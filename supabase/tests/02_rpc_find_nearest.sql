-- =============================================================
-- 02_rpc_find_nearest.sql
-- Tests for find_nearest_available_drivers RPC
-- Coordinates: Santa Rosa, La Pampa (~36.62°S, 64.29°W)
-- Run with: pg_prove -d postgres supabase/tests/02_rpc_find_nearest.sql
-- =============================================================

begin;
select plan(5);

-- ─────────────────────────────────────────────
-- SETUP: users + drivers at known positions
-- ─────────────────────────────────────────────
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('d1000000-0000-0000-0000-000000000001', 'd1@test.com', 'x', now(), now(), now()),
  ('d2000000-0000-0000-0000-000000000002', 'd2@test.com', 'x', now(), now(), now()),
  ('d3000000-0000-0000-0000-000000000003', 'd3@test.com', 'x', now(), now(), now()),
  ('d4000000-0000-0000-0000-000000000004', 'd4@test.com', 'x', now(), now(), now());

insert into public.profiles (id, role, full_name)
values
  ('d1000000-0000-0000-0000-000000000001', 'driver', 'Driver Cerca Sedan'),
  ('d2000000-0000-0000-0000-000000000002', 'driver', 'Driver Lejos Sedan'),
  ('d3000000-0000-0000-0000-000000000003', 'driver', 'Driver Offline'),
  ('d4000000-0000-0000-0000-000000000004', 'driver', 'Driver SUV')
on conflict (id) do nothing;

-- Vehicles
insert into public.vehicles (id, plate, vehicle_type) values
  ('v1000000-0000-0000-0000-000000000001', 'CERCA01', 'sedan'),
  ('v2000000-0000-0000-0000-000000000002', 'LEJOS02', 'sedan'),
  ('v3000000-0000-0000-0000-000000000003', 'OFFLN03', 'sedan'),
  ('v4000000-0000-0000-0000-000000000004', 'SUVV004', 'suv')
on conflict (id) do nothing;

insert into public.drivers (id, is_active, is_online, current_status, vehicle_id, mobile_number) values
  -- Driver 1: online, available, ~500m from pickup
  ('d1000000-0000-0000-0000-000000000001', true, true, 'available',
   'v1000000-0000-0000-0000-000000000001', '+5491100000001'),
  -- Driver 2: online, available, ~5km from pickup
  ('d2000000-0000-0000-0000-000000000002', true, true, 'available',
   'v2000000-0000-0000-0000-000000000002', '+5491100000002'),
  -- Driver 3: OFFLINE → must be excluded
  ('d3000000-0000-0000-0000-000000000003', true, false, 'offline',
   'v3000000-0000-0000-0000-000000000003', '+5491100000003'),
  -- Driver 4: online, available, ~1km, SUV
  ('d4000000-0000-0000-0000-000000000004', true, true, 'available',
   'v4000000-0000-0000-0000-000000000004', '+5491100000004')
on conflict (id) do nothing;

-- Pickup reference point: -36.6200, -64.2900  (lat, lng)
-- Driver 1: ~0.0045° offset south  → ~500m
-- Driver 2: ~0.045° offset south   → ~5km
-- Driver 4: ~0.009° offset east    → ~800m (SUV)

insert into public.driver_current_location (driver_id, location, status, updated_at) values
  ('d1000000-0000-0000-0000-000000000001',
   st_makepoint(-64.2900, -36.6245)::geography,  -- lng, lat
   'available', now()),
  ('d2000000-0000-0000-0000-000000000002',
   st_makepoint(-64.2900, -36.6650)::geography,
   'available', now()),
  ('d3000000-0000-0000-0000-000000000003',
   st_makepoint(-64.2900, -36.6210)::geography,
   'offline', now()),
  ('d4000000-0000-0000-0000-000000000004',
   st_makepoint(-64.2810, -36.6200)::geography,
   'available', now())
on conflict (driver_id) do update
  set location = excluded.location,
      status   = excluded.status,
      updated_at = excluded.updated_at;

-- ─────────────────────────────────────────────
-- Test 1: Returns drivers ordered closest-first
-- Driver 1 (~500m) should appear before Driver 2 (~5km)
-- ─────────────────────────────────────────────
do $$
declare
  first_driver_id uuid;
begin
  select driver_id into first_driver_id
  from public.find_nearest_available_drivers(
    -36.6200, -64.2900,   -- pickup lat/lng
    20000,                 -- max 20km
    10,                    -- limit
    null                   -- any vehicle type
  )
  order by distance_m asc
  limit 1;

  if first_driver_id != 'd1000000-0000-0000-0000-000000000001' then
    raise exception 'Expected Driver 1 (closest) to appear first, got %', first_driver_id;
  end if;
end;
$$;

select ok(true, 'find_nearest_available_drivers returns drivers ordered closest-first');

-- ─────────────────────────────────────────────
-- Test 2: Excludes drivers where is_online = false
-- ─────────────────────────────────────────────
select ok(
  not exists (
    select 1 from public.find_nearest_available_drivers(-36.6200, -64.2900, 20000, 10, null)
    where driver_id = 'd3000000-0000-0000-0000-000000000003'
  ),
  'find_nearest excludes offline drivers (is_online = false)'
);

-- ─────────────────────────────────────────────
-- Test 3: Excludes drivers outside max_distance_m
-- With max 1000m, Driver 2 (~5km away) must not appear
-- ─────────────────────────────────────────────
select ok(
  not exists (
    select 1 from public.find_nearest_available_drivers(-36.6200, -64.2900, 1000, 10, null)
    where driver_id = 'd2000000-0000-0000-0000-000000000002'
  ),
  'find_nearest excludes drivers beyond max_distance_m'
);

-- ─────────────────────────────────────────────
-- Test 4: Filters by vehicle_type when p_vehicle_type is passed
-- Requesting 'suv' should return only Driver 4
-- ─────────────────────────────────────────────
select is(
  (select count(*)::int from public.find_nearest_available_drivers(
    -36.6200, -64.2900, 20000, 10, 'suv'::public.vehicle_type
  )),
  1,
  'find_nearest with vehicle_type=suv returns exactly 1 result'
);

select is(
  (select driver_id from public.find_nearest_available_drivers(
    -36.6200, -64.2900, 20000, 10, 'suv'::public.vehicle_type
  ) limit 1),
  'd4000000-0000-0000-0000-000000000004'::uuid,
  'find_nearest suv filter returns the SUV driver'
);

-- ─────────────────────────────────────────────
-- Test 5: Returns empty when no drivers within max_distance_m
-- Using 1m radius — no driver will be that close to the exact pickup point
-- ─────────────────────────────────────────────
select is(
  (select count(*)::int from public.find_nearest_available_drivers(
    -36.6200, -64.2900, 1, 10, null
  )),
  0,
  'find_nearest returns empty when no drivers within 1m radius'
);

select * from finish();
rollback;
