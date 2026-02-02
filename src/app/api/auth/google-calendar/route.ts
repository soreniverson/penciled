import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/google-calendar'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check for redirect parameter (e.g., from onboarding)
  const { searchParams } = new URL(request.url)
  const redirectTo = searchParams.get('redirect')

  // Generate cryptographically random state for CSRF protection
  const state = crypto.randomUUID()

  // Store state in cookie for verification in callback
  const cookieStore = await cookies()
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  // Store redirect destination if provided (for onboarding flow)
  if (redirectTo) {
    cookieStore.set('google_oauth_redirect', redirectTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })
  }

  // Redirect to Google authorization
  const authUrl = getAuthUrl(state)
  redirect(authUrl)
}
