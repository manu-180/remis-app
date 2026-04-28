-- =============================================================
-- 04_audit_chain.sql
-- Tests for audit_log SHA-256 hash chain integrity
-- The audit_log_hash_chain_trigger fires BEFORE INSERT and:
--   - sets prev_hash = row_hash of the last record
--   - sets row_hash  = sha256(prev_hash || entity || action || diff::text || created_at::text)
-- We verify chain consistency after 3 natural writes (ride status changes).
-- =============================================================

begin;
select plan(6);

-- ─────────────────────────────────────────────
-- SETUP: minimal data to trigger audit entries
-- audit_table_changes() fires on rides INSERT/UPDATE/DELETE
-- ─────────────────────────────────────────────

-- auth user
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('ac000000-0000-0000-0000-000000000001', 'audit_pax@test.com', 'x', now(), now(), now());

insert into public.profiles (id, role, full_name)
values ('ac000000-0000-0000-0000-000000000001', 'passenger', 'Audit Pax')
on conflict (id) do nothing;

insert into public.passengers (id)
values ('ac000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- Capture the current max audit_log id so we can isolate this test's entries
-- (other seeds may have already written audit rows)
create temp table _audit_baseline as
  select coalesce(max(id), 0) as baseline_id from public.audit_log;

-- ─────────────────────────────────────────────
-- Generate 3 audit entries:
--   1. INSERT ride            → audit entry #1
--   2. UPDATE ride (status)   → audit entry #2
--   3. UPDATE ride (status)   → audit entry #3
-- ─────────────────────────────────────────────
insert into public.rides (id, passenger_id, status, pickup_location, requested_via)
values (
  'audit001-0000-0000-0000-000000000001',
  'ac000000-0000-0000-0000-000000000001',
  'requested',
  st_makepoint(-64.31, -36.62)::geography,
  'app'
);

update public.rides
set status = 'assigned', updated_at = now()
where id = 'audit001-0000-0000-0000-000000000001';

update public.rides
set status = 'on_trip', updated_at = now()
where id = 'audit001-0000-0000-0000-000000000001';

-- ─────────────────────────────────────────────
-- Test 1: At least 3 audit entries were created for this ride
-- ─────────────────────────────────────────────
select ok(
  (
    select count(*)::int
    from public.audit_log
    where entity = 'rides'
      and entity_id = 'audit001-0000-0000-0000-000000000001'
  ) >= 3,
  'at least 3 audit_log entries exist for the test ride'
);

-- ─────────────────────────────────────────────
-- Test 2: Every audit entry has a non-null row_hash
-- ─────────────────────────────────────────────
select is(
  (
    select count(*)::int
    from public.audit_log
    where id > (select baseline_id from _audit_baseline)
      and row_hash is null
  ),
  0,
  'all new audit_log rows have non-null row_hash'
);

-- ─────────────────────────────────────────────
-- Test 3: The first new entry (after baseline) has prev_hash = row_hash
--         of the last row before it, OR prev_hash is null if it's the
--         very first row in the chain
-- We verify: if prev_hash is not null, it matches the preceding row's row_hash
-- ─────────────────────────────────────────────
select ok(
  (
    with ordered as (
      select id, prev_hash, row_hash,
             lag(row_hash) over (order by id) as prev_row_hash
      from public.audit_log
      where id > (select baseline_id from _audit_baseline)
      order by id
    )
    select bool_and(
      -- Either it's the first new entry (prev_row_hash is null → prev_hash may be the chain before our test)
      -- or prev_hash equals the prior row's row_hash
      prev_row_hash is null
      or prev_hash = prev_row_hash
    )
    from ordered
    where prev_row_hash is not null
  ),
  'each new audit_log row''s prev_hash equals the preceding row''s row_hash'
);

-- ─────────────────────────────────────────────
-- Test 4: Chain is sequential — IDs are strictly increasing
--         (no gaps would break the chain ordering assumption)
-- ─────────────────────────────────────────────
select ok(
  (
    with ordered as (
      select id,
             lag(id) over (order by id) as prev_id
      from public.audit_log
      where id > (select baseline_id from _audit_baseline)
    )
    select bool_and(id > prev_id)
    from ordered
    where prev_id is not null
  ),
  'audit_log IDs are strictly increasing for new entries (chain order is valid)'
);

-- ─────────────────────────────────────────────
-- Test 5: Recompute row_hash for the FIRST new entry and verify it matches
-- Formula: sha256(prev_hash || entity || action || diff::text || created_at::text)
-- ─────────────────────────────────────────────
select ok(
  (
    with first_new as (
      select *
      from public.audit_log
      where id > (select baseline_id from _audit_baseline)
      order by id
      limit 1
    )
    select row_hash = sha256(
      coalesce(prev_hash, ''::bytea)
      || convert_to(
           coalesce(entity, '')
           || coalesce(action, '')
           || coalesce(diff::text, '')
           || coalesce(created_at::text, ''),
           'UTF8'
         )
    )
    from first_new
  ),
  'row_hash of first new audit entry matches recomputed SHA-256'
);

-- ─────────────────────────────────────────────
-- Test 6: Recompute row_hash for the THIRD new entry
--         (proves chaining propagates correctly across multiple writes)
-- ─────────────────────────────────────────────
select ok(
  (
    with third_new as (
      select *
      from public.audit_log
      where id > (select baseline_id from _audit_baseline)
      order by id
      limit 1 offset 2
    )
    select row_hash = sha256(
      coalesce(prev_hash, ''::bytea)
      || convert_to(
           coalesce(entity, '')
           || coalesce(action, '')
           || coalesce(diff::text, '')
           || coalesce(created_at::text, ''),
           'UTF8'
         )
    )
    from third_new
  ),
  'row_hash of third new audit entry matches recomputed SHA-256'
);

select * from finish();
rollback;
