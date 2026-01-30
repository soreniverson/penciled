import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LinksList, type BookingLinkWithCounts } from './links-list'

export default async function LinksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch links with counts in a single query using aggregates
  const { data } = await supabase
    .from('booking_links')
    .select(`
      *,
      booking_link_members(count),
      booking_link_meetings(count)
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  // Transform the data to flatten the counts
  const links: BookingLinkWithCounts[] = (data || []).map((link: any) => ({
    ...link,
    member_count: link.booking_link_members?.[0]?.count || 0,
    meeting_count: link.booking_link_meetings?.[0]?.count || 0,
  }))

  return <LinksList links={links} />
}
