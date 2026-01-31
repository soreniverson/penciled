'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, AlertTriangle } from 'lucide-react'
import type { Meeting, DelegatePermissions } from '@/types/database'
import { format, addMinutes, setHours, setMinutes, startOfDay, addDays } from 'date-fns'

type Props = {
  providerId: string
  principalId?: string | null
  children: React.ReactNode
}

type PermissionInfo = {
  canBook: boolean
  canOverrideAvailability: boolean
  canOverrideConflicts: boolean
}

export function QuickBookDialog({ providerId, principalId, children }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [permissions, setPermissions] = useState<PermissionInfo>({
    canBook: true,
    canOverrideAvailability: false,
    canOverrideConflicts: false,
  })

  // Form state
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [meetingId, setMeetingId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [overrideAvailability, setOverrideAvailability] = useState(false)
  const [overrideConflicts, setOverrideConflicts] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  const effectiveProviderId = principalId || providerId

  // Fetch data when dialog opens
  useEffect(() => {
    if (!open) return

    const fetchData = async () => {
      const supabase = createClient()

      type MeetingResult = {
        id: string
        name: string
        duration_minutes: number
      }

      // Fetch meetings for the effective provider
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('id, name, duration_minutes')
        .eq('provider_id', effectiveProviderId)
        .eq('is_active', true)
        .order('name') as { data: MeetingResult[] | null }

      if (meetingsData) {
        setMeetings(meetingsData as Meeting[])
        if (meetingsData.length > 0) {
          setMeetingId(meetingsData[0].id)
        }
      }

      // Check delegation permissions if booking for a principal
      if (principalId && principalId !== providerId) {
        type DelegationResult = {
          permissions: DelegatePermissions
        }

        const { data: delegation } = await supabase
          .from('delegates')
          .select('permissions')
          .eq('principal_id', principalId)
          .eq('delegate_id', providerId)
          .single() as { data: DelegationResult | null }

        if (delegation?.permissions) {
          const perms = delegation.permissions
          setPermissions({
            canBook: perms.book,
            canOverrideAvailability: perms.override_availability,
            canOverrideConflicts: perms.override_conflicts,
          })
        }
      } else {
        // User is the provider - full permissions
        setPermissions({
          canBook: true,
          canOverrideAvailability: true,
          canOverrideConflicts: true,
        })
      }

      // Set default date to tomorrow
      const tomorrow = addDays(new Date(), 1)
      setSelectedDate(format(tomorrow, 'yyyy-MM-dd'))
      setSelectedTime('10:00')
    }

    fetchData()
  }, [open, effectiveProviderId, providerId, principalId])

  const resetForm = () => {
    setClientName('')
    setClientEmail('')
    setClientPhone('')
    setMeetingId(meetings[0]?.id || '')
    setSelectedDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
    setSelectedTime('10:00')
    setNotes('')
    setOverrideAvailability(false)
    setOverrideConflicts(false)
    setOverrideReason('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const selectedMeeting = meetings.find(m => m.id === meetingId)
      if (!selectedMeeting) {
        setError('Please select a meeting')
        return
      }

      // Parse date and time
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const dateObj = startOfDay(new Date(selectedDate))
      const startTime = setMinutes(setHours(dateObj, hours), minutes)
      const endTime = addMinutes(startTime, selectedMeeting.duration_minutes)

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: effectiveProviderId,
          meeting_id: meetingId,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          notes: notes || null,
          override_availability: overrideAvailability,
          override_conflicts: overrideConflicts,
          override_reason: (overrideAvailability || overrideConflicts) ? overrideReason || 'Quick book by provider' : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create booking')
        return
      }

      setOpen(false)
      resetForm()
      router.refresh()
    } catch {
      setError('Failed to create booking')
    } finally {
      setLoading(false)
    }
  }

  const selectedMeeting = meetings.find(m => m.id === meetingId)

  // Generate time slots (every 15 minutes)
  const timeSlots: string[] = []
  for (let h = 6; h < 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      timeSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Quick Book</DialogTitle>
            <DialogDescription>
              Create a booking on behalf of a client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Client Details */}
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email *</Label>
              <Input
                id="clientEmail"
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientPhone">Client Phone (optional)</Label>
              <Input
                id="clientPhone"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+1 555 123 4567"
              />
            </div>

            {/* Meeting Selection */}
            <div className="space-y-2">
              <Label htmlFor="meeting">Meeting *</Label>
              <Select value={meetingId} onValueChange={setMeetingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a meeting" />
                </SelectTrigger>
                <SelectContent>
                  {meetings.map((meeting) => (
                    <SelectItem key={meeting.id} value={meeting.id}>
                      {meeting.name} ({meeting.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeSlots.map((time: string) => (
                      <SelectItem key={time} value={time}>
                        {format(setMinutes(setHours(new Date(), parseInt(time.split(':')[0])), parseInt(time.split(':')[1])), 'h:mm a')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedMeeting && selectedDate && selectedTime && (
              <p className="text-sm text-muted-foreground">
                {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')} at{' '}
                {format(setMinutes(setHours(new Date(), parseInt(selectedTime.split(':')[0])), parseInt(selectedTime.split(':')[1])), 'h:mm a')}
                {' - '}
                {format(addMinutes(setMinutes(setHours(new Date(), parseInt(selectedTime.split(':')[0])), parseInt(selectedTime.split(':')[1])), selectedMeeting.duration_minutes), 'h:mm a')}
              </p>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for this booking..."
                rows={2}
              />
            </div>

            {/* Override Section */}
            {(permissions.canOverrideAvailability || permissions.canOverrideConflicts) && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-yellow-500" />
                  <span className="text-sm font-medium">Override Options</span>
                </div>

                {permissions.canOverrideAvailability && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={overrideAvailability}
                      onCheckedChange={(checked) => setOverrideAvailability(checked === true)}
                    />
                    <span className="text-sm">Override availability</span>
                  </label>
                )}

                {permissions.canOverrideConflicts && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={overrideConflicts}
                      onCheckedChange={(checked) => setOverrideConflicts(checked === true)}
                    />
                    <span className="text-sm">Override conflicts</span>
                  </label>
                )}

                {(overrideAvailability || overrideConflicts) && (
                  <div className="space-y-2">
                    <Label htmlFor="overrideReason">Override Reason</Label>
                    <Input
                      id="overrideReason"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Reason for override..."
                    />
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !clientName || !clientEmail || !meetingId || !selectedDate || !selectedTime}>
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              Create Booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
