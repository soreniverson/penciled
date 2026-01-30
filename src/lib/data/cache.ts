import { unstable_cache } from 'next/cache'
import { cache } from 'react'

/**
 * Cache configuration for different data types
 *
 * - provider: 5 minutes (settings rarely change)
 * - meetings: 2 minutes (might be updated)
 * - availability: 2 minutes (might be updated)
 * - calendarBusy: 1 minute (external data, changes frequently)
 */
export const CACHE_TIMES = {
  provider: 300,      // 5 minutes
  meetings: 120,      // 2 minutes
  availability: 120,  // 2 minutes
  calendarBusy: 60,   // 1 minute
  bookings: 30,       // 30 seconds (changes often)
} as const

/**
 * Cache tags for invalidation
 */
export const CACHE_TAGS = {
  provider: (id: string) => `provider-${id}`,
  meetings: (providerId: string) => `meetings-${providerId}`,
  availability: (providerId: string) => `availability-${providerId}`,
  calendarBusy: (providerId: string, date: string) => `calendar-busy-${providerId}-${date}`,
  bookings: (providerId: string) => `bookings-${providerId}`,
} as const

/**
 * Creates a cached version of a function using Next.js unstable_cache
 * Use this for data that can be cached across requests
 */
export function createCachedFn<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts: string[],
  options: { revalidate: number; tags?: string[] }
) {
  return unstable_cache(fn, keyParts, options)
}

/**
 * Creates a request-deduplicated version of a function using React cache
 * Use this for data that should be fetched once per request
 */
export function createDeduplicatedFn<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return cache(fn) as T
}
