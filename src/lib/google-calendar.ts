import { google, calendar_v3 } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import type { Provider } from '@/types/database'
import { randomUUID } from 'crypto'

// Untyped admin client for tables/columns not in type definitions
function createUntypedAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type CalendarWatch = {
  provider_id: string
  channel_id: string
  resource_id: string
}

type ProviderWithSync = {
  google_calendar_id: string | null
  google_sync_token: string | null
}

type BookingForSync = {
  id: string
  start_time: string
  end_time: string
  status: string
}

type GoogleTokens = {
  access_token: string
  refresh_token?: string
  expiry_date?: number
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl(state: string) {
  const oauth2Client = getOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
    prompt: 'consent',
    state,
  })
}

export async function getTokensFromCode(code: string): Promise<GoogleTokens> {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens as GoogleTokens
}

async function getAuthorizedClient(providerId: string) {
  const supabase = createAdminClient()

  const { data: provider } = await supabase
    .from('providers')
    .select('google_calendar_token')
    .eq('id', providerId)
    .single()
    .then(res => ({ ...res, data: res.data as Pick<Provider, 'google_calendar_token'> | null }))

  if (!provider?.google_calendar_token) {
    return null
  }

  const tokens = provider.google_calendar_token as GoogleTokens
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials(tokens)

  // Check if token needs refresh
  if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      oauth2Client.setCredentials(credentials)

      // Update tokens in database
      await supabase
        .from('providers')
        // @ts-ignore - Supabase types not inferring correctly
        .update({ google_calendar_token: credentials })
        .eq('id', providerId)
    } catch (error) {
      console.error('Token refresh failed:', error)
      // Clear invalid tokens
      await supabase
        .from('providers')
        // @ts-ignore - Supabase types not inferring correctly
        .update({ google_calendar_token: null, google_calendar_id: null })
        .eq('id', providerId)
      return null
    }
  }

  return oauth2Client
}

export async function getCalendarBusyTimes(
  providerId: string,
  startDate: Date,
  endDate: Date
): Promise<{ start: Date; end: Date }[]> {
  const oauth2Client = await getAuthorizedClient(providerId)
  if (!oauth2Client) return []

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: 'primary' }],
      },
    })

    const busyTimes = response.data.calendars?.primary?.busy || []
    return busyTimes.map((busy) => ({
      start: new Date(busy.start!),
      end: new Date(busy.end!),
    }))
  } catch (error) {
    console.error('Failed to fetch busy times:', error)
    return []
  }
}

export type CalendarEventResult = {
  eventId: string | null
  meetingLink: string | null
}

