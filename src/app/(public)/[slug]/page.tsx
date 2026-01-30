import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BookingFlow } from '../book/[slug]/booking-flow'
import { ThemeWrapper } from '@/components/theme-wrapper'
import type { Provider, Meeting, Availability } from '@/types/database'

// Reserved slugs that should not be used for provider booking pages
const RESERVED_SLUGS = [
  'login',
  'signup',
  'dashboard',
  'book',
  'booking',
  'api',
  'team',
  'auth',
  'callback',
  'settings',
  'admin',
  'onboarding',
]

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params

  // Check reserved slugs
  if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
    return { title: 'Not Found' }
  }

  const supabase = await createClient()

  const { data: provider } = await supabase
    .from('providers')
    .select('business_name')
    .eq('slug', slug)
    .single()
    .then(res => ({ ...res, data: res.data as Pick<Provider, 'business_name'> | null }))

  if (!provider) {
    return { title: 'Not Found' }
  }

  return {
    title: `Book with ${provider.business_name}`,
    description: `Schedule an appointment with ${provider.business_name}`,
  }
}

export default async function ProviderBookingPage({ params }: Props) {
  const { slug } = await params

  // Check reserved slugs - redirect to 404
  if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
    notFound()
  }

  const supabase = await createClient()

  // Fetch provider by slug
  const { data: provider } = await supabase
    .from('providers')
    .select('*')
    .eq('slug', slug)
    .single()
    .then(res => ({ ...res, data: res.data as Provider | null }))

  if (!provider) {
    notFound()
  }

  // Fetch active meetings
  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .eq('provider_id', provider.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .returns<Meeting[]>()

  // Fetch availability
  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('provider_id', provider.id)
    .eq('is_active', true)
    .returns<Availability[]>()

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
      />
    </ThemeWrapper>
  )
}
