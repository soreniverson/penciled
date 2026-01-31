import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getZoomAuthUrl } from '@/lib/zoom'
import { cookies } from 'next/headers'

export async function GET() {
  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID()

  // Store state in cookie for verification in callback
  const cookieStore = await cookies()
  cookieStore.set('zoom_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  // Redirect to Zoom authorization
  const authUrl = getZoomAuthUrl(state)
  redirect(authUrl)
}
