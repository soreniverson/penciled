import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TemplatesManager } from './templates-manager'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: templates } = await supabase
    .from('meeting_templates')
    .select('*')
    .eq('provider_id', user.id)
    .order('created_at', { ascending: false })

  return <TemplatesManager initialTemplates={templates || []} />
}
