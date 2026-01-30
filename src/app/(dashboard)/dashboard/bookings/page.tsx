import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Calendar, Clock, Mail, Phone, User, Users } from 'lucide-react'
import { CancelBookingButton } from './cancel-button'
import { CompleteBookingButton } from './complete-button'
import { ApproveBookingButton, DeclineBookingButton } from './approve-button'
import type { Booking, Meeting } from '@/types/database'

type BookingWithMeeting = Booking & {
  meetings: Pick<Meeting, 'name' | 'duration_minutes'> | null
  booking_links?: { name: string } | null
  isTeamBooking?: boolean
}

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get booking links where user is a member (for team bookings)
  const { data: memberLinks } = await supabase
    .from('booking_link_members')
    .select('booking_link_id')
    .eq('provider_id', user.id) as { data: { booking_link_id: string }[] | null }

  const teamLinkIds = memberLinks?.map(m => m.booking_link_id) || []

  // Get all upcoming bookings (own + team)
  const { data: ownBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      meetings (name, duration_minutes),
      booking_links (name)
    `)
    .eq('provider_id', user.id)
    .in('status', ['confirmed', 'pending'])
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .returns<BookingWithMeeting[]>()

  // Get team bookings (where user is a team member but not the provider)
  let teamBookings: BookingWithMeeting[] = []
  if (teamLinkIds.length > 0) {
    const { data: teamData } = await supabase
      .from('bookings')
      .select(`
        *,
        meetings (name, duration_minutes),
        booking_links (name)
      `)
      .in('booking_link_id', teamLinkIds)
      .neq('provider_id', user.id)
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .returns<BookingWithMeeting[]>()

    teamBookings = (teamData || []).map(b => ({ ...b, isTeamBooking: true }))
  }

  // Combine and sort bookings
  const bookings = [...(ownBookings || []), ...teamBookings]
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  // Get past bookings (last 30 days) - own only for simplicity
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: pastBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      meetings (name, duration_minutes),
      booking_links (name)
    `)
    .eq('provider_id', user.id)
    .lt('start_time', new Date().toISOString())
    .gte('start_time', thirtyDaysAgo.toISOString())
    .order('start_time', { ascending: false })
    .limit(20)
    .returns<BookingWithMeeting[]>()

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
                        <span className="font-medium">{booking.meetings?.name}</span>
                        {booking.booking_links?.name && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            <Users className="size-3" />
                            {booking.booking_links.name}
                          </span>
                        )}
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
                    <div className="flex flex-col sm:flex-row gap-2">
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
                        <span className="font-medium">{booking.meetings?.name}</span>
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
