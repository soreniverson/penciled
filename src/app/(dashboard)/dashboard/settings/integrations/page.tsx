import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, Calendar } from 'lucide-react'
import { DisconnectGoogleCalendarButton } from './disconnect-button'
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
    .select('google_calendar_token')
    .eq('id', user.id)
    .single()
    .then(res => ({ ...res, data: res.data as Pick<Provider, 'google_calendar_token'> | null }))

  const isGoogleConnected = !!provider?.google_calendar_token

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      <div className="flex items-center min-h-10">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
      </div>

      {/* Success/Error Messages */}
      {params.success === 'google_connected' && (
        <div className="p-4 bg-green-50 text-green-800 rounded-lg flex items-center gap-2">
          <Check className="size-5" />
          Google Calendar connected successfully!
        </div>
      )}
      {params.success === 'google_disconnected' && (
        <div className="p-4 bg-muted text-muted-foreground rounded-lg flex items-center gap-2">
          <Check className="size-5" />
          Google Calendar disconnected.
        </div>
      )}
      {params.error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <X className="size-5" />
          {params.error === 'google_denied' && 'Google Calendar access was denied.'}
          {params.error === 'invalid_request' && 'Invalid request. Please try again.'}
          {params.error === 'invalid_state' && 'Session expired. Please try again.'}
          {params.error === 'save_failed' && 'Failed to save connection. Please try again.'}
          {params.error === 'token_exchange_failed' && 'Failed to connect. Please try again.'}
        </div>
      )}

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="size-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Google Calendar</CardTitle>
              <CardDescription>
                Sync bookings to your calendar and check for conflicts
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isGoogleConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="size-4" />
                Connected
              </div>
              <DisconnectGoogleCalendarButton />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Google Calendar to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Automatically add bookings to your calendar</li>
                <li>Check your existing events to prevent double bookings</li>
                <li>Get calendar reminders for appointments</li>
              </ul>
              <form action="/api/auth/google-calendar" method="GET">
                <Button type="submit">
                  <svg className="mr-2 size-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Connect Google Calendar
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
