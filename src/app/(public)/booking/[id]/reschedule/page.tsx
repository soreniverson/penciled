import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RescheduleFlow } from './reschedule-flow'
import type { Booking, Meeting, Provider, Availability } from '@/types/database'

type BookingWithDetails = Booking & {
  meetings: Meeting | null
  providers: Provider | null
}

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function ReschedulePage({ params, searchParams }: Props) {
  const { id } = await params
  const { token } = await searchParams

  const supabase = await createClient()

  // Fetch booking with meeting and provider info
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      meetings (*),
      providers (*)
    `)
    .eq('id', id)
    .single()
    .then(res => ({ ...res, data: res.data as BookingWithDetails | null }))

  if (!booking) {
    notFound()
  }

  // Verify management token
  if (booking.management_token !== token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Invalid Link</h1>
          <p className="text-muted-foreground">
            This reschedule link is invalid or has expired.
          </p>
        </div>
      </div>
    )
  }

  // Check if booking can be rescheduled
  const isCancelled = booking.status === 'cancelled'
  const isPast = new Date(booking.end_time) < new Date()

  if (isCancelled || isPast) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Cannot Reschedule</h1>
          <p className="text-muted-foreground">
            {isCancelled ? 'This booking has been cancelled.' : 'This booking has already passed.'}
          </p>
        </div>
      </div>
    )
  }

  // Get provider's availability
  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('provider_id', booking.provider_id)
    .eq('is_active', true)
    .returns<Availability[]>()

  if (!booking.providers || !booking.meetings) {
    notFound()
  }

  return (
    <RescheduleFlow
      booking={booking}
      provider={booking.providers}
      meeting={booking.meetings}
      availability={availability || []}
      token={token!}
    />
  )
}
