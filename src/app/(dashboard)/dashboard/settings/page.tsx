import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from './settings-form'
import type { Provider } from '@/types/database'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data } = await supabase
    .from('providers')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!data) {
    redirect('/onboarding')
  }

  return <SettingsForm provider={data as Provider} />
}
