'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { Calendar, ExternalLink, Plus, AlertCircle } from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import type { Booking, Meeting } from '@/types/database'
import { CopyButton } from '@/components/copy-button'
import { CancelBookingButton } from './bookings/cancel-button'
import { CompleteBookingButton } from './bookings/complete-button'
import { ApproveBookingButton, DeclineBookingButton } from './bookings/approve-button'
import { QuickBookDialog } from './bookings/quick-book-dialog'

type BookingWithMeeting = Booking & {
  meetings: Pick<Meeting, 'name' | 'duration_minutes'> | null
}

type Props = {
  userId: string
  userSlug: string | null
  upcomingBookings: BookingWithMeeting[]
  pastBookings: BookingWithMeeting[]
  delegateBookings?: {
    principalId: string
    principalName: string | null
    upcomingBookings: BookingWithMeeting[]
    pastBookings: BookingWithMeeting[]
  } | null
}

function formatBookingDate(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'EEE, MMM d')
}

export function BookingsPageClient({
  userId,
  userSlug,
  upcomingBookings: userUpcoming,
  pastBookings: userPast,
  delegateBookings,
}: Props) {
  const searchParams = useSearchParams()
  const principalId = searchParams.get('principal')

  // Determine which bookings to show
  const isViewingPrincipal = principalId && delegateBookings?.principalId === principalId
  const upcomingBookings = isViewingPrincipal ? delegateBookings.upcomingBookings : userUpcoming
  const pastBookings = isViewingPrincipal ? delegateBookings.pastBookings : userPast
  const effectiveProviderId = isViewingPrincipal ? principalId : userId

  const bookingPageUrl = !isViewingPrincipal && userSlug
    ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/${userSlug}`
    : null

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      <PageHeader title="Bookings">
        <div className="flex gap-2">
          <QuickBookDialog providerId={userId} principalId={isViewingPrincipal ? principalId : null}>
            <Button variant="outline" size="sm">
              <Plus className="size-4 mr-1" />
              Quick Book
            </Button>
          </QuickBookDialog>
          {bookingPageUrl && (
            <>
              <CopyButton text={bookingPageUrl} />
              <Link href={`/${userSlug}`} target="_blank">
                <Button variant="outline" size="icon">
                  <ExternalLink className="size-4" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </PageHeader>

      {/* Delegate Mode Indicator */}
      {isViewingPrincipal && delegateBookings && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <AlertCircle className="size-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Viewing bookings for {delegateBookings.principalName || 'your principal'}
          </span>
        </div>
      )}

      {/* Upcoming Bookings */}
      <div className="space-y-3">
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
