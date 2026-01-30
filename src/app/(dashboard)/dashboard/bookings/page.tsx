import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { Calendar, Mail, Phone, User, Users } from 'lucide-react'
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
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Upcoming</h1>
        {pastBookings && pastBookings.length > 0 && (
          <a href="#past" className="text-2xl font-semibold tracking-tight text-muted-foreground hover:text-foreground transition-colors">
            Past
          </a>
        )}
      </div>

      {/* Upcoming Bookings */}
      {bookings && bookings.length > 0 ? (
        <div className="space-y-2">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Date box */}
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-muted border border-border flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                      {format(new Date(booking.start_time), 'MMM')}
                    </span>
                    <span className="text-lg font-semibold leading-none mt-0.5">
                      {format(new Date(booking.start_time), 'd')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full shrink-0 ${
                        booking.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <span className="font-medium truncate">{booking.meetings?.name}</span>
                      {booking.booking_links?.name && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                          <Users className="size-3" />
                          {booking.booking_links.name}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                      <span>{format(new Date(booking.start_time), 'h:mm a')} – {format(new Date(booking.end_time), 'h:mm a')}</span>
                      <span className="flex items-center gap-1">
                        <User className="size-3.5" />
                        {booking.client_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="size-3.5" />
                        {booking.client_email}
                      </span>
                      {booking.client_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3.5" />
                          {booking.client_phone}
                        </span>
                      )}
                    </div>
                    {booking.notes && (
                      <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded text-xs">
                        {booking.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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

      {/* Past Bookings */}
      {pastBookings && pastBookings.length > 0 && (
        <div id="past" className="space-y-2 pt-4">
          <h2 className="text-lg font-medium text-muted-foreground mb-3">Past</h2>
          {pastBookings.map((booking) => (
            <Card key={booking.id} className="opacity-60">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Date box */}
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-muted border border-border flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                      {format(new Date(booking.start_time), 'MMM')}
                    </span>
                    <span className="text-lg font-semibold leading-none mt-0.5">
                      {format(new Date(booking.start_time), 'd')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full shrink-0 ${
                        booking.status === 'completed' ? 'bg-blue-500' :
                        booking.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                      }`} />
                      <span className="font-medium truncate">{booking.meetings?.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">({booking.status})</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <User className="size-3.5" />
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
      )}
    </div>
  )
}
