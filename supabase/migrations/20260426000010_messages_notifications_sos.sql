-- Chat conductor↔pasajero, log de notificaciones FCM, eventos SOS y trip share

-- ─────────────────────────────────────────────
-- messages: chat en tiempo real sobre Supabase Realtime
-- ─────────────────────────────────────────────
create table public.messages (
  id         uuid        primary key default uuid_generate_v4(),
  ride_id    uuid        not null references public.rides(id) on delete cascade,
  sender_id  uuid        not null references public.profiles(id) on delete cascade,
  body       text        not null check (length(body) > 0 and length(body) <= 2000),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index messages_ride_idx    on public.messages(ride_id, created_at);
create index messages_sender_idx  on public.messages(sender_id);
create index messages_unread_idx  on public.messages(ride_id) where read_at is null;

-- ─────────────────────────────────────────────
-- notifications: log de FCM enviadas (no es Realtime, es registro)
-- ─────────────────────────────────────────────
create table public.notifications (
  id              uuid        primary key default uuid_generate_v4(),
  recipient_id    uuid        not null references public.profiles(id) on delete cascade,
  type            text        not null,
  title           text,
  body            text,
  data            jsonb,
  fcm_message_id  text,
  sent_at         timestamptz,
  delivered_at    timestamptz,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index notifications_recipient_idx  on public.notifications(recipient_id, created_at desc);
create index notifications_unread_idx     on public.notifications(recipient_id) where read_at is null;

-- ─────────────────────────────────────────────
-- sos_events: CRÍTICO — append-only, retención 10 años
-- Compliance: Ley 25.326 + auditoría de seguridad
-- ─────────────────────────────────────────────
create table public.sos_events (
  id                           uuid        primary key default uuid_generate_v4(),
  ride_id                      uuid        references public.rides(id) on delete set null,
  triggered_by                 uuid        not null references public.profiles(id) on delete restrict,
  triggered_role               public.user_role not null,
  location                     geography(Point, 4326),
  prior_locations              jsonb,
  driver_snapshot              jsonb,
  passenger_snapshot           jsonb,
  vehicle_snapshot             jsonb,
  dispatched_to_dispatcher     boolean     not null default false,
  external_contacts_notified   jsonb,
  resolved_at                  timestamptz,
  resolved_by                  uuid        references public.profiles(id) on delete set null,
  resolution_notes             text,
  created_at                   timestamptz not null default now()
);

create index sos_events_ride_idx        on public.sos_events(ride_id) where ride_id is not null;
create index sos_events_triggered_idx   on public.sos_events(triggered_by, created_at desc);
create index sos_events_unresolved_idx  on public.sos_events(created_at) where resolved_at is null;
create index sos_events_location_gist   on public.sos_events using gist(location) where location is not null;

-- Prevenir DELETE en sos_events (retención 10 años)
create or replace rule sos_events_no_delete as
  on delete to public.sos_events do instead nothing;

-- ─────────────────────────────────────────────
-- shared_trips: token público para tracking
-- ─────────────────────────────────────────────
create table public.shared_trips (
  token       uuid        primary key default uuid_generate_v4(),
  ride_id     uuid        not null references public.rides(id) on delete cascade,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  created_by  uuid        not null references public.profiles(id) on delete cascade
);

create index shared_trips_ride_idx      on public.shared_trips(ride_id);
create index shared_trips_active_idx    on public.shared_trips(token)
  where revoked_at is null and expires_at > now();
