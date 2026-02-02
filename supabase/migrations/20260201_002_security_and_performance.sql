-- Migration: Security and Performance Improvements
-- Adds missing indexes, calendar event tracking for teams, and webhook idempotency

-- ============================================
-- MISSING INDEXES
-- ============================================

-- Index on bookings.status for frequently filtered queries
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Index on bookings.meeting_id for meeting-based lookups
CREATE INDEX IF NOT EXISTS idx_bookings_meeting_id ON bookings(meeting_id);

-- Index on bookings.client_email for duplicate detection
CREATE INDEX IF NOT EXISTS idx_bookings_client_email ON bookings(client_email);

-- Index on bookings.booking_link_id for team booking queries
CREATE INDEX IF NOT EXISTS idx_bookings_booking_link_id ON bookings(booking_link_id);

-- Composite index for conflict checking with buffer time
CREATE INDEX IF NOT EXISTS idx_bookings_provider_time_status
ON bookings(provider_id, start_time, end_time, status)
WHERE status != 'cancelled';

-- ============================================
-- BOOKING CALENDAR EVENTS TABLE
-- Track per-provider calendar events for team bookings
-- ============================================

CREATE TABLE IF NOT EXISTS booking_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  google_event_id text,
  zoom_meeting_id text,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure one event record per booking per provider
  UNIQUE(booking_id, provider_id)
);

-- Enable RLS
ALTER TABLE booking_calendar_events ENABLE ROW LEVEL SECURITY;

-- Providers can view their own calendar events
CREATE POLICY "Providers can view own calendar events" ON booking_calendar_events
  FOR SELECT USING (auth.uid() = provider_id);

-- Allow inserts from service role (admin)
CREATE POLICY "Service role can manage calendar events" ON booking_calendar_events
  FOR ALL USING (true);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_booking_calendar_events_booking
ON booking_calendar_events(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_calendar_events_provider
ON booking_calendar_events(provider_id);

CREATE INDEX IF NOT EXISTS idx_booking_calendar_events_google
ON booking_calendar_events(google_event_id) WHERE google_event_id IS NOT NULL;

-- ============================================
-- PROCESSED WEBHOOKS TABLE
-- For webhook idempotency
-- ============================================

CREATE TABLE IF NOT EXISTS processed_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type text NOT NULL,
  external_id text NOT NULL,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  processed_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure we don't process the same webhook twice
  UNIQUE(webhook_type, external_id)
);

-- Enable RLS (service role only)
ALTER TABLE processed_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhooks" ON processed_webhooks
  FOR ALL USING (true);

-- Index for lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_type_id
ON processed_webhooks(webhook_type, external_id);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at
ON processed_webhooks(processed_at);

-- Cleanup old webhook records (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhooks()
RETURNS void AS $$
BEGIN
  DELETE FROM processed_webhooks
  WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADD FOREIGN KEY FOR meeting_id if missing
-- ============================================

-- First check if the column exists and add FK constraint
DO $$
BEGIN
  -- Add meeting_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'meeting_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE;
  END IF;

  -- Add FK constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_meeting_id_fkey' AND table_name = 'bookings'
  ) THEN
    -- Only add if column exists and FK doesn't
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_meeting_id_fkey
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END IF;
END $$;
