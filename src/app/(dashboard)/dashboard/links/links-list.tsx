'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Copy, Check, ExternalLink, Users, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { BookingLink } from '@/types/database'

export type BookingLinkWithCounts = BookingLink & {
  member_count: number
  meeting_count: number
}

type Props = {
  links: BookingLinkWithCounts[]
}

export function LinksList({ links }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copyLink = async (link: BookingLinkWithCounts) => {
    const url = `${window.location.origin}/book/link/${link.slug}`
    await navigator.clipboard.writeText(url)
    setCopiedId(link.id)

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon" className="size-8">
            <ChevronLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight flex-1">Team</h1>
        <Link href="/dashboard/links/new">
          <Button variant="outline" size="icon">
            <Plus className="size-4" />
          </Button>
        </Link>
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="size-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No team links yet</p>
            <Link href="/dashboard/links/new">
              <Button variant="link" className="mt-2">
                Create your first link
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <Card key={link.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{link.name}</h3>
                      {!link.is_active && (
                        <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {link.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {link.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" />
                        {link.member_count} member{link.member_count !== 1 ? 's' : ''}
                      </span>
                      <span>
                        {link.meeting_count} meeting{link.meeting_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(link)}
                    >
                      {copiedId === link.id ? (
                        <>
                          <Check className="size-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Link href={`/book/link/${link.slug}`} target="_blank">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="size-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/links/${link.id}`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
