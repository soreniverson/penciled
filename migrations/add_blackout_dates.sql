-- Migration: Add blackout dates table
-- Allows providers to block specific date ranges (vacations, conferences, etc.)

CREATE TABLE IF NOT EXISTS blackout_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- Index for efficient provider lookups
CREATE INDEX IF NOT EXISTS idx_blackout_dates_provider ON blackout_dates(provider_id);

-- Index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_blackout_dates_range ON blackout_dates(provider_id, start_date, end_date);

-- Enable RLS
ALTER TABLE blackout_dates ENABLE ROW LEVEL SECURITY;

-- Policy: Providers can see their own blackout dates
CREATE POLICY "Providers can view own blackout dates"
  ON blackout_dates
  FOR SELECT
  USING (auth.uid() = provider_id);

-- Policy: Providers can insert their own blackout dates
CREATE POLICY "Providers can insert own blackout dates"
  ON blackout_dates
  FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

-- Policy: Providers can update their own blackout dates
CREATE POLICY "Providers can update own blackout dates"
  ON blackout_dates
  FOR UPDATE
  USING (auth.uid() = provider_id);

-- Policy: Providers can delete their own blackout dates
CREATE POLICY "Providers can delete own blackout dates"
  ON blackout_dates
  FOR DELETE
  USING (auth.uid() = provider_id);

-- Policy: Allow public read access for booking flow
CREATE POLICY "Public can view blackout dates for availability check"
  ON blackout_dates
  FOR SELECT
  USING (true);
