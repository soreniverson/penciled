import { createUntypedClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { BookingLink, Provider, Meeting } from '@/types/database'

const LinkBookingFlow = dynamic(
  () => import('./link-booking-flow').then(mod => ({ default: mod.LinkBookingFlow })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

type Props = {
  params: Promise<{ slug: string }>
}

type MemberWithProvider = {
  provider_id: string
  is_required: boolean
  providers: Provider
}

type MeetingWithId = {
  meeting_id: string
  meetings: Meeting
}

export default async function LinkBookingPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createUntypedClient()

  // Fetch booking link with members and meetings
  const { data: bookingLink, error } = await supabase
    .from('booking_links')
    .select(`
      *,
      booking_link_members (
        provider_id,
        is_required,
        providers:provider_id (*)
      ),
      booking_link_meetings (
        meeting_id,
        meetings:meeting_id (*)
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

  // Extract meetings
  const meetings = (bookingLink.booking_link_meetings as MeetingWithId[] || [])
    .filter(m => m.meetings && m.meetings.is_active)
    .map(m => m.meetings)

  if (meetings.length === 0) {
    notFound()
  }

  // Get owner info for display
  const owner = members.find(m => m.providerId === bookingLink.owner_id)?.provider

  return (
    <LinkBookingFlow
      bookingLink={bookingLink as BookingLink}
      members={members}
      meetings={meetings}
      ownerTimezone={owner?.timezone || 'America/New_York'}
    />
  )
}
