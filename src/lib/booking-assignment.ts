import { createAdminClient } from '@/lib/supabase/admin'
import type { InsertBookingAssignment } from '@/types/database'

type AssignmentReason = 'required' | 'round_robin' | 'load_balanced' | 'manual'

type MemberWithStats = {
  providerId: string
  isRequired: boolean
  isAvailable: boolean
  bookingsToday: number
  bookingsThisWeek: number
  lastAssignedAt: Date | null
}

// Type definitions for Supabase query results
type MemberResult = { provider_id: string; is_required: boolean }
type BookingAssignmentWithBooking = { provider_id: string; assigned_at: string; bookings: { start_time: string } }
type BookingConflict = { provider_id: string }
type AssignmentResult = { provider_id: string; assigned_at: string; assignment_reason: string | null }

/**
 * Assign members to a flexible team booking (Any N of M)
 * Returns the assigned member IDs
 */
export async function assignMembersToBooking(
  bookingId: string,
  bookingLinkId: string,
  startTime: Date,
  endTime: Date,
  minRequired: number,
  assignmentMode: 'round_robin' | 'load_balanced' = 'round_robin'
): Promise<string[]> {
  const supabase = createAdminClient()

  // Get all members of the booking link with their availability status
  const { data: members } = await supabase
    .from('booking_link_members')
    .select('provider_id, is_required')
    .eq('booking_link_id', bookingLinkId) as { data: MemberResult[] | null }

  if (!members || members.length === 0) {
    return []
  }

  const memberIds = members.map(m => m.provider_id)

  // Get booking stats for load balancing
  const dayStart = new Date(startTime)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(startTime)
  dayEnd.setHours(23, 59, 59, 999)

  const weekStart = new Date(startTime)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  // Get bookings for stats
  const { data: recentBookings } = await supabase
    .from('booking_assignments')
    .select('provider_id, assigned_at, bookings!inner(start_time)')
    .in('provider_id', memberIds)
    .gte('bookings.start_time', weekStart.toISOString()) as { data: BookingAssignmentWithBooking[] | null }

  // Get member availability for this specific time slot
  const { data: conflictingBookings } = await supabase
    .from('bookings')
    .select('provider_id')
    .in('provider_id', memberIds)
    .neq('status', 'cancelled')
    .lt('start_time', endTime.toISOString())
    .gt('end_time', startTime.toISOString()) as { data: BookingConflict[] | null }

  const busyMemberIds = new Set(conflictingBookings?.map(b => b.provider_id) || [])

  // Build member stats
  const memberStats: MemberWithStats[] = members.map(m => {
    const memberBookings = recentBookings?.filter(b => b.provider_id === m.provider_id) || []
    const todayBookings = memberBookings.filter(b => {
      const bookingDate = new Date(b.bookings.start_time)
      return bookingDate >= dayStart && bookingDate <= dayEnd
    })

    const lastAssignment = memberBookings
      .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())[0]

    return {
      providerId: m.provider_id,
      isRequired: m.is_required,
      isAvailable: !busyMemberIds.has(m.provider_id),
      bookingsToday: todayBookings.length,
      bookingsThisWeek: memberBookings.length,
      lastAssignedAt: lastAssignment ? new Date(lastAssignment.assigned_at) : null,
    }
  })

  // Separate required and optional members
  const requiredMembers = memberStats.filter(m => m.isRequired)
  const optionalMembers = memberStats.filter(m => !m.isRequired && m.isAvailable)

  // All required members must be assigned
  const assignedMembers: { providerId: string; reason: AssignmentReason }[] = requiredMembers.map(m => ({
    providerId: m.providerId,
    reason: 'required' as AssignmentReason,
  }))

  // Calculate how many more members we need
  const additionalNeeded = minRequired - assignedMembers.length

  if (additionalNeeded > 0 && optionalMembers.length > 0) {
    // Sort optional members based on assignment mode
    const sortedOptional = [...optionalMembers].sort((a, b) => {
      if (assignmentMode === 'round_robin') {
        // Prefer members who haven't been assigned recently
        const aTime = a.lastAssignedAt?.getTime() || 0
        const bTime = b.lastAssignedAt?.getTime() || 0
        return aTime - bTime
      } else {
        // load_balanced: prefer members with fewer bookings this week
        return a.bookingsThisWeek - b.bookingsThisWeek
      }
    })

    // Assign additional members
    for (let i = 0; i < Math.min(additionalNeeded, sortedOptional.length); i++) {
      assignedMembers.push({
        providerId: sortedOptional[i].providerId,
        reason: assignmentMode,
      })
    }
  }

  // Create assignment records
  const assignments: InsertBookingAssignment[] = assignedMembers.map(m => ({
    booking_id: bookingId,
    provider_id: m.providerId,
    assignment_reason: m.reason,
  }))

  if (assignments.length > 0) {
    await supabase
      .from('booking_assignments')
      // @ts-ignore - Supabase types not inferring correctly for new tables
      .insert(assignments)
  }

  return assignedMembers.map(m => m.providerId)
}

/**
 * Get the assigned members for a booking
 */
export async function getBookingAssignments(
  bookingId: string
): Promise<{ providerId: string; assignedAt: Date; reason: string | null }[]> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('booking_assignments')
    .select('provider_id, assigned_at, assignment_reason')
    .eq('booking_id', bookingId) as { data: AssignmentResult[] | null }

  if (!data) return []

  return data.map(a => ({
    providerId: a.provider_id,
    assignedAt: new Date(a.assigned_at),
    reason: a.assignment_reason,
  }))
}
