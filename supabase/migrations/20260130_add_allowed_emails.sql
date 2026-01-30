-- Create allowed_emails table for beta access control
CREATE TABLE IF NOT EXISTS allowed_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  added_at timestamp with time zone DEFAULT now()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS allowed_emails_email_idx ON allowed_emails (email);

-- Allow service role to read this table
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can read (auth callback uses service role via admin client)
CREATE POLICY "Service role can read allowed_emails" ON allowed_emails
  FOR SELECT USING (true);
