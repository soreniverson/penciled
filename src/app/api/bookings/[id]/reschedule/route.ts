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
        id, management_token, google_event_id, provider_id, service_id,
        client_name, client_email,
        providers:provider_id (id, name, business_name, email, timezone),
        services:service_id (name)
      `)
      .eq('id', id)
      .single() as { data: {
        id: string
        management_token: string
        google_event_id: string | null
        provider_id: string
        service_id: string
        client_name: string
        client_email: string
        providers: { id: string; name: string | null; business_name: string | null; email: string; timezone: string } | null
        services: { name: string } | null
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

    // Send updated confirmation emails
    const provider = booking.providers
    const service = booking.services

    if (provider && service) {
      const emailData = {
        bookingId: booking.id,
        managementToken: booking.management_token,
        serviceName: service.name,
        providerName: provider.business_name || provider.name || 'Your provider',
        providerEmail: provider.email,
        clientName: booking.client_name,
        clientEmail: booking.client_email,
        startTime: new Date(start_time),
        endTime: new Date(end_time),
        timezone: provider.timezone,
      }

      // Send emails (using the confirmation emails with "rescheduled" context would be better,
      // but for now reusing confirmation emails)
      Promise.all([
        sendBookingConfirmationToClient(emailData),
        sendBookingNotificationToProvider(emailData),
      ]).catch(err => console.error('Reschedule email sending failed:', err))
    }

    // Update Google Calendar event if it exists
    if (booking.google_event_id) {
      updateCalendarEvent(booking.provider_id, booking.google_event_id, {
        start_time,
        end_time,
      }).catch(err => console.error('Calendar event update failed:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reschedule error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/bookings/[id]/reschedule', 'reschedule')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
