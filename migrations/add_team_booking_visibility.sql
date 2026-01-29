-- Migration: Add RLS policy for team booking visibility
-- Allows team members to view bookings from booking links they're part of

-- Team members can view bookings from their booking links
CREATE POLICY "Team members can view bookings from their links"
  ON bookings
  FOR SELECT
  USING (
    booking_link_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM booking_link_members
      WHERE booking_link_members.booking_link_id = bookings.booking_link_id
      AND booking_link_members.provider_id = auth.uid()
    )
  );

-- Team members can update bookings from their links (for approval/cancellation)
CREATE POLICY "Team members can update bookings from their links"
  ON bookings
  FOR UPDATE
  USING (
    booking_link_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM booking_link_members
      WHERE booking_link_members.booking_link_id = bookings.booking_link_id
      AND booking_link_members.provider_id = auth.uid()
    )
  );
