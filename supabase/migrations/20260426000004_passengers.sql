-- Tabla passengers y direcciones frecuentes

create table public.passengers (
  id                     uuid           primary key references public.profiles(id) on delete cascade,
  default_payment_method public.payment_method default 'cash',
  blacklisted            boolean        not null default false,
  blacklist_reason       text,
  total_rides            int            not null default 0,
  total_no_shows         int            not null default 0,
  notes                  text,
  created_at             timestamptz    not null default now()
);

create index passengers_blacklisted_idx on public.passengers(blacklisted) where blacklisted = true;

-- Direcciones frecuentes del pasajero
create table public.frequent_addresses (
  id           uuid            primary key default uuid_generate_v4(),
  passenger_id uuid            not null references public.passengers(id) on delete cascade,
  label        text,
  address_text text            not null,
  location     geography(Point, 4326) not null,
  use_count    int             not null default 0,
  last_used_at timestamptz,
  created_at   timestamptz     not null default now()
);

create index frequent_addresses_passenger_idx  on public.frequent_addresses(passenger_id);
create index frequent_addresses_location_gist  on public.frequent_addresses using gist(location);
create index frequent_addresses_use_count_idx  on public.frequent_addresses(passenger_id, use_count desc);
