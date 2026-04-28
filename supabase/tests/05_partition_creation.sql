-- =============================================================
-- 05_partition_creation.sql
-- Tests for driver_location_history partition management.
-- Functions: create_location_history_partition(date), create_next_month_partition()
-- The parent table is partitioned by range on recorded_at.
-- Migration 20260426000006 already creates 12 months of partitions on deploy;
-- these tests verify the functions still work idempotently and that data
-- routes to the correct partition.
-- =============================================================

begin;
select plan(5);

-- ─────────────────────────────────────────────
-- SETUP: a driver to insert location history rows
-- ─────────────────────────────────────────────
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('pa000000-0000-0000-0000-000000000001', 'part_drv@test.com', 'x', now(), now(), now());

insert into public.profiles (id, role, full_name)
values ('pa000000-0000-0000-0000-000000000001', 'driver', 'Partition Driver')
on conflict (id) do nothing;

insert into public.vehicles (id, plate, vehicle_type)
values ('pv000000-0000-0000-0000-000000000001', 'PART001', 'sedan')
on conflict (id) do nothing;

insert into public.drivers (id, is_active, is_online, current_status, vehicle_id)
values ('pa000000-0000-0000-0000-000000000001', true, true, 'available',
        'pv000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- Test 1: create_next_month_partition() runs without error (idempotent)
-- The partition for next month may already exist from the migration DO block;
-- the function should handle that gracefully with a NOTICE, not an exception.
-- ─────────────────────────────────────────────
select lives_ok(
  $q$ select public.create_next_month_partition() $q$,
  'create_next_month_partition() runs without error (idempotent)'
);

-- ─────────────────────────────────────────────
-- Test 2: The partition table for next month exists in pg_class
-- ─────────────────────────────────────────────
select ok(
  exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'driver_location_history_'
                      || to_char(date_trunc('month', now()) + interval '1 month', 'YYYY_MM')
  ),
  'partition table for next month exists in pg_class after create_next_month_partition()'
);

-- ─────────────────────────────────────────────
-- Test 3: create_location_history_partition() with an explicit far-future date
-- e.g., 3 years from now — should not exist yet, so it will be created
-- ─────────────────────────────────────────────
select lives_ok(
  $q$
    select public.create_location_history_partition(
      (date_trunc('month', now()) + interval '36 months')::date
    )
  $q$,
  'create_location_history_partition() succeeds for a far-future date'
);

-- Verify the far-future partition now exists
select ok(
  exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'driver_location_history_'
                      || to_char(date_trunc('month', now()) + interval '36 months', 'YYYY_MM')
  ),
  'far-future partition table exists in pg_class after explicit creation'
);

-- ─────────────────────────────────────────────
-- Test 4: Insert a row with current-month timestamp and verify it routes
--         to the current-month partition (not rejected with "no partition")
-- ─────────────────────────────────────────────
select lives_ok(
  $q$
    insert into public.driver_location_history
      (driver_id, location, recorded_at)
    values (
      'pa000000-0000-0000-0000-000000000001',
      st_makepoint(-64.29, -36.62)::geography,
      now()
    )
  $q$,
  'inserting a current-month row into driver_location_history succeeds (partition routing works)'
);

select * from finish();
rollback;
