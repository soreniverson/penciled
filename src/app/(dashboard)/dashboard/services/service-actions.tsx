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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { ServiceForm } from './service-form'
import type { Service } from '@/types/database'

type Props = {
  service: Service
}

export function ServiceActions({ service }: Props) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleToggleActive = async () => {
    const supabase = createClient()
    await supabase
      .from('services')
      // @ts-ignore - Supabase types not inferring correctly
      .update({ is_active: !service.is_active })
      .eq('id', service.id)
    router.refresh()
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.from('services').delete().eq('id', service.id)
      setDeleteOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ServiceForm providerId={service.provider_id} service={service}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil className="size-4 mr-2" />
              Edit
            </DropdownMenuItem>
          </ServiceForm>
          <DropdownMenuItem onClick={handleToggleActive}>
            {service.is_active ? (
              <>
                <EyeOff className="size-4 mr-2" />
                Make Inactive
              </>
            ) : (
              <>
                <Eye className="size-4 mr-2" />
                Make Active
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete service?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{service.name}&quot;. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
