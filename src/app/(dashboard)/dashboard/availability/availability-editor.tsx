'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageHeader } from '@/components/page-header'
import { Loader2, Check, Plus, X, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { InsertAvailability, BlackoutDate, InsertBlackoutDate } from '@/types/database'

const DAYS = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
]

type TimeWindow = {
  id?: string
  startTime: string
  endTime: string
}

export type AvailabilityDay = {
  enabled: boolean
  windows: TimeWindow[]
}

const DEFAULT_WINDOW: TimeWindow = { startTime: '09:00', endTime: '17:00' }

const DEFAULT_AVAILABILITY: Record<number, AvailabilityDay> = {
  0: { enabled: false, windows: [{ ...DEFAULT_WINDOW }] },
  1: { enabled: true, windows: [{ ...DEFAULT_WINDOW }] },
  2: { enabled: true, windows: [{ ...DEFAULT_WINDOW }] },
  3: { enabled: true, windows: [{ ...DEFAULT_WINDOW }] },
  4: { enabled: true, windows: [{ ...DEFAULT_WINDOW }] },
  5: { enabled: true, windows: [{ ...DEFAULT_WINDOW }] },
  6: { enabled: false, windows: [{ ...DEFAULT_WINDOW }] },
}

type Props = {
  providerId: string
  initialAvailability: Record<number, AvailabilityDay>
  initialBlackoutDates: BlackoutDate[]
}

