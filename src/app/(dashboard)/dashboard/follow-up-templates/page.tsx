import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FollowUpTemplatesManager } from './follow-up-templates-manager'

export default async function FollowUpTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: templates }, { data: meetings }] = await Promise.all([
    supabase
      .from('follow_up_templates')
      .select('*')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('meetings')
      .select('id, name')
      .eq('provider_id', user.id)
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <FollowUpTemplatesManager
      initialTemplates={templates || []}
      meetings={meetings || []}
    />
  )
}
