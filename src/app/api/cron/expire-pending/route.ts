import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This endpoint should be called by a cron job every hour
// It expires pending booking requests that haven't been approved before the meeting time

function createUntypedAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createUntypedAdminClient()
  const now = new Date()

  try {
    // Find pending bookings where start_time has passed
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, client_email, client_name, start_time')
      .eq('status', 'pending')
      .lt('start_time', now.toISOString())

    if (fetchError) {
      console.error('Error fetching expired bookings:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch expired bookings' },
        { status: 500 }
      )
    }

    if (!expiredBookings || expiredBookings.length === 0) {
      return NextResponse.json({ expired: 0 })
    }

    // Update to cancelled
    const ids = expiredBookings.map(b => b.id)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: now.toISOString(),
        cancellation_reason: 'Request expired - not approved before meeting time',
      })
      .in('id', ids)

    if (updateError) {
      console.error('Error updating expired bookings:', updateError)
      return NextResponse.json(
        { error: 'Failed to update expired bookings' },
        { status: 500 }
      )
    }

    console.log(`Expired ${ids.length} pending bookings:`, ids)

    return NextResponse.json({
      expired: ids.length,
      bookingIds: ids,
    })
  } catch (error) {
    console.error('Cron expire-pending error:', error)
    return NextResponse.json(
      { error: 'Failed to process expired bookings' },
      { status: 500 }
    )
  }
}
