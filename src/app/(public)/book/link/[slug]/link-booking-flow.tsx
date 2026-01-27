'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { formatPrice, formatDuration } from '@/lib/utils'
import { type TimeSlot } from '@/lib/availability'
import type { BookingLink, Provider, Service } from '@/types/database'
import { format } from 'date-fns'
import { Clock, ArrowLeft, Check, Loader2, CalendarDays, Users, Globe, AlertCircle } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import Link from 'next/link'

type Member = {
  providerId: string
  isRequired: boolean
  provider: Provider
}

type Props = {
  bookingLink: BookingLink
  members: Member[]
  services: Service[]
  ownerTimezone: string
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

export function LinkBookingFlow({ bookingLink, members, services, ownerTimezone }: Props) {
  const [step, setStep] = useState<BookingStep>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [loadingDates, setLoadingDates] = useState(true)

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [isPendingRequest, setIsPendingRequest] = useState(false)

  const formattedTimezone = formatTimezone(ownerTimezone)

  // Get display name (either booking link name or owner's business name)
  const displayName = bookingLink.name

  // Required members for display
  const requiredMembers = members.filter(m => m.isRequired)

  // Fetch available dates when component mounts
  useEffect(() => {
    const fetchDates = async () => {
      setLoadingDates(true)
      try {
        const response = await fetch(
          `/api/availability/link-slots?booking_link_id=${bookingLink.id}&action=dates`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch available dates')
        }

        const { dates } = await response.json()
        setAvailableDates(dates.map((d: string) => new Date(d)))
      } catch (error) {
        console.error('Error fetching dates:', error)
        setAvailableDates([])
      } finally {
        setLoadingDates(false)
      }
    }

    fetchDates()
  }, [bookingLink.id])

  // Fetch time slots when date/service changes
  useEffect(() => {
    if (!selectedDate || !selectedService) return

    const fetchSlots = async () => {
      setLoadingSlots(true)

      try {
        const response = await fetch(
          `/api/availability/link-slots?booking_link_id=${bookingLink.id}&service_id=${selectedService.id}&date=${selectedDate.toISOString()}`
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
  }, [selectedDate, selectedService, bookingLink.id])

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
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
        setSelectedService(null)
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
    if (!selectedService || !selectedDate || !selectedSlot) return

    setSubmitting(true)
    setError(null)

    try {
      const startTimeUTC = selectedSlot.start.toISOString()
      const endTimeUTC = selectedSlot.end.toISOString()

      // Use the first required member's provider_id for the booking
      // In future, this could create bookings for all members
      const primaryMember = requiredMembers[0]

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: primaryMember.providerId,
          service_id: selectedService.id,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone || null,
          notes: notes || null,
          start_time: startTimeUTC,
          end_time: endTimeUTC,
          booking_link_id: bookingLink.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create booking')
      }

      const { booking } = await response.json()

      setBookingId(booking.id)
      setIsPendingRequest(selectedService.booking_mode === 'request')
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
          <div className="flex items-center justify-center">
            <h1 className="text-lg font-semibold">{displayName}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        {/* Team members indicator */}
        {step !== 'confirmation' && requiredMembers.length > 1 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground justify-center">
            <Users className="size-4" />
            <span>Scheduling with {requiredMembers.length} team members</span>
          </div>
        )}

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
                {step === 'service' && 'Select a service'}
                {step === 'date' && 'Pick a date'}
                {step === 'time' && 'Pick a time'}
                {step === 'details' && 'Your details'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 h-5">
                {step === 'service' && `${services.length} available`}
                {step === 'date' && selectedService && `${selectedService.name} • ${formatDuration(selectedService.duration_minutes)}`}
                {step === 'time' && selectedDate && format(selectedDate, 'EEEE, MMMM d')}
                {step === 'details' && selectedDate && selectedSlot && `${format(selectedDate, 'EEE, MMM d')} at ${format(selectedSlot.start, 'h:mm a')}`}
              </p>
            </div>
          </div>
        )}

        {/* Content area */}
        <div>
          {/* Step: Select Service */}
          {step === 'service' && (
            <div className="space-y-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="w-full text-left p-4 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{service.name}</h3>
                        {service.booking_mode === 'request' && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                            Requires approval
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      )}
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {formatDuration(service.duration_minutes)}
                      </p>
                    </div>
                    <span className="font-medium text-sm">
                      {formatPrice(service.price_cents, service.currency)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step: Select Date */}
          {step === 'date' && selectedService && (
            <div className="space-y-4">
              {loadingDates ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}

          {/* Step: Select Time */}
          {step === 'time' && selectedService && selectedDate && (
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
                  {/* Time slot grid - optimized for mobile with larger touch targets */}
                  <div className="grid grid-cols-3 gap-2">
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
          {step === 'details' && selectedService && selectedDate && selectedSlot && (
            <Card>
              <CardContent className="pt-4 space-y-5">
                {/* Booking Summary */}
                <div className="p-4 rounded-lg bg-secondary space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{selectedService.name}</span>
                    <span className="font-medium">{formatPrice(selectedService.price_cents, selectedService.currency)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDuration(selectedService.duration_minutes)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="size-3" />
                    {formattedTimezone}
                  </p>
                  {requiredMembers.length > 1 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="size-3" />
                      {requiredMembers.length} team members
                    </p>
                  )}
                </div>

                {/* Booking mode notice */}
                {selectedService.booking_mode === 'request' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <AlertCircle className="size-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">
                      This booking requires approval. You&apos;ll receive a confirmation email once approved.
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
                    ) : selectedService.booking_mode === 'request' ? (
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
          {step === 'confirmation' && selectedService && selectedDate && selectedSlot && (
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
                  ? `We'll email you at ${clientEmail} once confirmed.`
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
                    <p className="font-medium">{selectedService.name}</p>
                    <p className="text-sm text-muted-foreground">{formatDuration(selectedService.duration_minutes)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="size-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{displayName}</p>
                    {requiredMembers.length > 1 && (
                      <p className="text-sm text-muted-foreground">{requiredMembers.length} team members</p>
                    )}
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
