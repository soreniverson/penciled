import { createUntypedAdminClient } from '@/lib/supabase/admin'
import { getCalendarBusyTimes } from '@/lib/google-calendar'
import { generateTimeSlots, type TimeSlot } from '@/lib/availability'
import { startOfDay, endOfDay, format, getDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import type { Availability, Service, Booking } from '@/types/database'

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
 */
export async function getIntersectionAvailability(
  memberIds: string[],
  requiredMemberIds: string[],
  date: Date,
  service: Pick<Service, 'duration_minutes' | 'buffer_minutes'>,
  timezone: string
): Promise<TimeSlot[]> {
  const supabase = createUntypedAdminClient()
  const zonedDate = toZonedTime(date, timezone)
  const dayStart = startOfDay(zonedDate)
  const dayEnd = endOfDay(zonedDate)
  const dateStr = format(zonedDate, 'yyyy-MM-dd')
  const dayOfWeek = getDay(zonedDate)

  // Fetch data for all members in parallel
  const memberDataPromises = memberIds.map(async (providerId): Promise<MemberAvailability> => {
    const isRequired = requiredMemberIds.includes(providerId)

    // Fetch availability rules
    const { data: availabilityRules } = await supabase
      .from('availability')
      .select('day_of_week, start_time, end_time')
      .eq('provider_id', providerId)
      .eq('is_active', true)

    // Fetch existing bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('provider_id', providerId)
      .neq('status', 'cancelled')
      .gte('start_time', dayStart.toISOString())
      .lte('start_time', dayEnd.toISOString())

    // Fetch blackout dates
    const { data: blackouts } = await supabase
      .from('blackout_dates')
      .select('start_date, end_date')
      .eq('provider_id', providerId)
      .lte('start_date', dateStr)
      .gte('end_date', dateStr)

    // Fetch Google Calendar busy times
    let busyTimes: { start: Date; end: Date }[] = []
    const { data: provider } = await supabase
      .from('providers')
      .select('google_calendar_token')
      .eq('id', providerId)
      .single()

    if (provider?.google_calendar_token) {
      busyTimes = await getCalendarBusyTimes(providerId, dayStart, dayEnd)
    }

    return {
      providerId,
      isRequired,
      availabilityRules: availabilityRules || [],
      bookings: (bookings || []) as Pick<Booking, 'start_time' | 'end_time'>[],
      busyTimes,
      blackoutDates: blackouts || [],
    }
  })

  const membersData = await Promise.all(memberDataPromises)

  // Check if any required member is blacked out on this day
  for (const member of membersData) {
    if (member.isRequired && member.blackoutDates.length > 0) {
      // Required member has blackout on this day - no slots available
      return []
    }
  }

  // Find intersection of availability rules for this day
  // Start with all possible slots from the first member, then filter by others
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
    service,
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
      // This required member has no availability on this day
      return []
    }

    // Generate this member's slots
    const memberSlots = generateTimeSlots(
      zonedDate,
      member.availabilityRules,
      service,
      member.bookings,
      timezone,
      2,
      member.busyTimes
    )

    // Create a set of available slot start times for quick lookup
    const memberAvailableStarts = new Set(
      memberSlots
        .filter(s => s.available)
        .map(s => s.start.getTime())
    )

    // Filter current slots to only those where this member is also available
    slots = slots.map(slot => ({
      ...slot,
      available: slot.available && memberAvailableStarts.has(slot.start.getTime()),
    }))
  }

  return slots
}

/**
 * Get available dates for multi-person booking (intersection of all members' schedules)
 */
export async function getIntersectionAvailableDates(
  memberIds: string[],
  requiredMemberIds: string[],
  timezone: string,
  daysAhead: number = 60
): Promise<Date[]> {
  const supabase = createUntypedAdminClient()
  const dates: Date[] = []
  const now = new Date()
  const today = startOfDay(toZonedTime(now, timezone))

  // Fetch availability rules and blackout dates for all required members
  const requiredMembers = memberIds.filter(id => requiredMemberIds.includes(id))

  if (requiredMembers.length === 0) {
    return []
  }

  const memberDataPromises = requiredMembers.map(async (providerId) => {
    const { data: availabilityRules } = await supabase
      .from('availability')
      .select('day_of_week')
      .eq('provider_id', providerId)
      .eq('is_active', true)

    const { data: blackouts } = await supabase
      .from('blackout_dates')
      .select('start_date, end_date')
      .eq('provider_id', providerId)

    return {
      providerId,
      availableDays: new Set((availabilityRules || []).map(r => r.day_of_week)),
      blackoutDates: blackouts || [],
    }
  })

  const membersData = await Promise.all(memberDataPromises)

  // Find intersection of available days
  let intersectionDays: Set<number> = new Set()
  for (let i = 0; i < membersData.length; i++) {
    const member = membersData[i]
    if (i === 0) {
      intersectionDays = new Set(member.availableDays)
    } else {
      // Keep only days that are in both sets
      const currentDays = Array.from(intersectionDays)
      intersectionDays = new Set(
        currentDays.filter(day => member.availableDays.has(day))
      )
    }
  }

  if (intersectionDays.size === 0) {
    return []
  }

  // Generate dates for the next daysAhead days
  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dayOfWeek = getDay(date)
    const dateStr = format(date, 'yyyy-MM-dd')

    // Check if this day of week is available for all members
    if (!intersectionDays.has(dayOfWeek)) {
      continue
    }

    // Check if any member has a blackout on this date
    const hasBlackout = membersData.some(member =>
      member.blackoutDates.some(
        b => dateStr >= b.start_date && dateStr <= b.end_date
      )
    )

    if (!hasBlackout) {
      dates.push(date)
    }
  }

  return dates
}
