-- Migration: Add resource pools for panel/interview scheduling

-- Resource pools table (e.g., "Interview Panel", "Support Team")
CREATE TABLE resource_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pool_type TEXT NOT NULL DEFAULT 'round_robin' CHECK (pool_type IN ('round_robin', 'load_balanced', 'priority')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resource pool members
CREATE TABLE resource_pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES resource_pools(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0, -- Higher priority = assigned first (for priority mode)
  max_bookings_per_day INTEGER, -- Optional limit on daily bookings from this pool
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pool_id, provider_id)
);

-- Link booking_links to resource pools
ALTER TABLE booking_links ADD COLUMN resource_pool_id UUID REFERENCES resource_pools(id);

-- RLS for resource_pools
ALTER TABLE resource_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own pools" ON resource_pools
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Pool members can view pools" ON resource_pools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM resource_pool_members
      WHERE resource_pool_members.pool_id = resource_pools.id
      AND resource_pool_members.provider_id = auth.uid()
    )
  );

-- RLS for resource_pool_members
ALTER TABLE resource_pool_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pool owners can manage members" ON resource_pool_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM resource_pools
      WHERE resource_pools.id = resource_pool_members.pool_id
      AND resource_pools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Members can view own membership" ON resource_pool_members
  FOR SELECT USING (auth.uid() = provider_id);

-- Indexes
CREATE INDEX idx_resource_pools_owner ON resource_pools(owner_id);
CREATE INDEX idx_resource_pools_active ON resource_pools(is_active) WHERE is_active = true;
CREATE INDEX idx_resource_pool_members_pool ON resource_pool_members(pool_id);
CREATE INDEX idx_resource_pool_members_provider ON resource_pool_members(provider_id);
CREATE INDEX idx_booking_links_pool ON booking_links(resource_pool_id) WHERE resource_pool_id IS NOT NULL;

-- Update trigger
CREATE TRIGGER update_resource_pools_updated_at
  BEFORE UPDATE ON resource_pools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
