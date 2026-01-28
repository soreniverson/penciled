import { NextResponse } from 'next/server'

export async function GET() {
  // Only allow in development or with secret
  const isDev = process.env.NODE_ENV === 'development'

  return NextResponse.json({
    // Show partial values for security
    google_client_id: process.env.GOOGLE_CLIENT_ID?.slice(0, 20) + '...',
    google_redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    next_public_app_url: process.env.NEXT_PUBLIC_APP_URL,
    expected_callback_path: '/api/auth/google-calendar/callback',
    full_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`,
    matches_redirect_uri: process.env.GOOGLE_REDIRECT_URI === `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`,
  })
}
