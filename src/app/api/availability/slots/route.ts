import { NextResponse } from 'next/server'
import { generateTimeSlots } from '@/lib/availability'
import { startOfDay, endOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import type { Meeting, Booking } from '@/types/database'
import { checkRateLimit } from '@/lib/rate-limit'

// Import from the new cached data layer
import {
  getProviderTimezone,
  getProviderCalendarToken,
  getProviderAvailability,
  getMeetingConfig,
  getBookingsInRange,
  isDateBlackedOut,
  getCachedBusyTimes,
} from '@/lib/data'

export async function GET(request: Request) {
  // Rate limit public endpoint
  const rateLimitResponse = await checkRateLimit(request, 'slots')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider_id')
    const meetingId = searchParams.get('meeting_id')
    const dateStr = searchParams.get('date')
    const excludeBookingId = searchParams.get('exclude_booking_id') || undefined

    if (!providerId || !meetingId || !dateStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: provider_id, meeting_id, date' },
        { status: 400 }
      )
    }

    const requestedDate = new Date(dateStr)

    // OPTIMIZATION: Fetch timezone, availability rules, and meeting config in parallel
    // These are all cached, so subsequent requests are instant
    const [timezone, availabilityRules, meeting] = await Promise.all([
      getProviderTimezone(providerId),
      getProviderAvailability(providerId),
      getMeetingConfig(meetingId),
    ])

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (!availabilityRules || availabilityRules.length === 0) {
      return NextResponse.json({ slots: [] })
    }

    // Calculate day boundaries in provider's timezone
    const zonedDate = toZonedTime(requestedDate, timezone)
    const dayStart = startOfDay(zonedDate)
    const dayEnd = endOfDay(zonedDate)

    // Check blackout first (cheap, cached)
    const isBlackedOut = await isDateBlackedOut(providerId, zonedDate)
    if (isBlackedOut) {
      return NextResponse.json({ slots: [] })
    }

    // OPTIMIZATION: Fetch bookings and calendar busy times in parallel
    // Calendar busy times are now CACHED (1 minute) - huge performance win
    const [bookings, calendarToken] = await Promise.all([
      getBookingsInRange(providerId, dayStart, dayEnd, excludeBookingId),
      getProviderCalendarToken(providerId),
    ])

    // Fetch Google Calendar busy times (CACHED)
    let externalBusyTimes: { start: Date; end: Date }[] = []
    if (calendarToken?.google_calendar_token) {
      externalBusyTimes = await getCachedBusyTimes(providerId, dayStart, dayEnd)
    }

    // Generate slots with combined conflicts
    const slots = generateTimeSlots(
      zonedDate,
      availabilityRules,
      meeting as Pick<Meeting, 'duration_minutes' | 'buffer_minutes'>,
      bookings as Pick<Booking, 'start_time' | 'end_time'>[],
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
