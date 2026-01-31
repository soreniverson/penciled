import { z } from 'zod'

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Delegate permissions schema
export const delegatePermissionsSchema = z.object({
  view: z.boolean().default(true),
  book: z.boolean().default(false),
  reschedule: z.boolean().default(false),
  cancel: z.boolean().default(false),
  override_availability: z.boolean().default(false),
  override_conflicts: z.boolean().default(false),
})

// Create delegate validation schema
export const createDelegateSchema = z.object({
  delegate_email: z.string().email('Invalid email format'),
  permissions: delegatePermissionsSchema.optional(),
  expires_at: z.string().datetime().optional().nullable(),
})

// Update delegate validation schema
export const updateDelegateSchema = z.object({
  permissions: delegatePermissionsSchema.optional(),
  expires_at: z.string().datetime().optional().nullable(),
})

// Delegate ID parameter validation
export const delegateIdSchema = z.string().regex(uuidRegex, 'Invalid delegate ID')

// Type exports
export type DelegatePermissions = z.infer<typeof delegatePermissionsSchema>
export type CreateDelegateInput = z.infer<typeof createDelegateSchema>
export type UpdateDelegateInput = z.infer<typeof updateDelegateSchema>
