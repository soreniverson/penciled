import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Calendar, Clock, Mail, Phone, User } from 'lucide-react'
import { CancelBookingButton } from './cancel-button'
import { CompleteBookingButton } from './complete-button'
import { ApproveBookingButton, DeclineBookingButton } from './approve-button'
import type { Booking, Service } from '@/types/database'

type BookingWithService = Booking & {
  services: Pick<Service, 'name' | 'duration_minutes'> | null
}

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all upcoming bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      services (name, duration_minutes)
    `)
    .eq('provider_id', user.id)
    .in('status', ['confirmed', 'pending'])
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .returns<BookingWithService[]>()

  // Get past bookings (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: pastBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      services (name, duration_minutes)
    `)
    .eq('provider_id', user.id)
    .lt('start_time', new Date().toISOString())
    .gte('start_time', thirtyDaysAgo.toISOString())
    .order('start_time', { ascending: false })
    .limit(20)
    .returns<BookingWithService[]>()

  return (
    <div className="space-y-4 max-w-[780px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
      </div>

      {/* Upcoming Bookings */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Upcoming</h2>
        {bookings && bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
                        }`} />
                        <span className="font-medium">{booking.services?.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-4" />
                          {format(new Date(booking.start_time), 'EEE, MMM d')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-4" />
                          {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="size-4" />
                          {booking.client_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="size-4" />
                          {booking.client_email}
                        </span>
                        {booking.client_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-4" />
                            {booking.client_phone}
                          </span>
                        )}
                      </div>
                      {booking.notes && (
                        <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                          {booking.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
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
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="size-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming bookings</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Past Bookings */}
      {pastBookings && pastBookings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Past (last 30 days)</h2>
          <div className="space-y-3">
            {pastBookings.map((booking) => (
              <Card key={booking.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${
                          booking.status === 'completed' ? 'bg-blue-500' :
                          booking.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <span className="font-medium">{booking.services?.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">({booking.status})</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-4" />
                          {format(new Date(booking.start_time), 'EEE, MMM d')}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="size-4" />
                          {booking.client_name}
                        </span>
                      </div>
                    </div>
                    {booking.status === 'confirmed' && (
                      <CompleteBookingButton bookingId={booking.id} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
