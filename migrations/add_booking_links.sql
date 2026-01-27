-- Migration: Add booking links for multi-person scheduling
-- Allows teams to create booking links that check availability across multiple calendars

-- Booking links table (main entity)
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link members (team members associated with this booking link)
CREATE TABLE IF NOT EXISTS booking_link_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_link_id, provider_id)
);

-- Services available on a booking link
CREATE TABLE IF NOT EXISTS booking_link_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(booking_link_id, service_id)
);

-- Track which link a booking came from
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_link_id UUID REFERENCES booking_links(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_links_slug ON booking_links(slug);
CREATE INDEX IF NOT EXISTS idx_booking_links_owner ON booking_links(owner_id);
CREATE INDEX IF NOT EXISTS idx_booking_link_members_link ON booking_link_members(booking_link_id);
CREATE INDEX IF NOT EXISTS idx_booking_link_members_provider ON booking_link_members(provider_id);
CREATE INDEX IF NOT EXISTS idx_booking_link_services_link ON booking_link_services(booking_link_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_link ON bookings(booking_link_id);

-- Enable RLS
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_link_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_link_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_links

-- Owners can view their own links
CREATE POLICY "Owners can view own booking links"
  ON booking_links
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Members can view links they're part of
CREATE POLICY "Members can view links they belong to"
  ON booking_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_link_members
      WHERE booking_link_members.booking_link_id = booking_links.id
      AND booking_link_members.provider_id = auth.uid()
    )
  );

-- Public can view active links (for booking page)
CREATE POLICY "Public can view active booking links"
  ON booking_links
  FOR SELECT
  USING (is_active = true);

-- Only owners can create links
CREATE POLICY "Owners can create booking links"
  ON booking_links
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only owners can update their links
CREATE POLICY "Owners can update own booking links"
  ON booking_links
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Only owners can delete their links
CREATE POLICY "Owners can delete own booking links"
  ON booking_links
  FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for booking_link_members

-- Public can view members (for booking page availability check)
CREATE POLICY "Public can view booking link members"
  ON booking_link_members
  FOR SELECT
  USING (true);

-- Only link owners can manage members
CREATE POLICY "Link owners can insert members"
  ON booking_link_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = booking_link_members.booking_link_id
      AND booking_links.owner_id = auth.uid()
    )
  );

CREATE POLICY "Link owners can delete members"
  ON booking_link_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = booking_link_members.booking_link_id
      AND booking_links.owner_id = auth.uid()
    )
  );

-- RLS Policies for booking_link_services

-- Public can view services (for booking page)
CREATE POLICY "Public can view booking link services"
  ON booking_link_services
  FOR SELECT
  USING (true);

-- Only link owners can manage services
CREATE POLICY "Link owners can insert services"
  ON booking_link_services
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = booking_link_services.booking_link_id
      AND booking_links.owner_id = auth.uid()
    )
  );

CREATE POLICY "Link owners can delete services"
  ON booking_link_services
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = booking_link_services.booking_link_id
      AND booking_links.owner_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_booking_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS booking_links_updated_at ON booking_links;
CREATE TRIGGER booking_links_updated_at
  BEFORE UPDATE ON booking_links
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_links_updated_at();
