-- Último heartbeat de cada conductor (1 fila por conductor)
create table public.driver_heartbeats (
  driver_id          uuid primary key references public.drivers(id) on delete cascade,
  last_heartbeat_at  timestamptz not null,
  battery_pct        int,
  app_version        text,
  device_info        jsonb
);

alter table public.driver_heartbeats enable row level security;

create policy "service_role_all" on public.driver_heartbeats
  for all using (auth.role() = 'service_role');

create policy "drivers_read_own" on public.driver_heartbeats
  for select using (
    exists (
      select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid()
    )
  );
