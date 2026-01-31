import { createUntypedAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getIntersectionAvailability, getIntersectionAvailableDates, getFlexibleIntersectionAvailability } from '@/lib/multi-availability'
import type { Meeting } from '@/types/database'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingLinkId = searchParams.get('booking_link_id')
    const meetingId = searchParams.get('meeting_id')
    const dateStr = searchParams.get('date')
    const action = searchParams.get('action') || 'slots' // 'slots' or 'dates'

    if (!bookingLinkId) {
      return NextResponse.json(
        { error: 'Missing required parameter: booking_link_id' },
        { status: 400 }
      )
    }

    const supabase = createUntypedAdminClient()

    // Fetch booking link with members
    const { data: bookingLink, error: linkError } = await supabase
      .from('booking_links')
      .select(`
        id,
        owner_id,
        name,
        slug,
        is_active,
        min_required_members,
        booking_link_members (
          provider_id,
          is_required
        )
      `)
      .eq('id', bookingLinkId)
      .single()

    if (linkError || !bookingLink) {
      return NextResponse.json({ error: 'Booking link not found' }, { status: 404 })
    }

    if (!bookingLink.is_active) {
      return NextResponse.json({ error: 'Booking link is not active' }, { status: 400 })
    }

    const members = bookingLink.booking_link_members || []
    if (members.length === 0) {
      return NextResponse.json({ error: 'No members in booking link' }, { status: 400 })
    }

    const memberIds = members.map((m: { provider_id: string }) => m.provider_id)
    const requiredMemberIds = members
      .filter((m: { is_required: boolean }) => m.is_required)
      .map((m: { provider_id: string }) => m.provider_id)

    // Determine minimum required members for "Any N of M" scheduling
    // If min_required_members is set, use flexible scheduling
    // Otherwise, all required members must be available (legacy behavior)
    const minRequired = bookingLink.min_required_members || requiredMemberIds.length || memberIds.length

    // Get owner's timezone (used as default)
    const { data: owner } = await supabase
      .from('providers')
      .select('timezone')
      .eq('id', bookingLink.owner_id)
      .single()

    const timezone = owner?.timezone || 'America/New_York'

    // Return available dates
    if (action === 'dates') {
      const dates = await getIntersectionAvailableDates(
        memberIds,
        requiredMemberIds,
        timezone
      )

      return NextResponse.json({
        dates: dates.map(d => d.toISOString()),
      })
    }

    // Return available slots for a specific date
    if (!meetingId || !dateStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: meeting_id, date' },
        { status: 400 }
      )
    }

    // Verify meeting is on this booking link
    const { data: linkMeeting } = await supabase
      .from('booking_link_meetings')
      .select('id')
      .eq('booking_link_id', bookingLinkId)
      .eq('meeting_id', meetingId)
      .single()

    if (!linkMeeting) {
      return NextResponse.json(
        { error: 'Meeting not available on this booking link' },
        { status: 400 }
      )
    }

    // Fetch meeting details
    const { data: meeting } = await supabase
      .from('meetings')
      .select('duration_minutes, buffer_minutes')
      .eq('id', meetingId)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    const requestedDate = new Date(dateStr)

    // Use flexible scheduling if min_required_members is set
    const useFlexibleScheduling = bookingLink.min_required_members !== null

    const slots = useFlexibleScheduling
      ? await getFlexibleIntersectionAvailability(
          memberIds,
          requiredMemberIds,
          minRequired,
          requestedDate,
          meeting as Pick<Meeting, 'duration_minutes' | 'buffer_minutes'>,
          timezone
        )
      : await getIntersectionAvailability(
          memberIds,
          requiredMemberIds,
          requestedDate,
          meeting as Pick<Meeting, 'duration_minutes' | 'buffer_minutes'>,
          timezone
        )

    // Return only available slots with serializable dates
    const serializedSlots = slots.map(slot => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      available: slot.available,
    }))

    return NextResponse.json({ slots: serializedSlots })
  } catch (error) {
    console.error('Link availability slots error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability slots' },
      { status: 500 }
    )
  }
}
