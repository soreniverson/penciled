import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Booking, Meeting } from '@/types/database'
import { BookingsPageClient } from './bookings-page-client'

type BookingWithMeeting = Booking & {
  meetings: Pick<Meeting, 'name' | 'duration_minutes'> | null
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const principalId = typeof params.principal === 'string' ? params.principal : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const now = new Date().toISOString()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Run queries for user's own bookings
  const [providerResult, upcomingResult, pastResult] = await Promise.all([
    supabase
      .from('providers')
      .select('slug')
      .eq('id', user.id)
      .single(),
    supabase
      .from('bookings')
      .select('*, meetings(name, duration_minutes)')
      .eq('provider_id', user.id)
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .returns<BookingWithMeeting[]>(),
    supabase
      .from('bookings')
      .select('*, meetings(name, duration_minutes)')
      .eq('provider_id', user.id)
      .lt('start_time', now)
      .gte('start_time', thirtyDaysAgo.toISOString())
      .order('start_time', { ascending: false })
      .limit(10)
      .returns<BookingWithMeeting[]>(),
  ])

  const provider = providerResult.data as { slug: string } | null

  // If viewing as delegate, fetch principal's bookings
  let delegateBookings = null

  if (principalId) {
    type DelegationResult = {
      permissions: unknown
      providers: { name: string | null; business_name: string | null } | { name: string | null; business_name: string | null }[] | null
    }

    // Verify user has delegation rights
    const { data: delegation } = await supabase
      .from('delegates')
      .select('permissions, providers:principal_id (name, business_name)')
      .eq('principal_id', principalId)
      .eq('delegate_id', user.id)
      .single() as { data: DelegationResult | null }

    if (delegation?.permissions) {
      const [{ data: principalUpcoming }, { data: principalPast }] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, meetings(name, duration_minutes)')
          .eq('provider_id', principalId)
          .in('status', ['confirmed', 'pending'])
          .gte('start_time', now)
          .order('start_time', { ascending: true })
          .returns<BookingWithMeeting[]>(),
        supabase
          .from('bookings')
          .select('*, meetings(name, duration_minutes)')
          .eq('provider_id', principalId)
          .lt('start_time', now)
          .gte('start_time', thirtyDaysAgo.toISOString())
          .order('start_time', { ascending: false })
          .limit(10)
          .returns<BookingWithMeeting[]>(),
      ])

      const principalInfo = Array.isArray(delegation.providers)
        ? delegation.providers[0]
        : delegation.providers

      delegateBookings = {
        principalId,
        principalName: principalInfo?.business_name || principalInfo?.name || null,
        upcomingBookings: principalUpcoming || [],
        pastBookings: principalPast || [],
      }
    }
  }

  return (
    <BookingsPageClient
      userId={user.id}
      userSlug={provider?.slug || null}
      upcomingBookings={upcomingResult.data || []}
      pastBookings={pastResult.data || []}
      delegateBookings={delegateBookings}
    />
  )
}
