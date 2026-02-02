import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncCalendarChanges } from '@/lib/google-calendar'
import { sendCancellationEmailToClient, sendRescheduleNotificationToProvider } from '@/lib/email'

// Untyped admin client for tables not in type definitions
function createUntypedAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type BookingWithRelations = {
  id: string
  management_token: string
  client_name: string
  client_email: string
  start_time: string
  end_time: string
  meeting_link: string | null
  providers: { name: string | null; business_name: string | null; email: string; timezone: string } | null
  meetings: { name: string } | null
}

// Check if we've already processed this webhook (idempotency)
async function checkAndMarkProcessed(
  supabase: ReturnType<typeof createUntypedAdminClient>,
  webhookType: string,
  externalId: string,
  providerId: string
): Promise<boolean> {
  // Try to insert - will fail if already exists due to unique constraint
  const { error } = await supabase
    .from('processed_webhooks')
    .insert({
      webhook_type: webhookType,
      external_id: externalId,
      provider_id: providerId,
    })

  // If insert succeeded, this is a new webhook
  if (!error) return false

  // If unique constraint violation, already processed
  if (error.code === '23505') return true

  // Other error - log but don't fail
  console.error('Error checking webhook idempotency:', error)
  return false
}

export async function POST(request: Request) {
  // Google sends these headers with push notifications
  const channelId = request.headers.get('x-goog-channel-id')
  const resourceState = request.headers.get('x-goog-resource-state')
  const messageNumber = request.headers.get('x-goog-message-number')

  // Initial sync notification - just acknowledge
  if (resourceState === 'sync') {
    return new NextResponse(null, { status: 200 })
  }

  if (!channelId) {
    return new NextResponse('Missing channel ID', { status: 400 })
  }

  const supabase = createUntypedAdminClient()

  // Find the provider for this channel
  const { data: watch } = await supabase
    .from('calendar_watches')
    .select('provider_id')
    .eq('channel_id', channelId)
    .single() as { data: { provider_id: string } | null }

  if (!watch) {
    // Unknown channel - might be an old/expired watch
    return new NextResponse(null, { status: 200 })
  }

  // Check idempotency - use channel ID + message number as unique identifier
  const webhookId = `${channelId}-${messageNumber || Date.now()}`
  const alreadyProcessed = await checkAndMarkProcessed(
    supabase,
    'google_calendar',
    webhookId,
    watch.provider_id
  )

  if (alreadyProcessed) {
    console.log(`Skipping already processed webhook: ${webhookId}`)
    return new NextResponse(null, { status: 200 })
  }

  // Process the calendar change
  try {
    const { cancelled, rescheduled } = await syncCalendarChanges(watch.provider_id)

    // Send notifications for cancelled bookings
    for (const bookingId of cancelled) {
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          id, management_token, client_name, client_email, start_time, end_time,
          providers:provider_id (name, business_name, email, timezone),
          meetings:meeting_id (name)
        `)
        .eq('id', bookingId)
        .single() as { data: BookingWithRelations | null }

      if (booking && booking.providers && booking.meetings) {
        const provider = booking.providers
        const meeting = booking.meetings

        sendCancellationEmailToClient({
          bookingId: booking.id,
          managementToken: booking.management_token,
          meetingName: meeting.name,
          providerName: provider.business_name || provider.name || 'Your provider',
          providerEmail: provider.email,
          clientName: booking.client_name,
          clientEmail: booking.client_email,
          startTime: new Date(booking.start_time),
          endTime: new Date(booking.end_time),
          timezone: provider.timezone,
          reason: 'Cancelled via Google Calendar',
        }).catch(err => console.error('Failed to send cancellation email:', err))
      }
    }

    // Send notifications for rescheduled bookings
    for (const bookingId of rescheduled) {
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          id, management_token, client_name, client_email, start_time, end_time, meeting_link,
          providers:provider_id (name, business_name, email, timezone),
          meetings:meeting_id (name)
        `)
        .eq('id', bookingId)
        .single() as { data: BookingWithRelations | null }

      if (booking && booking.providers && booking.meetings) {
        const provider = booking.providers
        const meeting = booking.meetings

        // Note: We don't have the old time here, so we just notify about the new time
        // A more complete implementation would store the old time before updating
        sendRescheduleNotificationToProvider({
          bookingId: booking.id,
          managementToken: booking.management_token,
          meetingName: meeting.name,
          providerName: provider.business_name || provider.name || 'Your provider',
          providerEmail: provider.email,
          clientName: booking.client_name,
          clientEmail: booking.client_email,
          startTime: new Date(booking.start_time),
          endTime: new Date(booking.end_time),
          oldStartTime: new Date(booking.start_time), // Same as new - see note above
          oldEndTime: new Date(booking.end_time),
          timezone: provider.timezone,
          meetingLink: booking.meeting_link,
          rescheduledBy: 'provider',
        }).catch(err => console.error('Failed to send reschedule email:', err))
      }
    }

    console.log(`Synced calendar changes for provider ${watch.provider_id}:`, { cancelled, rescheduled })
  } catch (error) {
    console.error('Error processing calendar webhook:', error)
  }

  // Always return 200 to acknowledge receipt
  return new NextResponse(null, { status: 200 })
}
