import { describe, it, expect } from 'vitest'
import {
  createBookingSchema,
  tokenActionSchema,
  rescheduleSchema,
  providerActionSchema,
  bookingIdSchema,
} from './booking'

describe('booking validations', () => {
  describe('createBookingSchema', () => {
    const validBooking = {
      provider_id: '123e4567-e89b-12d3-a456-426614174000',
      meeting_id: '123e4567-e89b-12d3-a456-426614174001',
      client_name: 'John Doe',
      client_email: 'john@example.com',
      client_phone: '+1234567890',
      start_time: '2025-01-20T10:00:00.000Z',
      end_time: '2025-01-20T11:00:00.000Z',
      notes: 'Test booking',
    }

    it('validates a correct booking', () => {
      const result = createBookingSchema.safeParse(validBooking)
      expect(result.success).toBe(true)
    })

    it('rejects invalid email format', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        client_email: 'invalid-email',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('client_email')
      }
    })

    it('rejects invalid UUID for provider_id', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        provider_id: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('provider_id')
      }
    })

    it('rejects invalid UUID for meeting_id', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        meeting_id: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('meeting_id')
      }
    })

    it('rejects missing required fields', () => {
      const result = createBookingSchema.safeParse({
        provider_id: validBooking.provider_id,
        // Missing other required fields
      })
      expect(result.success).toBe(false)
    })

    it('rejects end_time before start_time', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        start_time: '2025-01-20T11:00:00.000Z',
        end_time: '2025-01-20T10:00:00.000Z',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('end_time')
      }
    })

    it('rejects empty client_name', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        client_name: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects client_name that is too long', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        client_name: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('rejects notes that are too long', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        notes: 'a'.repeat(1001),
      })
      expect(result.success).toBe(false)
    })

    it('allows optional fields to be null', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        client_phone: null,
        notes: null,
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid datetime format', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        start_time: 'not-a-date',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('tokenActionSchema', () => {
    it('validates correct token action', () => {
      const result = tokenActionSchema.safeParse({
        token: 'valid-token-123',
        reason: 'Need to cancel',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty token', () => {
      const result = tokenActionSchema.safeParse({
        token: '',
        reason: 'Need to cancel',
      })
      expect(result.success).toBe(false)
    })

    it('allows reason to be optional', () => {
      const result = tokenActionSchema.safeParse({
        token: 'valid-token-123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects reason that is too long', () => {
      const result = tokenActionSchema.safeParse({
        token: 'valid-token-123',
        reason: 'a'.repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('rescheduleSchema', () => {
    const validReschedule = {
      token: 'valid-token-123',
      start_time: '2025-01-20T10:00:00.000Z',
      end_time: '2025-01-20T11:00:00.000Z',
    }

    it('validates correct reschedule request', () => {
      const result = rescheduleSchema.safeParse(validReschedule)
      expect(result.success).toBe(true)
    })

    it('rejects missing token', () => {
      const result = rescheduleSchema.safeParse({
        start_time: validReschedule.start_time,
        end_time: validReschedule.end_time,
      })
      expect(result.success).toBe(false)
    })

    it('rejects end_time before start_time', () => {
      const result = rescheduleSchema.safeParse({
        ...validReschedule,
        start_time: '2025-01-20T11:00:00.000Z',
        end_time: '2025-01-20T10:00:00.000Z',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('providerActionSchema', () => {
    it('validates with reason', () => {
      const result = providerActionSchema.safeParse({
        reason: 'Schedule conflict',
      })
      expect(result.success).toBe(true)
    })

    it('validates without reason', () => {
      const result = providerActionSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('rejects reason that is too long', () => {
      const result = providerActionSchema.safeParse({
        reason: 'a'.repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('bookingIdSchema', () => {
    it('validates correct UUID', () => {
      const result = bookingIdSchema.safeParse('123e4567-e89b-12d3-a456-426614174000')
      expect(result.success).toBe(true)
    })

    it('rejects invalid UUID', () => {
      const result = bookingIdSchema.safeParse('not-a-uuid')
      expect(result.success).toBe(false)
    })

    it('rejects empty string', () => {
      const result = bookingIdSchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('rejects UUID-like string with invalid version', () => {
      const result = bookingIdSchema.safeParse('123e4567-e89b-62d3-a456-426614174000')
      expect(result.success).toBe(false)
    })
  })
})
