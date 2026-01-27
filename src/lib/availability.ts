import {
  addMinutes,
  format,
  parse,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  getDay,
  addDays,
} from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { Availability, Booking, Service } from '@/types/database'

export type TimeSlot = {
  start: Date
  end: Date
  available: boolean
}

type AvailabilityRule = Pick<Availability, 'day_of_week' | 'start_time' | 'end_time'>

type BlackoutDateRange = {
  start_date: string
  end_date: string
}

export function getAvailableDates(
  availability: AvailabilityRule[],
  timezone: string,
  daysAhead: number = 60,
  blackoutDates: BlackoutDateRange[] = []
): Date[] {
  const dates: Date[] = []
  const now = new Date()
  const today = startOfDay(toZonedTime(now, timezone))

  // Get unique days that have availability
  const availableDays = new Set(availability.map(a => a.day_of_week))

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(today, i)
    const dayOfWeek = getDay(date)

    if (!availableDays.has(dayOfWeek)) {
      continue
    }

    // Check if date falls within any blackout period
    const dateStr = format(date, 'yyyy-MM-dd')
    const isBlackedOut = blackoutDates.some(blackout => {
      return dateStr >= blackout.start_date && dateStr <= blackout.end_date
    })

    if (!isBlackedOut) {
      dates.push(date)
    }
  }

  return dates
}

export function generateTimeSlots(
  date: Date,
  availability: AvailabilityRule[],
  service: Pick<Service, 'duration_minutes' | 'buffer_minutes'>,
  existingBookings: Pick<Booking, 'start_time' | 'end_time'>[],
  timezone: string,
  minimumNoticeHours: number = 2,
  externalBusyTimes: { start: Date; end: Date }[] = []
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const dayOfWeek = getDay(date)

  // Get availability rules for this day
  const dayRules = availability.filter(a => a.day_of_week === dayOfWeek)
  if (dayRules.length === 0) return slots

  const now = new Date()
  const minimumStartTime = addMinutes(now, minimumNoticeHours * 60)

  for (const rule of dayRules) {
    // Parse start and end times for this day (handle both HH:mm and HH:mm:ss formats)
    const startTimeStr = rule.start_time.slice(0, 5)
    const endTimeStr = rule.end_time.slice(0, 5)
    const dayStart = parse(startTimeStr, 'HH:mm', date)
    const dayEnd = parse(endTimeStr, 'HH:mm', date)

    // Generate slots at service duration intervals
    let slotStart = dayStart
    while (isBefore(addMinutes(slotStart, service.duration_minutes), dayEnd) ||
           format(addMinutes(slotStart, service.duration_minutes), 'HH:mm') === format(dayEnd, 'HH:mm')) {
      const slotEnd = addMinutes(slotStart, service.duration_minutes)

      // Convert to UTC for comparison
      const slotStartUTC = fromZonedTime(slotStart, timezone)
      const slotEndUTC = fromZonedTime(slotEnd, timezone)

      // Check if slot is in the past or too soon
      const isPast = isBefore(slotStartUTC, minimumStartTime)

      // Check if slot conflicts with existing bookings (including buffer)
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = new Date(booking.start_time)
        const bookingEnd = new Date(booking.end_time)

        // Add buffer time around existing bookings
        const bufferedStart = addMinutes(bookingStart, -service.buffer_minutes)
        const bufferedEnd = addMinutes(bookingEnd, service.buffer_minutes)

        // Check for overlap
        return (
          (isAfter(slotStartUTC, bufferedStart) && isBefore(slotStartUTC, bufferedEnd)) ||
          (isAfter(slotEndUTC, bufferedStart) && isBefore(slotEndUTC, bufferedEnd)) ||
          (isBefore(slotStartUTC, bufferedStart) && isAfter(slotEndUTC, bufferedEnd)) ||
          format(slotStartUTC, "yyyy-MM-dd'T'HH:mm") === format(bufferedStart, "yyyy-MM-dd'T'HH:mm")
        )
      })

      // Check if slot conflicts with external busy times (e.g., Google Calendar)
      const hasExternalConflict = externalBusyTimes.some(busy => {
        const busyStart = new Date(busy.start)
        const busyEnd = new Date(busy.end)

        // Check for overlap with external busy time
        return (
          (isAfter(slotStartUTC, busyStart) && isBefore(slotStartUTC, busyEnd)) ||
          (isAfter(slotEndUTC, busyStart) && isBefore(slotEndUTC, busyEnd)) ||
          (isBefore(slotStartUTC, busyStart) && isAfter(slotEndUTC, busyEnd)) ||
          format(slotStartUTC, "yyyy-MM-dd'T'HH:mm") === format(busyStart, "yyyy-MM-dd'T'HH:mm") ||
          format(slotEndUTC, "yyyy-MM-dd'T'HH:mm") === format(busyEnd, "yyyy-MM-dd'T'HH:mm")
        )
      })

      slots.push({
        start: slotStart,
        end: slotEnd,
        available: !isPast && !hasConflict && !hasExternalConflict,
      })

      slotStart = addMinutes(slotStart, service.duration_minutes)
    }
  }

  return slots
}

export function formatTimeSlot(slot: TimeSlot, timezone: string): string {
  return format(slot.start, 'h:mm a')
}

export function getBookingsForDateRange(
  bookings: Pick<Booking, 'start_time' | 'end_time' | 'status'>[],
  startDate: Date,
  endDate: Date
): Pick<Booking, 'start_time' | 'end_time'>[] {
  return bookings.filter(booking => {
    if (booking.status === 'cancelled') return false

    const bookingStart = new Date(booking.start_time)
    return isAfter(bookingStart, startDate) && isBefore(bookingStart, endDate)
  })
}
