-- =============================================================
-- 01_rls_passengers.sql
-- RLS policy tests for passengers, rides, audit_log, and RPCs
-- Run with: pg_prove -d postgres supabase/tests/01_rls_passengers.sql
-- =============================================================

begin;
select plan(8);

-- ─────────────────────────────────────────────
-- SETUP: test users in auth.users
-- ─────────────────────────────────────────────
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', 'pax1@test.com',   'x', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'pax2@test.com',   'x', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'driver1@test.com','x', now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', 'disp1@test.com',  'x', now(), now(), now());

-- profiles (bypassing the trigger that would create duplicates — insert manually)
insert into public.profiles (id, role, full_name)
values
  ('11111111-1111-1111-1111-111111111111', 'passenger',   'Pasajero A'),
  ('22222222-2222-2222-2222-222222222222', 'passenger',   'Pasajero B'),
  ('33333333-3333-3333-3333-333333333333', 'driver',      'Conductor Uno'),
  ('44444444-4444-4444-4444-444444444444', 'dispatcher',  'Despachador Uno')
on conflict (id) do nothing;

insert into public.passengers (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

-- Vehicle for driver
insert into public.vehicles (id, plate, vehicle_type)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TST001', 'sedan')
on conflict (id) do nothing;

insert into public.drivers (id, is_active, is_online, current_status, vehicle_id)
values ('33333333-3333-3333-3333-333333333333', true, true, 'available',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
on conflict (id) do nothing;

-- A ride belonging to Pasajero A (needed for dispatcher test)
insert into public.rides (id, passenger_id, status, pickup_location, requested_via)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'requested',
  st_makepoint(-64.31, -36.62)::geography,
  'app'
) on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- Test 1: Passenger A cannot see Passenger B's row
-- ─────────────────────────────────────────────
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.passengers
   where id = '22222222-2222-2222-2222-222222222222'),
  0,
  'passenger A cannot see passenger B row'
);

-- ─────────────────────────────────────────────
-- Test 2: Driver role cannot SELECT from passengers table
-- (driver's only policies are own-row and staff; driver is not a passenger)
-- ─────────────────────────────────────────────
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select is(
  (select count(*)::int from public.passengers),
  0,
  'driver cannot read any row in passengers table'
);

-- ─────────────────────────────────────────────
-- Test 3: Passenger cannot insert into audit_log
-- (audit_log has only an admin SELECT policy; no insert policy for authenticated)
-- ─────────────────────────────────────────────
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $q$
    insert into public.audit_log (entity, entity_id, action, row_hash)
    values ('test', 'test-id', 'INSERT', sha256('test'::bytea))
  $q$,
  null,
  null,
  'passenger cannot insert into audit_log'
);

-- ─────────────────────────────────────────────
-- Test 4: Dispatcher can see all rides
-- ─────────────────────────────────────────────
set local "request.jwt.claims" = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select ok(
  (select count(*)::int from public.rides) >= 1,
  'dispatcher can see all rides (at least the seeded one)'
);

-- ─────────────────────────────────────────────
-- Test 5: Anon user cannot read rides
-- ─────────────────────────────────────────────
set local role anon;

select is(
  (select count(*)::int from public.rides),
  0,
  'anon user cannot read rides table'
);

-- ─────────────────────────────────────────────
-- Test 6: assign_ride fails when ride already assigned (race-condition guard)
-- ─────────────────────────────────────────────
set local role postgres;

-- First assignment succeeds
perform public.assign_ride(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);

-- Second assignment must raise P0001
select throws_ok(
  $q$
    select public.assign_ride(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444'
    )
  $q$,
  'P0001',
  null,
  'assign_ride fails when ride already assigned'
);

-- ─────────────────────────────────────────────
-- Test 7: cancel_ride fails when ride is in terminal status (completed)
-- ─────────────────────────────────────────────

-- Force ride to completed for this test
update public.rides set status = 'completed' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select throws_ok(
  $q$
    select public.cancel_ride(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      '44444444-4444-4444-4444-444444444444',
      'test cancellation'
    )
  $q$,
  'P0001',
  null,
  'cancel_ride fails when ride is already completed'
);

-- ─────────────────────────────────────────────
-- Test 8: get_shared_trip with invalid/expired token returns error P0003
-- ─────────────────────────────────────────────
select throws_ok(
  $q$
    select * from public.get_shared_trip('deadbeef-dead-beef-dead-beefdeadbeef'::uuid)
  $q$,
  'P0003',
  null,
  'get_shared_trip raises P0003 for invalid or expired token'
);

select * from finish();
rollback;
