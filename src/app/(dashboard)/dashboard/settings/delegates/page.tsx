import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DelegatesManager } from './delegates-manager'

export default async function DelegatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch delegates and principals
  const [{ data: delegates }, { data: principals }] = await Promise.all([
    supabase
      .from('delegates')
      .select(`
        id, permissions, expires_at, created_at,
        delegate:delegate_id (id, name, email)
      `)
      .eq('principal_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('delegates')
      .select(`
        id, permissions, expires_at, created_at,
        principal:principal_id (id, name, email)
      `)
      .eq('delegate_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <DelegatesManager
      initialDelegates={delegates || []}
      initialPrincipals={principals || []}
    />
  )
}
