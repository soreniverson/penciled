import { createUntypedAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getCalendarBusyTimes } from '@/lib/google-calendar'
import { generateTimeSlots } from '@/lib/availability'
import { startOfDay, endOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import type { Availability, Service, Booking } from '@/types/database'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider_id')
    const serviceId = searchParams.get('service_id')
    const dateStr = searchParams.get('date')
    const excludeBookingId = searchParams.get('exclude_booking_id')

    if (!providerId || !serviceId || !dateStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: provider_id, service_id, date' },
        { status: 400 }
      )
    }

    const supabase = createUntypedAdminClient()

    // Parse date and get day boundaries in provider's timezone
    const requestedDate = new Date(dateStr)

    // Fetch provider info (timezone and calendar connection)
    const { data: provider } = await supabase
      .from('providers')
      .select('timezone, google_calendar_token')
      .eq('id', providerId)
      .single()

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    const timezone = provider.timezone || 'America/New_York'
    const zonedDate = toZonedTime(requestedDate, timezone)
    const dayStart = startOfDay(zonedDate)
    const dayEnd = endOfDay(zonedDate)

    // Fetch provider's availability rules
    const { data: availabilityRules } = await supabase
      .from('availability')
      .select('day_of_week, start_time, end_time')
      .eq('provider_id', providerId)
      .eq('is_active', true)

    if (!availabilityRules || availabilityRules.length === 0) {
      return NextResponse.json({ slots: [] })
    }

    // Fetch service details
    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes, buffer_minutes')
      .eq('id', serviceId)
      .single()

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Fetch existing Supabase bookings for the day
    let bookingsQuery = supabase
      .from('bookings')
      .select('start_time, end_time, status')
      .eq('provider_id', providerId)
      .neq('status', 'cancelled')
      .gte('start_time', dayStart.toISOString())
      .lte('start_time', dayEnd.toISOString())

    // Exclude a specific booking (for reschedule flow)
    if (excludeBookingId) {
      bookingsQuery = bookingsQuery.neq('id', excludeBookingId)
    }

    const { data: bookings } = await bookingsQuery

    // Check for blackout dates
    const dateOnlyStr = zonedDate.toISOString().split('T')[0]
    const { data: blackouts } = await supabase
      .from('blackout_dates')
      .select('start_date, end_date')
      .eq('provider_id', providerId)
      .lte('start_date', dateOnlyStr)
      .gte('end_date', dateOnlyStr)

    // If there's a blackout for this day, return no slots
    if (blackouts && blackouts.length > 0) {
      return NextResponse.json({ slots: [] })
    }

    // Fetch Google Calendar busy times if connected
    let externalBusyTimes: { start: Date; end: Date }[] = []
    if (provider.google_calendar_token) {
      externalBusyTimes = await getCalendarBusyTimes(
        providerId,
        dayStart,
        dayEnd
      )
    }

    // Generate slots with combined conflicts
    const slots = generateTimeSlots(
      zonedDate,
      availabilityRules,
      service as Pick<Service, 'duration_minutes' | 'buffer_minutes'>,
      (bookings || []) as Pick<Booking, 'start_time' | 'end_time'>[],
      timezone,
      2, // minimumNoticeHours
      externalBusyTimes
    )

    // Return only available slots with serializable dates
    const serializedSlots = slots.map(slot => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      available: slot.available,
    }))

    return NextResponse.json({ slots: serializedSlots })
  } catch (error) {
    console.error('Availability slots error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability slots' },
      { status: 500 }
    )
  }
}
