import { unstable_cache } from 'next/cache'
import { getCalendarBusyTimes as fetchCalendarBusyTimes } from '@/lib/google-calendar'
import { CACHE_TIMES } from './cache'

/**
 * Get Google Calendar busy times - CACHED
 *
 * This is the biggest performance win. Google Calendar API calls
 * take 200-500ms each. By caching for 1 minute, we dramatically
 * reduce latency for slot availability checks.
 *
 * Cache key includes provider ID and date to ensure freshness per day.
 */
export function getCalendarBusyTimesCached(
  providerId: string,
  startDateIso: string,
  endDateIso: string
): Promise<{ start: string; end: string }[]> {
  return unstable_cache(
    async (): Promise<{ start: string; end: string }[]> => {
      const startDate = new Date(startDateIso)
      const endDate = new Date(endDateIso)

      const busyTimes = await fetchCalendarBusyTimes(providerId, startDate, endDate)

      // Serialize dates for caching
      return busyTimes.map(({ start, end }) => ({
        start: start.toISOString(),
        end: end.toISOString(),
      }))
    },
    ['calendar-busy-times', providerId, startDateIso, endDateIso],
    {
      revalidate: CACHE_TIMES.calendarBusy,
      tags: ['calendar'],
    }
  )()
}

/**
 * Get busy times for multiple providers - batched and cached
 * Used for team booking availability
 */
export async function getCalendarBusyTimesForProviders(
  providerIds: string[],
  startDate: Date,
  endDate: Date
): Promise<Map<string, { start: Date; end: Date }[]>> {
  const startIso = startDate.toISOString()
  const endIso = endDate.toISOString()

  // Fetch all in parallel
  const results = await Promise.all(
    providerIds.map(async (providerId) => {
      const cached = await getCalendarBusyTimesCached(providerId, startIso, endIso)
      return {
        providerId,
        busyTimes: cached.map(({ start, end }) => ({
          start: new Date(start),
          end: new Date(end),
        })),
      }
    })
  )

  // Build map
  const busyTimesByProvider = new Map<string, { start: Date; end: Date }[]>()
  for (const { providerId, busyTimes } of results) {
    busyTimesByProvider.set(providerId, busyTimes)
  }

  return busyTimesByProvider
}

/**
 * Wrapper that returns Date objects instead of strings
 * For backward compatibility with existing code
 */
export async function getCachedBusyTimes(
  providerId: string,
  startDate: Date,
  endDate: Date
): Promise<{ start: Date; end: Date }[]> {
  const cached = await getCalendarBusyTimesCached(
    providerId,
    startDate.toISOString(),
    endDate.toISOString()
  )

  return cached.map(({ start, end }) => ({
    start: new Date(start),
    end: new Date(end),
  }))
}