export function AvailabilityEditor({ providerId, initialAvailability, initialBlackoutDates }: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const isInitialLoad = useRef(true)
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Blackout dates state
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>(initialBlackoutDates)
  const [blackoutModalOpen, setBlackoutModalOpen] = useState(false)
  const [newBlackoutStart, setNewBlackoutStart] = useState('')
  const [newBlackoutEnd, setNewBlackoutEnd] = useState('')
  const [newBlackoutReason, setNewBlackoutReason] = useState('')
  const [savingBlackout, setSavingBlackout] = useState(false)
  const [deletingBlackoutId, setDeletingBlackoutId] = useState<string | null>(null)

  const [availability, setAvailability] = useState<Record<number, AvailabilityDay>>(
    Object.keys(initialAvailability).length > 0 ? initialAvailability : DEFAULT_AVAILABILITY
  )

  // Mark initial load complete after first render and cleanup timeouts
  useEffect(() => {
    const timer = setTimeout(() => { isInitialLoad.current = false }, 100)
    return () => {
      clearTimeout(timer)
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
    }
  }, [])

  const saveAvailability = useCallback(async (data: Record<number, AvailabilityDay>) => {
    setSaving(true)
    try {
      const supabase = createClient()

      await supabase
        .from('availability')
        .delete()
        .eq('provider_id', providerId)

      const records: InsertAvailability[] = []

      Object.entries(data).forEach(([dayOfWeek, day]) => {
        if (day.enabled) {
          day.windows.forEach((window) => {
            records.push({
              provider_id: providerId,
              day_of_week: parseInt(dayOfWeek),
              start_time: window.startTime,
              end_time: window.endTime,
              is_active: true,
            })
          })
        }
      })

      if (records.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('availability').insert(records as any)
      }

      setSaved(true)
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
      savedTimeoutRef.current = setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }, [providerId])

  const addBlackoutDate = async () => {
    if (!newBlackoutStart || !newBlackoutEnd) return
    if (newBlackoutEnd < newBlackoutStart) {
      alert('End date must be on or after start date')
      return
    }

    setSavingBlackout(true)
    try {
      const supabase = createClient()
      const newBlackout: InsertBlackoutDate = {
        provider_id: providerId,
        start_date: newBlackoutStart,
        end_date: newBlackoutEnd,
        reason: newBlackoutReason || null,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from('blackout_dates')
        .insert(newBlackout as any)
        .select()
        .single()

      if (error) throw error

      if (data) {
        setBlackoutDates(prev => [...prev, data as BlackoutDate].sort((a, b) =>
          a.start_date.localeCompare(b.start_date)
        ))
      }

      // Reset form and close modal
      setNewBlackoutStart('')
      setNewBlackoutEnd('')
      setNewBlackoutReason('')
      setBlackoutModalOpen(false)
    } catch (error) {
      console.error('Error adding blackout date:', error)
    } finally {
      setSavingBlackout(false)
    }
  }

  const deleteBlackoutDate = async (id: string) => {
    setDeletingBlackoutId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('blackout_dates')
        .delete()
        .eq('id', id)

      if (error) throw error

      setBlackoutDates(prev => prev.filter(b => b.id !== id))
    } catch (error) {
      console.error('Error deleting blackout date:', error)
    } finally {
      setDeletingBlackoutId(null)
    }
  }

  // Auto-save on changes
  useEffect(() => {
    if (isInitialLoad.current) return

    const timeout = setTimeout(() => {
      saveAvailability(availability)
    }, 500)

    return () => clearTimeout(timeout)
  }, [availability, saveAvailability])

  const toggleDay = (day: number, enabled: boolean) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        enabled,
        windows: enabled && prev[day].windows.length === 0
          ? [{ ...DEFAULT_WINDOW }]
          : prev[day].windows,
      },
    }))
  }

  const updateWindow = (day: number, windowIndex: number, updates: Partial<TimeWindow>) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        windows: prev[day].windows.map((w, i) =>
          i === windowIndex ? { ...w, ...updates } : w
        ),
      },
    }))
  }

  const addWindow = (day: number) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        windows: [...prev[day].windows, { startTime: '13:00', endTime: '17:00' }],
      },
    }))
  }

  const removeWindow = (day: number, windowIndex: number) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        windows: prev[day].windows.filter((_, i) => i !== windowIndex),
      },
    }))
  }

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      <PageHeader title="Availability">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saved && <><Check className="size-4 text-green-500" /> Saved</>}
        </div>
      </PageHeader>

      <Card>
        <CardContent className="py-4 space-y-1">
          {DAYS.map((day) => (
            <div key={day.value} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 py-3">
              <div className="flex items-center gap-3 sm:w-32 shrink-0 sm:pt-1">
                <Switch
                  checked={availability[day.value].enabled}
                  onCheckedChange={(checked) => toggleDay(day.value, checked)}
                />
                <span className={`text-sm font-medium ${!availability[day.value].enabled ? 'text-muted-foreground' : ''}`}>
                  {day.fullLabel}
                </span>
              </div>

              <div className="flex-1 pl-9 sm:pl-0">
                {availability[day.value].enabled ? (
                  <div className="space-y-3">
                    {availability[day.value].windows.map((window, windowIndex) => (
                      <div key={windowIndex} className="flex items-center gap-2 sm:gap-3">
                        <Input
                          type="time"
                          className="w-[110px] sm:w-[130px]"
                          value={window.startTime}
                          onChange={(e) =>
                            updateWindow(day.value, windowIndex, { startTime: e.target.value })
                          }
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <Input
                          type="time"
                          className="w-[110px] sm:w-[130px]"
                          value={window.endTime}
                          onChange={(e) =>
                            updateWindow(day.value, windowIndex, { endTime: e.target.value })
                          }
                        />
                        <div className="flex items-center gap-1">
                          {availability[day.value].windows.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeWindow(day.value, windowIndex)}
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                          {windowIndex === availability[day.value].windows.length - 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground"
                              onClick={() => addWindow(day.value)}
                            >
                              <Plus className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Blackout Dates Section */}
      {blackoutDates.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="divide-y divide-border">
              {blackoutDates.map((blackout) => (
                <div key={blackout.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">
                      {format(parseISO(blackout.start_date), 'MMM d, yyyy')}
                      {blackout.start_date !== blackout.end_date && (
                        <> – {format(parseISO(blackout.end_date), 'MMM d, yyyy')}</>
                      )}
                    </p>
                    {blackout.reason && (
                      <p className="text-sm text-muted-foreground">{blackout.reason}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteBlackoutDate(blackout.id)}
                    disabled={deletingBlackoutId === blackout.id}
                  >
                    {deletingBlackoutId === blackout.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <button
        onClick={() => setBlackoutModalOpen(true)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        + Add blackout dates
      </button>

      {/* Blackout Date Modal */}
      <Dialog open={blackoutModalOpen} onOpenChange={setBlackoutModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Blackout Dates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={newBlackoutStart}
                  onChange={(e) => setNewBlackoutStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={newBlackoutEnd}
                  onChange={(e) => setNewBlackoutEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="e.g., Vacation, Conference"
                value={newBlackoutReason}
                onChange={(e) => setNewBlackoutReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBlackoutModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={addBlackoutDate}
              disabled={!newBlackoutStart || !newBlackoutEnd || savingBlackout}
            >
              {savingBlackout ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Add'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
