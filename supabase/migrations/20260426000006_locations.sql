-- Ubicaciones de conductores: tabla hot (current) + tabla histórica particionada
-- CRÍTICO: ver 00_arquitectura.md sección 2.2 para decisiones de PostGIS

-- ─────────────────────────────────────────────
-- 1. driver_current_location  (1 row/conductor)
-- ─────────────────────────────────────────────
create table public.driver_current_location (
  driver_id    uuid          primary key references public.drivers(id) on delete cascade,
  location     geography(Point, 4326) not null,
  heading      double precision,
  speed_mps    double precision,
  accuracy_m   double precision,
  battery_pct  int           check (battery_pct between 0 and 100),
  status       public.driver_status not null,
  updated_at   timestamptz   not null default now()
);

-- Índice espacial solo sobre conductores disponibles → tiny en RAM
create index dcl_available_gist
  on public.driver_current_location using gist(location)
  where status = 'available';

-- Índice para detectar conductores offline por timeout
create index dcl_updated_at_idx
  on public.driver_current_location(updated_at desc);

-- Autovacuum agresivo: esta tabla recibe UPSERTs constantes
alter table public.driver_current_location set (
  autovacuum_vacuum_scale_factor  = 0.02,
  autovacuum_analyze_scale_factor = 0.02
);

-- ─────────────────────────────────────────────
-- 2. driver_location_history (append-only, particionada por mes)
-- ─────────────────────────────────────────────
create table public.driver_location_history (
  id          bigserial,
  driver_id   uuid              not null,
  ride_id     uuid,
  location    geography(Point, 4326) not null,
  heading     double precision,
  speed_mps   double precision,
  accuracy_m  double precision,
  recorded_at timestamptz       not null,
  primary key (id, recorded_at)
) partition by range (recorded_at);

create index dlh_driver_recorded_idx
  on public.driver_location_history(driver_id, recorded_at desc);

create index dlh_recorded_brin
  on public.driver_location_history using brin(recorded_at);

create index dlh_ride_idx
  on public.driver_location_history(ride_id)
  where ride_id is not null;

-- ─────────────────────────────────────────────
-- 3. Función para crear partición mensual
-- ─────────────────────────────────────────────
create or replace function public.create_location_history_partition(target_month date)
returns void language plpgsql as $$
declare
  partition_name text;
  start_date     date;
  end_date       date;
begin
  start_date     := date_trunc('month', target_month)::date;
  end_date       := (date_trunc('month', target_month) + interval '1 month')::date;
  partition_name := 'driver_location_history_' || to_char(start_date, 'YYYY_MM');

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = partition_name
  ) then
    execute format(
      'create table public.%I partition of public.driver_location_history
       for values from (%L) to (%L)',
      partition_name, start_date, end_date
    );
    raise notice 'Partición creada: %', partition_name;
  else
    raise notice 'Partición ya existe: %', partition_name;
  end if;
end;
$$;

-- Función que crea el mes siguiente (llamada por pg_cron el día 25)
create or replace function public.create_next_month_partition()
returns void language plpgsql as $$
begin
  perform public.create_location_history_partition(
    (date_trunc('month', now()) + interval '1 month')::date
  );
end;
$$;

-- ─────────────────────────────────────────────
-- 4. Crear particiones iniciales: mes actual + 11 futuros
-- ─────────────────────────────────────────────
do $$
declare
  i int;
begin
  for i in 0..11 loop
    perform public.create_location_history_partition(
      (date_trunc('month', now()) + (i || ' months')::interval)::date
    );
  end loop;
end;
$$;

-- ─────────────────────────────────────────────
-- 5. Cron: crear partición del mes siguiente cada día 25
-- ─────────────────────────────────────────────
select cron.schedule(
  'create-location-history-partition',
  '0 3 25 * *',
  'select public.create_next_month_partition()'
);
