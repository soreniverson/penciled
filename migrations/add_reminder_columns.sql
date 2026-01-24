-- Add reminder tracking columns to bookings table
-- Run this migration in your Supabase SQL editor

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT FALSE;

-- Add index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_bookings_reminders ON bookings (status, reminder_24h_sent, reminder_1h_sent, start_time)
WHERE status = 'confirmed';
