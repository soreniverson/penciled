import { google, calendar_v3 } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Provider } from '@/types/database'

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
      'https://www.googleapis.com/auth/calendar.events.owned',
      'https://www.googleapis.com/auth/calendar.events.freebusy',
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
): Promise<string | null> {
  const oauth2Client = await getAuthorizedClient(providerId)
  if (!oauth2Client) return null

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
      requestBody: {
        summary: `${meetingName} with ${booking.client_name}`,
        description,
        start: {
          dateTime: booking.start_time,
        },
        end: {
          dateTime: booking.end_time,
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

    // Store event ID in booking
    if (eventId) {
      await supabase
        .from('bookings')
        // @ts-ignore - Supabase types not inferring correctly
        .update({ google_event_id: eventId })
        .eq('id', booking.id)
    }

    return eventId
  } catch (error) {
    console.error('Failed to create calendar event:', error)
    return null
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
