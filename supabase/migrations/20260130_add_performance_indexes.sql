-- Performance indexes for common query patterns
-- Run this migration to improve query performance

-- Bookings: Most queries filter by provider_id + status + start_time
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status_start
ON bookings(provider_id, status, start_time);

-- Bookings: For fetching upcoming bookings
CREATE INDEX IF NOT EXISTS idx_bookings_provider_start_time
ON bookings(provider_id, start_time DESC);

-- Availability: Always filtered by provider_id + is_active
CREATE INDEX IF NOT EXISTS idx_availability_provider_active
ON availability(provider_id, is_active)
WHERE is_active = true;

-- Meetings: Always filtered by provider_id + is_active
CREATE INDEX IF NOT EXISTS idx_meetings_provider_active
ON meetings(provider_id, is_active)
WHERE is_active = true;

-- Blackout dates: Filtered by provider and date range
CREATE INDEX IF NOT EXISTS idx_blackout_dates_provider_dates
ON blackout_dates(provider_id, start_date, end_date);

-- Providers: Lookup by slug (for booking pages)
CREATE INDEX IF NOT EXISTS idx_providers_slug
ON providers(slug)
WHERE slug IS NOT NULL;

-- Booking links: Lookup by slug
CREATE INDEX IF NOT EXISTS idx_booking_links_slug
ON booking_links(slug)
WHERE slug IS NOT NULL;

-- Booking link members: For team availability queries
CREATE INDEX IF NOT EXISTS idx_booking_link_members_provider
ON booking_link_members(provider_id);

CREATE INDEX IF NOT EXISTS idx_booking_link_members_link
ON booking_link_members(booking_link_id);

-- Booking link meetings: For fetching meetings on a link
CREATE INDEX IF NOT EXISTS idx_booking_link_meetings_link
ON booking_link_meetings(booking_link_id);
