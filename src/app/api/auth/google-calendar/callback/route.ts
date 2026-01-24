import { createClient } from '@/lib/supabase/server'
import { getTokensFromCode } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // This is the user ID
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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Verify the state matches the current user
  if (!user || user.id !== state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings/integrations?error=invalid_state`
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
