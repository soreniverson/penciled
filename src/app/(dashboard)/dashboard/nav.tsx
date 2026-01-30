'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  Clock,
  Settings,
  Briefcase,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Bookings', icon: Calendar },
  { href: '/dashboard/meetings', label: 'Meetings', icon: Briefcase },
  { href: '/dashboard/availability', label: 'Availability', icon: Clock },
  { href: '/dashboard/links', label: 'Team', icon: Users },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function DashboardNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

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
