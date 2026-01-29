import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendBookingConfirmationToClient, sendBookingNotificationToProvider } from '@/lib/email'
import { parseBody, rescheduleSchema, bookingIdSchema, validateParam } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { updateCalendarEvent } from '@/lib/google-calendar'
import { logApiError } from '@/lib/error-logger'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'reschedule')
    if (rateLimitResponse) return rateLimitResponse

    const { id } = await params

    // Validate booking ID
    const { error: idError } = validateParam(id, bookingIdSchema)
    if (idError) return idError

    // Validate request body
    const { data: body, error: validationError } = await parseBody(request, rescheduleSchema)
    if (validationError) return validationError

    const { token, start_time, end_time } = body

    const supabase = createAdminClient()

    // Verify token and get booking with provider/service info
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        id, management_token, google_event_id, provider_id, service_id, booking_link_id,
        client_name, client_email, notes,
        providers:provider_id (id, name, business_name, email, timezone, google_calendar_token),
        services:service_id (name),
        booking_links:booking_link_id (name)
      `)
      .eq('id', id)
      .single() as { data: {
        id: string
        management_token: string
        google_event_id: string | null
        provider_id: string
        service_id: string
        booking_link_id: string | null
        client_name: string
        client_email: string
        notes: string | null
        providers: { id: string; name: string | null; business_name: string | null; email: string; timezone: string; google_calendar_token: unknown } | null
        services: { name: string } | null
        booking_links: { name: string } | null
      } | null }

    if (!booking || booking.management_token !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check for conflicts at the new time
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('provider_id', booking.provider_id)
      .neq('status', 'cancelled')
      .neq('id', id) // Exclude current booking
      .lt('start_time', end_time)
      .gt('end_time', start_time)
      .limit(1)

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      )
    }

    // Update booking with new time
    const { error } = await supabase
      .from('bookings')
      // @ts-ignore - Supabase types not inferring correctly
      .update({
        start_time,
        end_time,
      })
      .eq('id', id)

    if (error) {
      console.error('Reschedule error:', error)
      await logApiError(error, '/api/bookings/[id]/reschedule', 'reschedule', { bookingId: id })
      return NextResponse.json({ error: 'Failed to reschedule' }, { status: 500 })
    }

    // Determine display name and get team members
    const service = booking.services
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
        .eq('is_required', true) as { data: { providers: TeamMember | TeamMember[] | null }[] | null }

      if (members) {
        teamMembers = members
          .map((m) => {
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

    if (service && teamMembers.length > 0) {
      const primaryMember = teamMembers[0]

      const baseEmailData = {
        bookingId: booking.id,
        managementToken: booking.management_token,
        serviceName: service.name,
        providerName: displayName,
        clientName: booking.client_name,
        clientEmail: booking.client_email,
        startTime: new Date(start_time),
        endTime: new Date(end_time),
        timezone: primaryMember.timezone,
        notes: booking.notes,
      }

      try {
        // Send rescheduled confirmation to client
        await sendBookingConfirmationToClient({ ...baseEmailData, providerEmail: primaryMember.email })

        // Notify all team members about the reschedule
        await Promise.all(
          teamMembers.map(async (member) => {
            await sendBookingNotificationToProvider({
              ...baseEmailData,
              providerEmail: member.email,
            })

            // Update calendar event for each team member who has Google connected
            // Note: We need to track google_event_id per member for this to work properly
            // For now, update the primary member's calendar event
            if (member.id === booking.provider_id && booking.google_event_id && member.google_calendar_token) {
              await updateCalendarEvent(member.id, booking.google_event_id, {
                start_time,
                end_time,
              }).catch(err => console.error(`Calendar update failed for ${member.email}:`, err))
            }
          })
        )
      } catch (err) {
        console.error('Reschedule email/calendar error:', err)
        // Don't fail the reschedule if emails fail
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reschedule error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/bookings/[id]/reschedule', 'reschedule')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
