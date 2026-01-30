import { createAdminClient } from '@/lib/supabase/admin'
import { generateTimeSlots, type TimeSlot } from '@/lib/availability'
import { startOfDay, endOfDay, format, getDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import type { Availability, Meeting, Booking } from '@/types/database'
import {
  getBookingsForProviders,
  getCalendarBusyTimesForProviders,
} from '@/lib/data'

type MemberAvailability = {
  providerId: string
  isRequired: boolean
  availabilityRules: Pick<Availability, 'day_of_week' | 'start_time' | 'end_time'>[]
  bookings: Pick<Booking, 'start_time' | 'end_time'>[]
  busyTimes: { start: Date; end: Date }[]
  blackoutDates: { start_date: string; end_date: string }[]
}

/**
 * Get intersection availability for multiple team members
 * Returns slots where ALL required members are available
 *
 * OPTIMIZED: Uses batched queries instead of N+1 pattern
 */
export async function getIntersectionAvailability(
  memberIds: string[],
  requiredMemberIds: string[],
  date: Date,
  meeting: Pick<Meeting, 'duration_minutes' | 'buffer_minutes'>,
  timezone: string
): Promise<TimeSlot[]> {
  const supabase = createAdminClient()
  const zonedDate = toZonedTime(date, timezone)
  const dayStart = startOfDay(zonedDate)
  const dayEnd = endOfDay(zonedDate)
  const dateStr = format(zonedDate, 'yyyy-MM-dd')
  const dayOfWeek = getDay(zonedDate)

  // OPTIMIZATION: Batch all queries instead of N+1 queries per member
  const [
    availabilityData,
    blackoutsData,
    providersData,
    bookingsByProvider,
  ] = await Promise.all([
    // Single query for all members' availability rules
    supabase
      .from('availability')
      .select('provider_id, day_of_week, start_time, end_time')
      .in('provider_id', memberIds)
      .eq('is_active', true),

    // Single query for all members' blackout dates
    supabase
      .from('blackout_dates')
      .select('provider_id, start_date, end_date')
      .in('provider_id', memberIds)
      .lte('start_date', dateStr)
      .gte('end_date', dateStr),

    // Single query for all members' calendar tokens
    supabase
      .from('providers')
      .select('id, google_calendar_token')
      .in('id', memberIds),

    // Batched query from data layer
    getBookingsForProviders(memberIds, dayStart, dayEnd),
  ])

  // Get calendar busy times for members who have it connected (CACHED)
  const membersWithCalendar = (providersData.data || [])
    .filter((p: { id: string; google_calendar_token: unknown }) => p.google_calendar_token)
    .map((p: { id: string }) => p.id)

  const busyTimesByProvider = membersWithCalendar.length > 0
    ? await getCalendarBusyTimesForProviders(membersWithCalendar, dayStart, dayEnd)
    : new Map<string, { start: Date; end: Date }[]>()

  // Group data by provider
  const membersData: MemberAvailability[] = memberIds.map(providerId => {
    const isRequired = requiredMemberIds.includes(providerId)

    const availabilityRules = (availabilityData.data || [])
      .filter((r: { provider_id: string }) => r.provider_id === providerId)
      .map((r: { day_of_week: number; start_time: string; end_time: string }) => ({
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
      }))

    const blackoutDates = (blackoutsData.data || [])
      .filter((b: { provider_id: string }) => b.provider_id === providerId)
      .map((b: { start_date: string; end_date: string }) => ({
        start_date: b.start_date,
        end_date: b.end_date,
      }))

    const bookings = bookingsByProvider.get(providerId) || []
    const busyTimes = busyTimesByProvider.get(providerId) || []

    return {
      providerId,
      isRequired,
      availabilityRules,
      bookings,
      busyTimes,
      blackoutDates,
    }
  })

  // Check if any required member is blacked out on this day
  for (const member of membersData) {
    if (member.isRequired && member.blackoutDates.length > 0) {
      return []
    }
  }

  // Find intersection of availability rules for this day
  const requiredMembers = membersData.filter(m => m.isRequired)
  if (requiredMembers.length === 0) {
    return []
  }

  // Get initial slots from the first required member
  const firstMember = requiredMembers[0]
  const firstMemberRules = firstMember.availabilityRules.filter(r => r.day_of_week === dayOfWeek)

  if (firstMemberRules.length === 0) {
    return []
  }

  // Generate slots for first member
  let slots = generateTimeSlots(
    zonedDate,
    firstMember.availabilityRules,
    meeting,
    firstMember.bookings,
    timezone,
    2,
    firstMember.busyTimes
  )

  // Filter slots by other required members' availability
  for (let i = 1; i < requiredMembers.length; i++) {
    const member = requiredMembers[i]
    const memberRules = member.availabilityRules.filter(r => r.day_of_week === dayOfWeek)

    if (memberRules.length === 0) {
      return []
    }

    const memberSlots = generateTimeSlots(
      zonedDate,
      member.availabilityRules,
      meeting,
      member.bookings,
      timezone,
      2,
      member.busyTimes
    )

    const memberAvailableStarts = new Set(
      memberSlots
        .filter(s => s.available)
        .map(s => s.start.getTime())
    )

    slots = slots.map(slot => ({
      ...slot,
      available: slot.available && memberAvailableStarts.has(slot.start.getTime()),
    }))
  }

  return slots
}

/**
 * Get available dates for multi-person booking
 *
 * OPTIMIZED: Uses batched queries
 */
export async function getIntersectionAvailableDates(
  memberIds: string[],
  requiredMemberIds: string[],
  timezone: string,
  daysAhead: number = 60
): Promise<Date[]> {
  const supabase = createAdminClient()
  const dates: Date[] = []
  const now = new Date()
  const today = startOfDay(toZonedTime(now, timezone))
  const todayStr = format(today, 'yyyy-MM-dd')

  const requiredMembers = memberIds.filter(id => requiredMemberIds.includes(id))

  if (requiredMembers.length === 0) {
    return []
  }

  // OPTIMIZATION: Batch queries
  const [availabilityData, blackoutsData] = await Promise.all([
    supabase
      .from('availability')
      .select('provider_id, day_of_week')
      .in('provider_id', requiredMembers)
      .eq('is_active', true),

    supabase
      .from('blackout_dates')
      .select('provider_id, start_date, end_date')
      .in('provider_id', requiredMembers)
      .gte('end_date', todayStr),
  ])

  // Group by provider
  const membersData = requiredMembers.map(providerId => ({
    providerId,
    availableDays: new Set(
      (availabilityData.data || [])
        .filter((r: { provider_id: string }) => r.provider_id === providerId)
        .map((r: { day_of_week: number }) => r.day_of_week)
    ),
    blackoutDates: (blackoutsData.data || [])
      .filter((b: { provider_id: string }) => b.provider_id === providerId),
  }))

  // Find intersection of available days
  let intersectionDays: Set<number> = new Set()
  for (let i = 0; i < membersData.length; i++) {
    const member = membersData[i]
    if (i === 0) {
      intersectionDays = new Set(member.availableDays)
    } else {
      const currentDays = Array.from(intersectionDays)
      intersectionDays = new Set(
        currentDays.filter(day => member.availableDays.has(day))
      )
    }
  }

  if (intersectionDays.size === 0) {
    return []
  }

  // Generate dates
  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dayOfWeek = getDay(date)
    const dateStr = format(date, 'yyyy-MM-dd')

    if (!intersectionDays.has(dayOfWeek)) {
      continue
    }

    const hasBlackout = membersData.some(member =>
      member.blackoutDates.some(
        (b: { start_date: string; end_date: string }) =>
          dateStr >= b.start_date && dateStr <= b.end_date
      )
    )

    if (!hasBlackout) {
      dates.push(date)
    }
  }

  return dates
}
