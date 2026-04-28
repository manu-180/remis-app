-- ═══════════════════════════════════════════════
-- Tanda 5D — Security & KYC extensions
-- ═══════════════════════════════════════════════

-- ═══════════════════════════════════════════════
-- 1. ALTER kyc_verifications — add missing columns
-- ═══════════════════════════════════════════════
alter table public.kyc_verifications
  add column if not exists document_type        text,
  add column if not exists document_number_hash text,
  add column if not exists expires_at           timestamptz,
  add column if not exists reference_face_url   text;

-- ═══════════════════════════════════════════════
-- 2. device_bindings
-- ═══════════════════════════════════════════════
create table public.device_bindings (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  device_id   text        not null,
  device_info jsonb,
  bound_at    timestamptz not null default now(),
  revoked_at  timestamptz
);

create index device_bindings_user_device_idx
  on public.device_bindings (user_id, device_id);

create index device_bindings_active_idx
  on public.device_bindings (user_id)
  where revoked_at is null;

alter table public.device_bindings enable row level security;

create policy "device_bindings_select_own"
  on public.device_bindings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "device_bindings_select_admin"
  on public.device_bindings for select to authenticated
  using (public.is_admin());

create policy "device_bindings_insert_own"
  on public.device_bindings for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "device_bindings_update_own"
  on public.device_bindings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════
-- 3. security_events
-- ═══════════════════════════════════════════════
create table public.security_events (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        references public.profiles(id) on delete set null,
  event_type text        not null,
  severity   text        not null default 'info' check (severity in ('info', 'warning', 'critical')),
  metadata   jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index security_events_user_created_idx
  on public.security_events (user_id, created_at desc);

create index security_events_type_created_idx
  on public.security_events (event_type, created_at desc);

create index security_events_created_idx
  on public.security_events (created_at desc);

alter table public.security_events enable row level security;

create policy "security_events_select_admin"
  on public.security_events for select to authenticated
  using (public.is_admin());

-- ═══════════════════════════════════════════════
-- 4. rate_limit_buckets
-- ═══════════════════════════════════════════════
-- Cleanup of stale buckets is handled by a scheduled cron job (pg_cron or Edge Function).
create table public.rate_limit_buckets (
  id          uuid        primary key default uuid_generate_v4(),
  key         text        not null unique,
  tokens      numeric     not null default 10,
  last_refill timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger rate_limit_buckets_updated_at
  before update on public.rate_limit_buckets
  for each row execute function public.set_updated_at();

alter table public.rate_limit_buckets enable row level security;

create policy "rate_limit_buckets_select_admin"
  on public.rate_limit_buckets for select to authenticated
  using (public.is_admin());

-- ═══════════════════════════════════════════════
-- 5. phone_calls
-- ═══════════════════════════════════════════════
create table public.phone_calls (
  id                uuid        primary key default uuid_generate_v4(),
  ride_id           uuid        references public.rides(id) on delete set null,
  caller_id         uuid        references public.profiles(id) on delete set null,
  callee_id         uuid        references public.profiles(id) on delete set null,
  caller_role       text        check (caller_role in ('passenger', 'driver')),
  duration_seconds  integer,
  twilio_call_sid   text        unique,
  proxy_session_sid text,
  status            text        check (status in ('initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer')),
  created_at        timestamptz not null default now()
);

create index phone_calls_ride_created_idx
  on public.phone_calls (ride_id, created_at desc);

alter table public.phone_calls enable row level security;

create policy "phone_calls_select_own_ride"
  on public.phone_calls for select to authenticated
  using (
    exists (
      select 1 from public.rides r
      where r.id = ride_id
        and (r.passenger_id = (select auth.uid()) or r.driver_id = (select auth.uid()))
    )
  );

create policy "phone_calls_select_staff"
  on public.phone_calls for select to authenticated
  using (public.is_dispatcher_or_admin());

-- ═══════════════════════════════════════════════
-- 6. driver_heartbeats
-- ═══════════════════════════════════════════════
-- Rows older than 7 days can be deleted by a scheduled cron job.
create table public.driver_heartbeats (
  id          uuid              primary key default uuid_generate_v4(),
  driver_id   uuid              not null references public.drivers(id) on delete cascade,
  ride_id     uuid              references public.rides(id) on delete set null,
  latitude    double precision,
  longitude   double precision,
  recorded_at timestamptz       not null default now()
);

create index driver_heartbeats_driver_recorded_idx
  on public.driver_heartbeats (driver_id, recorded_at desc);

alter table public.driver_heartbeats enable row level security;

create policy "driver_heartbeats_insert_own"
  on public.driver_heartbeats for insert to authenticated
  with check (driver_id = (select auth.uid()));

create policy "driver_heartbeats_select_own"
  on public.driver_heartbeats for select to authenticated
  using (driver_id = (select auth.uid()));

create policy "driver_heartbeats_select_staff"
  on public.driver_heartbeats for select to authenticated
  using (public.is_dispatcher_or_admin());
