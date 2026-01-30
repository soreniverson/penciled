import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Availability } from '@/types/database'
import { CACHE_TIMES } from './cache'

type AvailabilityRule = Pick<Availability, 'day_of_week' | 'start_time' | 'end_time'>

/**
 * Get availability rules for a provider - cached
 */
export const getProviderAvailability = unstable_cache(
  async (providerId: string): Promise<AvailabilityRule[]> => {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('availability')
      .select('day_of_week, start_time, end_time')
      .eq('provider_id', providerId)
      .eq('is_active', true)

    return (data || []) as AvailabilityRule[]
  },
  ['provider-availability'],
  { revalidate: CACHE_TIMES.availability }
)

/**
 * Get blackout dates for a provider - cached
 */
export const getProviderBlackoutDates = unstable_cache(
  async (providerId: string): Promise<{ start_date: string; end_date: string }[]> => {
    const supabase = createAdminClient()

    // Get blackouts that are current or future (not expired)
    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('blackout_dates')
      .select('start_date, end_date')
      .eq('provider_id', providerId)
      .gte('end_date', today)

    return (data || []) as { start_date: string; end_date: string }[]
  },
  ['provider-blackouts'],
  { revalidate: CACHE_TIMES.availability }
)

/**
 * Check if a specific date is blacked out
 */
export async function isDateBlackedOut(providerId: string, date: Date): Promise<boolean> {
  const blackouts = await getProviderBlackoutDates(providerId)
  const dateStr = date.toISOString().split('T')[0]

  return blackouts.some(
    (b) => dateStr >= b.start_date && dateStr <= b.end_date
  )
}
