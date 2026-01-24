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
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
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
        {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {saved && <Check className="size-4 text-green-600" />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Working hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {DAYS.map((day) => (
            <div
              key={day.value}
              className="px-3 py-3 rounded-lg border"
            >
              <div className="flex items-center gap-4">
                <Switch
                  checked={availability[day.value].enabled}
                  onCheckedChange={(checked) => toggleDay(day.value, checked)}
                />
                <span className="w-24 text-sm font-medium">{day.label}</span>
                {!availability[day.value].enabled && (
                  <span className="ml-auto text-sm text-muted-foreground">Unavailable</span>
                )}
              </div>

              {availability[day.value].enabled && (
                <div className="mt-3 ml-12 space-y-2">
                  {availability[day.value].windows.map((window, windowIndex) => (
                    <div key={windowIndex} className="flex items-center gap-2">
                      <Input
                        type="time"
                        className="w-28 h-9"
                        value={window.startTime}
                        onChange={(e) =>
                          updateWindow(day.value, windowIndex, { startTime: e.target.value })
                        }
                      />
                      <span className="text-muted-foreground text-sm">to</span>
                      <Input
                        type="time"
                        className="w-28 h-9"
                        value={window.endTime}
                        onChange={(e) =>
                          updateWindow(day.value, windowIndex, { endTime: e.target.value })
                        }
                      />
                      {availability[day.value].windows.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => removeWindow(day.value, windowIndex)}
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground"
                    onClick={() => addWindow(day.value)}
                  >
                    <Plus className="size-4 mr-1" />
                    Add hours
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
