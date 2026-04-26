-- RLS policies para todas las tablas públicas
-- Patrón: (SELECT auth.uid()) — con wrapper SELECT para evitar O(n) calls
-- Una policy por operación (no FOR ALL)
-- Siempre especificar rol (TO authenticated / TO anon)

-- Helper: verificar rol del usuario actual
create or replace function public.current_user_role()
returns public.user_role language sql stable security definer as $$
  select role from public.profiles
  where id = (select auth.uid())
  and deleted_at is null
  limit 1;
$$;

-- Helper: verificar si es dispatcher o admin
create or replace function public.is_dispatcher_or_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
    and role in ('dispatcher', 'admin')
    and deleted_at is null
  );
$$;

-- Helper: verificar si es admin
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
    and role = 'admin'
    and deleted_at is null
  );
$$;

-- ═══════════════════════════════════════════════
-- profiles
-- ═══════════════════════════════════════════════
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_select_staff"
  on public.profiles for select to authenticated
  using (public.is_dispatcher_or_admin());

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ═══════════════════════════════════════════════
-- passengers
-- ═══════════════════════════════════════════════
alter table public.passengers enable row level security;

create policy "passengers_select_own"
  on public.passengers for select to authenticated
  using ((select auth.uid()) = id);

create policy "passengers_select_staff"
  on public.passengers for select to authenticated
  using (public.is_dispatcher_or_admin());

create policy "passengers_insert_own"
  on public.passengers for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "passengers_update_own"
  on public.passengers for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ═══════════════════════════════════════════════
-- frequent_addresses
-- ═══════════════════════════════════════════════
alter table public.frequent_addresses enable row level security;

create policy "frequent_addresses_select_own"
  on public.frequent_addresses for select to authenticated
  using (
    passenger_id = (select auth.uid())
    or public.is_dispatcher_or_admin()
  );

create policy "frequent_addresses_insert_own"
  on public.frequent_addresses for insert to authenticated
  with check (passenger_id = (select auth.uid()));

create policy "frequent_addresses_update_own"
  on public.frequent_addresses for update to authenticated
  using (passenger_id = (select auth.uid()))
  with check (passenger_id = (select auth.uid()));

create policy "frequent_addresses_delete_own"
  on public.frequent_addresses for delete to authenticated
  using (passenger_id = (select auth.uid()));

-- ═══════════════════════════════════════════════
-- vehicles
-- ═══════════════════════════════════════════════
alter table public.vehicles enable row level security;

create policy "vehicles_select_authenticated"
  on public.vehicles for select to authenticated
  using (true);

create policy "vehicles_insert_admin"
  on public.vehicles for insert to authenticated
  with check (public.is_admin());

create policy "vehicles_update_admin"
  on public.vehicles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ═══════════════════════════════════════════════
-- drivers
-- ═══════════════════════════════════════════════
alter table public.drivers enable row level security;

create policy "drivers_select_own"
  on public.drivers for select to authenticated
  using ((select auth.uid()) = id);

create policy "drivers_select_staff"
  on public.drivers for select to authenticated
  using (public.is_dispatcher_or_admin());

-- Pasajero puede ver datos públicos del conductor asignado a su ride activo
create policy "drivers_select_passenger_assigned"
  on public.drivers for select to authenticated
  using (
    public.current_user_role() = 'passenger'
    and exists (
      select 1 from public.rides r
      join public.passengers p on p.id = r.passenger_id
      where r.driver_id = drivers.id
      and p.id = (select auth.uid())
      and r.status in ('assigned', 'en_route_to_pickup', 'waiting_passenger', 'on_trip')
    )
  );

create policy "drivers_insert_own"
  on public.drivers for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "drivers_update_own"
  on public.drivers for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "drivers_update_staff"
  on public.drivers for update to authenticated
  using (public.is_dispatcher_or_admin())
  with check (public.is_dispatcher_or_admin());

-- ═══════════════════════════════════════════════
-- driver_documents
-- ═══════════════════════════════════════════════
alter table public.driver_documents enable row level security;

create policy "driver_docs_select_own"
  on public.driver_documents for select to authenticated
  using (
    driver_id = (select auth.uid())
    or public.is_dispatcher_or_admin()
  );

create policy "driver_docs_insert_own"
  on public.driver_documents for insert to authenticated
  with check (driver_id = (select auth.uid()) or public.is_dispatcher_or_admin());

