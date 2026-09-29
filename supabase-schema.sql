-- Run this in Supabase > SQL Editor > New query > Run.
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text, phone text, car text, registration text,
  service text, preferred_date date, preferred_time text, message text,
  status text default 'pending'
);
create table if not exists roadside_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  location_text text, latitude double precision, longitude double precision,
  problem text, car text, registration text, fuel text, transmission text,
  name text, phone text, whatsapp text, description text,
  status text default 'pending'
);
create table if not exists car_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  type text default 'sell',
  registration text, car text, year text, km text, fuel text,
  expected_price text, name text, phone text, notes text,
  status text default 'new'
);
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  customer_name text, vehicle_service text, rating int, body text,
  approved boolean default false
);
alter table bookings enable row level security;
alter table roadside_requests enable row level security;
alter table car_leads enable row level security;
alter table reviews enable row level security;
-- Visitors may only ADD requests, never read them.
create policy "public add bookings" on bookings for insert to anon with check (true);
create policy "public add roadside" on roadside_requests for insert to anon with check (true);
create policy "public add leads" on car_leads for insert to anon with check (true);
create policy "public add reviews" on reviews for insert to anon with check (approved = false);
-- Visitors may read only approved reviews.
create policy "public read approved reviews" on reviews for select to anon using (approved = true);
-- You read/manage everything from the Supabase dashboard (Table Editor) for now.
