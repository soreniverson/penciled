'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, X } from 'lucide-react'

export function DisconnectGoogleCalendarButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDisconnect = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/auth/google-calendar/disconnect', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setOpen(false)
      router.push('/dashboard/settings/integrations?success=google_disconnected')
      router.refresh()
    } catch (error) {
      console.error('Disconnect error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <X className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect Google Calendar?</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={loading}
          >
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            Disconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
