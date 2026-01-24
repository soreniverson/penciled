import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL))
  }

  // Use user ID as state to verify callback
  const authUrl = getAuthUrl(user.id)

  return NextResponse.redirect(authUrl)
}
