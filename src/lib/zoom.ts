import { createAdminClient } from '@/lib/supabase/admin'
import type { Provider } from '@/types/database'

type ZoomTokens = {
  access_token: string
  refresh_token: string
  expires_at: number // Unix timestamp in milliseconds
}

type ZoomMeetingResult = {
  meetingId: string | null
  meetingUrl: string | null
}

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID!
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET!
const ZOOM_REDIRECT_URI = process.env.ZOOM_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/zoom/callback`

/**
 * Get Zoom OAuth authorization URL
 */
export function getZoomAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ZOOM_CLIENT_ID,
    redirect_uri: ZOOM_REDIRECT_URI,
    state,
  })

  return `https://zoom.us/oauth/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function getZoomTokensFromCode(code: string): Promise<ZoomTokens> {
  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: ZOOM_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Zoom token exchange failed:', error)
    throw new Error('Failed to exchange code for tokens')
  }

  const data = await response.json()

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
}

/**
 * Get Zoom user info (to get user ID)
 */
export async function getZoomUserInfo(accessToken: string): Promise<{ id: string; email: string }> {
  const response = await fetch('https://api.zoom.us/v2/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get Zoom user info')
  }

  const data = await response.json()
  return { id: data.id, email: data.email }
}

/**
 * Get authorized Zoom access token for a provider
 * Refreshes if expired
 */
async function getAuthorizedToken(providerId: string): Promise<string | null> {
  const supabase = createAdminClient()

  const { data: provider } = await supabase
    .from('providers')
    .select('zoom_token, zoom_user_id')
    .eq('id', providerId)
    .single()
    .then(res => ({ ...res, data: res.data as Pick<Provider, 'zoom_token' | 'zoom_user_id'> | null }))

  if (!provider?.zoom_token) {
    return null
  }

  const tokens = provider.zoom_token as unknown as ZoomTokens

  // Check if token needs refresh (with 5 minute buffer)
  if (tokens.expires_at < Date.now() + 5 * 60 * 1000) {
    try {
      const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')

      const response = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
        }),
      })

      if (!response.ok) {
        // Token refresh failed, clear tokens
        await supabase
          .from('providers')
          // @ts-ignore - Supabase types not inferring correctly
          .update({ zoom_token: null, zoom_user_id: null })
          .eq('id', providerId)
        return null
      }

      const data = await response.json()
      const newTokens: ZoomTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || tokens.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
      }

      await supabase
        .from('providers')
        // @ts-ignore - Supabase types not inferring correctly
        .update({ zoom_token: newTokens })
        .eq('id', providerId)

      return newTokens.access_token
    } catch (error) {
      console.error('Zoom token refresh failed:', error)
      return null
    }
  }

  return tokens.access_token
}

/**
 * Create a Zoom meeting
 */
export async function createZoomMeeting(
  providerId: string,
  booking: {
    id: string
    client_name: string
    client_email: string
    start_time: string
    end_time: string
    notes?: string | null
  },
  meetingName: string
): Promise<ZoomMeetingResult> {
  const accessToken = await getAuthorizedToken(providerId)
  if (!accessToken) {
    return { meetingId: null, meetingUrl: null }
  }

  const supabase = createAdminClient()

  // Get Zoom user ID
  const { data: provider } = await supabase
    .from('providers')
    .select('zoom_user_id')
    .eq('id', providerId)
    .single() as { data: { zoom_user_id: string | null } | null }

  if (!provider?.zoom_user_id) {
    return { meetingId: null, meetingUrl: null }
  }

  const startTime = new Date(booking.start_time)
  const endTime = new Date(booking.end_time)
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

  try {
    const response = await fetch(`https://api.zoom.us/v2/users/${provider.zoom_user_id}/meetings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: `${meetingName} with ${booking.client_name}`,
        type: 2, // Scheduled meeting
        start_time: startTime.toISOString(),
        duration: durationMinutes,
        agenda: booking.notes || `Meeting booked via penciled.fyi`,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          meeting_invitees: [{ email: booking.client_email }],
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Zoom meeting creation failed:', error)
      return { meetingId: null, meetingUrl: null }
    }

    const data = await response.json()

    // Store meeting ID in booking
    await supabase
      .from('bookings')
      // @ts-ignore - Supabase types not inferring correctly
      .update({
        zoom_meeting_id: String(data.id),
        meeting_link: data.join_url,
        video_platform: 'zoom',
      })
      .eq('id', booking.id)

    return {
      meetingId: String(data.id),
      meetingUrl: data.join_url,
    }
  } catch (error) {
    console.error('Zoom meeting creation error:', error)
    return { meetingId: null, meetingUrl: null }
  }
}

/**
 * Delete a Zoom meeting
 */
export async function deleteZoomMeeting(
  providerId: string,
  meetingId: string
): Promise<boolean> {
  const accessToken = await getAuthorizedToken(providerId)
  if (!accessToken) {
    return false
  }

  try {
    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    return response.ok || response.status === 404 // 404 means already deleted
  } catch (error) {
    console.error('Zoom meeting deletion error:', error)
    return false
  }
}

/**
 * Update a Zoom meeting time
 */
export async function updateZoomMeeting(
  providerId: string,
  meetingId: string,
  updates: {
    start_time: string
    end_time: string
  }
): Promise<boolean> {
  const accessToken = await getAuthorizedToken(providerId)
  if (!accessToken) {
    return false
  }

  const startTime = new Date(updates.start_time)
  const endTime = new Date(updates.end_time)
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

  try {
    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_time: startTime.toISOString(),
        duration: durationMinutes,
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Zoom meeting update error:', error)
    return false
  }
}

/**
 * Check if a booking should use Zoom based on video platform setting
 * 'auto' mode: use Zoom for external meetings (different email domain)
 */
export function shouldUseZoom(
  videoPlatform: 'google_meet' | 'zoom' | 'none' | 'auto',
  providerEmail: string,
  clientEmail: string,
  hasZoomConnected: boolean
): boolean {
  if (videoPlatform === 'zoom') {
    return hasZoomConnected
  }

  if (videoPlatform === 'google_meet' || videoPlatform === 'none') {
    return false
  }

  // Auto mode: external meetings use Zoom
  if (videoPlatform === 'auto' && hasZoomConnected) {
    const providerDomain = providerEmail.split('@')[1]?.toLowerCase()
    const clientDomain = clientEmail.split('@')[1]?.toLowerCase()
    return providerDomain !== clientDomain
  }

  return false
}
