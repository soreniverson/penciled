import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ThemeWrapper } from '@/components/theme-wrapper'
import { Loader2 } from 'lucide-react'

const BookingFlow = dynamic(() => import('./booking-flow').then(mod => ({ default: mod.BookingFlow })), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
})
import { getProviderBySlug } from '@/lib/data/providers'
import { getProviderBlackoutDates } from '@/lib/data/availability'
import type { Provider, Meeting, Availability } from '@/types/database'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const provider = await getProviderBySlug(slug)

  if (!provider) {
    return { title: 'Not Found' }
  }

  return {
    title: `Book with ${provider.business_name}`,
    description: `Schedule an appointment with ${provider.business_name}`,
  }
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params

  // Use cached provider lookup
  const provider = await getProviderBySlug(slug)

  if (!provider) {
    notFound()
  }

  const supabase = await createClient()

  // Fetch meetings, availability, and blackout dates in parallel
  const [meetingsResult, availabilityResult, blackoutDates] = await Promise.all([
    supabase
      .from('meetings')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .returns<Meeting[]>(),
    supabase
      .from('availability')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('is_active', true)
      .returns<Availability[]>(),
    getProviderBlackoutDates(provider.id),
  ])

  const meetings = meetingsResult.data
  const availability = availabilityResult.data

  if (!meetings || meetings.length === 0) {
    return (
      <ThemeWrapper>
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-2">No meetings available</h1>
            <p className="text-muted-foreground">
              {provider.business_name} hasn&apos;t set up any meetings yet.
            </p>
          </div>
        </div>
      </ThemeWrapper>
    )
  }

  return (
    <ThemeWrapper>
      <BookingFlow
        provider={provider}
        meetings={meetings}
        availability={availability || []}
        blackoutDates={blackoutDates}
      />
    </ThemeWrapper>
  )
}
