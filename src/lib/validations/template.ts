import { z } from 'zod'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500).optional().nullable(),
  agenda: z.string().max(5000).optional().nullable(),
  pre_meeting_notes: z.string().max(5000).optional().nullable(),
  post_meeting_notes: z.string().max(5000).optional().nullable(),
})

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  agenda: z.string().max(5000).optional().nullable(),
  pre_meeting_notes: z.string().max(5000).optional().nullable(),
  post_meeting_notes: z.string().max(5000).optional().nullable(),
  is_active: z.boolean().optional(),
})

export const templateIdSchema = z.string().regex(uuidRegex, 'Invalid template ID')

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>
