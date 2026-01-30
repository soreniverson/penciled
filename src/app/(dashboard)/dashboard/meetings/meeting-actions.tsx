'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { MeetingForm } from './meeting-form'
import type { Meeting } from '@/types/database'

type Props = {
  meeting: Meeting
}

export function MeetingActions({ meeting }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'toggle' | 'delete' | null>(null)

  const handleToggleActive = async () => {
    setLoading('toggle')
    try {
      const supabase = createClient()
      await supabase
        .from('meetings')
        // @ts-ignore - Supabase types not inferring correctly
        .update({ is_active: !meeting.is_active })
        .eq('id', meeting.id)

      router.refresh()
    } catch (error) {
      console.error('Toggle error:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this meeting? This cannot be undone.')) {
      return
    }

    setLoading('delete')
    try {
      const supabase = createClient()
      await supabase
        .from('meetings')
        .delete()
        .eq('id', meeting.id)

      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <MeetingForm providerId={meeting.provider_id} meeting={meeting}>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Pencil className="size-4 mr-2" />
            Edit
          </DropdownMenuItem>
        </MeetingForm>
        <DropdownMenuItem
          onClick={handleToggleActive}
          disabled={loading === 'toggle'}
        >
          {loading === 'toggle' ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : meeting.is_active ? (
            <EyeOff className="size-4 mr-2" />
          ) : (
            <Eye className="size-4 mr-2" />
          )}
          {meeting.is_active ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={loading === 'delete'}
          className="text-destructive"
        >
          {loading === 'delete' ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="size-4 mr-2" />
          )}
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
