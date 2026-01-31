'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  Calendar,
  Clock,
  Settings,
  Briefcase,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Bookings', icon: Calendar, shortcut: 'b' },
  { href: '/dashboard/meetings', label: 'Meetings', icon: Briefcase, shortcut: 'm' },
  { href: '/dashboard/availability', label: 'Availability', icon: Clock, shortcut: 'a' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, shortcut: 's' },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      // Don't trigger with modifier keys
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return
      }

      const item = navItems.find(item => item.shortcut === e.key.toLowerCase())
      if (item) {
        router.push(item.href)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return (
    <nav className="flex items-center gap-1 sm:gap-1 bg-neutral-900 sm:bg-transparent border border-neutral-800 sm:border-0 rounded-full sm:rounded-none px-2 py-1.5 sm:p-0 shadow-lg sm:shadow-none">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 rounded-full sm:rounded-md px-3 sm:px-3 ${
              isActive(item.href)
                ? 'text-foreground bg-neutral-800 sm:bg-transparent'
                : 'text-muted-foreground hover:text-foreground hover:bg-neutral-800 sm:hover:bg-transparent'
            }`}
          >
            <item.icon className="size-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Button>
        </Link>
      ))}
    </nav>
  )
}
