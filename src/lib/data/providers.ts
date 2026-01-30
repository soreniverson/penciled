import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Provider } from '@/types/database'
import { CACHE_TIMES, CACHE_TAGS } from './cache'

/**
 * Get provider by ID - request deduplicated
 * Use this in server components when you need provider data multiple times
 */
export const getProvider = cache(async (providerId: string): Promise<Provider | null> => {
  const supabase = await createClient()

  const { data } = await supabase
    .from('providers')
    .select('*')
    .eq('id', providerId)
    .single()

  return data as Provider | null
})

/**
 * Get provider by slug - cached across requests
 * Use this for public booking pages where the same slug is requested often
 */
export const getProviderBySlug = unstable_cache(
  async (slug: string): Promise<Provider | null> => {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('providers')
      .select('*')
      .eq('slug', slug)
      .single()

    return data as Provider | null
  },
  ['provider-by-slug'],
  { revalidate: CACHE_TIMES.provider }
)

/**
 * Get provider's Google Calendar token - request deduplicated
 * Not cached long-term because tokens might be refreshed
 */
export const getProviderCalendarToken = cache(async (providerId: string) => {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('providers')
    .select('google_calendar_token, google_calendar_id')
    .eq('id', providerId)
    .single()

  return data as Pick<Provider, 'google_calendar_token' | 'google_calendar_id'> | null
})

/**
 * Get provider's timezone - cached (rarely changes)
 */
export const getProviderTimezone = unstable_cache(
  async (providerId: string): Promise<string> => {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('providers')
      .select('timezone')
      .eq('id', providerId)
      .single()

    return (data as { timezone: string } | null)?.timezone || 'America/New_York'
  },
  ['provider-timezone'],
  { revalidate: CACHE_TIMES.provider }
)
