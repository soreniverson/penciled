'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { Calendar, Zap, AlertCircle } from 'lucide-react'
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
  const quickBookButtonRef = useRef<HTMLButtonElement>(null)

  // Enter key shortcut to open Quick Book
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if Enter is pressed and no input/textarea is focused
      if (e.key === 'Enter' &&
          !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) &&
          !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault()
        quickBookButtonRef.current?.click()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
            <Button ref={quickBookButtonRef} variant="outline" size="icon" title="Quick Book (Enter)">
              <Zap className="size-4" />
            </Button>
          </QuickBookDialog>
          {bookingPageUrl && (
            <CopyButton text={bookingPageUrl} />
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
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="shrink-0 bg-muted rounded-lg px-3 py-2 text-center min-w-[90px]">
                          <p className="text-xs text-muted-foreground leading-tight">{formatBookingDate(startDate)}</p>
                          <p className="text-xl font-semibold leading-tight">{format(startDate, 'h:mm')}</p>
                          <p className="text-xs text-muted-foreground leading-tight">{format(startDate, 'a')}</p>
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                          <p className="font-medium text-lg truncate leading-tight">{booking.client_name}</p>
                          <p className="text-sm text-muted-foreground truncate leading-tight">
                            {booking.meetings?.name}
                            {booking.status === 'pending' && <span className="text-yellow-500 ml-2">(pending)</span>}
                          </p>
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
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="shrink-0 bg-muted rounded-lg px-3 py-2 text-center min-w-[90px]">
                          <p className="text-xs text-muted-foreground leading-tight">{format(startDate, 'EEE, MMM d')}</p>
                          <p className="text-xl font-semibold leading-tight">{format(startDate, 'h:mm')}</p>
                          <p className="text-xs text-muted-foreground leading-tight">{format(startDate, 'a')}</p>
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                          <p className="font-medium text-lg truncate leading-tight">{booking.client_name}</p>
                          <p className="text-sm text-muted-foreground truncate leading-tight">
                            {booking.meetings?.name}
                            {booking.status !== 'confirmed' && (
                              <span className={`ml-2 ${booking.status === 'cancelled' ? 'text-red-500' : ''}`}>
                                ({booking.status})
                              </span>
                            )}
                          </p>
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
