-- Calendar watches table for Google Calendar push notifications
CREATE TABLE IF NOT EXISTS calendar_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT,
  expiration TIMESTAMPTZ NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for provider lookup
CREATE INDEX IF NOT EXISTS idx_calendar_watches_provider ON calendar_watches(provider_id);

-- Index for finding expiring watches
CREATE INDEX IF NOT EXISTS idx_calendar_watches_expiration ON calendar_watches(expiration);

-- Unique constraint for provider + calendar combo
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_watches_provider_calendar ON calendar_watches(provider_id, calendar_id);

-- Add sync token column to providers for incremental sync
ALTER TABLE providers ADD COLUMN IF NOT EXISTS google_sync_token TEXT;

-- Track the last time we synced from Google Calendar
ALTER TABLE providers ADD COLUMN IF NOT EXISTS google_last_sync TIMESTAMPTZ;
