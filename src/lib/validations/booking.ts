import { z } from 'zod'

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Base booking fields (without refinement, for extension)
const baseBookingFields = {
  provider_id: z.string().regex(uuidRegex, 'Invalid provider ID'),
  meeting_id: z.string().regex(uuidRegex, 'Invalid meeting ID'),
  client_name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  client_email: z.string().email('Invalid email format'),
  client_phone: z.string().max(20).optional().nullable(),
  start_time: z.string().datetime({ message: 'Invalid start time format' }),
  end_time: z.string().datetime({ message: 'Invalid end time format' }),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
  booking_link_id: z.string().regex(uuidRegex, 'Invalid booking link ID').optional().nullable(),
}

const endTimeAfterStartTime = (data: { start_time: string; end_time: string }) =>
  new Date(data.end_time) > new Date(data.start_time)

// Create booking validation schema
export const createBookingSchema = z.object(baseBookingFields).refine(
  endTimeAfterStartTime,
  { message: 'End time must be after start time', path: ['end_time'] }
)

// Token action validation schema (for cancel/reschedule by client)
export const tokenActionSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  reason: z.string().max(500, 'Reason too long').optional().nullable(),
})

// Reschedule validation schema
export const rescheduleSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  start_time: z.string().datetime({ message: 'Invalid start time format' }),
  end_time: z.string().datetime({ message: 'Invalid end time format' }),
}).refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  { message: 'End time must be after start time', path: ['end_time'] }
)

// Provider action validation schema (for provider approve/decline/cancel/complete)
export const providerActionSchema = z.object({
  reason: z.string().max(500, 'Reason too long').optional().nullable(),
})

// Provider reschedule validation schema
export const providerRescheduleSchema = z.object({
  start_time: z.string().datetime({ message: 'Invalid start time format' }),
  end_time: z.string().datetime({ message: 'Invalid end time format' }),
  reason: z.string().max(500, 'Reason too long').optional().nullable(),
  // Override flags (require appropriate delegation permissions)
  override_availability: z.boolean().optional(),
  override_conflicts: z.boolean().optional(),
}).refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  { message: 'End time must be after start time', path: ['end_time'] }
)

// Override booking creation schema (extends base fields)
export const createBookingWithOverridesSchema = z.object({
  ...baseBookingFields,
  override_availability: z.boolean().optional(),
  override_conflicts: z.boolean().optional(),
  override_reason: z.string().max(500).optional().nullable(),
}).refine(
  endTimeAfterStartTime,
  { message: 'End time must be after start time', path: ['end_time'] }
)

// Booking ID parameter validation
export const bookingIdSchema = z.string().regex(uuidRegex, 'Invalid booking ID')

// Type exports
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type CreateBookingWithOverridesInput = z.infer<typeof createBookingWithOverridesSchema>
export type TokenActionInput = z.infer<typeof tokenActionSchema>
export type RescheduleInput = z.infer<typeof rescheduleSchema>
export type ProviderActionInput = z.infer<typeof providerActionSchema>
export type ProviderRescheduleInput = z.infer<typeof providerRescheduleSchema>
