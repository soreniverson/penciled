-- Prevent double-booking race conditions with database-level constraint
-- This uses a PostgreSQL exclusion constraint to prevent overlapping time ranges

-- First, enable the btree_gist extension (required for exclusion constraints with ranges)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint to prevent overlapping bookings for the same provider
-- Only applies to non-cancelled bookings
ALTER TABLE bookings
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
  provider_id WITH =,
  tstzrange(start_time, end_time) WITH &&
)
WHERE (status != 'cancelled');

-- Add index for faster conflict checks
CREATE INDEX IF NOT EXISTS idx_bookings_provider_time_range
ON bookings (provider_id, start_time, end_time)
WHERE status != 'cancelled';
