import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // Handle magic link verification
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'magiclink' | 'email',
    })

    if (!error && data.user) {
      return await handleSuccessfulAuth(request, supabase, data.user, next, origin)
    }
  }

  // Handle OAuth code exchange
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Code exchange error:', error.message, error)
    }

    if (!error && data.user) {
      return await handleSuccessfulAuth(request, supabase, data.user, next, origin)
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}

async function handleSuccessfulAuth(
  request: Request,
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  next: string,
  origin: string
) {
  // Check if provider record exists, if not create one
  const { data: existingProvider } = await supabase
    .from('providers')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existingProvider) {
    // Create provider record
    // @ts-ignore - Supabase types not inferring correctly
    await supabase.from('providers').insert({
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
    })

    // Redirect to onboarding for new users
    return redirectTo(request, origin, '/onboarding')
  }

  // Check if user has completed onboarding (has services)
  const { data: services } = await supabase
    .from('services')
    .select('id')
    .eq('provider_id', user.id)
    .limit(1)

  const redirectPath = services && services.length > 0 ? next : '/onboarding'

  return redirectTo(request, origin, redirectPath)
}

function redirectTo(request: Request, origin: string, path: string) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${path}`)
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`)
  } else {
    return NextResponse.redirect(`${origin}${path}`)
  }
}
