'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import type { Meeting, MeetingTemplate, Provider } from '@/types/database'

const DURATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
]

const BUFFER_OPTIONS = [
  { value: '0', label: 'No buffer' },
  { value: '5', label: '5 minutes' },
  { value: '10', label: '10 minutes' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
]

const BOOKING_MODE_OPTIONS = [
  { value: 'instant', label: 'Instant' },
  { value: 'request', label: 'Request' },
]

const VIDEO_PLATFORM_OPTIONS = [
  { value: 'auto', label: 'Automatic' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'none', label: 'No video' },
]

type Props = {
  providerId: string
  meeting?: Meeting
  children: React.ReactNode
}

export function MeetingForm({ providerId, meeting, children }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState(meeting?.name || '')
  const [description, setDescription] = useState(meeting?.description || '')
  const [duration, setDuration] = useState(String(meeting?.duration_minutes || 60))
  const [buffer, setBuffer] = useState(String(meeting?.buffer_minutes || 15))
  const [bookingMode, setBookingMode] = useState<'instant' | 'request'>(meeting?.booking_mode || 'instant')
  const [videoPlatform, setVideoPlatform] = useState<'auto' | 'google_meet' | 'zoom' | 'none'>(meeting?.video_platform || 'auto')
  const [templateId, setTemplateId] = useState<string | null>(meeting?.template_id || null)

  // Templates and provider data (fetched client-side)
  const [templates, setTemplates] = useState<MeetingTemplate[]>([])
  const [provider, setProvider] = useState<Pick<Provider, 'google_calendar_token' | 'zoom_token'> | null>(null)

  const isEditing = !!meeting

  // Fetch templates and provider data when dialog opens
  useEffect(() => {
    if (!open) return

    const fetchData = async () => {
      const supabase = createClient()

      const [{ data: templatesData }, { data: providerData }] = await Promise.all([
        supabase
          .from('meeting_templates')
          .select('id, name')
          .eq('provider_id', providerId)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('providers')
          .select('google_calendar_token, zoom_token')
          .eq('id', providerId)
          .single(),
      ])

      if (templatesData) setTemplates(templatesData as MeetingTemplate[])
      if (providerData) setProvider(providerData)
    }

    fetchData()
  }, [open, providerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)

    try {
      const supabase = createClient()

      if (isEditing) {
        await supabase
          .from('meetings')
          // @ts-ignore - Supabase types not inferring correctly
          .update({
            name,
            description: description || null,
            duration_minutes: parseInt(duration),
            buffer_minutes: parseInt(buffer),
            booking_mode: bookingMode,
            video_platform: videoPlatform,
            template_id: templateId,
          })
          .eq('id', meeting.id)
      } else {
        await supabase
          .from('meetings')
          // @ts-ignore - Supabase types not inferring correctly
          .insert({
            provider_id: providerId,
            name,
            description: description || null,
            duration_minutes: parseInt(duration),
            buffer_minutes: parseInt(buffer),
            booking_mode: bookingMode,
            video_platform: videoPlatform,
            template_id: templateId,
          })
      }

      setOpen(false)
      router.refresh()

      // Reset form for new meetings
      if (!isEditing) {
        setName('')
        setDescription('')
        setDuration('60')
        setBuffer('15')
        setVideoPlatform('auto')
        setTemplateId(null)
      }
    } catch (error) {
      console.error('Meeting save error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Meeting' : 'Add Meeting'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Consultation Call"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this meeting"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
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
              <div className="space-y-2">
                <Label htmlFor="buffer">Buffer Time</Label>
                <Select value={buffer} onValueChange={setBuffer}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUFFER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={bookingMode} onValueChange={(v) => setBookingMode(v as 'instant' | 'request')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Video</Label>
              <Select value={videoPlatform} onValueChange={(v) => setVideoPlatform(v as typeof videoPlatform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_PLATFORM_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      disabled={
                        (opt.value === 'google_meet' && !provider?.google_calendar_token) ||
                        (opt.value === 'zoom' && !provider?.zoom_token)
                      }
                    >
                      {opt.label}
                      {opt.value === 'google_meet' && !provider?.google_calendar_token && ' (not connected)'}
                      {opt.value === 'zoom' && !provider?.zoom_token && ' (not connected)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Meeting Template (optional)</Label>
                <Select value={templateId || 'none'} onValueChange={(v) => setTemplateId(v === 'none' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Apply agenda and notes from a template to bookings
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Meeting'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
