import { createUntypedAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getIntersectionAvailability, getIntersectionAvailableDates } from '@/lib/multi-availability'
import type { Service } from '@/types/database'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingLinkId = searchParams.get('booking_link_id')
    const serviceId = searchParams.get('service_id')
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
    if (!serviceId || !dateStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: service_id, date' },
        { status: 400 }
      )
    }

    // Verify service is on this booking link
    const { data: linkService } = await supabase
      .from('booking_link_services')
      .select('id')
      .eq('booking_link_id', bookingLinkId)
      .eq('service_id', serviceId)
      .single()

    if (!linkService) {
      return NextResponse.json(
        { error: 'Service not available on this booking link' },
        { status: 400 }
      )
    }

    // Fetch service details
    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes, buffer_minutes')
      .eq('id', serviceId)
      .single()

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const requestedDate = new Date(dateStr)

    const slots = await getIntersectionAvailability(
      memberIds,
      requiredMemberIds,
      requestedDate,
      service as Pick<Service, 'duration_minutes' | 'buffer_minutes'>,
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