export async function createCalendarEvent(
  providerId: string,
  booking: {
    id: string
    client_name: string
    client_email: string
    client_phone?: string | null
    start_time: string
    end_time: string
    notes?: string | null
  },
  meetingName: string
): Promise<CalendarEventResult> {
  const oauth2Client = await getAuthorizedClient(providerId)
  if (!oauth2Client) return { eventId: null, meetingLink: null }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const supabase = createAdminClient()

  // Get provider's calendar ID (or use primary)
  const { data: provider } = await supabase
    .from('providers')
    .select('google_calendar_id')
    .eq('id', providerId)
    .single()
    .then(res => ({ ...res, data: res.data as Pick<Provider, 'google_calendar_id'> | null }))

  const calendarId = provider?.google_calendar_id || 'primary'

  const description = [
    `Booked via penciled.fyi`,
    '',
    `Client: ${booking.client_name}`,
    `Email: ${booking.client_email}`,
    booking.client_phone ? `Phone: ${booking.client_phone}` : null,
    booking.notes ? `\nNotes: ${booking.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const response = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1, // Enable Google Meet creation
      requestBody: {
        summary: `${meetingName} with ${booking.client_name}`,
        description,
        start: {
          dateTime: booking.start_time,
        },
        end: {
          dateTime: booking.end_time,
        },
        // Add client as attendee so they get the calendar invite
        attendees: [
          { email: booking.client_email, displayName: booking.client_name },
        ],
        // Request Google Meet link
        conferenceData: {
          createRequest: {
            requestId: booking.id, // Unique ID for idempotency
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 }, // 1 hour before
          ],
        },
      },
    })

    const eventId = response.data.id || null
    const meetingLink = response.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri || response.data.hangoutLink || null

    // Store event ID and meeting link in booking
    if (eventId || meetingLink) {
      await supabase
        .from('bookings')
        // @ts-ignore - Supabase types not inferring correctly
        .update({
          google_event_id: eventId,
          meeting_link: meetingLink,
        })
        .eq('id', booking.id)
    }

    console.log('Calendar event created:', { eventId, meetingLink })

    return { eventId, meetingLink }
  } catch (error) {
    console.error('Failed to create calendar event:', error)
    return { eventId: null, meetingLink: null }
  }
}

export async function deleteCalendarEvent(
  providerId: string,
  eventId: string
): Promise<boolean> {
  const oauth2Client = await getAuthorizedClient(providerId)
  if (!oauth2Client) return false

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const supabase = createAdminClient()

  const { data: provider } = await supabase
    .from('providers')
    .select('google_calendar_id')
    .eq('id', providerId)
    .single()
    .then(res => ({ ...res, data: res.data as Pick<Provider, 'google_calendar_id'> | null }))

  const calendarId = provider?.google_calendar_id || 'primary'

  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    })
    return true
  } catch (error) {
    console.error('Failed to delete calendar event:', error)
    return false
  }
}

export async function updateCalendarEvent(
  providerId: string,
  eventId: string,
  updates: {
    start_time: string
    end_time: string
  }
): Promise<boolean> {
  const oauth2Client = await getAuthorizedClient(providerId)
  if (!oauth2Client) return false

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const supabase = createAdminClient()

  const { data: provider } = await supabase
    .from('providers')
    .select('google_calendar_id')
    .eq('id', providerId)
    .single()
    .then(res => ({ ...res, data: res.data as Pick<Provider, 'google_calendar_id'> | null }))

  const calendarId = provider?.google_calendar_id || 'primary'

  try {
    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        start: {
          dateTime: updates.start_time,
        },
        end: {
          dateTime: updates.end_time,
        },
      },
    })
    return true
  } catch (error) {
    console.error('Failed to update calendar event:', error)
    return false
  }
}

// ==================== Calendar Watch (Push Notifications) ====================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const WEBHOOK_URL = `${APP_URL}/api/webhooks/google-calendar`

export async function registerCalendarWatch(providerId: string): Promise<boolean> {
  const oauth2Client = await getAuthorizedClient(providerId)
  if (!oauth2Client) return false

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const supabase = createAdminClient()
  const untypedSupabase = createUntypedAdminClient()

  const { data: provider } = await supabase
    .from('providers')
    .select('google_calendar_id')
    .eq('id', providerId)
    .single()
    .then(res => ({ ...res, data: res.data as Pick<Provider, 'google_calendar_id'> | null }))

  const calendarId = provider?.google_calendar_id || 'primary'
  const channelId = randomUUID()

  try {
    // First, stop any existing watch for this provider
    await stopCalendarWatch(providerId)

    // Register new watch - expires in 7 days (max allowed by Google)
    const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000

    const response = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: WEBHOOK_URL,
        expiration: expiration.toString(),
      },
    })

    if (!response.data.resourceId) {
      console.error('No resourceId returned from watch registration')
      return false
    }

    // Store watch in database (using untyped client for new table)
    await untypedSupabase.from('calendar_watches').insert({
      provider_id: providerId,
      channel_id: channelId,
      resource_id: response.data.resourceId,
      expiration: new Date(expiration).toISOString(),
      calendar_id: calendarId,
    })

    console.log(`Calendar watch registered for provider ${providerId}`)
    return true
  } catch (error) {
    console.error('Failed to register calendar watch:', error)
    return false
  }
}

export async function stopCalendarWatch(providerId: string): Promise<boolean> {
  const oauth2Client = await getAuthorizedClient(providerId)
  if (!oauth2Client) return false

  const untypedSupabase = createUntypedAdminClient()

  // Get existing watch
  const { data: watch } = await untypedSupabase
    .from('calendar_watches')
    .select('channel_id, resource_id')
    .eq('provider_id', providerId)
    .single() as { data: CalendarWatch | null }

  if (!watch) return true // No watch to stop

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  try {
    await calendar.channels.stop({
      requestBody: {
        id: watch.channel_id,
        resourceId: watch.resource_id,
      },
    })
  } catch (error) {
    // Ignore errors - watch may have already expired
    console.log('Watch stop error (may be expired):', error)
  }

  // Delete from database
  await untypedSupabase
    .from('calendar_watches')
    .delete()
    .eq('provider_id', providerId)

  return true
}

export async function refreshExpiringWatches(): Promise<{ refreshed: number; failed: number }> {
  const untypedSupabase = createUntypedAdminClient()

  // Find watches expiring in the next 24 hours
  const expirationThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data: expiringWatches } = await untypedSupabase
    .from('calendar_watches')
    .select('provider_id')
    .lt('expiration', expirationThreshold) as { data: { provider_id: string }[] | null }

  if (!expiringWatches || expiringWatches.length === 0) {
    return { refreshed: 0, failed: 0 }
  }

  let refreshed = 0
  let failed = 0

  for (const watch of expiringWatches) {
    const success = await registerCalendarWatch(watch.provider_id)
    if (success) {
      refreshed++
    } else {
      failed++
    }
  }

  return { refreshed, failed }
}

export async function getCalendarEvent(
  providerId: string,
  eventId: string
): Promise<calendar_v3.Schema$Event | null> {
  const oauth2Client = await getAuthorizedClient(providerId)
  if (!oauth2Client) return null

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const supabase = createAdminClient()

  const { data: provider } = await supabase
    .from('providers')
    .select('google_calendar_id')
    .eq('id', providerId)
    .single()
    .then(res => ({ ...res, data: res.data as Pick<Provider, 'google_calendar_id'> | null }))

  const calendarId = provider?.google_calendar_id || 'primary'

  try {
    const response = await calendar.events.get({
      calendarId,
      eventId,
    })
    return response.data
  } catch (error) {
    console.error('Failed to get calendar event:', error)
    return null
  }
}

export async function syncCalendarChanges(providerId: string): Promise<{
  cancelled: string[]
  rescheduled: string[]
}> {
  const oauth2Client = await getAuthorizedClient(providerId)
  if (!oauth2Client) return { cancelled: [], rescheduled: [] }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const supabase = createAdminClient()
  const untypedSupabase = createUntypedAdminClient()

  const { data: provider } = await untypedSupabase
    .from('providers')
    .select('google_calendar_id, google_sync_token')
    .eq('id', providerId)
    .single() as { data: ProviderWithSync | null }

  const calendarId = provider?.google_calendar_id || 'primary'

  const cancelled: string[] = []
  const rescheduled: string[] = []

  try {
    // Use sync token for incremental sync, or do full sync if no token
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      singleEvents: true,
      showDeleted: true,
    }

    if (provider?.google_sync_token) {
      params.syncToken = provider.google_sync_token
    } else {
      // Initial sync - only look at recent/upcoming events
      const now = new Date()
      params.timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      params.timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }

    let nextPageToken: string | undefined
    let newSyncToken: string | undefined

    do {
      if (nextPageToken) {
        params.pageToken = nextPageToken
      }

      const response = await calendar.events.list(params)
      const events = response.data.items || []

      for (const event of events) {
        if (!event.id) continue

        // Find booking with this event ID
        const { data: booking } = await supabase
          .from('bookings')
          .select('id, start_time, end_time, status')
          .eq('google_event_id', event.id)
          .eq('provider_id', providerId)
          .single() as { data: BookingForSync | null }

        if (!booking) continue

        // Check if event was cancelled/deleted
        if (event.status === 'cancelled' && booking.status !== 'cancelled') {
          // Cancel the booking
          await supabase
            .from('bookings')
            // @ts-ignore
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: 'Cancelled via Google Calendar',
            })
            .eq('id', booking.id)

          cancelled.push(booking.id)
          continue
        }

        // Check if event was rescheduled
        if (event.start?.dateTime && event.end?.dateTime && booking.status !== 'cancelled') {
          const eventStart = new Date(event.start.dateTime).toISOString()
          const eventEnd = new Date(event.end.dateTime).toISOString()

          if (eventStart !== booking.start_time || eventEnd !== booking.end_time) {
            // Update booking time
            await supabase
              .from('bookings')
              // @ts-ignore
              .update({
                start_time: eventStart,
                end_time: eventEnd,
                rescheduled_at: new Date().toISOString(),
              })
              .eq('id', booking.id)

            rescheduled.push(booking.id)
          }
        }
      }

      nextPageToken = response.data.nextPageToken || undefined
      newSyncToken = response.data.nextSyncToken || undefined
    } while (nextPageToken)

    // Save new sync token
    if (newSyncToken) {
      await untypedSupabase
        .from('providers')
        .update({
          google_sync_token: newSyncToken,
          google_last_sync: new Date().toISOString(),
        })
        .eq('id', providerId)
    }

    return { cancelled, rescheduled }
  } catch (error: unknown) {
    // If sync token is invalid, clear it and try again
    if (error && typeof error === 'object' && 'code' in error && error.code === 410) {
      await untypedSupabase
        .from('providers')
        .update({ google_sync_token: null })
        .eq('id', providerId)
      console.log('Sync token expired, cleared for full sync')
    }
    console.error('Failed to sync calendar changes:', error)
    return { cancelled: [], rescheduled: [] }
  }
}
