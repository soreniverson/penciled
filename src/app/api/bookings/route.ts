import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  sendBookingConfirmationToClient,
  sendBookingNotificationToProvider,
  sendBookingRequestToClient,
  sendBookingRequestToProvider,
  sendConflictOverrideNotification,
} from '@/lib/email'
import { parseBody, createBookingWithOverridesSchema, type CreateBookingWithOverridesInput } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { createCalendarEvent, getCalendarBusyTimes } from '@/lib/google-calendar'
import { createZoomMeeting, shouldUseZoom } from '@/lib/zoom'
import { logApiError } from '@/lib/error-logger'
import { getDelegationContext, hasPermission } from '@/lib/auth/delegation'
import { assignMembersToBooking } from '@/lib/booking-assignment'

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'booking')
    if (rateLimitResponse) return rateLimitResponse

    // Validate request body (now with override support)
    const parseResult = await parseBody<CreateBookingWithOverridesInput>(request, createBookingWithOverridesSchema)
    if (parseResult.error) return parseResult.error

    const {
      provider_id,
      meeting_id,
      client_name,
      client_email,
      client_phone,
      start_time,
      end_time,
      notes,
      booking_link_id,
      override_availability,
      override_conflicts,
      override_reason,
    } = parseResult.data

    const supabase = await createClient()

    // Check if user is authenticated (required for overrides)
    const { data: { user } } = await supabase.auth.getUser()

    // If override flags are set, verify the user has permission
    let delegationContext = null
    let approvedByUserId: string | null = null

    if (override_availability || override_conflicts) {
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required for override' },
          { status: 401 }
        )
      }

      delegationContext = await getDelegationContext(user.id, provider_id, booking_link_id || null)

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

      approvedByUserId = user.id
    }

    // Fetch meeting to get booking mode and video platform
    const { data: meetingData } = await supabase
      .from('meetings')
      .select('booking_mode, name, video_platform')
      .eq('id', meeting_id)
      .single() as { data: { booking_mode: string | null; name: string; video_platform: 'google_meet' | 'zoom' | 'none' | 'auto' | null } | null }

    const bookingMode = meetingData?.booking_mode || 'instant'
    const videoPlatform = meetingData?.video_platform || 'google_meet'

    // Check for conflicts (unless override_conflicts is set)
    let conflictingBooking: { id: string; client_name: string; client_email: string } | null = null

    if (!override_conflicts) {
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id, client_name, client_email')
        .eq('provider_id', provider_id)
        .neq('status', 'cancelled')
        .lt('start_time', end_time)
        .gt('end_time', start_time)
        .limit(1)

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json(
          { error: 'This time slot is no longer available' },
          { status: 409 }
        )
      }
    } else {
      // Get conflicting booking info for notification
      type ConflictResult = { id: string; client_name: string; client_email: string }

      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id, client_name, client_email')
        .eq('provider_id', provider_id)
        .neq('status', 'cancelled')
        .lt('start_time', end_time)
        .gt('end_time', start_time)
        .limit(1) as { data: ConflictResult[] | null }

      if (conflicts && conflicts.length > 0) {
        conflictingBooking = conflicts[0]
      }
    }

    // Check Google Calendar conflicts (unless override_conflicts is set)
    if (!override_conflicts) {
      const busyTimes = await getCalendarBusyTimes(
        provider_id,
        new Date(start_time),
        new Date(end_time)
      )

      const hasCalendarConflict = busyTimes.some(busy =>
        new Date(busy.start) < new Date(end_time) && new Date(busy.end) > new Date(start_time)
      )

      if (hasCalendarConflict) {
        return NextResponse.json(
          { error: 'Time slot is no longer available' },
          { status: 409 }
        )
      }
    }

    // Create booking with status based on booking mode
    const bookingData: Record<string, unknown> = {
      provider_id,
      meeting_id,
      client_name,
      client_email,
      client_phone: client_phone || null,
      start_time,
      end_time,
      notes: notes || null,
      status: bookingMode === 'request' ? 'pending' : 'confirmed',
      booking_link_id: booking_link_id || null,
    }

    // Add override tracking if applicable
    if (override_availability) {
      bookingData.availability_override = true
      bookingData.override_approved_by = approvedByUserId
      bookingData.override_reason = override_reason || 'Override requested'
    }

    if (override_conflicts) {
      bookingData.conflict_override = true
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      // @ts-ignore - Supabase types not inferring correctly
      .insert(bookingData)
      .select('id, management_token')
      .single() as { data: { id: string; management_token: string } | null; error: Error | null }

    if (error) {
      console.error('Booking creation error:', error)
      await logApiError(error, '/api/bookings', 'create', { provider_id, meeting_id })
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }

    const meetingName = meetingData?.name || 'Appointment'

    // Determine team members to notify
    type TeamMember = {
      id: string
      name: string | null
      business_name: string | null
      email: string
      timezone: string
      google_calendar_token: unknown
      zoom_token: unknown
    }

    let teamMembers: TeamMember[] = []
    let displayName = ''

    if (booking_link_id && booking) {
      // Fetch booking link info and members
      const { data: linkData } = await supabase
        .from('booking_links')
        .select('name, min_required_members')
        .eq('id', booking_link_id)
        .single() as { data: { name: string; min_required_members: number | null } | null }

      const { data: members } = await supabase
        .from('booking_link_members')
        .select(`
          provider_id,
          is_required,
          providers:provider_id (
            id,
            name,
            business_name,
            email,
            timezone,
            google_calendar_token,
            zoom_token
          )
        `)
        .eq('booking_link_id', booking_link_id)

      // If min_required_members is set, use flexible assignment
      if (linkData?.min_required_members !== null && linkData?.min_required_members !== undefined && booking) {
        // Assign members to this booking (round-robin/load-balanced)
        const assignedMemberIds = await assignMembersToBooking(
          booking.id,
          booking_link_id,
          new Date(start_time),
          new Date(end_time),
          linkData.min_required_members,
          'round_robin'
        )

        // Filter to only assigned members
        if (members) {
          teamMembers = members
            .filter((m: { provider_id: string }) => assignedMemberIds.includes(m.provider_id))
            .map((m: { providers: TeamMember | TeamMember[] | null }) => {
              const p = m.providers
              return Array.isArray(p) ? p[0] : p
            })
            .filter((p): p is TeamMember => p !== null)
        }
      } else {
        // Legacy behavior: all required members
        if (members) {
          teamMembers = members
            .filter((m: { is_required: boolean }) => m.is_required)
            .map((m: { providers: TeamMember | TeamMember[] | null }) => {
              const p = m.providers
              return Array.isArray(p) ? p[0] : p
            })
            .filter((p): p is TeamMember => p !== null)
        }
      }

      displayName = linkData?.name || 'Your team'
    } else {
      // Single provider booking
      const { data: provider } = await supabase
        .from('providers')
        .select('id, name, business_name, email, timezone, google_calendar_token, zoom_token')
        .eq('id', provider_id)
        .single() as { data: TeamMember | null }

      if (provider) {
        teamMembers = [provider]
        displayName = provider.business_name || provider.name || 'Your provider'
      }
    }

    // Send emails and create calendar events for all team members
    if (teamMembers.length > 0 && booking) {
      const primaryMember = teamMembers[0]

      console.log('Sending booking emails to team:', teamMembers.map(m => ({
        email: m.email,
        hasGoogleCalendar: !!m.google_calendar_token
      })))

      try {
        let meetingLink: string | null = null

        // For instant bookings, create video meeting and calendar events
        if (bookingMode !== 'request') {
          // Check if we should use Zoom based on video platform setting
          const useZoom = shouldUseZoom(
            videoPlatform,
            primaryMember.email,
            client_email,
            !!primaryMember.zoom_token
          )

          if (useZoom && videoPlatform !== 'none') {
            // Create Zoom meeting
            console.log('Creating Zoom meeting...')
            const zoomResult = await createZoomMeeting(
              primaryMember.id,
              {
                id: booking.id,
                client_name,
                client_email,
                start_time,
                end_time,
                notes,
              },
              meetingName
            )
            meetingLink = zoomResult.meetingUrl
            console.log('Zoom meeting created:', meetingLink)
          }

          // Create Google Calendar events for all members with Google connected
          // If no Zoom meeting was created, Google Meet link will be used
          const calendarResults = await Promise.all(
            teamMembers
              .filter(member => member.google_calendar_token)
              .map(member =>
                createCalendarEvent(
                  member.id,
                  {
                    id: booking.id,
                    client_name,
                    client_email,
                    client_phone,
                    start_time,
                    end_time,
                    notes,
                  },
                  meetingName
                )
              )
          )

          // If no Zoom link, get Google Meet link from calendar event
          if (!meetingLink && videoPlatform !== 'none') {
            meetingLink = calendarResults.find(r => r.meetingLink)?.meetingLink || null
          }
          console.log('Calendar events created, meeting link:', meetingLink)
        }

        const baseEmailData = {
          bookingId: booking.id,
          managementToken: booking.management_token,
          meetingName,
          providerName: displayName,
          clientName: client_name,
          clientEmail: client_email,
          startTime: new Date(start_time),
          endTime: new Date(end_time),
          timezone: primaryMember.timezone,
          notes: notes || null,
          meetingLink,
        }

        // Send client email with meeting link
        if (bookingMode === 'request') {
          await sendBookingRequestToClient({ ...baseEmailData, providerEmail: primaryMember.email })
        } else {
          await sendBookingConfirmationToClient({ ...baseEmailData, providerEmail: primaryMember.email })
        }

        // Send provider notifications to ALL team members
        await Promise.all(
          teamMembers.map(async (member) => {
            const memberEmailData = {
              ...baseEmailData,
              providerEmail: member.email,
              providerName: displayName,
            }

            if (bookingMode === 'request') {
              await sendBookingRequestToProvider(memberEmailData)
            } else {
              await sendBookingNotificationToProvider(memberEmailData)
            }
          })
        )

        console.log('All team notifications sent successfully')

        // Send conflict override notification if applicable
        if (conflictingBooking && override_conflicts && user) {
          const { data: overrider } = await supabase
            .from('providers')
            .select('name')
            .eq('id', user.id)
            .single() as { data: { name: string | null } | null }

          const overriderName = overrider?.name || 'A delegate'

          sendConflictOverrideNotification({
            bookingId: booking.id,
            managementToken: booking.management_token,
            meetingName,
            providerName: displayName,
            providerEmail: primaryMember.email,
            clientName: client_name,
            clientEmail: client_email,
            startTime: new Date(start_time),
            endTime: new Date(end_time),
            timezone: primaryMember.timezone,
            conflictingBookingId: conflictingBooking.id,
            conflictingClientName: conflictingBooking.client_name,
            conflictingClientEmail: conflictingBooking.client_email,
            overrideByName: overriderName,
          }).catch(err => console.error('Conflict override notification failed:', err))
        }
      } catch (err) {
        console.error('Email/calendar error:', err)
        // Don't fail the booking if emails fail
      }
    }

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('Booking error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/bookings', 'create')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
