import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatInTimeZone } from 'date-fns-tz'
import { Calendar, Clock, User, MapPin, Check, X } from 'lucide-react'
import Link from 'next/link'
import { CancelBookingClient } from './cancel-button'
import type { Booking, Service, Provider } from '@/types/database'

type BookingWithDetails = Booking & {
  services: Pick<Service, 'name' | 'duration_minutes'> | null
  providers: Pick<Provider, 'business_name' | 'email' | 'timezone'> | null
}

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function ManageBookingPage({ params, searchParams }: Props) {
  const { id } = await params
  const { token } = await searchParams

  const supabase = await createClient()

  // Fetch booking with service and provider info
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      services (name, duration_minutes),
      providers (business_name, email, timezone)
    `)
    .eq('id', id)
    .single()
    .then(res => ({ ...res, data: res.data as BookingWithDetails | null }))

  if (!booking) {
    notFound()
  }

  // Verify management token
  if (booking.management_token !== token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <X className="size-12 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-semibold mb-2">Invalid Link</h1>
            <p className="text-muted-foreground">
              This booking link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isCancelled = booking.status === 'cancelled'
  const isPast = new Date(booking.end_time) < new Date()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            penciled.fyi
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              {isCancelled ? (
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <X className="size-4" />
                  Cancelled
                </span>
              ) : isPast ? (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Check className="size-4" />
                  Completed
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="size-4" />
                  Confirmed
                </span>
              )}
            </div>
            <CardTitle>Your Booking</CardTitle>
            <CardDescription>
              {isCancelled
                ? 'This booking has been cancelled.'
                : isPast
                ? 'This booking has been completed.'
                : 'View and manage your appointment.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Service</p>
              <p className="font-medium">{booking.services?.name}</p>
            </div>

            <Separator />

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="size-4" />
                  Date
                </p>
                <p className="font-medium">
                  {formatInTimeZone(new Date(booking.start_time), booking.providers?.timezone || 'UTC', 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="size-4" />
                  Time
                </p>
                <p className="font-medium">
                  {formatInTimeZone(new Date(booking.start_time), booking.providers?.timezone || 'UTC', 'h:mm a')} - {formatInTimeZone(new Date(booking.end_time), booking.providers?.timezone || 'UTC', 'h:mm a')}
                </p>
              </div>
            </div>

            <Separator />

            {/* Provider */}
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <User className="size-4" />
                Provider
              </p>
              <p className="font-medium">
                {booking.providers?.business_name}
              </p>
            </div>

            {/* Notes */}
            {booking.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{booking.notes}</p>
                </div>
              </>
            )}

            {/* Cancellation Info */}
            {isCancelled && booking.cancellation_reason && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Cancellation Reason</p>
                  <p className="text-sm">{booking.cancellation_reason}</p>
                </div>
              </>
            )}

            {/* Actions */}
            {!isCancelled && !isPast && (
              <>
                <Separator />
                <div className="pt-2 space-y-2">
                  <Link href={`/booking/${booking.id}/reschedule?token=${token}`} className="block">
                    <Button variant="outline" className="w-full">
                      Reschedule
                    </Button>
                  </Link>
                  <CancelBookingClient
                    bookingId={booking.id}
                    token={token!}
                    providerName={booking.providers?.business_name || 'the provider'}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="border-t mt-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-muted-foreground">
            Powered by{' '}
            <Link href="/" className="underline hover:text-foreground">
              penciled.fyi
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
