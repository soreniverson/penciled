'use client'

import { useState } from 'react'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import type { Service } from '@/types/database'

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
  { value: 'instant', label: 'Instant booking', description: 'Clients are automatically confirmed' },
  { value: 'request', label: 'Request booking', description: 'You approve each booking' },
]

type Props = {
  providerId: string
  service?: Service
  children: React.ReactNode
}

export function ServiceForm({ providerId, service, children }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState(service?.name || '')
  const [description, setDescription] = useState(service?.description || '')
  const [duration, setDuration] = useState(String(service?.duration_minutes || 60))
  const [price, setPrice] = useState(service?.price_cents ? String(service.price_cents / 100) : '')
  const [buffer, setBuffer] = useState(String(service?.buffer_minutes || 15))
  const [bookingMode, setBookingMode] = useState<'instant' | 'request'>(service?.booking_mode || 'instant')

  const isEditing = !!service

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)

    try {
      const supabase = createClient()
      const priceCents = price ? Math.round(parseFloat(price) * 100) : null

      if (isEditing) {
        await supabase
          .from('services')
          // @ts-ignore - Supabase types not inferring correctly
          .update({
            name,
            description: description || null,
            duration_minutes: parseInt(duration),
            price_cents: priceCents,
            buffer_minutes: parseInt(buffer),
            booking_mode: bookingMode,
          })
          .eq('id', service.id)
      } else {
        await supabase
          .from('services')
          // @ts-ignore - Supabase types not inferring correctly
          .insert({
            provider_id: providerId,
            name,
            description: description || null,
            duration_minutes: parseInt(duration),
            price_cents: priceCents,
            buffer_minutes: parseInt(buffer),
            booking_mode: bookingMode,
          })
      }

      setOpen(false)
      router.refresh()

      // Reset form for new services
      if (!isEditing) {
        setName('')
        setDescription('')
        setDuration('60')
        setPrice('')
        setBuffer('15')
      }
    } catch (error) {
      console.error('Service save error:', error)
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
            <DialogTitle>{isEditing ? 'Edit Service' : 'Add Service'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the details of this service.' : 'Create a new service for clients to book.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Piano Lesson"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this service"
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
              <Label htmlFor="price">Price (optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-7"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Booking Mode</Label>
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
              <p className="text-xs text-muted-foreground">
                {bookingMode === 'instant' ? 'Clients are automatically confirmed' : 'You approve each booking request'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
