import { createClient } from '@/lib/supabase/server'
import { stopCalendarWatch } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Stop calendar watch first (before we lose the tokens)
    await stopCalendarWatch(user.id)

    // Clear tokens and sync data
    const { error } = await supabase
      .from('providers')
      // @ts-ignore - Supabase types not inferring correctly
      .update({
        google_calendar_token: null,
        google_calendar_id: null,
        google_sync_token: null,
        google_last_sync: null,
      })
      .eq('id', user.id)

    if (error) {
      console.error('Disconnect error:', error)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Google Calendar disconnect error:', err)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
