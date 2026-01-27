'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Loader2, Check, Plus, X } from 'lucide-react'
import type { Availability, InsertAvailability } from '@/types/database'

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

type AvailabilityDay = {
  enabled: boolean
  windows: TimeWindow[]
}

const DEFAULT_WINDOW: TimeWindow = { startTime: '09:00', endTime: '17:00' }

export default function AvailabilityPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [providerId, setProviderId] = useState<string | null>(null)
  const isInitialLoad = useRef(true)

  const [availability, setAvailability] = useState<Record<number, AvailabilityDay>>({
    0: { enabled: false, windows: [{ ...DEFAULT_WINDOW }] },
    1: { enabled: true, windows: [{ ...DEFAULT_WINDOW }] },
    2: { enabled: true, windows: [{ ...DEFAULT_WINDOW }] },
    3: { enabled: true, windows: [{ ...DEFAULT_WINDOW }] },
    4: { enabled: true, windows: [{ ...DEFAULT_WINDOW }] },
    5: { enabled: true, windows: [{ ...DEFAULT_WINDOW }] },
    6: { enabled: false, windows: [{ ...DEFAULT_WINDOW }] },
  })

  const saveAvailability = useCallback(async (data: Record<number, AvailabilityDay>, provId: string) => {
    setSaving(true)
    try {
      const supabase = createClient()

      await supabase
        .from('availability')
        .delete()
        .eq('provider_id', provId)

      const records: InsertAvailability[] = []

      Object.entries(data).forEach(([dayOfWeek, day]) => {
        if (day.enabled) {
          day.windows.forEach((window) => {
            records.push({
              provider_id: provId,
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
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }, [])

  useEffect(() => {
    const loadAvailability = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      setProviderId(user.id)

      const { data } = await supabase
        .from('availability')
        .select('*')
        .eq('provider_id', user.id)
        .order('start_time', { ascending: true })
        .returns<Availability[]>()

      if (data && data.length > 0) {
        const loaded: Record<number, AvailabilityDay> = {}

        // Initialize all days
        for (let i = 0; i < 7; i++) {
          loaded[i] = { enabled: false, windows: [{ ...DEFAULT_WINDOW }] }
        }

        // Group records by day
        data.forEach((record) => {
          const day = record.day_of_week
          if (!loaded[day].enabled) {
            loaded[day] = { enabled: true, windows: [] }
          }
          loaded[day].windows.push({
            id: record.id,
            startTime: record.start_time.slice(0, 5),
            endTime: record.end_time.slice(0, 5),
          })
        })

        setAvailability(loaded)
      }

      setLoading(false)
      setTimeout(() => { isInitialLoad.current = false }, 100)
    }

    loadAvailability()
  }, [])

  // Auto-save on changes
  useEffect(() => {
    if (isInitialLoad.current || !providerId || loading) return

    const timeout = setTimeout(() => {
      saveAvailability(availability, providerId)
    }, 500)

    return () => clearTimeout(timeout)
  }, [availability, providerId, loading, saveAvailability])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-[780px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saved && <><Check className="size-4 text-green-500" /> Saved</>}
        </div>
      </div>

      <Card>
        <CardContent className="py-4 divide-y divide-border">
          {DAYS.map((day) => (
            <div key={day.value} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-4 min-h-10">
                <div className="flex items-center gap-3 w-28 shrink-0">
                  <Switch
                    checked={availability[day.value].enabled}
                    onCheckedChange={(checked) => toggleDay(day.value, checked)}
                  />
                  <span className={`text-sm font-medium ${!availability[day.value].enabled ? 'text-muted-foreground' : ''}`}>
                    {day.fullLabel}
                  </span>
                </div>

                <div className="flex-1 flex items-center">
                  {availability[day.value].enabled ? (
                    <div className="space-y-2 w-full">
                      {availability[day.value].windows.map((window, windowIndex) => (
                        <div key={windowIndex} className="flex items-center gap-2">
                          <Input
                            type="time"
                            className="w-[120px]"
                            value={window.startTime}
                            onChange={(e) =>
                              updateWindow(day.value, windowIndex, { startTime: e.target.value })
                            }
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            className="w-[120px]"
                            value={window.endTime}
                            onChange={(e) =>
                              updateWindow(day.value, windowIndex, { endTime: e.target.value })
                            }
                          />
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
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unavailable</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
