'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2, ArrowRight, Check } from 'lucide-react'

type Step = 'email' | 'signin' | 'request' | 'requested'

function LoginContent() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/access?email=${encodeURIComponent(email.trim())}`)
      const data = await res.json()

      if (data.allowed) {
        setStep('signin')
      } else {
        setStep('request')
      }
    } catch (err) {
      setErrorMsg('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    })
  }

  const handleRequestAccess = async () => {
    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (data.success || data.alreadyRequested) {
        setStep('requested')
      } else if (data.allowed) {
        setStep('signin')
      } else {
        setErrorMsg(data.error || 'Failed to submit request')
      }
    } catch (err) {
      setErrorMsg('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Requested confirmation
  if (step === 'requested') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <Link href="/" className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">penciled.fyi</h1>
        </Link>

        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="size-6 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold mb-2">You're on the list</h2>
            <p className="text-muted-foreground text-sm">
              We'll let you know when it's your turn to join.
            </p>
            <Link href="/">
              <Button variant="ghost" className="mt-4">
                Back to home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Sign in with Google (allowed user)
  if (step === 'signin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <Link href="/" className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">penciled.fyi</h1>
        </Link>

        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in as {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGoogleLogin}
              className="w-full"
              size="lg"
            >
              <svg className="mr-2 size-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <button
              onClick={() => {
                setStep('email')
                setEmail('')
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Use a different email
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Request access (not allowed)
  if (step === 'request') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <Link href="/" className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">penciled.fyi</h1>
        </Link>

        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Join the waitlist</CardTitle>
            <CardDescription>
              We're currently in closed beta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Request access for <strong>{email}</strong>
            </p>

            {errorMsg && (
              <p className="text-sm text-destructive text-center">{errorMsg}</p>
            )}

            <Button
              onClick={handleRequestAccess}
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              Request access
            </Button>

            <button
              onClick={() => {
                setStep('email')
                setEmail('')
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Use a different email
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Email entry (default)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">penciled.fyi</h1>
      </Link>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Get started</CardTitle>
          <CardDescription>
            Enter your email to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              Something went wrong. Please try again.
            </div>
          )}

          <form onSubmit={handleCheckEmail} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
            </div>
            {errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="size-4 mr-2" />
              )}
              Continue
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-foreground">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
