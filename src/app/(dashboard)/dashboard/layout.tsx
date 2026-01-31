import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from './nav'
import { DelegateContextSwitcher } from '@/components/delegate-context-switcher'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's name for the context switcher
  const { data: provider } = await supabase
    .from('providers')
    .select('name')
    .eq('id', user.id)
    .single() as { data: { name: string | null } | null }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 hidden sm:block">
        <div className="flex h-16 items-center justify-between px-4 md:px-6 max-w-7xl mx-auto">
          <DashboardNav />
          <DelegateContextSwitcher userId={user.id} userName={provider?.name} />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-5 py-6 md:p-6 max-w-7xl mx-auto">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 sm:hidden">
        <DashboardNav />
      </div>
    </div>
  )
}
