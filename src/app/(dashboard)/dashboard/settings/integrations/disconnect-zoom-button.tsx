'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function DisconnectZoomButton() {
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Zoom?')) return

    setDisconnecting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      await supabase
        .from('providers')
        // @ts-ignore - Supabase types not inferring correctly
        .update({ zoom_token: null, zoom_user_id: null })
        .eq('id', user.id)

      router.push('/dashboard/settings/integrations?success=zoom_disconnected')
      router.refresh()
    } catch (error) {
      console.error('Failed to disconnect Zoom:', error)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDisconnect}
      disabled={disconnecting}
    >
      {disconnecting && <Loader2 className="size-4 mr-2 animate-spin" />}
      Disconnect
    </Button>
  )
}
