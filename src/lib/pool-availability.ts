import { createAdminClient } from '@/lib/supabase/admin'
import { generateTimeSlots, type TimeSlot } from '@/lib/availability'
import { startOfDay, endOfDay, format, getDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import type { Meeting } from '@/types/database'
import {
  getBookingsForProviders,
  getCalendarBusyTimesForProviders,
} from '@/lib/data'

// Type definitions for Supabase query results
type PoolMember = { provider_id: string; priority: number }
type PoolMemberSimple = { provider_id: string }
type AvailabilityRule = { provider_id: string; day_of_week: number; start_time: string; end_time: string }
type BlackoutDate = { provider_id: string; start_date: string; end_date: string }
type ProviderWithCalendar = { id: string; google_calendar_token: unknown }
type PoolMemberWithMax = { provider_id: string; priority: number; max_bookings_per_day: number | null }
type BookingConflict = { provider_id: string }
type BookingAssignmentWithBooking = { provider_id: string; assigned_at: string; bookings: { start_time: string } }

/**
 * Get union availability for a resource pool
 * Returns slots where ANY member of the pool is available
 * This is the opposite of intersection - any one member free = slot available
 */
export async function getPoolUnionAvailability(
  poolId: string,
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

  // Get pool members
  const { data: poolMembers } = await supabase
    .from('resource_pool_members')
    .select('provider_id, priority')
    .eq('pool_id', poolId)
    .eq('is_active', true) as { data: PoolMember[] | null }

  if (!poolMembers || poolMembers.length === 0) {
    return []
  }

  const memberIds = poolMembers.map(m => m.provider_id)

  // Batch fetch all required data
  const [
    availabilityData,
    blackoutsData,
    providersData,
    bookingsByProvider,
  ] = await Promise.all([
    supabase
      .from('availability')
      .select('provider_id, day_of_week, start_time, end_time')
      .in('provider_id', memberIds)
      .eq('is_active', true) as unknown as { data: AvailabilityRule[] | null },

    supabase
      .from('blackout_dates')
      .select('provider_id, start_date, end_date')
      .in('provider_id', memberIds)
      .lte('start_date', dateStr)
      .gte('end_date', dateStr) as unknown as { data: BlackoutDate[] | null },

    supabase
      .from('providers')
      .select('id, google_calendar_token')
      .in('id', memberIds) as unknown as { data: ProviderWithCalendar[] | null },

    getBookingsForProviders(memberIds, dayStart, dayEnd),
  ])

  // Get calendar busy times
  const membersWithCalendar = (providersData.data || [])
    .filter(p => p.google_calendar_token)
    .map(p => p.id)

  const busyTimesByProvider = membersWithCalendar.length > 0
    ? await getCalendarBusyTimesForProviders(membersWithCalendar, dayStart, dayEnd)
    : new Map<string, { start: Date; end: Date }[]>()

  // Build blackout set for quick lookup
  const blackedOutMembers = new Set(
    (blackoutsData.data || []).map(b => b.provider_id)
  )

  // Generate slots for each available member
  const memberSlots = new Map<string, Map<number, boolean>>()

  for (const member of poolMembers) {
    // Skip if member is blacked out
    if (blackedOutMembers.has(member.provider_id)) continue

    const availabilityRules = (availabilityData.data || [])
      .filter(r => r.provider_id === member.provider_id)
      .map(r => ({
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
      }))

    const memberRules = availabilityRules.filter(r => r.day_of_week === dayOfWeek)
    if (memberRules.length === 0) continue

    const bookings = bookingsByProvider.get(member.provider_id) || []
    const busyTimes = busyTimesByProvider.get(member.provider_id) || []

    const slots = generateTimeSlots(
      zonedDate,
      availabilityRules,
      meeting,
      bookings,
      timezone,
      2,
      busyTimes
    )

    const slotMap = new Map<number, boolean>()
    for (const slot of slots) {
      slotMap.set(slot.start.getTime(), slot.available)
    }
    memberSlots.set(member.provider_id, slotMap)
  }

  // Get all unique time slots
  const allStartTimes = new Set<number>()
  for (const slots of memberSlots.values()) {
    for (const startTime of slots.keys()) {
      allStartTimes.add(startTime)
    }
  }

  // For union availability: slot is available if ANY member is available
  const resultSlots: TimeSlot[] = []

  for (const startTime of Array.from(allStartTimes).sort((a, b) => a - b)) {
    let anyAvailable = false

    for (const slots of memberSlots.values()) {
      if (slots.get(startTime) === true) {
        anyAvailable = true
        break
      }
    }

    const start = new Date(startTime)
    const end = new Date(startTime + meeting.duration_minutes * 60 * 1000)

    resultSlots.push({ start, end, available: anyAvailable })
  }

  return resultSlots
}

/**
 * Get available dates for a resource pool
 * A date is available if ANY pool member is available on that day
 */
export async function getPoolAvailableDates(
  poolId: string,
  timezone: string,
  daysAhead: number = 60
): Promise<Date[]> {
  const supabase = createAdminClient()
  const dates: Date[] = []
  const now = new Date()
  const today = startOfDay(toZonedTime(now, timezone))
  const todayStr = format(today, 'yyyy-MM-dd')

  // Get pool members
  const { data: poolMembers } = await supabase
    .from('resource_pool_members')
    .select('provider_id')
    .eq('pool_id', poolId)
    .eq('is_active', true) as { data: PoolMemberSimple[] | null }

  if (!poolMembers || poolMembers.length === 0) {
    return []
  }

  const memberIds = poolMembers.map(m => m.provider_id)

  // Batch fetch availability and blackouts
  const [availabilityData, blackoutsData] = await Promise.all([
    supabase
      .from('availability')
      .select('provider_id, day_of_week')
      .in('provider_id', memberIds)
      .eq('is_active', true) as unknown as { data: { provider_id: string; day_of_week: number }[] | null },

    supabase
      .from('blackout_dates')
      .select('provider_id, start_date, end_date')
      .in('provider_id', memberIds)
      .gte('end_date', todayStr) as unknown as { data: BlackoutDate[] | null },
  ])

  // Group data by provider
  const memberAvailableDays = new Map<string, Set<number>>()
  const memberBlackouts = new Map<string, { start_date: string; end_date: string }[]>()

  for (const memberId of memberIds) {
    const days = new Set(
      (availabilityData.data || [])
        .filter(r => r.provider_id === memberId)
        .map(r => r.day_of_week)
    )
    memberAvailableDays.set(memberId, days)

    const blackouts = (blackoutsData.data || [])
      .filter(b => b.provider_id === memberId)
    memberBlackouts.set(memberId, blackouts)
  }

  // Union of available days (any member available = day available)
  const unionDays = new Set<number>()
  for (const days of memberAvailableDays.values()) {
    for (const day of days) {
      unionDays.add(day)
    }
  }

  // Generate dates
  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dayOfWeek = getDay(date)
    const dateStr = format(date, 'yyyy-MM-dd')

    if (!unionDays.has(dayOfWeek)) {
      continue
    }

    // Check if at least one member is not blacked out
    let anyMemberAvailable = false
    for (const memberId of memberIds) {
      const blackouts = memberBlackouts.get(memberId) || []
      const isBlackedOut = blackouts.some(
        b => dateStr >= b.start_date && dateStr <= b.end_date
      )

      if (!isBlackedOut && memberAvailableDays.get(memberId)?.has(dayOfWeek)) {
        anyMemberAvailable = true
        break
      }
    }

    if (anyMemberAvailable) {
      dates.push(date)
    }
  }

  return dates
}

