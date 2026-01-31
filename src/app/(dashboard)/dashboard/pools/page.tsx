import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PoolsManager } from './pools-manager'

export default async function PoolsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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

  type MemberPoolResult = {
    pool_id: string
    resource_pools: Pool | null
  }

  // Fetch owned pools and pools user is a member of
  const [{ data: ownedPools }, { data: memberPools }] = await Promise.all([
    supabase
      .from('resource_pools')
      .select(`
        id, name, description, pool_type, is_active, created_at,
        resource_pool_members (
          id, provider_id, priority, is_active,
          providers:provider_id (id, name, email)
        )
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }) as unknown as { data: Pool[] | null },
    supabase
      .from('resource_pool_members')
      .select(`
        pool_id,
        resource_pools:pool_id (
          id, name, description, pool_type, is_active, created_at,
          owner:owner_id (id, name, email)
        )
      `)
      .eq('provider_id', user.id) as unknown as { data: MemberPoolResult[] | null },
  ])

  return (
    <PoolsManager
      ownedPools={ownedPools || []}
      memberPools={memberPools?.map(m => m.resource_pools).filter(Boolean) || []}
    />
  )
}
