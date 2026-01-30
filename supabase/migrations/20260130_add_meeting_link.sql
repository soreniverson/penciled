-- Add meeting_link column to bookings table for storing video conference links
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_link text;
