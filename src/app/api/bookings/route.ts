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
      service_id,
      client_name,
      client_email,
      client_phone,
      start_time,
      end_time,
      notes,
    } = body

    const supabase = await createClient()

    // Fetch service to get booking mode
    const { data: serviceData } = await supabase
      .from('services')
      .select('booking_mode, name')
      .eq('id', service_id)
      .single() as { data: { booking_mode: string | null; name: string } | null }

    const bookingMode = serviceData?.booking_mode || 'instant'

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
      service_id,
      client_name,
      client_email,
      client_phone: client_phone || null,
      start_time,
      end_time,
      notes: notes || null,
      status: bookingMode === 'request' ? 'pending' : 'confirmed',
    }
    const { data: booking, error } = await supabase
      .from('bookings')
      // @ts-ignore - Supabase types not inferring correctly
      .insert(bookingData)
      .select('id, management_token')
      .single() as { data: { id: string; management_token: string } | null; error: Error | null }

    if (error) {
      console.error('Booking creation error:', error)
      await logApiError(error, '/api/bookings', 'create', { provider_id, service_id })
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }

    // Fetch provider and service info for emails
    const { data: provider } = await supabase
      .from('providers')
      .select('name, business_name, email, timezone')
      .eq('id', provider_id)
      .single() as { data: { name: string | null; business_name: string | null; email: string; timezone: string } | null }

    const serviceName = serviceData?.name || 'Appointment'

    // Send emails (don't block response on email delivery)
    console.log('Email check - provider:', !!provider, 'booking:', !!booking, 'provider data:', JSON.stringify(provider))
    if (provider && booking) {
      const emailData = {
        bookingId: booking.id,
        managementToken: booking.management_token,
        serviceName,
        providerName: provider.business_name || provider.name || 'Your provider',
        providerEmail: provider.email,
        clientName: client_name,
        clientEmail: client_email,
        startTime: new Date(start_time),
        endTime: new Date(end_time),
        timezone: provider.timezone,
      }

      console.log('Sending booking emails with data:', JSON.stringify({
        bookingId: emailData.bookingId,
        providerEmail: emailData.providerEmail,
        clientEmail: emailData.clientEmail,
        bookingMode,
      }))

      // Send emails and create calendar event (must await in serverless)
      try {
        if (bookingMode === 'request') {
          const results = await Promise.all([
            sendBookingRequestToClient(emailData),
            sendBookingRequestToProvider(emailData),
          ])
          console.log('Request emails sent:', results)
        } else {
          const [emailResults, calendarResult] = await Promise.all([
            Promise.all([
              sendBookingConfirmationToClient(emailData),
              sendBookingNotificationToProvider(emailData),
            ]),
            createCalendarEvent(
              provider_id,
              {
                id: booking.id,
                client_name,
                client_email,
                client_phone,
                start_time,
                end_time,
                notes,
              },
              serviceName
            ),
          ])
          console.log('Confirmation emails sent:', emailResults, 'Calendar event:', calendarResult)
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
