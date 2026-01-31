-- Migration: Add Zoom integration support

-- Add Zoom OAuth tokens to providers
ALTER TABLE providers ADD COLUMN zoom_token JSONB;
ALTER TABLE providers ADD COLUMN zoom_user_id TEXT;

-- Add video platform preference to meetings
-- Options: 'google_meet', 'zoom', 'none', 'auto'
-- 'auto' = internal meetings use Google Meet, external use Zoom
ALTER TABLE meetings ADD COLUMN video_platform TEXT DEFAULT 'google_meet'
  CHECK (video_platform IN ('google_meet', 'zoom', 'none', 'auto'));

-- Track which platform was used for each booking
ALTER TABLE bookings ADD COLUMN video_platform TEXT;
ALTER TABLE bookings ADD COLUMN zoom_meeting_id TEXT;

-- Index for Zoom connected providers
CREATE INDEX idx_providers_zoom ON providers(zoom_user_id) WHERE zoom_user_id IS NOT NULL;
