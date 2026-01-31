import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendBookingDeclinedToClient } from '@/lib/email'
import { parseBody, providerActionSchema, bookingIdSchema, validateParam } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { logApiError } from '@/lib/error-logger'
import { getDelegationContext, hasPermission } from '@/lib/auth/delegation'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'decline')
    if (rateLimitResponse) return rateLimitResponse

    const { id } = await params

    // Validate booking ID
    const { error: idError } = validateParam(id, bookingIdSchema)
    if (idError) return idError

    // Validate request body (optional reason)
    const { data: body, error: validationError } = await parseBody(request, providerActionSchema)
    if (validationError) return validationError

    const { reason } = body

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get booking with provider and meeting info (without provider_id filter)
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        id, management_token, provider_id, booking_link_id, status,
        client_name, client_email, start_time, end_time,
        providers:provider_id (name, business_name, email, timezone),
        meetings:meeting_id (name)
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
        start_time: string
        end_time: string
        providers: { name: string | null; business_name: string | null; email: string; timezone: string } | null
        meetings: { name: string } | null
      } | null }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check authorization using delegation context
    // Decline requires 'cancel' permission since it's rejecting a booking
    const delegationContext = await getDelegationContext(
      user.id,
      booking.provider_id,
      booking.booking_link_id
    )

    if (!hasPermission(delegationContext, 'cancel')) {
      return NextResponse.json({ error: 'Not authorized to decline this booking' }, { status: 403 })
    }

    if (booking.status !== 'pending') {
      return NextResponse.json({ error: 'Booking is not pending' }, { status: 400 })
    }

    // Update booking status to cancelled
    const { error } = await supabase
      .from('bookings')
      // @ts-ignore - Supabase types not inferring correctly
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'Request declined',
      })
      .eq('id', id)

    if (error) {
      console.error('Decline error:', error)
      await logApiError(error, '/api/bookings/[id]/decline', 'decline', { bookingId: id })
      return NextResponse.json({ error: 'Failed to decline' }, { status: 500 })
    }

    // Send decline email to client
    const provider = booking.providers
    const meeting = booking.meetings

    if (provider && meeting) {
      const emailData = {
        bookingId: booking.id,
        managementToken: booking.management_token,
        meetingName: meeting.name,
        providerName: provider.business_name || provider.name || 'Your provider',
        providerEmail: provider.email,
        clientName: booking.client_name,
        clientEmail: booking.client_email,
        startTime: new Date(booking.start_time),
        endTime: new Date(booking.end_time),
        timezone: provider.timezone,
        reason: reason ?? undefined,
      }

      sendBookingDeclinedToClient(emailData).catch(err =>
        console.error('Decline email sending failed:', err)
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Decline error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/bookings/[id]/decline', 'decline')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
