'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDelegateContext } from '@/lib/hooks/use-delegate-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Users, Check, ChevronDown } from 'lucide-react'
import type { DelegatePermissions } from '@/types/database'

type Principal = {
  id: string
  name: string | null
  email: string
  business_name: string | null
  permissions: DelegatePermissions
}

type Props = {
  userId: string
  userName?: string | null
}

function formatPermissions(permissions: DelegatePermissions): string {
  const perms: string[] = []
  if (permissions.view) perms.push('View')
  if (permissions.book) perms.push('Book')
  if (permissions.reschedule) perms.push('Reschedule')
  if (permissions.cancel) perms.push('Cancel')
  if (permissions.override_availability) perms.push('Override Avail')
  if (permissions.override_conflicts) perms.push('Override Conflicts')
  return perms.join(', ') || 'View only'
}

export function DelegateContextSwitcher({ userId, userName }: Props) {
  const [principals, setPrincipals] = useState<Principal[]>([])
  const [loading, setLoading] = useState(true)
  const { currentPrincipalId, switchContext } = useDelegateContext()

  useEffect(() => {
    const fetchPrincipals = async () => {
      const supabase = createClient()

      type DelegationResult = {
        principal_id: string
        permissions: DelegatePermissions
        providers: {
          id: string
          name: string | null
          email: string
          business_name: string | null
        } | {
          id: string
          name: string | null
          email: string
          business_name: string | null
        }[] | null
      }

      const { data: delegations } = await supabase
        .from('delegates')
        .select(`
          principal_id,
          permissions,
          providers:principal_id (
            id,
            name,
            email,
            business_name
          )
        `)
        .eq('delegate_id', userId) as { data: DelegationResult[] | null }

      if (delegations) {
        const principalList = delegations
          .filter(d => d.providers)
          .map(d => {
            const provider = Array.isArray(d.providers) ? d.providers[0] : d.providers!
            return {
              id: provider.id,
              name: provider.name,
              email: provider.email,
              business_name: provider.business_name,
              permissions: d.permissions,
            }
          })
        setPrincipals(principalList)
      }

      setLoading(false)
    }

    fetchPrincipals()
  }, [userId])

  // Don't show if no principals to manage
  if (loading || principals.length === 0) {
    return null
  }

  const currentPrincipal = principals.find(p => p.id === currentPrincipalId)
  const displayName = currentPrincipal
    ? currentPrincipal.business_name || currentPrincipal.name || currentPrincipal.email
    : userName || 'My Calendar'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="size-4" />
          <span className="max-w-[120px] truncate">{displayName}</span>
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Switch Calendar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => switchContext(null)}
            className="flex items-center justify-between"
          >
            <span>My Calendar</span>
            {!currentPrincipalId && <Check className="size-4" />}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Managing For
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {principals.map((principal) => (
            <DropdownMenuItem
              key={principal.id}
              onClick={() => switchContext(principal.id)}
              className="flex flex-col items-start gap-0.5"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">
                  {principal.business_name || principal.name || principal.email}
                </span>
                {currentPrincipalId === principal.id && <Check className="size-4" />}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatPermissions(principal.permissions)}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
