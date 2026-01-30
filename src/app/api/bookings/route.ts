import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  sendBookingConfirmationToClient,
  sendBookingNotificationToProvider,
  sendBookingRequestToClient,
  sendBookingRequestToProvider,
} from '@/lib/email'
import { parseBody, createBookingSchema } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { createCalendarEvent, getCalendarBusyTimes } from '@/lib/google-calendar'
import { logApiError } from '@/lib/error-logger'

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'booking')
    if (rateLimitResponse) return rateLimitResponse

    // Validate request body
    const { data: body, error: validationError } = await parseBody(request, createBookingSchema)
    if (validationError) return validationError

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
    } = body

    const supabase = await createClient()

    // Fetch meeting to get booking mode
    const { data: meetingData } = await supabase
      .from('meetings')
      .select('booking_mode, name')
      .eq('id', meeting_id)
      .single() as { data: { booking_mode: string | null; name: string } | null }

    const bookingMode = meetingData?.booking_mode || 'instant'

    // Check for conflicts
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
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

    // Check Google Calendar conflicts
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

    // Create booking with status based on booking mode
    const bookingData = {
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
    }

    let teamMembers: TeamMember[] = []
    let displayName = ''

    if (booking_link_id) {
      // Fetch booking link info and all required team members
      const { data: linkData } = await supabase
        .from('booking_links')
        .select('name')
        .eq('id', booking_link_id)
        .single() as { data: { name: string } | null }

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
            google_calendar_token
          )
        `)
        .eq('booking_link_id', booking_link_id)
        .eq('is_required', true)

      if (members) {
        teamMembers = members
          .map((m: { providers: TeamMember | TeamMember[] | null }) => {
            const p = m.providers
            return Array.isArray(p) ? p[0] : p
          })
          .filter((p): p is TeamMember => p !== null)
      }

      displayName = linkData?.name || 'Your team'
    } else {
      // Single provider booking
      const { data: provider } = await supabase
        .from('providers')
        .select('id, name, business_name, email, timezone, google_calendar_token')
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
      }

      console.log('Sending booking emails to team:', teamMembers.map(m => ({
        email: m.email,
        hasGoogleCalendar: !!m.google_calendar_token
      })))

      try {
        // Send client email once
        if (bookingMode === 'request') {
          await sendBookingRequestToClient({ ...baseEmailData, providerEmail: primaryMember.email })
        } else {
          await sendBookingConfirmationToClient({ ...baseEmailData, providerEmail: primaryMember.email })
        }

        // Send provider notifications and create calendar events for ALL team members
        await Promise.all(
          teamMembers.map(async (member) => {
            const memberEmailData = {
              ...baseEmailData,
              providerEmail: member.email,
              providerName: displayName,
            }

            // Send email to this team member
            if (bookingMode === 'request') {
              await sendBookingRequestToProvider(memberEmailData)
            } else {
              await sendBookingNotificationToProvider(memberEmailData)
            }

            // Create calendar event if they have Google connected (instant bookings only)
            if (bookingMode !== 'request' && member.google_calendar_token) {
              await createCalendarEvent(
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
            }
          })
        )

        console.log('All team notifications sent successfully')
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
