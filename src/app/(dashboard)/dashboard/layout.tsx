import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from './nav'

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

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 hidden sm:block">
        <div className="flex h-16 items-center justify-center px-4 md:px-6 max-w-7xl mx-auto">
          <DashboardNav />
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
