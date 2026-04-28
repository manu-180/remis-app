-- Alertas visibles en el bottom bar del dispatcher
create table public.dispatcher_alerts (
  id          uuid primary key default uuid_generate_v4(),
  type        text not null,
  driver_id   uuid references public.drivers(id) on delete set null,
  ride_id     uuid references public.rides(id) on delete set null,
  message     text not null,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index dispatcher_alerts_unresolved_idx on public.dispatcher_alerts (resolved, created_at desc)
  where resolved = false;

alter table public.dispatcher_alerts enable row level security;

create policy "service_role_all" on public.dispatcher_alerts
  for all using (auth.role() = 'service_role');

-- Dispatchers (rol admin) pueden ver todas
create policy "admins_read_all" on public.dispatcher_alerts
  for select using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );
