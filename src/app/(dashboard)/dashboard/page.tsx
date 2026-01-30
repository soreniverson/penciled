import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, ExternalLink, Clock, Mail, User } from 'lucide-react'
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns'
import type { Provider, Booking, Meeting } from '@/types/database'
import { CopyButton } from '@/components/copy-button'
import { CancelBookingButton } from './bookings/cancel-button'
import { CompleteBookingButton } from './bookings/complete-button'
import { ApproveBookingButton, DeclineBookingButton } from './bookings/approve-button'

type BookingWithMeeting = Booking & {
  meetings: Pick<Meeting, 'name' | 'duration_minutes'> | null
}

function formatBookingDate(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'EEE, MMM d')
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

  // Get all upcoming bookings
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('*, meetings(name, duration_minutes)')
    .eq('provider_id', user.id)
    .in('status', ['confirmed', 'pending'])
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .returns<BookingWithMeeting[]>()

  // Get past bookings (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: pastBookings } = await supabase
    .from('bookings')
    .select('*, meetings(name, duration_minutes)')
    .eq('provider_id', user.id)
    .lt('start_time', new Date().toISOString())
    .gte('start_time', thirtyDaysAgo.toISOString())
    .order('start_time', { ascending: false })
    .limit(10)
    .returns<BookingWithMeeting[]>()

  const bookingPageUrl = provider?.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL}/${provider.slug}`
    : null

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        {bookingPageUrl && (
          <div className="flex gap-2">
            <CopyButton text={bookingPageUrl} />
            <Link href={`/${provider?.slug}`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1">
                Open <ExternalLink className="size-3" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Upcoming Bookings */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Upcoming</h2>
        {upcomingBookings && upcomingBookings.length > 0 ? (
          <div className="space-y-2">
            {upcomingBookings.map((booking) => {
              const startDate = new Date(booking.start_time)
              return (
                <Card key={booking.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="text-center shrink-0 w-14">
                          <p className="text-xs text-muted-foreground">{formatBookingDate(startDate)}</p>
                          <p className="text-lg font-semibold">{format(startDate, 'h:mm')}</p>
                          <p className="text-xs text-muted-foreground">{format(startDate, 'a')}</p>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`size-2 rounded-full shrink-0 ${
                              booking.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                            <p className="font-medium truncate">{booking.client_name}</p>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{booking.meetings?.name}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {booking.status === 'pending' ? (
                          <>
                            <ApproveBookingButton bookingId={booking.id} clientName={booking.client_name} />
                            <DeclineBookingButton bookingId={booking.id} clientName={booking.client_name} />
                          </>
                        ) : (
                          <CancelBookingButton bookingId={booking.id} clientName={booking.client_name} />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="size-10 mx-auto mb-3 opacity-50" />
              <p>No upcoming bookings</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Past Bookings */}
      {pastBookings && pastBookings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-muted-foreground">Past</h2>
          <div className="space-y-2">
            {pastBookings.map((booking) => {
              const startDate = new Date(booking.start_time)
              return (
                <Card key={booking.id} className="opacity-60">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="text-center shrink-0 w-14">
                          <p className="text-xs text-muted-foreground">{format(startDate, 'MMM d')}</p>
                          <p className="text-lg font-semibold">{format(startDate, 'h:mm')}</p>
                          <p className="text-xs text-muted-foreground">{format(startDate, 'a')}</p>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`size-2 rounded-full shrink-0 ${
                              booking.status === 'completed' ? 'bg-blue-500' :
                              booking.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                            }`} />
                            <p className="font-medium truncate">{booking.client_name}</p>
                            <span className="text-xs text-muted-foreground capitalize">({booking.status})</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{booking.meetings?.name}</p>
                        </div>
                      </div>
                      {booking.status === 'confirmed' && (
                        <CompleteBookingButton bookingId={booking.id} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
