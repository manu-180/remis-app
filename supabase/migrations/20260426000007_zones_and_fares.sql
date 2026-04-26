-- Zonas tarifarias (polígonos PostGIS) y matriz de tarifas

create table public.tariff_zones (
  id         uuid            primary key default uuid_generate_v4(),
  name       text            not null,
  polygon    geography(Polygon, 4326) not null,
  priority   int             not null default 0,
  is_active  boolean         not null default true,
  created_at timestamptz     not null default now(),
  updated_at timestamptz     not null default now()
);

create index tariff_zones_polygon_gist  on public.tariff_zones using gist(polygon);
create index tariff_zones_active_idx    on public.tariff_zones(is_active) where is_active = true;

create trigger tariff_zones_updated_at
  before update on public.tariff_zones
  for each row execute function public.set_updated_at();

-- Matriz de tarifas por par de zonas
-- Si flat_amount_ars no es null, sobreescribe el cálculo base + por_km
create table public.fares (
  id                    uuid            primary key default uuid_generate_v4(),
  origin_zone_id        uuid            references public.tariff_zones(id) on delete restrict,
  dest_zone_id          uuid            references public.tariff_zones(id) on delete restrict,
  base_amount_ars       numeric(10,2)   not null,
  per_km_ars            numeric(10,2)   not null default 0,
  flat_amount_ars       numeric(10,2),
  night_surcharge_pct   numeric(5,2)    not null default 0 check (night_surcharge_pct >= 0),
  effective_from        timestamptz     not null,
  effective_to          timestamptz,
  created_at            timestamptz     not null default now(),
  constraint fares_effective_range check (
    effective_to is null or effective_to > effective_from
  )
);

create index fares_zones_idx      on public.fares(origin_zone_id, dest_zone_id);
create index fares_effective_idx  on public.fares(effective_from, effective_to);
