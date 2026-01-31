import { createAdminClient } from '@/lib/supabase/admin'
import type { InsertFollowUp } from '@/types/database'
import { addMinutes } from 'date-fns'

// Type definitions for Supabase query results
type FollowUpTemplate = {
  id: string
  name: string
  type: string
  delay_minutes: number
  subject: string | null
  content: string
  apply_to_meetings: string[] | null
  is_active: boolean
}

type PendingFollowUp = {
  id: string
  type: string
  scheduled_for: string
}

/**
 * Schedule follow-ups for a completed booking based on matching templates
 */
export async function scheduleFollowUps(
  bookingId: string,
  providerId: string,
  meetingId: string,
  endTime: Date
): Promise<void> {
  const supabase = createAdminClient()

  // Get active follow-up templates for this provider
  const { data: templates } = await supabase
    .from('follow_up_templates')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_active', true) as { data: FollowUpTemplate[] | null }

  if (!templates || templates.length === 0) {
    return
  }

  // Filter templates that apply to this meeting
  const applicableTemplates = templates.filter(template => {
    // If apply_to_meetings is null, applies to all meetings
    if (!template.apply_to_meetings || template.apply_to_meetings.length === 0) {
      return true
    }
    // Otherwise, check if this meeting is in the list
    return template.apply_to_meetings.includes(meetingId)
  })

  if (applicableTemplates.length === 0) {
    return
  }

  // Create follow-up records for each applicable template
  const followUps: InsertFollowUp[] = applicableTemplates.map(template => ({
    booking_id: bookingId,
    template_id: template.id,
    provider_id: providerId,
    type: template.type as 'email' | 'feedback_request',
    status: 'pending',
    scheduled_for: addMinutes(endTime, template.delay_minutes).toISOString(),
    subject: template.subject,
    content: template.content,
  }))

  // Insert all follow-ups
  const { error } = await supabase
    .from('follow_ups')
    // @ts-ignore - Supabase types not inferring correctly for new tables
    .insert(followUps)

  if (error) {
    console.error('Failed to schedule follow-ups:', error)
  }
}

/**
 * Get pending follow-ups for a booking
 */
export async function getPendingFollowUps(
  bookingId: string
): Promise<{ id: string; type: string; scheduled_for: string }[]> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('follow_ups')
    .select('id, type, scheduled_for')
    .eq('booking_id', bookingId)
    .eq('status', 'pending') as { data: PendingFollowUp[] | null }

  return data || []
}

/**
 * Cancel all pending follow-ups for a booking (e.g., if booking is cancelled)
 */
export async function cancelFollowUps(bookingId: string): Promise<void> {
  const supabase = createAdminClient()

  await supabase
    .from('follow_ups')
    // @ts-ignore - Supabase types not inferring correctly
    .update({ status: 'cancelled' })
    .eq('booking_id', bookingId)
    .eq('status', 'pending')
}
