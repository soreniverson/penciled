import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatPrice, formatDuration } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { ServiceForm } from './service-form'
import { ServiceActions } from './service-actions'
import type { Service } from '@/types/database'

export default async function ServicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('provider_id', user.id)
    .order('created_at', { ascending: true })
    .returns<Service[]>()

  return (
    <div className="space-y-4 max-w-[780px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        </div>
        <ServiceForm providerId={user.id}>
          <Button>
            <Plus className="size-4 mr-2" />
            Add Service
          </Button>
        </ServiceForm>
      </div>

      {services && services.length > 0 ? (
        <div className="space-y-3">
          {services.map((service) => (
            <Card key={service.id} className={!service.is_active ? 'opacity-60' : ''}>
              <CardContent className="py-0.5 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{service.name}</h3>
                      {!service.is_active && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactive</span>
                      )}
                    </div>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-sm text-muted-foreground">{formatDuration(service.duration_minutes)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-sm text-muted-foreground">{formatPrice(service.price_cents, service.currency)}</span>
                    {service.booking_mode === 'request' && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-sm text-yellow-600">Requires approval</span>
                      </>
                    )}
                  </div>
                  <ServiceActions service={service} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No services yet</p>
            <ServiceForm providerId={user.id}>
              <Button variant="link" className="mt-2">
                Create your first service
              </Button>
            </ServiceForm>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
