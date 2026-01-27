'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDuration } from '@/lib/utils'
import { generateTimeSlots, getAvailableDates, type TimeSlot } from '@/lib/availability'
import type { Provider, Service, Availability, Booking } from '@/types/database'
import { format, startOfDay, endOfDay } from 'date-fns'
import { Clock, ArrowLeft, Check, Loader2, CalendarDays } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import Link from 'next/link'

type Props = {
  booking: Booking
  provider: Provider
  service: Service
  availability: Availability[]
  token: string
}

type RescheduleStep = 'date' | 'time' | 'confirmation'

export function RescheduleFlow({ booking, provider, service, availability, token }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<RescheduleStep>('date')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableDates = getAvailableDates(availability, provider.timezone)

  useEffect(() => {
    if (!selectedDate) return

    const fetchSlots = async () => {
      setLoadingSlots(true)
      const supabase = createClient()

      const dayStart = startOfDay(selectedDate)
      const dayEnd = endOfDay(selectedDate)

      const { data: bookings } = await supabase
        .from('bookings')
        .select('start_time, end_time, status')
        .eq('provider_id', provider.id)
        .neq('status', 'cancelled')
        .neq('id', booking.id) // Exclude current booking
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())

      const slots = generateTimeSlots(
        selectedDate,
        availability,
        service,
        bookings || [],
        provider.timezone
      )

      setTimeSlots(slots)
      setLoadingSlots(false)
    }

    fetchSlots()
  }, [selectedDate, availability, provider, service, booking.id])

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
          <div className="flex items-center gap-3">
            {provider.logo_url && (
              <img
                src={provider.logo_url}
                alt={provider.business_name || 'Logo'}
                className="h-8 w-auto object-contain"
              />
            )}
            <h1 className="text-lg font-semibold">{provider.business_name}</h1>
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
                {step === 'date' && `Rescheduling: ${service.name}`}
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
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{formatDuration(service.duration_minutes)}</p>
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
