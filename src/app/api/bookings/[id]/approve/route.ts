import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendBookingApprovalToClient } from '@/lib/email'
import { bookingIdSchema, validateParam } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { createCalendarEvent } from '@/lib/google-calendar'
import { logApiError } from '@/lib/error-logger'
import { getDelegationContext, hasPermission } from '@/lib/auth/delegation'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'approve')
    if (rateLimitResponse) return rateLimitResponse

    const { id } = await params

    // Validate booking ID
    const { error: idError } = validateParam(id, bookingIdSchema)
    if (idError) return idError

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get booking with provider and service info
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        id, management_token, provider_id, booking_link_id, status,
        client_name, client_email, client_phone, start_time, end_time, notes,
        providers:provider_id (id, name, business_name, email, timezone, google_calendar_token),
        meetings:meeting_id (name),
        booking_links:booking_link_id (name)
      `)
      .eq('id', id)
      .single() as { data: {
        id: string
        management_token: string
        provider_id: string
        booking_link_id: string | null
        status: string
        client_name: string
        client_email: string
        client_phone: string | null
        start_time: string
        end_time: string
        notes: string | null
        providers: { id: string; name: string | null; business_name: string | null; email: string; timezone: string; google_calendar_token: unknown } | null
        meetings: { name: string } | null
        booking_links: { name: string } | null
      } | null }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check authorization using delegation context
    // Approve requires 'view' permission (basic access) since it's approving an incoming request
    const delegationContext = await getDelegationContext(
      user.id,
      booking.provider_id,
      booking.booking_link_id
    )

    if (!hasPermission(delegationContext, 'view')) {
      return NextResponse.json({ error: 'Not authorized to approve this booking' }, { status: 403 })
    }

    if (booking.status !== 'pending') {
      return NextResponse.json({ error: 'Booking is not pending' }, { status: 400 })
    }

    // Update booking status to confirmed
    const { error } = await supabase
      .from('bookings')
      // @ts-ignore - Supabase types not inferring correctly
      .update({ status: 'confirmed' })
      .eq('id', id)

    if (error) {
      console.error('Approve error:', error)
      await logApiError(error, '/api/bookings/[id]/approve', 'approve', { bookingId: id })
      return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
    }

    // Determine display name and get team members
    const meeting = booking.meetings
    const provider = booking.providers
    let displayName = booking.booking_links?.name || provider?.business_name || provider?.name || 'Your provider'

    type TeamMember = {
      id: string
      name: string | null
      business_name: string | null
      email: string
      timezone: string
      google_calendar_token: unknown
    }

    let teamMembers: TeamMember[] = []

    if (booking.booking_link_id) {
      // Fetch all team members for notifications
      const { data: members } = await supabase
        .from('booking_link_members')
        .select(`
          provider_id,
          is_required,
          providers:provider_id (
            id, name, business_name, email, timezone, google_calendar_token
          )
        `)
        .eq('booking_link_id', booking.booking_link_id)
        .eq('is_required', true)

      if (members) {
        teamMembers = members
          .map((m: { providers: TeamMember | TeamMember[] | null }) => {
            const p = m.providers
            return Array.isArray(p) ? p[0] : p
          })
          .filter((p): p is TeamMember => p !== null)
      }
    } else if (provider) {
      // Single provider booking
      teamMembers = [{
        id: provider.id,
        name: provider.name,
        business_name: provider.business_name,
        email: provider.email,
        timezone: provider.timezone,
        google_calendar_token: provider.google_calendar_token,
      }]
    }

    if (meeting && teamMembers.length > 0) {
      const primaryMember = teamMembers[0]

      // Create calendar events FIRST to get meeting link
      let meetingLink: string | null = null

      const calendarResults = await Promise.all(
        teamMembers
          .filter(member => member.google_calendar_token)
          .map(member =>
            createCalendarEvent(
              member.id,
              {
                id: booking.id,
                client_name: booking.client_name,
                client_email: booking.client_email,
                client_phone: booking.client_phone,
                start_time: booking.start_time,
                end_time: booking.end_time,
                notes: booking.notes,
              },
              meeting.name
            ).catch(err => {
              console.error(`Calendar event creation failed for ${member.email}:`, err)
              return { eventId: null, meetingLink: null }
            })
          )
      )

      // Get the meeting link from the first successful calendar event
      meetingLink = calendarResults.find(r => r.meetingLink)?.meetingLink || null
      console.log('Calendar events created for approval, meeting link:', meetingLink)

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
        meetingLink,
      }

      // Send approval email to client with meeting link
      await sendBookingApprovalToClient({ ...baseEmailData, providerEmail: primaryMember.email })
        .catch(err => console.error('Approval email sending failed:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Approve error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/bookings/[id]/approve', 'approve')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
