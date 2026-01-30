import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Booking, Meeting, Provider } from '@/types/database'

/**
 * Common booking type with relations
 */
export type BookingWithRelations = Booking & {
  providers: Pick<Provider, 'name' | 'business_name' | 'email' | 'timezone'> | null
  meetings: Pick<Meeting, 'name'> | null
}

/**
 * Get a booking with provider and meeting info - request deduplicated
 * This is the most common query pattern for booking operations
 */
export const getBookingWithRelations = cache(async (bookingId: string): Promise<BookingWithRelations | null> => {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('bookings')
    .select(`
      *,
      providers:provider_id (name, business_name, email, timezone),
      meetings:meeting_id (name)
    `)
    .eq('id', bookingId)
    .single()

  return data as BookingWithRelations | null
})

/**
 * Get bookings for a provider within a date range
 * Used for slot availability calculation
 */
export const getBookingsInRange = cache(async (
  providerId: string,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string
): Promise<Pick<Booking, 'start_time' | 'end_time'>[]> => {
  const supabase = createAdminClient()

  let query = supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('provider_id', providerId)
    .neq('status', 'cancelled')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId)
  }

  const { data } = await query

  return (data || []) as Pick<Booking, 'start_time' | 'end_time'>[]
})

/**
 * Get bookings for multiple providers within a date range
 * Used for team booking slot calculation - single query instead of N queries
 */
export const getBookingsForProviders = cache(async (
  providerIds: string[],
  startDate: Date,
  endDate: Date
): Promise<Map<string, Pick<Booking, 'start_time' | 'end_time'>[]>> => {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('bookings')
    .select('provider_id, start_time, end_time')
    .in('provider_id', providerIds)
    .neq('status', 'cancelled')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())

  type BookingRow = { provider_id: string; start_time: string; end_time: string }
  const bookings = (data || []) as BookingRow[]

  // Group by provider
  const bookingsByProvider = new Map<string, Pick<Booking, 'start_time' | 'end_time'>[]>()

  for (const providerId of providerIds) {
    bookingsByProvider.set(providerId, [])
  }

  for (const booking of bookings) {
    const existing = bookingsByProvider.get(booking.provider_id) || []
    existing.push({ start_time: booking.start_time, end_time: booking.end_time })
    bookingsByProvider.set(booking.provider_id, existing)
  }

  return bookingsByProvider
})

/**
 * Get upcoming bookings for a provider
 */
export const getUpcomingBookings = cache(async (
  providerId: string,
  limit: number = 50
): Promise<BookingWithRelations[]> => {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('bookings')
    .select(`
      *,
      providers:provider_id (name, business_name, email, timezone),
      meetings:meeting_id (name)
    `)
    .eq('provider_id', providerId)
    .in('status', ['confirmed', 'pending'])
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(limit)

  return (data || []) as BookingWithRelations[]
})

/**
 * Get past bookings for a provider
 */
export const getPastBookings = cache(async (
  providerId: string,
  days: number = 30,
  limit: number = 20
): Promise<BookingWithRelations[]> => {
  const supabase = createAdminClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data } = await supabase
    .from('bookings')
    .select(`
      *,
      providers:provider_id (name, business_name, email, timezone),
      meetings:meeting_id (name)
    `)
    .eq('provider_id', providerId)
    .lt('start_time', new Date().toISOString())
    .gte('start_time', startDate.toISOString())
    .order('start_time', { ascending: false })
    .limit(limit)

  return (data || []) as BookingWithRelations[]
})
