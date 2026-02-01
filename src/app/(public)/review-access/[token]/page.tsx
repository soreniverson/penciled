'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const VALID_TOKENS = ['zoom-review-2026']

export default function ReviewAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const authenticate = async () => {
      const { token } = await params

      if (!VALID_TOKENS.includes(token)) {
        setError('Invalid access token')
        return
      }

      try {
        const response = await fetch('/api/auth/review-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Authentication failed')
          return
        }

        router.push(data.redirectTo || '/dashboard')
      } catch {
        setError('Authentication failed')
      }
    }

    authenticate()
  }, [params, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="size-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Setting up review account...</p>
      </div>
    </div>
  )
}
