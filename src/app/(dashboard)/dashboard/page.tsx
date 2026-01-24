import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, ExternalLink, Clock, Users } from 'lucide-react'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import type { Provider, Booking, Service } from '@/types/database'
import { CopyButton } from '@/components/copy-button'

type BookingWithService = Booking & {
  services: Pick<Service, 'name'> | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: provider } = await supabase
    .from('providers')
    .select('*')
    .eq('id', user.id)
    .single()
    .then(res => ({ ...res, data: res.data as Provider | null }))

  // Get today's bookings
  const today = new Date()
  const { data: todayBookings } = await supabase
    .from('bookings')
    .select('*, services(name)')
    .eq('provider_id', user.id)
    .eq('status', 'confirmed')
    .gte('start_time', startOfDay(today).toISOString())
    .lte('start_time', endOfDay(today).toISOString())
    .order('start_time', { ascending: true })
    .returns<BookingWithService[]>()

  // Get this week's booking count
  const { count: weekBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', user.id)
    .eq('status', 'confirmed')
    .gte('start_time', startOfWeek(today).toISOString())
    .lte('start_time', endOfWeek(today).toISOString())

  // Get total bookings
  const { count: totalBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', user.id)
    .eq('status', 'confirmed')

  const bookingPageUrl = provider?.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL}/book/${provider.slug}`
    : null

  return (
    <div className="space-y-4 max-w-[780px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{provider?.name ? `, ${provider.name.split(' ')[0]}` : ''}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayBookings?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {todayBookings?.length === 1 ? 'booking' : 'bookings'} today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekBookings || 0}</div>
            <p className="text-xs text-muted-foreground">
              {weekBookings === 1 ? 'booking' : 'bookings'} this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">All Time</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings || 0}</div>
            <p className="text-xs text-muted-foreground">
              total {totalBookings === 1 ? 'booking' : 'bookings'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Booking Link */}
      {bookingPageUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Booking Link</CardTitle>
            <CardDescription>Share this link with your clients</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm break-all">
              {bookingPageUrl}
            </code>
            <div className="flex gap-2">
              <CopyButton text={bookingPageUrl} />
              <Link href={`/book/${provider?.slug}`} target="_blank">
                <Button size="sm" className="gap-1">
                  Open <ExternalLink className="size-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
          <CardDescription>
            {format(today, 'EEEE, MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayBookings && todayBookings.length > 0 ? (
            <div className="space-y-4">
              {todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{booking.client_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.services?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {format(new Date(booking.start_time), 'h:mm a')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.end_time), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="size-12 mx-auto mb-4 opacity-50" />
              <p>No bookings scheduled for today</p>
              <Link href="/dashboard/bookings" className="text-sm underline hover:text-foreground">
                View all bookings
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
