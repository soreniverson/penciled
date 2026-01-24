'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Check } from 'lucide-react'

type Props = {
  bookingId: string
}

export function CompleteBookingButton({ bookingId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleComplete = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/bookings/${bookingId}/complete`, {
        method: 'POST',
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Complete error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleComplete} disabled={loading}>
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          <Check className="size-4 mr-1" />
          Complete
        </>
      )}
    </Button>
  )
}
