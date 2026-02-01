'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDuration } from '@/lib/utils'
import { getAvailableDates, type TimeSlot } from '@/lib/availability'
import type { Provider, Meeting, Availability, Booking } from '@/types/database'
import { format } from 'date-fns'
import { Clock, ArrowLeft, Check, Loader2, CalendarDays } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import Link from 'next/link'
import Image from 'next/image'

type BlackoutDateRange = {
  start_date: string
  end_date: string
}

type Props = {
  booking: Booking
  provider: Provider
  meeting: Meeting
  availability: Availability[]
  token: string
}

type RescheduleStep = 'date' | 'time' | 'confirmation'

export function RescheduleFlow({ booking, provider, meeting, availability, token }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<RescheduleStep>('date')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDateRange[]>([])

  // Fetch blackout dates on mount
  useEffect(() => {
    const fetchBlackoutDates = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('blackout_dates')
        .select('start_date, end_date')
        .eq('provider_id', provider.id)

      if (data) {
        setBlackoutDates(data)
      }
    }

    fetchBlackoutDates()
  }, [provider.id])

  const availableDates = useMemo(() => {
    return getAvailableDates(availability, provider.timezone, 60, blackoutDates)
  }, [availability, provider.timezone, blackoutDates])

  useEffect(() => {
    if (!selectedDate) return

    const fetchSlots = async () => {
      setLoadingSlots(true)

      try {
        const response = await fetch(
          `/api/availability/slots?provider_id=${provider.id}&meeting_id=${meeting.id}&date=${selectedDate.toISOString()}&exclude_booking_id=${booking.id}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch availability')
        }

        const { slots: apiSlots } = await response.json()

        // Convert ISO strings back to Date objects for TimeSlot format
        const slots = apiSlots.map((slot: { start: string; end: string; available: boolean }) => ({
          start: new Date(slot.start),
          end: new Date(slot.end),
          available: slot.available,
        }))

        setTimeSlots(slots)
      } catch (error) {
        console.error('Error fetching slots:', error)
        setTimeSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [selectedDate, provider.id, meeting.id, booking.id])

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setStep('time')
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot)
  }

  const handleBack = () => {
    switch (step) {
      case 'time':
        setStep('date')
        setSelectedDate(null)
        break
    }
  }

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          start_time: selectedSlot.start.toISOString(),
          end_time: selectedSlot.end.toISOString(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reschedule')
      }

      setStep('confirmation')
    } catch (err) {
      console.error('Reschedule error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-sm bg-background/80">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className={`flex items-center ${provider.logo_url ? 'justify-center' : ''}`}>
            {provider.logo_url ? (
              <Image
                src={provider.logo_url}
                alt={provider.business_name || 'Logo'}
                width={120}
                height={24}
                className="h-6 w-auto object-contain"
                unoptimized={provider.logo_url.startsWith('data:')}
              />
            ) : (
              <h1 className="text-lg font-semibold">{provider.business_name}</h1>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        {/* Header area */}
        {step !== 'confirmation' && (
          <div className="mb-6">
            <div className="h-8 flex items-center">
              {step !== 'date' && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -ml-1"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </button>
              )}
            </div>

            <div className="mt-2">
              <h2 className="text-xl font-semibold">
                {step === 'date' && 'Pick a new date'}
                {step === 'time' && 'Pick a new time'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 h-5">
                {step === 'date' && `Rescheduling: ${meeting.name}`}
                {step === 'time' && selectedDate && format(selectedDate, 'EEEE, MMMM d')}
              </p>
            </div>
          </div>
        )}

        {/* Current booking info */}
        {step === 'date' && (
          <div className="mb-4 p-3 rounded-lg bg-secondary text-sm">
            <p className="text-muted-foreground">Current appointment:</p>
            <p className="font-medium">
              {format(new Date(booking.start_time), 'EEE, MMM d')} at {format(new Date(booking.start_time), 'h:mm a')}
            </p>
          </div>
        )}

        {/* Content */}
        <div>
          {/* Step: Select Date */}
          {step === 'date' && (
            <Calendar
              selected={selectedDate}
              onSelect={handleDateSelect}
              availableDates={availableDates}
            />
          )}

          {/* Step: Select Time */}
          {step === 'time' && selectedDate && (
            <>
              {loadingSlots ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : timeSlots.filter(s => s.available).length === 0 ? (
                <div className="text-center py-16">
                  <CalendarDays className="size-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No times available</p>
                  <button onClick={handleBack} className="text-sm underline mt-2">
                    Pick another date
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {timeSlots.filter(s => s.available).map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => handleSlotSelect(slot)}
                        className={`w-full py-3 px-4 text-sm font-medium rounded-lg border transition-colors text-center ${
                          selectedSlot?.start.getTime() === slot.start.getTime()
                            ? 'border-foreground bg-secondary'
                            : 'bg-card hover:border-muted-foreground'
                        }`}
                      >
                        {format(slot.start, 'h:mm a')}
                      </button>
                    ))}
                  </div>

                  {selectedSlot && (
                    <div className="pt-4">
                      {error && (
                        <p className="text-sm text-destructive mb-4">{error}</p>
                      )}
                      <Button
                        onClick={handleSubmit}
                        className="w-full h-11"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          'Confirm New Time'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Step: Confirmation */}
          {step === 'confirmation' && selectedDate && selectedSlot && (
            <div className="text-center py-8">
              <div className="size-14 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="size-7 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">Rescheduled!</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Your new appointment time has been confirmed.
              </p>

              <div className="mt-8 p-4 rounded-lg bg-card border text-left space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarDays className="size-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(selectedSlot.start, 'h:mm a')} - {format(selectedSlot.end, 'h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="size-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{meeting.name}</p>
                    <p className="text-sm text-muted-foreground">{formatDuration(meeting.duration_minutes)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Link href={`/booking/${booking.id}/manage?token=${token}`}>
                  <Button variant="outline">View Booking</Button>
                </Link>
              </div>

              <p className="mt-8 text-xs text-muted-foreground">
                Powered by <Link href="/" className="underline">penciled.fyi</Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
