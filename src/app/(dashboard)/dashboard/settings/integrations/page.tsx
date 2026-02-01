import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Check, X, ChevronLeft } from 'lucide-react'
import { DisconnectGoogleCalendarButton } from './disconnect-button'
import { DisconnectZoomButton } from './disconnect-zoom-button'
import type { Provider } from '@/types/database'

type SearchParams = Promise<{ success?: string; error?: string }>

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: provider } = await supabase
    .from('providers')
    .select('google_calendar_token, zoom_token')
    .eq('id', user.id)
    .single()
    .then(res => ({ ...res, data: res.data as Pick<Provider, 'google_calendar_token' | 'zoom_token'> | null }))

  const isGoogleConnected = !!provider?.google_calendar_token
  const isZoomConnected = !!provider?.zoom_token

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon" className="size-8">
            <ChevronLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
      </div>

      {/* Success/Error Messages */}
      {params.success === 'google_connected' && (
        <div className="p-3 bg-muted text-foreground rounded-lg flex items-center gap-2 text-sm">
          <Check className="size-4" />
          Google Calendar connected
        </div>
      )}
      {params.success === 'google_disconnected' && (
        <div className="p-3 bg-muted text-muted-foreground rounded-lg flex items-center gap-2 text-sm">
          <Check className="size-4" />
          Google Calendar disconnected
        </div>
      )}
      {params.success === 'zoom_connected' && (
        <div className="p-3 bg-muted text-foreground rounded-lg flex items-center gap-2 text-sm">
          <Check className="size-4" />
          Zoom connected
        </div>
      )}
      {params.success === 'zoom_disconnected' && (
        <div className="p-3 bg-muted text-muted-foreground rounded-lg flex items-center gap-2 text-sm">
          <Check className="size-4" />
          Zoom disconnected
        </div>
      )}
      {params.error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2 text-sm">
          <X className="size-4" />
          {params.error === 'google_denied' && 'Google Calendar access was denied.'}
          {params.error === 'zoom_denied' && 'Zoom access was denied.'}
          {params.error === 'invalid_request' && 'Invalid request. Please try again.'}
          {params.error === 'invalid_state' && 'Session expired. Please try again.'}
          {params.error === 'save_failed' && 'Failed to save connection. Please try again.'}
          {params.error === 'token_exchange_failed' && 'Failed to connect. Please try again.'}
        </div>
      )}

      {/* Integrations List */}
      <div className="space-y-3">
        {/* Google Calendar */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Google Calendar</span>
              {isGoogleConnected ? (
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-green-500" />
                  <DisconnectGoogleCalendarButton />
                </div>
              ) : (
                <form action="/api/auth/google-calendar" method="GET">
                  <button
                    type="submit"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Connect
                  </button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Zoom */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Zoom</span>
              {isZoomConnected ? (
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-green-500" />
                  <DisconnectZoomButton />
                </div>
              ) : (
                <form action="/api/auth/zoom" method="GET">
                  <button
                    type="submit"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Connect
                  </button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
