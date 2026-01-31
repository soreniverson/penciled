import { z } from 'zod'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const createFollowUpTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  type: z.enum(['email', 'feedback_request']),
  delay_minutes: z.number().int().min(0).default(60),
  subject: z.string().max(200).optional().nullable(),
  content: z.object({
    body: z.string().optional(),
    // For feedback requests
    questions: z.array(z.string()).optional(),
  }),
  apply_to_meetings: z.array(z.string().regex(uuidRegex)).optional().nullable(),
})

export const updateFollowUpTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['email', 'feedback_request']).optional(),
  delay_minutes: z.number().int().min(0).optional(),
  subject: z.string().max(200).optional().nullable(),
  content: z.object({
    body: z.string().optional(),
    questions: z.array(z.string()).optional(),
  }).optional(),
  apply_to_meetings: z.array(z.string().regex(uuidRegex)).optional().nullable(),
  is_active: z.boolean().optional(),
})

export const followUpTemplateIdSchema = z.string().regex(uuidRegex, 'Invalid template ID')

export type CreateFollowUpTemplateInput = z.infer<typeof createFollowUpTemplateSchema>
export type UpdateFollowUpTemplateInput = z.infer<typeof updateFollowUpTemplateSchema>
