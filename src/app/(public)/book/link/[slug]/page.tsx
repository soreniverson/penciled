import { createUntypedClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LinkBookingFlow } from './link-booking-flow'
import type { BookingLink, Provider, Service } from '@/types/database'

type Props = {
  params: Promise<{ slug: string }>
}

type MemberWithProvider = {
  provider_id: string
  is_required: boolean
  providers: Provider
}

type ServiceWithId = {
  service_id: string
  services: Service
}

export default async function LinkBookingPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createUntypedClient()

  // Fetch booking link with members and services
  const { data: bookingLink, error } = await supabase
    .from('booking_links')
    .select(`
      *,
      booking_link_members (
        provider_id,
        is_required,
        providers:provider_id (*)
      ),
      booking_link_services (
        service_id,
        services:service_id (*)
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !bookingLink) {
    notFound()
  }

  // Extract members with their provider data
  const members = (bookingLink.booking_link_members as MemberWithProvider[] || [])
    .filter(m => m.providers)
    .map(m => ({
      providerId: m.provider_id,
      isRequired: m.is_required,
      provider: m.providers,
    }))

  if (members.length === 0) {
    notFound()
  }

  // Extract services
  const services = (bookingLink.booking_link_services as ServiceWithId[] || [])
    .filter(s => s.services && s.services.is_active)
    .map(s => s.services)

  if (services.length === 0) {
    notFound()
  }

  // Get owner info for display
  const owner = members.find(m => m.providerId === bookingLink.owner_id)?.provider

  return (
    <LinkBookingFlow
      bookingLink={bookingLink as BookingLink}
      members={members}
      services={services}
      ownerTimezone={owner?.timezone || 'America/New_York'}
    />
  )
}
