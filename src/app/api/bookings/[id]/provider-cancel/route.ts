import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendCancellationEmailToClient, sendCancellationEmailToProvider } from '@/lib/email'
import { parseBody, providerActionSchema, bookingIdSchema, validateParam } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { deleteCalendarEvent } from '@/lib/google-calendar'
import { deleteZoomMeeting } from '@/lib/zoom'
import { logApiError } from '@/lib/error-logger'
import { getDelegationContext, hasPermission } from '@/lib/auth/delegation'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'cancel')
    if (rateLimitResponse) return rateLimitResponse

    const { id } = await params

    // Validate booking ID
    const { error: idError } = validateParam(id, bookingIdSchema)
    if (idError) return idError

    // Validate request body
    const { data: body, error: validationError } = await parseBody(request, providerActionSchema)
    if (validationError) return validationError

    const { reason } = body

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get booking with provider and meeting info (without provider_id filter first)
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        id, management_token, google_event_id, provider_id, booking_link_id,
        zoom_meeting_id, client_name, client_email, start_time, end_time,
        providers:provider_id (id, name, business_name, email, timezone, google_calendar_token),
        meetings:meeting_id (name),
        booking_links:booking_link_id (name)
      `)
      .eq('id', id)
      .single() as { data: {
        id: string
        management_token: string
        google_event_id: string | null
        provider_id: string
        booking_link_id: string | null
        zoom_meeting_id: string | null
        client_name: string
        client_email: string
        start_time: string
        end_time: string
        providers: { id: string; name: string | null; business_name: string | null; email: string; timezone: string; google_calendar_token: unknown } | null
        meetings: { name: string } | null
        booking_links: { name: string } | null
      } | null }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check authorization using delegation context
    const delegationContext = await getDelegationContext(
      user.id,
      booking.provider_id,
      booking.booking_link_id
    )

    if (!hasPermission(delegationContext, 'cancel')) {
      return NextResponse.json(
        { error: 'Not authorized to cancel this booking' },
        { status: 403 }
      )
    }

    // Update booking status
    const { error } = await supabase
      .from('bookings')
      // @ts-ignore - Supabase types not inferring correctly
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
      })
      .eq('id', id)

    if (error) {
      console.error('Cancel error:', error)
      await logApiError(error, '/api/bookings/[id]/provider-cancel', 'provider-cancel', { bookingId: id })
      return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
    }

    // Get team members for team bookings
    type TeamMember = {
      id: string
      name: string | null
      business_name: string | null
      email: string
      timezone: string
      google_calendar_token: unknown
    }

    let teamMembers: TeamMember[] = []
    let displayName = booking.booking_links?.name || booking.providers?.business_name || booking.providers?.name || 'Your provider'

    if (booking.booking_link_id) {
      // Fetch all required team members
      const { data: members } = await supabase
        .from('booking_link_members')
        .select(`
          provider_id,
          providers:provider_id (id, name, business_name, email, timezone, google_calendar_token)
        `)
        .eq('booking_link_id', booking.booking_link_id)
        .eq('is_required', true) as { data: { providers: TeamMember | TeamMember[] | null }[] | null }

      if (members) {
        teamMembers = members
          .map((m) => {
            const p = m.providers
            return Array.isArray(p) ? p[0] : p
          })
          .filter((p): p is TeamMember => p !== null)
      }
    } else if (booking.providers) {
      teamMembers = [booking.providers]
    }

    const meeting = booking.meetings

    if (meeting && teamMembers.length > 0) {
      const primaryMember = teamMembers[0]

      // Send cancellation email to client
      const baseEmailData = {
        bookingId: booking.id,
        managementToken: booking.management_token,
        meetingName: meeting.name,
        providerName: displayName,
        clientName: booking.client_name,
        clientEmail: booking.client_email,
        startTime: new Date(booking.start_time),
        endTime: new Date(booking.end_time),
        timezone: primaryMember.timezone,
        reason: reason ?? undefined,
      }

      sendCancellationEmailToClient({ ...baseEmailData, providerEmail: primaryMember.email })
        .catch(err => console.error('Client cancellation email failed:', err))

      // Notify all team members
      Promise.all(
        teamMembers.map(member =>
          sendCancellationEmailToProvider({
            ...baseEmailData,
            providerEmail: member.email,
            providerName: displayName,
          })
        )
      ).catch(err => console.error('Provider cancellation emails failed:', err))

      // Delete calendar events for all team members with Google connected
      if (booking.google_event_id) {
        teamMembers
          .filter(member => member.google_calendar_token)
          .forEach(member => {
            deleteCalendarEvent(member.id, booking.google_event_id!)
              .catch(err => console.error(`Calendar deletion failed for ${member.email}:`, err))
          })
      }

      // Delete Zoom meeting if it exists
      if (booking.zoom_meeting_id) {
        deleteZoomMeeting(primaryMember.id, booking.zoom_meeting_id)
          .catch(err => console.error('Zoom meeting deletion failed:', err))
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/bookings/[id]/provider-cancel', 'provider-cancel')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
