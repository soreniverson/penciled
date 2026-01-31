import { createAdminClient } from '@/lib/supabase/admin'
import type { DelegatePermissions, Delegate } from '@/types/database'

export type DelegationPermission = keyof DelegatePermissions

export type DelegationContext = {
  isOwner: boolean
  isTeamMember: boolean
  isDelegate: boolean
  delegation: Pick<Delegate, 'id' | 'permissions' | 'expires_at'> | null
  principalId: string | null // The ID of the principal (person being acted on behalf of)
}

/**
 * Get delegation context for a user attempting to act on a booking
 * Returns information about whether the user is the owner, team member, or delegate
 */
export async function getDelegationContext(
  userId: string,
  bookingProviderId: string,
  bookingLinkId: string | null
): Promise<DelegationContext> {
  const supabase = createAdminClient()

  // Check if user is the direct owner
  if (userId === bookingProviderId) {
    return {
      isOwner: true,
      isTeamMember: false,
      isDelegate: false,
      delegation: null,
      principalId: null,
    }
  }

  // Check if user is a team member (for booking links)
  if (bookingLinkId) {
    const { data: membership } = await supabase
      .from('booking_link_members')
      .select('id')
      .eq('booking_link_id', bookingLinkId)
      .eq('provider_id', userId)
      .single()

    if (membership) {
      return {
        isOwner: false,
        isTeamMember: true,
        isDelegate: false,
        delegation: null,
        principalId: null,
      }
    }
  }

  // Check if user is a delegate for the booking's provider
  type DelegationResult = { id: string; permissions: DelegatePermissions; expires_at: string | null }
  const { data: delegation } = await supabase
    .from('delegates')
    .select('id, permissions, expires_at')
    .eq('principal_id', bookingProviderId)
    .eq('delegate_id', userId)
    .single() as { data: DelegationResult | null }

  if (delegation) {
    // Check if delegation has expired
    if (delegation.expires_at && new Date(delegation.expires_at) < new Date()) {
      return {
        isOwner: false,
        isTeamMember: false,
        isDelegate: false,
        delegation: null,
        principalId: null,
      }
    }

    return {
      isOwner: false,
      isTeamMember: false,
      isDelegate: true,
      delegation: delegation as Pick<Delegate, 'id' | 'permissions' | 'expires_at'>,
      principalId: bookingProviderId,
    }
  }

  return {
    isOwner: false,
    isTeamMember: false,
    isDelegate: false,
    delegation: null,
    principalId: null,
  }
}

/**
 * Check if a user has a specific permission for a booking
 */
export function hasPermission(
  context: DelegationContext,
  permission: DelegationPermission
): boolean {
  // Owners and team members have all permissions
  if (context.isOwner || context.isTeamMember) {
    return true
  }

  // Check delegate permissions
  if (context.isDelegate && context.delegation) {
    const permissions = context.delegation.permissions as DelegatePermissions
    return permissions[permission] === true
  }

  return false
}

/**
 * Check if user can perform an action on a booking
 * Combines getDelegationContext and hasPermission
 */
export async function canPerformAction(
  userId: string,
  bookingProviderId: string,
  bookingLinkId: string | null,
  permission: DelegationPermission
): Promise<{ allowed: boolean; context: DelegationContext }> {
  const context = await getDelegationContext(userId, bookingProviderId, bookingLinkId)
  const allowed = hasPermission(context, permission)
  return { allowed, context }
}

/**
 * Get all principals (people who have delegated to this user)
 */
export async function getPrincipals(
  delegateId: string
): Promise<{ id: string; name: string | null; email: string }[]> {
  const supabase = createAdminClient()

  const { data: delegations } = await supabase
    .from('delegates')
    .select(`
      principal_id,
      providers:principal_id (id, name, email)
    `)
    .eq('delegate_id', delegateId)

  if (!delegations) return []

  return delegations
    .map((d: { providers: { id: string; name: string | null; email: string } | { id: string; name: string | null; email: string }[] | null }) => {
      const p = d.providers
      return Array.isArray(p) ? p[0] : p
    })
    .filter((p): p is { id: string; name: string | null; email: string } => p !== null)
}

/**
 * Get all delegates for a principal (people the user has delegated to)
 */
export async function getDelegates(
  principalId: string
): Promise<(Delegate & { delegate: { id: string; name: string | null; email: string } })[]> {
  const supabase = createAdminClient()

  type DelegationWithDelegate = Delegate & {
    delegate: { id: string; name: string | null; email: string } | { id: string; name: string | null; email: string }[] | null
  }

  const { data: delegations } = await supabase
    .from('delegates')
    .select(`
      *,
      delegate:delegate_id (id, name, email)
    `)
    .eq('principal_id', principalId) as { data: DelegationWithDelegate[] | null }

  if (!delegations) return []

  return delegations.map((d) => ({
    ...d,
    delegate: Array.isArray(d.delegate) ? d.delegate[0] : d.delegate,
  })) as (Delegate & { delegate: { id: string; name: string | null; email: string } })[]
}
