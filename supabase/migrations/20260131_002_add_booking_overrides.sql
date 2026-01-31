-- Migration: Add booking override columns for provider reschedule and override support

-- Provider reschedule tracking
ALTER TABLE bookings ADD COLUMN rescheduled_by UUID REFERENCES providers(id);
ALTER TABLE bookings ADD COLUMN rescheduled_at TIMESTAMPTZ;

-- Override availability tracking
ALTER TABLE bookings ADD COLUMN availability_override BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN override_approved_by UUID REFERENCES providers(id);
ALTER TABLE bookings ADD COLUMN override_reason TEXT;

-- Override conflicts tracking (when booking is placed over existing conflicts)
ALTER TABLE bookings ADD COLUMN conflict_override BOOLEAN DEFAULT false;

-- Indexes for override tracking
CREATE INDEX idx_bookings_rescheduled_by ON bookings(rescheduled_by) WHERE rescheduled_by IS NOT NULL;
CREATE INDEX idx_bookings_availability_override ON bookings(availability_override) WHERE availability_override = true;
CREATE INDEX idx_bookings_conflict_override ON bookings(conflict_override) WHERE conflict_override = true;
