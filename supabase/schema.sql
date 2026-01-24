-- penciled.fyi Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROVIDERS TABLE
-- ============================================
create table providers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  business_name text,
  business_category text,
  timezone text not null default 'America/New_York',
  avatar_url text,
  slug text unique,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  google_calendar_token jsonb,
  google_calendar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for providers
alter table providers enable row level security;

create policy "Users can view own provider" on providers
  for select using (auth.uid() = id);

create policy "Users can update own provider" on providers
  for update using (auth.uid() = id);

create policy "Users can insert own provider" on providers
  for insert with check (auth.uid() = id);

-- Public read for slug lookup
create policy "Public can view provider by slug" on providers
  for select using (slug is not null);

-- ============================================
-- SERVICES TABLE
-- ============================================
create table services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 60,
  price_cents integer,
  currency text default 'USD',
  booking_mode text not null default 'instant' check (booking_mode in ('instant', 'request')),
  buffer_minutes integer not null default 15,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for services
alter table services enable row level security;

create policy "Providers can manage own services" on services
  for all using (auth.uid() = provider_id);

create policy "Public can view active services" on services
  for select using (is_active = true);

-- Index for provider lookups
create index services_provider_id_idx on services(provider_id);

-- ============================================
-- AVAILABILITY TABLE
-- ============================================
create table availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS for availability
alter table availability enable row level security;

create policy "Providers can manage own availability" on availability
  for all using (auth.uid() = provider_id);

create policy "Public can view active availability" on availability
  for select using (is_active = true);

-- Index for provider lookups
create index availability_provider_id_idx on availability(provider_id);
create index availability_provider_day_idx on availability(provider_id, day_of_week);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
create table bookings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  client_phone text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  google_event_id text,
  notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  management_token uuid default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for bookings
alter table bookings enable row level security;

create policy "Providers can view own bookings" on bookings
  for select using (auth.uid() = provider_id);

create policy "Providers can update own bookings" on bookings
  for update using (auth.uid() = provider_id);

create policy "Anyone can insert bookings" on bookings
  for insert with check (true);

-- Public can view booking by management token
create policy "Public can view booking by token" on bookings
  for select using (management_token is not null);

-- Indexes for bookings
create index bookings_provider_time_idx on bookings(provider_id, start_time, end_time);
create index bookings_provider_status_idx on bookings(provider_id, status);
create index bookings_management_token_idx on bookings(management_token);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_providers_updated_at
  before update on providers
  for each row execute function update_updated_at_column();

create trigger update_services_updated_at
  before update on services
  for each row execute function update_updated_at_column();

create trigger update_bookings_updated_at
  before update on bookings
  for each row execute function update_updated_at_column();

-- ============================================
-- SLUG UNIQUENESS CHECK FUNCTION
-- ============================================
create or replace function check_slug_availability(slug_to_check text, exclude_id uuid default null)
returns boolean as $$
begin
  return not exists (
    select 1 from providers
    where slug = slug_to_check
    and (exclude_id is null or id != exclude_id)
  );
end;
$$ language plpgsql;
