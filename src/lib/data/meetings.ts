import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Meeting } from '@/types/database'
import { CACHE_TIMES } from './cache'

/**
 * Get a single meeting by ID - request deduplicated
 */
export const getMeeting = cache(async (meetingId: string): Promise<Meeting | null> => {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single()

  return data as Meeting | null
})

/**
 * Get meeting duration and buffer - cached
 * This is frequently needed for slot generation
 */
export const getMeetingConfig = unstable_cache(
  async (meetingId: string): Promise<Pick<Meeting, 'duration_minutes' | 'buffer_minutes'> | null> => {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('meetings')
      .select('duration_minutes, buffer_minutes')
      .eq('id', meetingId)
      .single()

    return data as Pick<Meeting, 'duration_minutes' | 'buffer_minutes'> | null
  },
  ['meeting-config'],
  { revalidate: CACHE_TIMES.meetings }
)

/**
 * Get all active meetings for a provider - cached
 */
export const getProviderMeetings = unstable_cache(
  async (providerId: string): Promise<Meeting[]> => {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    return (data || []) as Meeting[]
  },
  ['provider-meetings'],
  { revalidate: CACHE_TIMES.meetings }
)
