'use client'

import { useState, useEffect } from 'react'
import { createUntypedClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Link2, Copy, Check, ExternalLink, Users } from 'lucide-react'
import Link from 'next/link'
import type { BookingLink } from '@/types/database'

type BookingLinkWithMembers = BookingLink & {
  booking_link_members: { provider_id: string }[]
  booking_link_meetings: { meeting_id: string }[]
}

export default function LinksPage() {
  const [loading, setLoading] = useState(true)
  const [links, setLinks] = useState<BookingLinkWithMembers[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const loadLinks = async () => {
      try {
        const supabase = createUntypedClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('booking_links')
          .select(`
            *,
            booking_link_members (provider_id),
            booking_link_meetings (meeting_id)
          `)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading links:', error)
        } else if (data) {
          setLinks(data as BookingLinkWithMembers[])
        }
      } catch (err) {
        console.error('Error loading links:', err)
      } finally {
        setLoading(false)
      }
    }

    loadLinks()
  }, [])

  const copyLink = async (link: BookingLinkWithMembers) => {
    const url = `${window.location.origin}/book/link/${link.slug}`
    await navigator.clipboard.writeText(url)
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-[780px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Team Links</h1>
        <Link href="/dashboard/links/new">
          <Button>
            <Plus className="size-4 mr-2" />
            New Link
          </Button>
        </Link>
      </div>

      <p className="text-muted-foreground">
        Create booking links that check availability across multiple team members.
      </p>

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="size-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">No team links yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a link to schedule meetings with multiple team members.
            </p>
            <Link href="/dashboard/links/new">
              <Button>
                <Plus className="size-4 mr-2" />
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
                        {link.booking_link_members.length} member{link.booking_link_members.length !== 1 ? 's' : ''}
                      </span>
                      <span>
                        {link.booking_link_meetings.length} meeting{link.booking_link_meetings.length !== 1 ? 's' : ''}
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
