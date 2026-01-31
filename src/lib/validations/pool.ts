import { z } from 'zod'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const createPoolSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500).optional().nullable(),
  pool_type: z.enum(['round_robin', 'load_balanced', 'priority']).default('round_robin'),
})

export const updatePoolSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  pool_type: z.enum(['round_robin', 'load_balanced', 'priority']).optional(),
  is_active: z.boolean().optional(),
})

export const addPoolMemberSchema = z.object({
  provider_email: z.string().email('Invalid email format'),
  priority: z.number().int().min(0).default(0),
  max_bookings_per_day: z.number().int().positive().optional().nullable(),
})

export const updatePoolMemberSchema = z.object({
  priority: z.number().int().min(0).optional(),
  max_bookings_per_day: z.number().int().positive().optional().nullable(),
  is_active: z.boolean().optional(),
})

export const poolIdSchema = z.string().regex(uuidRegex, 'Invalid pool ID')
export const memberIdSchema = z.string().regex(uuidRegex, 'Invalid member ID')

export type CreatePoolInput = z.infer<typeof createPoolSchema>
export type UpdatePoolInput = z.infer<typeof updatePoolSchema>
export type AddPoolMemberInput = z.infer<typeof addPoolMemberSchema>
export type UpdatePoolMemberInput = z.infer<typeof updatePoolMemberSchema>
