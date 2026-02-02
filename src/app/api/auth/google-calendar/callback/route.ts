import { createClient } from '@/lib/supabase/server'
import { getTokensFromCode, registerCalendarWatch } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings/integrations?error=google_denied`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings/integrations?error=invalid_request`
    )
  }

  // Verify state matches the cookie we set (CSRF protection)
  const cookieStore = await cookies()
  const storedState = cookieStore.get('google_oauth_state')?.value

  // Clear the state cookie
  cookieStore.delete('google_oauth_state')

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings/integrations?error=invalid_state`
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings/integrations?error=not_authenticated`
    )
  }

  try {
    const tokens = await getTokensFromCode(code)

    // Store tokens in provider record
    const { error: updateError } = await supabase
      .from('providers')
      // @ts-ignore - Supabase types not inferring correctly
      .update({
        google_calendar_token: tokens,
        google_calendar_id: 'primary', // Use primary calendar by default
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to save tokens:', updateError)
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings/integrations?error=save_failed`
      )
    }

    // Register calendar watch for push notifications (async, don't block)
    registerCalendarWatch(user.id).catch(err => {
      console.error('Failed to register calendar watch:', err)
    })

    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings/integrations?success=google_connected`
    )
  } catch (err) {
    console.error('Google Calendar OAuth error:', err)
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings/integrations?error=token_exchange_failed`
    )
  }
}
