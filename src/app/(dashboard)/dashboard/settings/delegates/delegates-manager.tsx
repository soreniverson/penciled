'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, Plus, Trash2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { DelegatePermissions } from '@/types/database'

type DelegateWithUser = {
  id: string
  permissions: DelegatePermissions
  expires_at: string | null
  created_at: string
  delegate: { id: string; name: string | null; email: string } | null
}

type PrincipalWithUser = {
  id: string
  permissions: DelegatePermissions
  expires_at: string | null
  created_at: string
  principal: { id: string; name: string | null; email: string } | null
}

type Props = {
  initialDelegates: DelegateWithUser[]
  initialPrincipals: PrincipalWithUser[]
}

const DEFAULT_PERMISSIONS: DelegatePermissions = {
  view: true,
  book: false,
  reschedule: false,
  cancel: false,
  override_availability: false,
  override_conflicts: false,
}

const PERMISSION_LABELS: Record<keyof DelegatePermissions, string> = {
  view: 'View',
  book: 'Create',
  reschedule: 'Reschedule',
  cancel: 'Cancel',
  override_availability: 'Availability',
  override_conflicts: 'Conflicts',
}

export function DelegatesManager({ initialDelegates, initialPrincipals }: Props) {
  const [delegates, setDelegates] = useState(initialDelegates)
  const [principals] = useState(initialPrincipals)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPermissions, setNewPermissions] = useState<DelegatePermissions>(DEFAULT_PERMISSIONS)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleAddDelegate = async () => {
    setError(null)
    setAdding(true)

    try {
      const response = await fetch('/api/delegates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegate_email: newEmail,
          permissions: newPermissions,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to add delegate')
        return
      }

      setDelegates([data.delegate, ...delegates])
      setShowAddDialog(false)
      setNewEmail('')
      setNewPermissions(DEFAULT_PERMISSIONS)
    } catch {
      setError('Failed to add delegate')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteDelegate = async (id: string) => {
    setDeletingId(id)

    try {
      const response = await fetch(`/api/delegates/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDelegates(delegates.filter(d => d.id !== id))
      }
    } catch {
      // Silent fail
    } finally {
      setDeletingId(null)
    }
  }

  const handleUpdatePermission = async (
    delegateId: string,
    permission: keyof DelegatePermissions,
    value: boolean
  ) => {
    setUpdatingId(delegateId)

    const delegate = delegates.find(d => d.id === delegateId)
    if (!delegate) return

    const newPerms = { ...delegate.permissions, [permission]: value }

    try {
      const response = await fetch(`/api/delegates/${delegateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: newPerms }),
      })

      if (response.ok) {
        setDelegates(delegates.map(d =>
          d.id === delegateId ? { ...d, permissions: newPerms } : d
        ))
      }
    } catch {
      // Silent fail
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon" className="size-8">
            <ChevronLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight flex-1">Delegates</h1>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Delegate</DialogTitle>
              <DialogDescription>
                Give someone permission to manage your bookings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="assistant@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  They must have a penciled.fyi account
                </p>
              </div>
              <div className="space-y-3">
                <Label>Permissions</Label>
                {(Object.keys(PERMISSION_LABELS) as (keyof DelegatePermissions)[]).map((perm) => (
                  <div key={perm} className="flex items-center justify-between">
                    <span className="text-sm">{PERMISSION_LABELS[perm]}</span>
                    <Switch
                      checked={newPermissions[perm]}
                      onCheckedChange={(checked) =>
                        setNewPermissions({ ...newPermissions, [perm]: checked })
                      }
                    />
                  </div>
                ))}
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDelegate} disabled={!newEmail || adding}>
                {adding && <Loader2 className="size-4 mr-2 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Delegates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Delegates</CardTitle>
        </CardHeader>
        <CardContent>
          {delegates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No delegates yet
            </p>
          ) : (
            <div className="space-y-4">
              {delegates.map((delegate) => (
                <div key={delegate.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{delegate.delegate?.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{delegate.delegate?.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDelegate(delegate.id)}
                      disabled={deletingId === delegate.id}
                    >
                      {deletingId === delegate.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(PERMISSION_LABELS) as (keyof DelegatePermissions)[]).map((perm) => (
                      <div key={perm} className="flex items-center gap-2">
                        <Switch
                          checked={delegate.permissions[perm]}
                          onCheckedChange={(checked) =>
                            handleUpdatePermission(delegate.id, perm, checked)
                          }
                          disabled={updatingId === delegate.id}
                          className="scale-75"
                        />
                        <span className="text-xs">{PERMISSION_LABELS[perm]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delegated To Me */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delegated to Me</CardTitle>
        </CardHeader>
        <CardContent>
          {principals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              None designated
            </p>
          ) : (
            <div className="space-y-3">
              {principals.map((principal) => (
                <div key={principal.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{principal.principal?.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{principal.principal?.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(PERMISSION_LABELS) as (keyof DelegatePermissions)[])
                      .filter((perm) => principal.permissions[perm])
                      .map((perm) => (
                        <span
                          key={perm}
                          className="text-xs bg-muted px-2 py-0.5 rounded"
                        >
                          {PERMISSION_LABELS[perm]}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