create policy "driver_docs_update_staff"
  on public.driver_documents for update to authenticated
  using (public.is_dispatcher_or_admin())
  with check (public.is_dispatcher_or_admin());

-- ═══════════════════════════════════════════════
-- driver_current_location
-- ═══════════════════════════════════════════════
alter table public.driver_current_location enable row level security;

-- El conductor escribe solo la suya (UPSERT)
create policy "dcl_upsert_own"
  on public.driver_current_location for all to authenticated
  using (driver_id = (select auth.uid()))
  with check (driver_id = (select auth.uid()));

-- Dispatcher/admin ven todas
create policy "dcl_select_staff"
  on public.driver_current_location for select to authenticated
  using (public.is_dispatcher_or_admin());

-- Pasajero ve la del conductor asignado a su ride activo
create policy "dcl_select_passenger_assigned"
  on public.driver_current_location for select to authenticated
  using (
    public.current_user_role() = 'passenger'
    and exists (
      select 1 from public.rides r
      join public.passengers p on p.id = r.passenger_id
      where r.driver_id = driver_current_location.driver_id
      and p.id = (select auth.uid())
      and r.status in ('assigned', 'en_route_to_pickup', 'waiting_passenger', 'on_trip')
    )
  );

-- ═══════════════════════════════════════════════
-- driver_location_history
-- ═══════════════════════════════════════════════
alter table public.driver_location_history enable row level security;

create policy "dlh_insert_own"
  on public.driver_location_history for insert to authenticated
  with check (driver_id = (select auth.uid()));

create policy "dlh_select_own"
  on public.driver_location_history for select to authenticated
  using (driver_id = (select auth.uid()) or public.is_dispatcher_or_admin());

-- ═══════════════════════════════════════════════
-- tariff_zones + fares (lectura pública autenticada)
-- ═══════════════════════════════════════════════
alter table public.tariff_zones enable row level security;

create policy "tariff_zones_select_authenticated"
  on public.tariff_zones for select to authenticated, anon
  using (is_active = true);

create policy "tariff_zones_write_admin"
  on public.tariff_zones for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.fares enable row level security;

create policy "fares_select_authenticated"
  on public.fares for select to authenticated, anon
  using (true);

create policy "fares_write_admin"
  on public.fares for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ═══════════════════════════════════════════════
-- rides
-- ═══════════════════════════════════════════════
alter table public.rides enable row level security;

-- Pasajero ve sus propios rides
create policy "rides_select_passenger"
  on public.rides for select to authenticated
  using (
    public.current_user_role() = 'passenger'
    and passenger_id = (select auth.uid())
  );

-- Driver ve los rides asignados (activos e histórico)
create policy "rides_select_driver"
  on public.rides for select to authenticated
  using (
    public.current_user_role() = 'driver'
    and driver_id = (select auth.uid())
  );

-- Dispatcher/admin ven todos
create policy "rides_select_staff"
  on public.rides for select to authenticated
  using (public.is_dispatcher_or_admin());

-- Pasajero puede crear rides (status=requested)
create policy "rides_insert_passenger"
  on public.rides for insert to authenticated
  with check (
    public.current_user_role() = 'passenger'
    and passenger_id = (select auth.uid())
    and status = 'requested'
  );

-- Dispatcher puede crear rides en cualquier estado
create policy "rides_insert_dispatcher"
  on public.rides for insert to authenticated
  with check (public.is_dispatcher_or_admin());

-- Solo dispatcher/admin pueden actualizar (asignación, cambios de estado)
-- Los cambios de estado del driver se hacen vía RPCs con security definer
create policy "rides_update_staff"
  on public.rides for update to authenticated
  using (public.is_dispatcher_or_admin())
  with check (public.is_dispatcher_or_admin());

-- ═══════════════════════════════════════════════
-- ride_events
-- ═══════════════════════════════════════════════
alter table public.ride_events enable row level security;

create policy "ride_events_select_involved"
  on public.ride_events for select to authenticated
  using (
    public.is_dispatcher_or_admin()
    or exists (
      select 1 from public.rides r
      where r.id = ride_events.ride_id
      and (r.passenger_id = (select auth.uid()) or r.driver_id = (select auth.uid()))
    )
  );

-- ═══════════════════════════════════════════════
-- payments
-- ═══════════════════════════════════════════════
alter table public.payments enable row level security;

