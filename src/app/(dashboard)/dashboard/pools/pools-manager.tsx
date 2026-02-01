'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

type PoolMember = {
  id: string
  provider_id: string
  priority: number
  is_active: boolean
  providers: { id: string; name: string | null; email: string } | null
}

type Pool = {
  id: string
  name: string
  description: string | null
  pool_type: 'round_robin' | 'load_balanced' | 'priority'
  is_active: boolean
  created_at: string
  resource_pool_members?: PoolMember[]
  owner?: { id: string; name: string | null; email: string } | null
}

type Props = {
  ownedPools: Pool[]
  memberPools: (Pool | null)[]
}

const POOL_TYPE_LABELS = {
  round_robin: 'Round Robin',
  load_balanced: 'Load Balanced',
  priority: 'Priority',
}

export function PoolsManager({ ownedPools: initialOwned, memberPools: initialMember }: Props) {
  const [ownedPools, setOwnedPools] = useState(initialOwned)
  const memberPools = initialMember.filter((p): p is Pool => p !== null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAddMemberDialog, setShowAddMemberDialog] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [deletingPoolId, setDeletingPoolId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Create pool form state
  const [newPoolName, setNewPoolName] = useState('')
  const [newPoolDescription, setNewPoolDescription] = useState('')
  const [newPoolType, setNewPoolType] = useState<'round_robin' | 'load_balanced' | 'priority'>('round_robin')

  // Add member form state
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberPriority, setNewMemberPriority] = useState(0)

  const handleCreatePool = async () => {
    setError(null)
    setCreating(true)

    try {
      const response = await fetch('/api/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPoolName,
          description: newPoolDescription || null,
          pool_type: newPoolType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create pool')
        return
      }

      setOwnedPools([{ ...data.pool, resource_pool_members: [] }, ...ownedPools])
      setShowCreateDialog(false)
      setNewPoolName('')
      setNewPoolDescription('')
      setNewPoolType('round_robin')
    } catch {
      setError('Failed to create pool')
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePool = async (poolId: string) => {
    if (!confirm('Are you sure you want to delete this pool?')) return

    setDeletingPoolId(poolId)

    try {
      const response = await fetch(`/api/pools/${poolId}`, { method: 'DELETE' })

      if (response.ok) {
        setOwnedPools(ownedPools.filter(p => p.id !== poolId))
      }
    } catch {
      // Silent fail
    } finally {
      setDeletingPoolId(null)
    }
  }

  const handleAddMember = async (poolId: string) => {
    setError(null)
    setAddingMember(true)

    try {
      const response = await fetch(`/api/pools/${poolId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_email: newMemberEmail,
          priority: newMemberPriority,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to add member')
        return
      }

      // Update the pool's members list
      setOwnedPools(ownedPools.map(p => {
        if (p.id === poolId) {
          return {
            ...p,
            resource_pool_members: [...(p.resource_pool_members || []), data.member],
          }
        }
        return p
      }))

      setShowAddMemberDialog(null)
      setNewMemberEmail('')
      setNewMemberPriority(0)
    } catch {
      setError('Failed to add member')
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (poolId: string, memberId: string) => {
    try {
      const response = await fetch(`/api/pools/${poolId}/members?member_id=${memberId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setOwnedPools(ownedPools.map(p => {
          if (p.id === poolId) {
            return {
              ...p,
              resource_pool_members: (p.resource_pool_members || []).filter(m => m.id !== memberId),
            }
          }
          return p
        }))
      }
    } catch {
      // Silent fail
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
        <h1 className="text-2xl font-semibold tracking-tight flex-1">Pools</h1>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Resource Pool</DialogTitle>
              <DialogDescription>
                Create a pool of team members for flexible scheduling
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Interview Panel"
                  value={newPoolName}
                  onChange={(e) => setNewPoolName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Technical interviewers for engineering roles"
                  value={newPoolDescription}
                  onChange={(e) => setNewPoolDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Assignment Mode</Label>
                <Select value={newPoolType} onValueChange={(v) => setNewPoolType(v as typeof newPoolType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="load_balanced">Load Balanced</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {newPoolType === 'round_robin' && 'Assigns to members in rotation'}
                  {newPoolType === 'load_balanced' && 'Assigns to member with fewest bookings'}
                  {newPoolType === 'priority' && 'Assigns to highest priority member first'}
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePool} disabled={!newPoolName || creating}>
                {creating && <Loader2 className="size-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Owned Pools */}
      {ownedPools.length > 0 && (
        <div className="space-y-4">
          {ownedPools.map((pool) => (
            <Card key={pool.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{pool.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {POOL_TYPE_LABELS[pool.pool_type]} · {pool.resource_pool_members?.length || 0} members
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={showAddMemberDialog === pool.id} onOpenChange={(open) => setShowAddMemberDialog(open ? pool.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Plus className="size-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Member</DialogTitle>
                          <DialogDescription>
                            Add a team member to {pool.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="member@example.com"
                              value={newMemberEmail}
                              onChange={(e) => setNewMemberEmail(e.target.value)}
                            />
                          </div>
                          {pool.pool_type === 'priority' && (
                            <div className="space-y-2">
                              <Label htmlFor="priority">Priority (higher = assigned first)</Label>
                              <Input
                                id="priority"
                                type="number"
                                min={0}
                                value={newMemberPriority}
                                onChange={(e) => setNewMemberPriority(parseInt(e.target.value) || 0)}
                              />
                            </div>
                          )}
                          {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowAddMemberDialog(null)}>
                            Cancel
                          </Button>
                          <Button onClick={() => handleAddMember(pool.id)} disabled={!newMemberEmail || addingMember}>
                            {addingMember && <Loader2 className="size-4 mr-2 animate-spin" />}
                            Add
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePool(pool.id)}
                      disabled={deletingPoolId === pool.id}
                    >
                      {deletingPoolId === pool.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {pool.resource_pool_members && pool.resource_pool_members.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    {pool.resource_pool_members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <p className="text-sm font-medium">{member.providers?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{member.providers?.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {pool.pool_type === 'priority' && (
                            <span className="text-xs text-muted-foreground">
                              Priority: {member.priority}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(pool.id, member.id)}
                          >
                            <Trash2 className="size-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Member of Pools */}
      {memberPools.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Member Of</h2>
          {memberPools.map((pool) => (
            <Card key={pool.id}>
              <CardHeader>
                <div>
                  <CardTitle className="text-base">{pool.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {POOL_TYPE_LABELS[pool.pool_type]} · Owned by {pool.owner?.name || pool.owner?.email || 'Unknown'}
                  </p>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {ownedPools.length === 0 && memberPools.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No pools yet
        </p>
      )}
    </div>
  )
}
