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

-- ============ ADMIN + PRE-OWNED CARS (run this part too) ============
create table if not exists admin_emails (email text primary key);
alter table admin_emails enable row level security;   -- no public access

create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from admin_emails where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;

create table if not exists preowned_vehicles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  brand text, model text, year int, km int,
  fuel text, transmission text, price numeric, owners text,
  location text default 'Rohaniya, Varanasi',
  features text, inspection text,
  photos text[] default '{}',
  status text default 'available'   -- available / sold / hidden
);
alter table preowned_vehicles enable row level security;
create policy "public sees available cars" on preowned_vehicles for select to anon, authenticated using (status = 'available');
create policy "admin manages cars" on preowned_vehicles for all to authenticated using (is_admin()) with check (is_admin());

-- Admin can read and manage requests, leads and reviews
create policy "admin bookings" on bookings for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin roadside" on roadside_requests for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin leads" on car_leads for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin reviews" on reviews for all to authenticated using (is_admin()) with check (is_admin());

-- Photo storage bucket for car photos
insert into storage.buckets (id, name, public) values ('cars', 'cars', true) on conflict (id) do nothing;
create policy "admin uploads car photos" on storage.objects for insert to authenticated with check (bucket_id = 'cars' and is_admin());
create policy "admin deletes car photos" on storage.objects for delete to authenticated using (bucket_id = 'cars' and is_admin());

-- LAST STEP: add YOUR email as admin (change the email, then run):
-- insert into admin_emails (email) values ('your-email@gmail.com');
