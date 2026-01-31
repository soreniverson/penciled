-- Migration: Add delegates table for EA delegation support
-- Allows providers to grant delegate access to other providers

CREATE TABLE delegates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  delegate_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '{
    "view": true,
    "book": false,
    "reschedule": false,
    "cancel": false,
    "override_availability": false,
    "override_conflicts": false
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(principal_id, delegate_id),
  -- Prevent self-delegation
  CONSTRAINT no_self_delegation CHECK (principal_id != delegate_id)
);

-- RLS for delegates
ALTER TABLE delegates ENABLE ROW LEVEL SECURITY;

-- Principals can manage their delegates
CREATE POLICY "Principals can manage own delegates" ON delegates
  FOR ALL USING (auth.uid() = principal_id);

-- Delegates can view their delegations
CREATE POLICY "Delegates can view their delegations" ON delegates
  FOR SELECT USING (auth.uid() = delegate_id);

-- Indexes
CREATE INDEX idx_delegates_principal ON delegates(principal_id);
CREATE INDEX idx_delegates_delegate ON delegates(delegate_id);
CREATE INDEX idx_delegates_expires ON delegates(expires_at) WHERE expires_at IS NOT NULL;

-- Trigger to update updated_at (add updated_at column first)
ALTER TABLE delegates ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER update_delegates_updated_at
  BEFORE UPDATE ON delegates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
