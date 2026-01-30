import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAvailableDates,
  generateTimeSlots,
  formatTimeSlot,
  getBookingsForDateRange,
} from './availability'
import { addDays, setHours, setMinutes, startOfDay } from 'date-fns'

describe('availability', () => {
  beforeEach(() => {
    // Mock the current date for consistent testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-20T10:00:00Z')) // Monday
  })

  describe('getAvailableDates', () => {
    it('returns dates that match availability rules', () => {
      const availability = [
        { day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00' }, // Monday
        { day_of_week: 3, start_time: '09:00:00', end_time: '17:00:00' }, // Wednesday
      ]

      const dates = getAvailableDates(availability, 'America/New_York', 14)

      // Should include Mondays and Wednesdays within 14 days
      expect(dates.length).toBeGreaterThan(0)
      dates.forEach(date => {
        const dayOfWeek = date.getDay()
        expect([1, 3]).toContain(dayOfWeek)
      })
    })

    it('returns empty array when no availability rules', () => {
      const dates = getAvailableDates([], 'America/New_York', 14)
      expect(dates).toHaveLength(0)
    })

    it('respects daysAhead parameter', () => {
      const availability = [
        { day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00' }, // Every day
        { day_of_week: 2, start_time: '09:00:00', end_time: '17:00:00' },
        { day_of_week: 3, start_time: '09:00:00', end_time: '17:00:00' },
        { day_of_week: 4, start_time: '09:00:00', end_time: '17:00:00' },
        { day_of_week: 5, start_time: '09:00:00', end_time: '17:00:00' },
      ]

      const dates7 = getAvailableDates(availability, 'America/New_York', 7)
      const dates14 = getAvailableDates(availability, 'America/New_York', 14)

      expect(dates14.length).toBeGreaterThanOrEqual(dates7.length)
    })
  })

  describe('generateTimeSlots', () => {
    const timezone = 'America/New_York'
    const service = { duration_minutes: 60, buffer_minutes: 15 }

    it('generates slots within availability window', () => {
      const availability = [
        { day_of_week: 1, start_time: '09:00', end_time: '12:00' },
      ]
      // Use a Monday in the future
      const date = new Date('2025-01-27T12:00:00Z')

      const slots = generateTimeSlots(
        date,
        availability,
        service,
        [],
        timezone,
        0 // No minimum notice for testing
      )

      expect(slots.length).toBeGreaterThan(0)
      // Should have 3 slots: 9-10, 10-11, 11-12
      expect(slots.length).toBe(3)
    })

    it('marks slots as unavailable when conflicting with existing bookings', () => {
      const availability = [
        { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
      ]
      const date = new Date('2025-01-27T12:00:00Z')

      const existingBookings = [
        {
          start_time: '2025-01-27T15:00:00Z', // 10:00 AM EST
          end_time: '2025-01-27T16:00:00Z',   // 11:00 AM EST
        },
      ]

      const slots = generateTimeSlots(
        date,
        availability,
        service,
        existingBookings,
        timezone,
        0
      )

      // Slots overlapping with the booking should be unavailable
      const unavailableSlots = slots.filter(s => !s.available)
      expect(unavailableSlots.length).toBeGreaterThan(0)
    })

    it('returns empty array for days without availability', () => {
      const availability = [
        { day_of_week: 1, start_time: '09:00', end_time: '17:00' }, // Monday only
      ]
      // Use a Tuesday
      const date = new Date('2025-01-28T12:00:00Z')

      const slots = generateTimeSlots(
        date,
        availability,
        service,
        [],
        timezone,
        0
      )

      expect(slots).toHaveLength(0)
    })

    it('respects minimum notice hours', () => {
      const availability = [
        { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
      ]
      // Current time is mocked to 10:00 AM UTC
      // For a date today, slots before 10:00 + notice should be unavailable
      const today = new Date('2025-01-20T12:00:00Z')

      const slots = generateTimeSlots(
        today,
        availability,
        service,
        [],
        'UTC',
        2 // 2 hours notice
      )

      // All slots should be marked based on whether they're past the notice window
      const pastSlots = slots.filter(s => s.start < new Date())
      pastSlots.forEach(slot => {
        expect(slot.available).toBe(false)
      })
    })
  })

  describe('formatTimeSlot', () => {
    it('formats time slot correctly', () => {
      const slot = {
        start: new Date('2025-01-20T14:00:00Z'),
        end: new Date('2025-01-20T15:00:00Z'),
        available: true,
      }

      const formatted = formatTimeSlot(slot, 'UTC')
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i)
    })
  })

  describe('getBookingsForDateRange', () => {
    it('filters bookings within date range', () => {
      const bookings = [
        { start_time: '2025-01-20T10:00:00Z', end_time: '2025-01-20T11:00:00Z', status: 'confirmed' as const },
        { start_time: '2025-01-21T10:00:00Z', end_time: '2025-01-21T11:00:00Z', status: 'confirmed' as const },
        { start_time: '2025-01-25T10:00:00Z', end_time: '2025-01-25T11:00:00Z', status: 'confirmed' as const },
      ]

      const startDate = new Date('2025-01-19T00:00:00Z')
      const endDate = new Date('2025-01-22T00:00:00Z')

      const result = getBookingsForDateRange(bookings, startDate, endDate)

      expect(result).toHaveLength(2)
    })

    it('excludes cancelled bookings', () => {
      const bookings = [
        { start_time: '2025-01-20T10:00:00Z', end_time: '2025-01-20T11:00:00Z', status: 'confirmed' as const },
        { start_time: '2025-01-21T10:00:00Z', end_time: '2025-01-21T11:00:00Z', status: 'cancelled' as const },
      ]

      const startDate = new Date('2025-01-19T00:00:00Z')
      const endDate = new Date('2025-01-22T00:00:00Z')

      const result = getBookingsForDateRange(bookings, startDate, endDate)

      // Only the confirmed booking should be returned
      expect(result).toHaveLength(1)
      expect(result[0].start_time).toBe('2025-01-20T10:00:00Z')
    })
  })
})
