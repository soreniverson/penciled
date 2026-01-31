import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getZoomTokensFromCode, getZoomUserInfo } from '@/lib/zoom'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Check for errors from Zoom
  if (error) {
    console.error('Zoom OAuth error:', error)
    redirect('/dashboard/settings/integrations?error=zoom_denied')
  }

  if (!code || !state) {
    redirect('/dashboard/settings/integrations?error=invalid_request')
  }

  // Verify state
  const cookieStore = await cookies()
  const storedState = cookieStore.get('zoom_oauth_state')?.value

  if (state !== storedState) {
    redirect('/dashboard/settings/integrations?error=invalid_state')
  }

  // Clear state cookie
  cookieStore.delete('zoom_oauth_state')

  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  try {
    // Exchange code for tokens
    const tokens = await getZoomTokensFromCode(code)

    // Get Zoom user info
    const zoomUser = await getZoomUserInfo(tokens.access_token)

    // Save tokens and user ID to provider
    const { error: updateError } = await supabase
      .from('providers')
      // @ts-ignore - Supabase types not inferring correctly
      .update({
        zoom_token: tokens,
        zoom_user_id: zoomUser.id,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to save Zoom tokens:', updateError)
      redirect('/dashboard/settings/integrations?error=save_failed')
    }

    redirect('/dashboard/settings/integrations?success=zoom_connected')
  } catch (err) {
    console.error('Zoom token exchange error:', err)
    redirect('/dashboard/settings/integrations?error=token_exchange_failed')
  }
}