/**
 * Select a member from a pool for a booking based on pool type
 */
export async function selectPoolMember(
  poolId: string,
  poolType: 'round_robin' | 'load_balanced' | 'priority',
  startTime: Date,
  endTime: Date
): Promise<string | null> {
  const supabase = createAdminClient()

  // Get pool members with their stats
  const { data: members } = await supabase
    .from('resource_pool_members')
    .select('provider_id, priority, max_bookings_per_day')
    .eq('pool_id', poolId)
    .eq('is_active', true)
    .order('priority', { ascending: false }) as { data: PoolMemberWithMax[] | null }

  if (!members || members.length === 0) {
    return null
  }

  const memberIds = members.map(m => m.provider_id)

  // Check which members are available for this time slot
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('provider_id')
    .in('provider_id', memberIds)
    .neq('status', 'cancelled')
    .lt('start_time', endTime.toISOString())
    .gt('end_time', startTime.toISOString()) as { data: BookingConflict[] | null }

  const busyMemberIds = new Set(conflicts?.map(c => c.provider_id) || [])
  const availableMembers = members.filter(m => !busyMemberIds.has(m.provider_id))

  if (availableMembers.length === 0) {
    return null
  }

  // Select based on pool type
  if (poolType === 'priority') {
    // Return highest priority available member
    return availableMembers[0].provider_id
  }

  // For round_robin and load_balanced, get booking stats
  const dayStart = new Date(startTime)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(startTime)
  dayEnd.setHours(23, 59, 59, 999)

  const weekStart = new Date(startTime)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const { data: recentBookings } = await supabase
    .from('booking_assignments')
    .select('provider_id, assigned_at, bookings!inner(start_time)')
    .in('provider_id', availableMembers.map(m => m.provider_id))
    .gte('bookings.start_time', weekStart.toISOString()) as { data: BookingAssignmentWithBooking[] | null }

  const memberStats = new Map<string, {
    bookingsToday: number
    bookingsThisWeek: number
    lastAssignedAt: Date | null
    maxPerDay: number | null
  }>()

  for (const member of availableMembers) {
    const memberBookings = recentBookings?.filter(b => b.provider_id === member.provider_id) || []
    const todayBookings = memberBookings.filter(b => {
      const bookingDate = new Date(b.bookings.start_time)
      return bookingDate >= dayStart && bookingDate <= dayEnd
    })

    const lastAssignment = memberBookings
      .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())[0]

    // Check daily limit
    if (member.max_bookings_per_day !== null && todayBookings.length >= member.max_bookings_per_day) {
      continue // Skip this member - at daily limit
    }

    memberStats.set(member.provider_id, {
      bookingsToday: todayBookings.length,
      bookingsThisWeek: memberBookings.length,
      lastAssignedAt: lastAssignment ? new Date(lastAssignment.assigned_at) : null,
      maxPerDay: member.max_bookings_per_day,
    })
  }

  const eligibleMembers = availableMembers.filter(m => memberStats.has(m.provider_id))
  if (eligibleMembers.length === 0) {
    return null
  }

  if (poolType === 'round_robin') {
    // Select member who was assigned least recently
    eligibleMembers.sort((a, b) => {
      const aStats = memberStats.get(a.provider_id)
      const bStats = memberStats.get(b.provider_id)
      const aTime = aStats?.lastAssignedAt?.getTime() || 0
      const bTime = bStats?.lastAssignedAt?.getTime() || 0
      return aTime - bTime
    })
  } else {
    // load_balanced: select member with fewest bookings this week
    eligibleMembers.sort((a, b) => {
      const aStats = memberStats.get(a.provider_id)
      const bStats = memberStats.get(b.provider_id)
      return (aStats?.bookingsThisWeek || 0) - (bStats?.bookingsThisWeek || 0)
    })
  }

  return eligibleMembers[0].provider_id
}
