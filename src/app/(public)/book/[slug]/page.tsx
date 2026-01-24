import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BookingFlow } from './booking-flow'
import { ThemeWrapper } from '@/components/theme-wrapper'
import type { Provider, Service, Availability } from '@/types/database'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: provider } = await supabase
    .from('providers')
    .select('business_name')
    .eq('slug', slug)
    .single()
    .then(res => ({ ...res, data: res.data as Pick<Provider, 'business_name'> | null }))

  if (!provider) {
    return {
      title: 'Not Found',
    }
  }

  return {
    title: `Book with ${provider.business_name}`,
    description: `Schedule an appointment with ${provider.business_name}`,
  }
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params
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

  // Fetch active services
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('provider_id', provider.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .returns<Service[]>()

  // Fetch availability
  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('provider_id', provider.id)
    .eq('is_active', true)
    .returns<Availability[]>()

  if (!services || services.length === 0) {
    return (
      <ThemeWrapper accentColor={provider.accent_color || 'sand'}>
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-2">No services available</h1>
            <p className="text-muted-foreground">
              {provider.business_name} hasn&apos;t set up any services yet.
            </p>
          </div>
        </div>
      </ThemeWrapper>
    )
  }

  return (
    <ThemeWrapper accentColor={provider.accent_color || 'sand'}>
      <BookingFlow
        provider={provider}
        services={services}
        availability={availability || []}
      />
    </ThemeWrapper>
  )
}
