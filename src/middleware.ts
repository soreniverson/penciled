import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Whitelist of allowed redirect paths to prevent open redirect vulnerability
const ALLOWED_REDIRECT_PREFIXES = ['/dashboard', '/onboarding']

function isValidRedirect(path: string | null): boolean {
  if (!path) return false
  // Ensure path is relative and starts with allowed prefix
  if (path.startsWith('//') || path.includes('://')) return false
  return ALLOWED_REDIRECT_PREFIXES.some(prefix => path.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/onboarding')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from login page
  if (request.nextUrl.pathname === '/login') {
    if (user) {
      const redirect = request.nextUrl.searchParams.get('redirect')
      const url = request.nextUrl.clone()
      // Only allow redirects to whitelisted paths to prevent open redirect vulnerability
      url.pathname = (redirect && isValidRedirect(redirect)) ? redirect : '/dashboard'
      url.searchParams.delete('redirect')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/login',
  ],
}
