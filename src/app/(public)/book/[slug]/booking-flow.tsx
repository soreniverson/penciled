'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { formatDuration } from '@/lib/utils'
import { getAvailableDates, type TimeSlot } from '@/lib/availability'
import type { Provider, Meeting, Availability } from '@/types/database'
import { format } from 'date-fns'
import { Clock, ArrowLeft, Check, Loader2, CalendarDays, User, Globe, AlertCircle } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import Link from 'next/link'

type BlackoutDateRange = {
  start_date: string
  end_date: string
}

type Props = {
  provider: Provider
  meetings: Meeting[]
  availability: Availability[]
}

type BookingStep = 'service' | 'date' | 'time' | 'details' | 'confirmation'

// Format timezone for display
function formatTimezone(timezone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    })
    const parts = formatter.formatToParts(now)
    const tzPart = parts.find(p => p.type === 'timeZoneName')
    return tzPart?.value || timezone
  } catch {
    return timezone
  }
}

export function BookingFlow({ provider, meetings, availability }: Props) {
  const [step, setStep] = useState<BookingStep>('service')
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [isPendingRequest, setIsPendingRequest] = useState(false)
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
    if (!selectedMeeting) return []
    return getAvailableDates(availability, provider.timezone, 60, blackoutDates)
  }, [selectedMeeting, availability, provider.timezone, blackoutDates])

  const formattedTimezone = formatTimezone(provider.timezone)

  useEffect(() => {
    if (!selectedDate || !selectedMeeting) return

    const fetchSlots = async () => {
      setLoadingSlots(true)

      try {
        const response = await fetch(
          `/api/availability/slots?provider_id=${provider.id}&meeting_id=${selectedMeeting.id}&date=${selectedDate.toISOString()}`
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
  }, [selectedDate, selectedMeeting, provider.id])

  const handleMeetingSelect = (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    setStep('date')
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setStep('time')
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot)
    setStep('details')
  }

  const handleBack = () => {
    switch (step) {
      case 'date':
        setStep('service')
        setSelectedMeeting(null)
        break
      case 'time':
        setStep('date')
        setSelectedDate(null)
        break
      case 'details':
        setStep('time')
        setSelectedSlot(null)
        break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMeeting || !selectedDate || !selectedSlot) return

    setSubmitting(true)
    setError(null)

    try {
      const startTimeUTC = selectedSlot.start.toISOString()
      const endTimeUTC = selectedSlot.end.toISOString()

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: provider.id,
          meeting_id: selectedMeeting.id,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone || null,
          notes: notes || null,
          start_time: startTimeUTC,
          end_time: endTimeUTC,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create booking')
      }

      const { booking } = await response.json()

      setBookingId(booking.id)
      setIsPendingRequest(selectedMeeting.booking_mode === 'request')
      setStep('confirmation')
    } catch (err) {
      console.error('Booking error:', err)
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
              <img
                src={provider.logo_url}
                alt={provider.business_name || 'Logo'}
                className="h-6 w-auto object-contain"
              />
            ) : (
              <h1 className="text-lg font-semibold">{provider.business_name}</h1>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        {/* Consistent header area for all steps */}
        {step !== 'confirmation' && (
          <div className="mb-6">
            {/* Back button row - fixed height */}
            <div className="h-8 flex items-center">
              {step !== 'service' && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -ml-1"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </button>
              )}
            </div>

            {/* Title and subtitle - consistent position */}
            <div className="mt-2">
              <h2 className="text-xl font-semibold">
                {step === 'service' && 'Select a meeting'}
                {step === 'date' && 'Pick a date'}
                {step === 'time' && 'Pick a time'}
                {step === 'details' && 'Your details'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 h-5">
                {step === 'service' && `${meetings.length} available`}
                {step === 'date' && selectedMeeting && `${selectedMeeting.name} • ${formatDuration(selectedMeeting.duration_minutes)}`}
                {step === 'time' && selectedDate && format(selectedDate, 'EEEE, MMMM d')}
                {step === 'details' && selectedDate && selectedSlot && `${format(selectedDate, 'EEE, MMM d')} at ${format(selectedSlot.start, 'h:mm a')}`}
              </p>
            </div>
          </div>
        )}

        {/* Content area */}
        <div>
          {/* Step: Select Meeting */}
          {step === 'service' && (
            <div className="space-y-2">
              {meetings.map((meeting) => (
                <button
                  key={meeting.id}
                  onClick={() => handleMeetingSelect(meeting)}
                  className="w-full text-left p-4 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{meeting.name}</h3>
                      {meeting.booking_mode === 'request' && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                          Requires approval
                        </span>
                      )}
                    </div>
                    {meeting.description && (
                      <p className="text-sm text-muted-foreground">{meeting.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {formatDuration(meeting.duration_minutes)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step: Select Date */}
          {step === 'date' && selectedMeeting && (
            <div className="space-y-4">
              <Calendar
                selected={selectedDate}
                onSelect={handleDateSelect}
                availableDates={availableDates}
              />
              {/* Timezone indicator */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="size-3.5" />
                <span>Times shown in {formattedTimezone}</span>
              </div>
            </div>
          )}

          {/* Step: Select Time */}
          {step === 'time' && selectedMeeting && selectedDate && (
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
                  {/* Time slot grid - responsive with larger touch targets */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {timeSlots.filter(s => s.available).map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => handleSlotSelect(slot)}
                        className="py-4 px-2 text-sm font-medium rounded-lg border bg-card hover:border-primary/40 active:bg-secondary transition-colors text-center touch-manipulation"
                      >
                        {format(slot.start, 'h:mm a')}
                      </button>
                    ))}
                  </div>
                  {/* Timezone indicator */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="size-3.5" />
                    <span>Times shown in {formattedTimezone}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step: Enter Details */}
          {step === 'details' && selectedMeeting && selectedDate && selectedSlot && (
            <Card>
              <CardContent className="pt-4 space-y-5">
                {/* Booking Summary */}
                <div className="p-4 rounded-lg bg-secondary space-y-2">
                  <p className="text-sm font-medium">{selectedMeeting.name}</p>
                  <p className="text-sm text-muted-foreground">{formatDuration(selectedMeeting.duration_minutes)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="size-3" />
                    {formattedTimezone}
                  </p>
                </div>

                {/* Booking mode notice */}
                {selectedMeeting.booking_mode === 'request' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <AlertCircle className="size-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">
                      This booking requires approval. You&apos;ll receive a confirmation email once {provider.business_name} approves your request.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm">Name</Label>
                    <Input
                      id="name"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Jane Smith"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="h-12"
                    />
                  </div>
                  {provider.collect_phone && (
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-sm">Phone <span className="text-muted-foreground">(optional)</span></Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="h-12"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-sm">Notes <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anything we should know?"
                      className="h-12"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : selectedMeeting.booking_mode === 'request' ? (
                      'Request Booking'
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step: Confirmation */}
          {step === 'confirmation' && selectedMeeting && selectedDate && selectedSlot && (
            <div className="text-center py-8">
              <div className={`size-14 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isPendingRequest ? 'bg-yellow-100' : 'bg-primary/10'
              }`}>
                <Check className={`size-7 ${isPendingRequest ? 'text-yellow-600' : 'text-primary'}`} />
              </div>
              <h2 className="text-xl font-semibold">
                {isPendingRequest ? 'Request Sent!' : "You're booked!"}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {isPendingRequest
                  ? `We'll email you at ${clientEmail} once ${provider.business_name} confirms.`
                  : `Confirmation sent to ${clientEmail}`
                }
              </p>

              <div className="mt-8 p-4 rounded-lg bg-card border text-left space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarDays className="size-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(selectedSlot.start, 'h:mm a')} - {format(selectedSlot.end, 'h:mm a')} ({formattedTimezone})
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="size-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{selectedMeeting.name}</p>
                    <p className="text-sm text-muted-foreground">{formatDuration(selectedMeeting.duration_minutes)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="size-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{provider.business_name}</p>
                  </div>
                </div>
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
