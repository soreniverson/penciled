import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AvailabilityEditor, type AvailabilityDay } from './availability-editor'
import type { Availability, BlackoutDate } from '@/types/database'

export default async function AvailabilityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch availability and blackout dates in parallel on the server
  const [availabilityResult, blackoutsResult] = await Promise.all([
    supabase
      .from('availability')
      .select('*')
      .eq('provider_id', user.id)
      .order('start_time', { ascending: true })
      .returns<Availability[]>(),
    supabase
      .from('blackout_dates')
      .select('*')
      .eq('provider_id', user.id)
      .order('start_date', { ascending: true })
      .returns<BlackoutDate[]>(),
  ])

  // Transform availability data into the editor format
  const initialAvailability: Record<number, AvailabilityDay> = {}
  const data = availabilityResult.data

  if (data && data.length > 0) {
    // Initialize all days
    for (let i = 0; i < 7; i++) {
      initialAvailability[i] = { enabled: false, windows: [] }
    }

    // Group records by day
    data.forEach((record) => {
      const day = record.day_of_week
      if (!initialAvailability[day].enabled) {
        initialAvailability[day] = { enabled: true, windows: [] }
      }
      initialAvailability[day].windows.push({
        id: record.id,
        startTime: record.start_time.slice(0, 5),
        endTime: record.end_time.slice(0, 5),
      })
    })
  }

  return (
    <AvailabilityEditor
      providerId={user.id}
      initialAvailability={initialAvailability}
      initialBlackoutDates={blackoutsResult.data || []}
    />
  )
}
