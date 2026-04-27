create table public.ride_ratings (
  id           uuid        primary key default uuid_generate_v4(),
  ride_id      uuid        not null unique references public.rides(id) on delete cascade,
  passenger_id uuid        not null references public.passengers(id) on delete cascade,
  driver_id    uuid        not null references public.drivers(id) on delete cascade,
  stars        int         not null check (stars between 1 and 5),
  comment      text        check (length(comment) <= 500),
  created_at   timestamptz not null default now()
);
create index ride_ratings_driver_idx on public.ride_ratings(driver_id, created_at desc);
create index ride_ratings_passenger_idx on public.ride_ratings(passenger_id, created_at desc);
