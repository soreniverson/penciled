import { NextResponse } from 'next/server'
import { refreshExpiringWatches } from '@/lib/google-calendar'

// This endpoint should be called by a cron job every 6 hours
// to refresh Google Calendar watches before they expire

export async function GET(request: Request) {
  // Verify cron secret - fail-secure if not configured
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { refreshed, failed } = await refreshExpiringWatches()

    console.log(`Calendar watch refresh: ${refreshed} refreshed, ${failed} failed`)

    return NextResponse.json({
      success: true,
      refreshed,
      failed,
    })
  } catch (error) {
    console.error('Failed to refresh calendar watches:', error)
    return NextResponse.json(
      { error: 'Failed to refresh watches' },
      { status: 500 }
    )
  }
}
