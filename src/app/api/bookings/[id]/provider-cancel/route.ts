import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendCancellationEmailToClient, sendCancellationEmailToProvider } from '@/lib/email'
import { parseBody, providerActionSchema, bookingIdSchema, validateParam } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { deleteCalendarEvent } from '@/lib/google-calendar'
import { logApiError } from '@/lib/error-logger'

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

    // Verify user is authenticated and owns this booking
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get booking with provider and service info
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        id, management_token, google_event_id, provider_id,
        client_name, client_email, start_time, end_time,
        providers:provider_id (name, business_name, email, timezone),
        services:service_id (name)
      `)
      .eq('id', id)
      .eq('provider_id', user.id)
      .single() as { data: {
        id: string
        management_token: string
        google_event_id: string | null
        provider_id: string
        client_name: string
        client_email: string
        start_time: string
        end_time: string
        providers: { name: string | null; business_name: string | null; email: string; timezone: string } | null
        services: { name: string } | null
      } | null }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
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

    // Send cancellation emails
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
        startTime: new Date(booking.start_time),
        endTime: new Date(booking.end_time),
        timezone: provider.timezone,
        reason: reason ?? undefined,
      }

      Promise.all([
        sendCancellationEmailToClient(emailData),
        sendCancellationEmailToProvider(emailData),
      ]).catch(err => console.error('Cancellation email sending failed:', err))
    }

    // Delete Google Calendar event if it exists
    if (booking.google_event_id) {
      deleteCalendarEvent(booking.provider_id, booking.google_event_id)
        .catch(err => console.error('Calendar event deletion failed:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/bookings/[id]/provider-cancel', 'provider-cancel')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
