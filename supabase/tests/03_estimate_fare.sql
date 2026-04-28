-- =============================================================
-- 03_estimate_fare.sql
-- Tests for estimate_fare RPC
-- Depends on seed data: supabase/migrations/20260426000050_seed_zones_and_fares.sql
-- Santa Rosa, La Pampa: ~36.62°S, 64.29°W
-- Zone polygons (from seed):
--   Centro:    lng -64.32/-64.29, lat -36.61/-36.635
--   Norte:     lng -64.35/-64.26, lat -36.57/-36.61
--   Sur:       lng -64.35/-64.26, lat -36.635/-36.67
--   Periferia: lng -64.50/-64.10, lat -36.50/-36.75 (wraps all)
-- =============================================================

begin;
select plan(6);

-- ─────────────────────────────────────────────
-- Helper: a point guaranteed to be inside Centro zone
--   lat -36.620, lng -64.305  (midpoint of Centro box)
-- A point inside Norte zone:
--   lat -36.590, lng -64.305
-- A point outside ALL specific zones but inside Periferia:
--   lat -36.520, lng -64.450
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- Test 1: Centro → Centro daytime → applies base + per_km, no night surcharge
-- Seed: base=2500, per_km=350, night_surcharge=20%
-- Straight distance ≈ 0 (same point → ~0m) but base applies
-- We use two distinct points ~1km apart inside Centro
--   Point A: -36.6200, -64.3050
--   Point B: -36.6280, -64.3050  (~890m apart ≈ route ~1.16km)
-- Expected: 2500 + (0.89*1.3/1)*350 ≈ 2905 (approx)
-- We just check amount > base_amount and origin_zone = dest_zone = Centro
-- ─────────────────────────────────────────────
select ok(
  (select estimated_amount_ars from public.estimate_fare(
    -36.6200, -64.3050,   -- pickup (Centro)
    -36.6280, -64.3050,   -- dest   (Centro)
    '2026-04-27 14:00:00+00'::timestamptz  -- daytime
  ) limit 1) >= 2500,
  'estimate_fare Centro→Centro daytime returns amount >= base_amount (2500 ARS)'
);

select is(
  (select origin_zone_id = dest_zone_id from public.estimate_fare(
    -36.6200, -64.3050,
    -36.6280, -64.3050,
    '2026-04-27 14:00:00+00'::timestamptz
  ) limit 1),
  true,
  'estimate_fare Centro→Centro: origin_zone_id equals dest_zone_id'
);

-- ─────────────────────────────────────────────
-- Test 2: Night surcharge applies between 22:00-06:00 (ART = UTC-3)
-- 22:00 ART = 01:00 UTC next day  (or 22:00+03:00 offset)
-- Pass at_time as 2026-04-28 01:00:00 UTC = 22:00 ART  → is_night = true
-- Daytime for same pair → lower amount
-- ─────────────────────────────────────────────
do $$
declare
  day_amount   numeric;
  night_amount numeric;
begin
  select estimated_amount_ars into day_amount
  from public.estimate_fare(
    -36.6200, -64.3050,
    -36.6280, -64.3050,
    '2026-04-27 14:00:00+00'::timestamptz  -- 11:00 ART → daytime
  );

  select estimated_amount_ars into night_amount
  from public.estimate_fare(
    -36.6200, -64.3050,
    -36.6280, -64.3050,
    '2026-04-28 01:00:00+00'::timestamptz  -- 22:00 ART → night
  );

  if night_amount <= day_amount then
    raise exception 'Night amount (%) must be > day amount (%) for 20%% surcharge',
      night_amount, day_amount;
  end if;
end;
$$;

select ok(true, 'estimate_fare night surcharge produces higher amount than daytime');

-- ─────────────────────────────────────────────
-- Test 3: Zone match → correct base fare applied
-- Centro → Norte: seed base=3000, per_km=350
-- Pickup inside Centro, dest inside Norte
--   Pickup: -36.6220, -64.3050 (Centro)
--   Dest:   -36.5900, -64.3050 (Norte, ~3.7km straight)
-- Expected amount ≈ 3000 + (3.7*1.3)*350 = 3000 + 1683.5 ≈ 4684
-- We check amount >= 3000 (base) and < 10000 (sanity)
-- ─────────────────────────────────────────────
select ok(
  (
    select estimated_amount_ars
    from public.estimate_fare(
      -36.6220, -64.3050,   -- Centro
      -36.5900, -64.3050,   -- Norte
      '2026-04-27 14:00:00+00'::timestamptz
    ) limit 1
  ) between 3000 and 10000,
  'estimate_fare Centro→Norte returns amount in expected range [3000, 10000] ARS'
);

-- ─────────────────────────────────────────────
-- Test 4: Same origin and destination → distance ≈ 0, amount ≈ base minimum
-- Both at exact same coordinate → straight dist = 0 → route dist = 0
-- amount = base_amount + 0 * per_km = base_amount (2500 for Centro→Centro)
-- ─────────────────────────────────────────────
select is(
  (
    select estimated_amount_ars
    from public.estimate_fare(
      -36.6220, -64.3050,
      -36.6220, -64.3050,   -- identical point
      '2026-04-27 14:00:00+00'::timestamptz
    ) limit 1
  ),
  2500.00::numeric,
  'estimate_fare with same origin=destination returns exactly base_amount (2500 ARS)'
);

-- ─────────────────────────────────────────────
-- Test 5: No matching zone + no wildcard fare → raises P0002
-- Use coordinates clearly outside La Pampa (e.g., Buenos Aires downtown)
-- Seed has NO wildcard fare (origin_zone_id IS NULL row), so P0002 expected
-- ─────────────────────────────────────────────
select throws_ok(
  $q$
    select * from public.estimate_fare(
      -34.6037, -58.3816,   -- Buenos Aires
      -34.6100, -58.3900,
      '2026-04-27 14:00:00+00'::timestamptz
    )
  $q$,
  'P0002',
  null,
  'estimate_fare raises P0002 when no fare is configured for the route'
);

select * from finish();
rollback;
