'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { generateSlug, getTimezoneOffset } from '@/lib/utils'
import { Check, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'

const BUSINESS_CATEGORIES = [
  'Tutoring & Education',
  'Personal Training & Fitness',
  'Photography',
  'Consulting',
  'Cleaning Services',
  'Hair & Beauty',
  'Health & Wellness',
  'Music Lessons',
  'Life Coaching',
  'Other',
]

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

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Business info
  const [businessName, setBusinessName] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [timezone, setTimezone] = useState(getTimezoneOffset())

  // Step 2: Meeting
  const [meetingName, setMeetingName] = useState('')
  const [meetingDuration, setMeetingDuration] = useState('60')

  // Step 3: Availability
  const [availability, setAvailability] = useState<Record<number, AvailabilityDay>>({
    0: { enabled: false, startTime: '09:00', endTime: '17:00' },
    1: { enabled: true, startTime: '09:00', endTime: '17:00' },
    2: { enabled: true, startTime: '09:00', endTime: '17:00' },
    3: { enabled: true, startTime: '09:00', endTime: '17:00' },
    4: { enabled: true, startTime: '09:00', endTime: '17:00' },
    5: { enabled: true, startTime: '09:00', endTime: '17:00' },
    6: { enabled: false, startTime: '09:00', endTime: '17:00' },
  })

  // Step 4: Slug
  const [slug, setSlug] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)

  // Generate slug when business name changes
  useEffect(() => {
    if (businessName && !slug) {
      setSlug(generateSlug(businessName))
    }
  }, [businessName, slug])

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

  const handleNext = () => {
    setError(null)

    if (step === 1) {
      if (!businessName.trim()) {
        setError('Please enter your business name')
        return
      }
    }

    if (step === 2) {
      if (!meetingName.trim()) {
        setError('Please enter a meeting name')
        return
      }
    }

    if (step === 3) {
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
          business_name: businessName,
          business_category: businessCategory || null,
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3, 4].map((s) => (
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
            Step {step} of 4
          </p>
        </div>

        {/* Step 1: Business Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Tell us about your business</CardTitle>
              <CardDescription>
                This helps us personalize your booking page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business name *</Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Sarah's Piano Lessons"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category (optional)</Label>
                <Select value={businessCategory} onValueChange={setBusinessCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        {/* Step 2: Meeting */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Create your first meeting</CardTitle>
              <CardDescription>
                What type of meeting do you offer? You can add more later.
              </CardDescription>
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

        {/* Step 3: Availability */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Set your availability</CardTitle>
              <CardDescription>
                When can clients book appointments with you?
              </CardDescription>
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

        {/* Step 4: Slug/Preview */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose your booking URL</CardTitle>
              <CardDescription>
                This is the link you&apos;ll share with clients.
              </CardDescription>
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
                  <p><strong>Business:</strong> {businessName}</p>
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
          {step < 4 ? (
            <Button onClick={handleNext}>
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
