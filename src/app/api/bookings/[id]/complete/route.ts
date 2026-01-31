import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { bookingIdSchema, validateParam } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { logApiError } from '@/lib/error-logger'
import { getDelegationContext, hasPermission } from '@/lib/auth/delegation'
import { scheduleFollowUps } from '@/lib/follow-ups'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'complete')
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

    // Get booking to check authorization
    type BookingResult = {
      id: string
      provider_id: string
      booking_link_id: string | null
    }

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, provider_id, booking_link_id')
      .eq('id', id)
      .single() as { data: BookingResult | null }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check authorization using delegation context
    // Complete requires 'view' permission (basic access)
    const delegationContext = await getDelegationContext(
      user.id,
      booking.provider_id,
      booking.booking_link_id
    )

    if (!hasPermission(delegationContext, 'view')) {
      return NextResponse.json({ error: 'Not authorized to complete this booking' }, { status: 403 })
    }

    // Get full booking details for follow-ups
    type FullBookingResult = {
      id: string
      provider_id: string
      meeting_id: string
      end_time: string
    }

    const { data: fullBooking } = await supabase
      .from('bookings')
      .select('id, provider_id, meeting_id, end_time')
      .eq('id', id)
      .single() as { data: FullBookingResult | null }

    // Update booking status to completed
    const { error } = await supabase
      .from('bookings')
      // @ts-ignore - Supabase types not inferring correctly
      .update({ status: 'completed' })
      .eq('id', id)

    if (error) {
      console.error('Complete error:', error)
      await logApiError(error, '/api/bookings/[id]/complete', 'complete', { bookingId: id })
      return NextResponse.json({ error: 'Failed to complete' }, { status: 500 })
    }

    // Schedule follow-ups (fire-and-forget)
    if (fullBooking && fullBooking.meeting_id) {
      scheduleFollowUps(
        fullBooking.id,
        fullBooking.provider_id,
        fullBooking.meeting_id,
        new Date(fullBooking.end_time)
      ).catch(err => {
        console.error('Failed to schedule follow-ups:', err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Complete error:', error)
    await logApiError(error instanceof Error ? error : new Error(String(error)), '/api/bookings/[id]/complete', 'complete')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
