-- Create waitlist_requests table for tracking access requests
CREATE TABLE IF NOT EXISTS waitlist_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  requested_at timestamp with time zone DEFAULT now()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS waitlist_requests_email_idx ON waitlist_requests (email);

-- RLS
ALTER TABLE waitlist_requests ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (public can request access)
CREATE POLICY "Anyone can request access" ON waitlist_requests
  FOR INSERT WITH CHECK (true);

-- Only service role can read
CREATE POLICY "Service role can read waitlist_requests" ON waitlist_requests
  FOR SELECT USING (true);
