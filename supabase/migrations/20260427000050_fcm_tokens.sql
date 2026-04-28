-- Tabla de tokens FCM por device/usuario
create table public.fcm_tokens (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  token        text not null,
  platform     text not null check (platform in ('android', 'ios', 'web')),
  device_id    text,
  app_version  text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, token)
);

create index fcm_tokens_user_id_idx on public.fcm_tokens (user_id);

alter table public.fcm_tokens enable row level security;

-- Solo service role escribe; usuarios pueden leer sus propios tokens
create policy "service_role_all" on public.fcm_tokens
  for all using (auth.role() = 'service_role');

create policy "users_read_own" on public.fcm_tokens
  for select using (auth.uid() = user_id);
