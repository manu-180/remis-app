-- Tabla rides (core del dominio) y ride_events (audit de transiciones)

create table public.rides (
  id                     uuid            primary key default uuid_generate_v4(),
  passenger_id           uuid            not null references public.passengers(id) on delete restrict,
  driver_id              uuid            references public.drivers(id) on delete set null,
  dispatcher_id          uuid            references public.profiles(id) on delete set null,
  status                 public.ride_status not null default 'requested',

  -- Ubicaciones
  pickup_address         text,
  pickup_location        geography(Point, 4326) not null,
  dest_address           text,
  dest_location          geography(Point, 4326),
  pickup_zone_id         uuid            references public.tariff_zones(id) on delete set null,
  dest_zone_id           uuid            references public.tariff_zones(id) on delete set null,

  -- Programación
  scheduled_for          timestamptz,

  -- Metadatos del pedido
  requested_via          text            not null default 'app'
                           check (requested_via in ('app', 'phone', 'walk_in')),
  vehicle_type_requested public.vehicle_type,
  passengers_count       int             not null default 1 check (passengers_count >= 1),
  notes                  text,

  -- Tarifa
  estimated_fare_ars     numeric(10,2),
  final_fare_ars         numeric(10,2),
  payment_method         public.payment_method not null default 'cash',
  payment_status         public.payment_status not null default 'pending',

  -- Timestamps de ciclo de vida
  requested_at           timestamptz     not null default now(),
  assigned_at            timestamptz,
  pickup_arrived_at      timestamptz,
  started_at             timestamptz,
  ended_at               timestamptz,
  cancelled_at           timestamptz,
  cancellation_reason    text,

  -- Recorrido real
  distance_meters        double precision,
  route_geometry         geography(LineString, 4326),

  created_at             timestamptz     not null default now(),
  updated_at             timestamptz     not null default now()
);

-- Índices para el dispatcher (cola de pedidos por estado)
create index rides_status_requested_idx
  on public.rides(requested_at desc)
  where status in ('requested', 'assigned', 'en_route_to_pickup', 'waiting_passenger', 'on_trip');

create index rides_driver_active_idx
  on public.rides(driver_id, status)
  where driver_id is not null and status not in ('completed', 'cancelled_by_passenger', 'cancelled_by_driver', 'cancelled_by_dispatcher', 'no_show');

create index rides_passenger_history_idx
  on public.rides(passenger_id, created_at desc);

create index rides_driver_history_idx
  on public.rides(driver_id, created_at desc)
  where driver_id is not null;

create index rides_scheduled_idx
  on public.rides(scheduled_for)
  where status = 'requested' and scheduled_for is not null;

create index rides_pickup_location_gist
  on public.rides using gist(pickup_location);

create trigger rides_updated_at
  before update on public.rides
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- ride_events: log de transiciones de estado
-- ─────────────────────────────────────────────
create table public.ride_events (
  id          bigserial       primary key,
  ride_id     uuid            not null references public.rides(id) on delete cascade,
  from_status public.ride_status,
  to_status   public.ride_status not null,
  actor_id    uuid,
  actor_role  public.user_role,
  metadata    jsonb,
  created_at  timestamptz     not null default now()
);

create index ride_events_ride_idx on public.ride_events(ride_id, created_at);
