'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  Clock,
  Settings,
  Briefcase,
  Link2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Bookings', icon: Calendar },
  { href: '/dashboard/services', label: 'Services', icon: Briefcase },
  { href: '/dashboard/availability', label: 'Availability', icon: Clock },
  { href: '/dashboard/links', label: 'Links', icon: Link2 },
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
    <nav className="flex items-center gap-1">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${
              isActive(item.href)
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Button>
        </Link>
      ))}
    </nav>
  )
}
