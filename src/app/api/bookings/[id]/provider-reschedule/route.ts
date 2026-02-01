import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendProviderRescheduleNotification, sendRescheduleNotificationToProvider } from '@/lib/email'
import { parseBody, providerRescheduleSchema, bookingIdSchema, validateParam } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { updateCalendarEvent, getCalendarBusyTimes } from '@/lib/google-calendar'
import { updateZoomMeeting } from '@/lib/zoom'
import { logApiError } from '@/lib/error-logger'
import { getDelegationContext, hasPermission } from '@/lib/auth/delegation'

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
    const { data: body, error: validationError } = await parseBody(request, providerRescheduleSchema)
    if (validationError) return validationError

    const { start_time, end_time, reason, override_availability, override_conflicts } = body

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get booking with provider and meeting info
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        id, management_token, google_event_id, provider_id, booking_link_id,
        zoom_meeting_id, client_name, client_email, start_time, end_time, meeting_link,
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
        meeting_link: string | null
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

    if (!hasPermission(delegationContext, 'reschedule')) {
      return NextResponse.json(
        { error: 'Not authorized to reschedule this booking' },
        { status: 403 }
      )
    }

    // Check override permissions if override flags are set
    if (override_availability && !hasPermission(delegationContext, 'override_availability')) {
      return NextResponse.json(
        { error: 'Not authorized to override availability' },
        { status: 403 }
      )
    }

    if (override_conflicts && !hasPermission(delegationContext, 'override_conflicts')) {
      return NextResponse.json(
        { error: 'Not authorized to override conflicts' },
        { status: 403 }
      )
    }

    // Check for conflicts (unless override_conflicts is set)
    if (!override_conflicts) {
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id')
        .eq('provider_id', booking.provider_id)
        .neq('id', id) // Exclude current booking
        .neq('status', 'cancelled')
        .lt('start_time', end_time)
        .gt('end_time', start_time)
        .limit(1)

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json(
          { error: 'This time slot conflicts with another booking' },
          { status: 409 }
        )
      }

      // Check Google Calendar conflicts
      const busyTimes = await getCalendarBusyTimes(
        booking.provider_id,
        new Date(start_time),
        new Date(end_time)
      )

      const hasCalendarConflict = busyTimes.some(busy =>
        new Date(busy.start) < new Date(end_time) && new Date(busy.end) > new Date(start_time)
      )

      if (hasCalendarConflict) {
        return NextResponse.json(
          { error: 'Time slot conflicts with calendar event' },
          { status: 409 }
        )
      }
    }

    // Get rescheduler's name for notification
    let reschedulerName: string | null = null
    if (delegationContext.isDelegate && delegationContext.principalId) {
      const { data: rescheduler } = await supabase
        .from('providers')
        .select('name')
        .eq('id', user.id)
        .single() as { data: { name: string | null } | null }
      reschedulerName = rescheduler?.name || null
    }

    // Update booking
    const updateData: Record<string, unknown> = {
      start_time,
      end_time,
      rescheduled_by: user.id,
      rescheduled_at: new Date().toISOString(),
    }

    if (override_availability) {
      updateData.availability_override = true
      updateData.override_approved_by = user.id
      updateData.override_reason = reason || 'Provider reschedule'
    }

    if (override_conflicts) {
      updateData.conflict_override = true
    }

    const { error } = await supabase
      .from('bookings')
      // @ts-ignore - Supabase types not inferring correctly
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Reschedule error:', error)
      await logApiError(error, '/api/bookings/[id]/provider-reschedule', 'provider-reschedule', { bookingId: id })
      return NextResponse.json({ error: 'Failed to reschedule' }, { status: 500 })
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

      // Update calendar events for all team members with Google connected
      if (booking.google_event_id) {
        Promise.all(
          teamMembers
            .filter(member => member.google_calendar_token)
            .map(member =>
              updateCalendarEvent(member.id, booking.google_event_id!, {
                start_time,
                end_time,
              }).catch(err => console.error(`Calendar update failed for ${member.email}:`, err))
            )
        ).catch(err => console.error('Calendar updates failed:', err))
      }

      // Update Zoom meeting if it exists
      if (booking.zoom_meeting_id) {
        updateZoomMeeting(primaryMember.id, booking.zoom_meeting_id, {
          start_time,
          end_time,
        }).catch(err => console.error('Zoom meeting update failed:', err))
      }

      const baseEmailData = {
        bookingId: booking.id,
        managementToken: booking.management_token,
        meetingName: meeting.name,
        providerName: displayName,
        clientName: booking.client_name,
        clientEmail: booking.client_email,
        startTime: new Date(start_time),
        endTime: new Date(end_time),
        oldStartTime: new Date(booking.start_time),
        oldEndTime: new Date(booking.end_time),
        timezone: primaryMember.timezone,
        meetingLink: booking.meeting_link,
        reason: reason ?? undefined,
        rescheduledByName: reschedulerName ?? undefined,
      }

      // Send reschedule notification to client
      sendProviderRescheduleNotification({ ...baseEmailData, providerEmail: primaryMember.email })
        .catch(err => console.error('Client reschedule notification failed:', err))

      // Notify all team members about the reschedule
      Promise.all(
        teamMembers.map(member =>
          sendRescheduleNotificationToProvider({
            ...baseEmailData,
            providerEmail: member.email,
            rescheduledBy: 'provider',
          })
        )
      ).catch(err => console.error('Team reschedule notifications failed:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reschedule error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/bookings/[id]/provider-reschedule', 'provider-reschedule')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