create policy "payments_select_passenger"
  on public.payments for select to authenticated
  using (
    public.current_user_role() = 'passenger'
    and exists (
      select 1 from public.rides r
      where r.id = payments.ride_id
      and r.passenger_id = (select auth.uid())
    )
  );

create policy "payments_select_driver"
  on public.payments for select to authenticated
  using (
    public.current_user_role() = 'driver'
    and exists (
      select 1 from public.rides r
      where r.id = payments.ride_id
      and r.driver_id = (select auth.uid())
    )
  );

create policy "payments_select_staff"
  on public.payments for select to authenticated
  using (public.is_dispatcher_or_admin());

-- ═══════════════════════════════════════════════
-- mp_webhook_events (solo edge functions / admin)
-- ═══════════════════════════════════════════════
alter table public.mp_webhook_events enable row level security;

create policy "mp_webhook_select_admin"
  on public.mp_webhook_events for select to authenticated
  using (public.is_admin());

-- ═══════════════════════════════════════════════
-- messages
-- ═══════════════════════════════════════════════
alter table public.messages enable row level security;

create policy "messages_select_involved"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.rides r
      where r.id = messages.ride_id
      and (
        r.passenger_id = (select auth.uid())
        or r.driver_id = (select auth.uid())
        or public.is_dispatcher_or_admin()
      )
    )
  );

create policy "messages_insert_involved"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.rides r
      where r.id = messages.ride_id
      and (r.passenger_id = (select auth.uid()) or r.driver_id = (select auth.uid()))
      and r.status in ('assigned', 'en_route_to_pickup', 'waiting_passenger', 'on_trip')
    )
  );

-- ═══════════════════════════════════════════════
-- notifications
-- ═══════════════════════════════════════════════
alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()) or public.is_admin());

create policy "notifications_update_read_own"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- ═══════════════════════════════════════════════
-- sos_events
-- ═══════════════════════════════════════════════
alter table public.sos_events enable row level security;

create policy "sos_events_insert_driver_passenger"
  on public.sos_events for insert to authenticated
  with check (
    triggered_by = (select auth.uid())
    and public.current_user_role() in ('driver', 'passenger')
  );

create policy "sos_events_select_staff"
  on public.sos_events for select to authenticated
  using (public.is_dispatcher_or_admin());

create policy "sos_events_select_own"
  on public.sos_events for select to authenticated
  using (triggered_by = (select auth.uid()));

create policy "sos_events_update_staff"
  on public.sos_events for update to authenticated
  using (public.is_dispatcher_or_admin())
  with check (public.is_dispatcher_or_admin());

-- ═══════════════════════════════════════════════
-- shared_trips (anon SELECT vía RPC get_shared_trip SECURITY DEFINER)
-- No policy directa para anon — se accede por RPC
-- ═══════════════════════════════════════════════
alter table public.shared_trips enable row level security;

create policy "shared_trips_insert_own"
  on public.shared_trips for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.rides r
      where r.id = shared_trips.ride_id
      and (r.passenger_id = (select auth.uid()) or r.driver_id = (select auth.uid()))
    )
  );

create policy "shared_trips_select_own"
  on public.shared_trips for select to authenticated
  using (
    created_by = (select auth.uid())
    or public.is_dispatcher_or_admin()
  );

create policy "shared_trips_update_own"
  on public.shared_trips for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- ═══════════════════════════════════════════════
-- audit_log (solo admin puede leer)
-- ═══════════════════════════════════════════════
alter table public.audit_log enable row level security;

create policy "audit_log_select_admin"
  on public.audit_log for select to authenticated
  using (public.is_admin());

-- ═══════════════════════════════════════════════
-- kyc_verifications
-- ═══════════════════════════════════════════════
alter table public.kyc_verifications enable row level security;

create policy "kyc_select_own"
  on public.kyc_verifications for select to authenticated
  using (driver_id = (select auth.uid()) or public.is_admin());

create policy "kyc_insert_admin"
  on public.kyc_verifications for insert to authenticated
  with check (public.is_admin());

create policy "kyc_update_admin"
  on public.kyc_verifications for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ═══════════════════════════════════════════════
-- feature_flags (lectura pública autenticada)
-- ═══════════════════════════════════════════════
alter table public.feature_flags enable row level security;

create policy "feature_flags_select_authenticated"
  on public.feature_flags for select to authenticated
  using (true);

create policy "feature_flags_write_admin"
  on public.feature_flags for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
