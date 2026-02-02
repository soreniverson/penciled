'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { generateSlug, getTimezoneOffset } from '@/lib/utils'
import { Check, ArrowRight, ArrowLeft, Loader2, Calendar } from 'lucide-react'

const DURATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
]

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

const DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

type AvailabilityDay = {
  enabled: boolean
  startTime: string
  endTime: string
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Name and timezone
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState(getTimezoneOffset())

  // Step 2: Google Calendar
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [connectingCalendar, setConnectingCalendar] = useState(false)

  // Step 3: Meeting
  const [meetingName, setMeetingName] = useState('')
  const [meetingDuration, setMeetingDuration] = useState('60')

  // Step 4: Availability
  const [availability, setAvailability] = useState<Record<number, AvailabilityDay>>({
    0: { enabled: false, startTime: '09:00', endTime: '17:00' },
    1: { enabled: true, startTime: '09:00', endTime: '17:00' },
    2: { enabled: true, startTime: '09:00', endTime: '17:00' },
    3: { enabled: true, startTime: '09:00', endTime: '17:00' },
    4: { enabled: true, startTime: '09:00', endTime: '17:00' },
    5: { enabled: true, startTime: '09:00', endTime: '17:00' },
    6: { enabled: false, startTime: '09:00', endTime: '17:00' },
  })

  // Step 5: Slug
  const [slug, setSlug] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)

  // Check initial state: calendar connection and URL params from OAuth callback
  useEffect(() => {
    const checkInitialState = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if calendar is already connected
        const { data: provider } = await supabase
          .from('providers')
          .select('google_calendar_token')
          .eq('id', user.id)
          .single() as { data: { google_calendar_token: unknown } | null }

        if (provider?.google_calendar_token) {
          setCalendarConnected(true)
        }
      }

      // Handle OAuth callback params
      const success = searchParams.get('success')
      const oauthError = searchParams.get('error')

      if (success === 'google_connected') {
        setCalendarConnected(true)
        setStep(2) // Stay on step 2 to show connected state
      } else if (oauthError) {
        setStep(2) // Go to step 2 to show error
        if (oauthError === 'google_denied') {
          setError('Google Calendar access was denied. Please try again.')
        } else {
          setError('Failed to connect Google Calendar. Please try again.')
        }
      }

      setInitialLoading(false)
    }

    checkInitialState()
  }, [searchParams])

  // Generate slug when name changes
  useEffect(() => {
    if (name && !slug) {
      setSlug(generateSlug(name))
    }
  }, [name, slug])

  // Check slug availability
  useEffect(() => {
    if (!slug) {
      setSlugAvailable(null)
      return
    }

    const checkSlug = async () => {
      setCheckingSlug(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('providers')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      setSlugAvailable(!data)
      setCheckingSlug(false)
    }

    const debounce = setTimeout(checkSlug, 500)
    return () => clearTimeout(debounce)
  }, [slug])

  const handleConnectCalendar = () => {
    setConnectingCalendar(true)
    // Redirect to Google OAuth with onboarding redirect
    window.location.href = '/api/auth/google-calendar?redirect=/onboarding'
  }

  const handleNext = () => {
    setError(null)

    if (step === 1) {
      if (!name.trim()) {
        setError('Please enter your name')
        return
      }
    }

    if (step === 2) {
      if (!calendarConnected) {
        setError('Please connect your Google Calendar to continue')
        return
      }
    }

    if (step === 3) {
      if (!meetingName.trim()) {
        setError('Please enter a meeting name')
        return
      }
    }

    if (step === 4) {
      const hasAvailability = Object.values(availability).some(day => day.enabled)
      if (!hasAvailability) {
        setError('Please set at least one day of availability')
        return
      }
    }

    setStep(step + 1)
  }

  const handleBack = () => {
    setError(null)
    setStep(step - 1)
  }

  const handleComplete = async () => {
    if (!slugAvailable) {
      setError('Please choose an available URL')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Update provider
      const { error: providerError } = await supabase
        .from('providers')
        // @ts-ignore - Supabase types not inferring correctly
        .update({
          name,
          business_name: name,
          timezone,
          slug,
        })
        .eq('id', user.id)

      if (providerError) throw providerError

      // Create meeting
      const { error: meetingError } = await supabase
        .from('meetings')
        // @ts-ignore - Supabase types not inferring correctly
        .insert({
          provider_id: user.id,
          name: meetingName,
          duration_minutes: parseInt(meetingDuration),
        })

      if (meetingError) throw meetingError

      // Create availability
      const availabilityRecords = Object.entries(availability)
        .filter(([, day]) => day.enabled)
        .map(([dayOfWeek, day]) => ({
          provider_id: user.id,
          day_of_week: parseInt(dayOfWeek),
          start_time: day.startTime,
          end_time: day.endTime,
        }))

      const { error: availabilityError } = await supabase
        .from('availability')
        // @ts-ignore - Supabase types not inferring correctly
        .insert(availabilityRecords)

      if (availabilityError) throw availabilityError

      router.push('/dashboard')
    } catch (err) {
      console.error('Onboarding error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateAvailability = (day: number, updates: Partial<AvailabilityDay>) => {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }))
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center size-8 rounded-full text-sm font-medium transition-colors ${
                  s < step
                    ? 'bg-primary text-primary-foreground'
                    : s === step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <Check className="size-4" /> : s}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Step {step} of 5
          </p>
        </div>

        {/* Step 1: Name and Timezone */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Tell us about yourself</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Sarah's Piano Lessons"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Google Calendar */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Connect your calendar</CardTitle>
              <CardDescription>
                Sync your bookings and prevent double-booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {calendarConnected ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center justify-center size-10 rounded-full bg-green-100">
                    <Check className="size-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Google Calendar connected</p>
                    <p className="text-sm text-green-700">Your bookings will sync automatically</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-start gap-3">
                      <Calendar className="size-5 text-muted-foreground mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Why connect Google Calendar?</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Automatically add bookings to your calendar</li>
                          <li>• Block times when you&apos;re already busy</li>
                          <li>• Send calendar invites to clients</li>
                          <li>• Create Google Meet links for video calls</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleConnectCalendar}
                    disabled={connectingCalendar}
                    className="w-full"
                    size="lg"
                  >
                    {connectingCalendar ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Calendar className="size-4 mr-2" />
                    )}
                    Connect Google Calendar
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Meeting */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Create your first meeting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meetingName">Meeting name *</Label>
                <Input
                  id="meetingName"
                  placeholder="e.g., Consultation Call"
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select value={meetingDuration} onValueChange={setMeetingDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Availability */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Set your availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {DAYS.map((day) => (
                <div
                  key={day.value}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={availability[day.value].enabled}
                      onCheckedChange={(checked) =>
                        updateAvailability(day.value, { enabled: checked })
                      }
                    />
                    <span className="w-20 text-sm font-medium">{day.label}</span>
                  </div>
                  {availability[day.value].enabled && (
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <Input
                        type="time"
                        className="w-24 sm:w-28"
                        value={availability[day.value].startTime}
                        onChange={(e) =>
                          updateAvailability(day.value, { startTime: e.target.value })
                        }
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        className="w-24 sm:w-28"
                        value={availability[day.value].endTime}
                        onChange={(e) =>
                          updateAvailability(day.value, { endTime: e.target.value })
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 5: Slug/Preview */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose your booking URL</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Your URL</Label>
                <div className="flex items-center gap-0">
                  <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">
                    penciled.fyi/book/
                  </span>
                  <Input
                    id="slug"
                    className="rounded-l-none"
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                  />
                </div>
                {checkingSlug && (
                  <p className="text-sm text-muted-foreground">Checking availability...</p>
                )}
                {!checkingSlug && slugAvailable === true && slug && (
                  <p className="text-sm text-green-600">This URL is available!</p>
                )}
                {!checkingSlug && slugAvailable === false && (
                  <p className="text-sm text-destructive">This URL is taken. Try another.</p>
                )}
              </div>

              <div className="p-4 rounded-lg border bg-muted/50">
                <p className="text-sm font-medium mb-2">Preview</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Name:</strong> {name}</p>
                  <p><strong>Meeting:</strong> {meetingName} ({meetingDuration} min)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}
          {step < 5 ? (
            <Button onClick={handleNext} disabled={step === 2 && !calendarConnected}>
              Next
              <ArrowRight className="size-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={loading || !slugAvailable}>
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
