-- Migration: Add flexible "Any N of M" scheduling support

-- Add min_required_members to booking_links
-- NULL = all required members must be available (current behavior)
-- N = at least N members must be free for a slot to be available
ALTER TABLE booking_links ADD COLUMN min_required_members INTEGER DEFAULT NULL;

-- Constraint: min_required_members must be positive if set
ALTER TABLE booking_links ADD CONSTRAINT min_required_positive
  CHECK (min_required_members IS NULL OR min_required_members > 0);

-- Booking assignments table for tracking which members are assigned to a booking
-- Useful for round-robin/load-balanced assignment when using flexible scheduling
CREATE TABLE booking_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assignment_reason TEXT, -- 'required', 'round_robin', 'load_balanced', 'manual'
  UNIQUE(booking_id, provider_id)
);

-- RLS for booking_assignments
ALTER TABLE booking_assignments ENABLE ROW LEVEL SECURITY;

-- Providers can view assignments for their bookings
CREATE POLICY "Providers can view own booking assignments" ON booking_assignments
  FOR SELECT USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_assignments.booking_id
      AND bookings.provider_id = auth.uid()
    )
  );

-- Anyone can insert assignments (needed for public booking creation)
CREATE POLICY "Anyone can insert booking assignments" ON booking_assignments
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_booking_assignments_booking ON booking_assignments(booking_id);
CREATE INDEX idx_booking_assignments_provider ON booking_assignments(provider_id);
