import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from './route'
import { createBookingSchema } from '@/lib/validations'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          neq: vi.fn(() => ({
            lt: vi.fn(() => ({
              gt: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-id', management_token: 'test-token' },
            error: null,
          })),
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/email', () => ({
  sendBookingConfirmationToClient: vi.fn(() => Promise.resolve()),
  sendBookingNotificationToProvider: vi.fn(() => Promise.resolve()),
  sendBookingRequestToClient: vi.fn(() => Promise.resolve()),
  sendBookingRequestToProvider: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/google-calendar', () => ({
  createCalendarEvent: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/error-logger', () => ({
  logApiError: vi.fn(() => Promise.resolve()),
}))

describe('POST /api/bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validation', () => {
    it('should reject empty request body', async () => {
      const request = new Request('http://localhost/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should reject invalid email format', async () => {
      const request = new Request('http://localhost/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: '123e4567-e89b-12d3-a456-426614174000',
          meeting_id: '123e4567-e89b-12d3-a456-426614174001',
          client_name: 'Test Client',
          client_email: 'invalid-email',
          start_time: '2024-01-15T10:00:00Z',
          end_time: '2024-01-15T11:00:00Z',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should reject invalid UUID for provider_id', async () => {
      const request = new Request('http://localhost/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: 'not-a-uuid',
          meeting_id: '123e4567-e89b-12d3-a456-426614174001',
          client_name: 'Test Client',
          client_email: 'test@example.com',
          start_time: '2024-01-15T10:00:00Z',
          end_time: '2024-01-15T11:00:00Z',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should reject when end_time is before start_time', async () => {
      const request = new Request('http://localhost/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: '123e4567-e89b-12d3-a456-426614174000',
          meeting_id: '123e4567-e89b-12d3-a456-426614174001',
          client_name: 'Test Client',
          client_email: 'test@example.com',
          start_time: '2024-01-15T11:00:00Z',
          end_time: '2024-01-15T10:00:00Z',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should validate datetime format', () => {
      // Test that the schema validates datetime format
      const invalidDateData = {
        provider_id: '123e4567-e89b-12d3-a456-426614174000',
        meeting_id: '123e4567-e89b-12d3-a456-426614174001',
        client_name: 'Test Client',
        client_email: 'test@example.com',
        start_time: 'not-a-date',
        end_time: 'also-not-a-date',
      }

      const result = createBookingSchema.safeParse(invalidDateData)
      expect(result.success).toBe(false)
    })

    it('should reject empty client name', async () => {
      const request = new Request('http://localhost/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: '123e4567-e89b-12d3-a456-426614174000',
          meeting_id: '123e4567-e89b-12d3-a456-426614174001',
          client_name: '',
          client_email: 'test@example.com',
          start_time: '2025-01-15T10:00:00Z',
          end_time: '2025-01-15T11:00:00Z',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should reject client name that is too long', async () => {
      const request = new Request('http://localhost/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: '123e4567-e89b-12d3-a456-426614174000',
          meeting_id: '123e4567-e89b-12d3-a456-426614174001',
          client_name: 'a'.repeat(101),
          client_email: 'test@example.com',
          start_time: '2025-01-15T10:00:00Z',
          end_time: '2025-01-15T11:00:00Z',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Schema validation', () => {
    it('should validate a correct booking request', () => {
      const validData = {
        provider_id: '123e4567-e89b-12d3-a456-426614174000',
        meeting_id: '123e4567-e89b-12d3-a456-426614174001',
        client_name: 'Test Client',
        client_email: 'test@example.com',
        start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_time: new Date(Date.now() + 90000000).toISOString(),
      }

      const result = createBookingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should allow optional fields', () => {
      const validData = {
        provider_id: '123e4567-e89b-12d3-a456-426614174000',
        meeting_id: '123e4567-e89b-12d3-a456-426614174001',
        client_name: 'Test Client',
        client_email: 'test@example.com',
        client_phone: '+1234567890',
        notes: 'Test notes',
        start_time: new Date(Date.now() + 86400000).toISOString(),
        end_time: new Date(Date.now() + 90000000).toISOString(),
      }

      const result = createBookingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})
