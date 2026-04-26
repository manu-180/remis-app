-- Tablas vehicles, drivers, driver_documents

create table public.vehicles (
  id            uuid            primary key default uuid_generate_v4(),
  plate         text            unique not null,
  make          text,
  model         text,
  color         text,
  year          int,
  vehicle_type  public.vehicle_type default 'sedan',
  mobile_number text,
  is_active     boolean         not null default true,
  created_at    timestamptz     not null default now(),
  updated_at    timestamptz     not null default now()
);

create index vehicles_plate_idx     on public.vehicles(plate);
create index vehicles_active_idx    on public.vehicles(is_active) where is_active = true;

create trigger vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- Conductores
create table public.drivers (
  id             uuid            primary key references public.profiles(id) on delete cascade,
  is_active      boolean         not null default false,
  is_online      boolean         not null default false,
  current_status public.driver_status not null default 'offline',
  vehicle_id     uuid            references public.vehicles(id) on delete set null,
  mobile_number  text,
  rating         numeric(3,2)    not null default 5.00 check (rating >= 0 and rating <= 5),
  total_rides    int             not null default 0,
  joined_at      timestamptz,
  created_at     timestamptz     not null default now(),
  updated_at     timestamptz     not null default now()
);

create index drivers_active_online_idx  on public.drivers(is_active, is_online) where is_active = true;
create index drivers_status_idx         on public.drivers(current_status) where is_online = true;
create index drivers_vehicle_idx        on public.drivers(vehicle_id) where vehicle_id is not null;

create trigger drivers_updated_at
  before update on public.drivers
  for each row execute function public.set_updated_at();

-- Documentos del conductor (con vencimientos — crítico para compliance)
create table public.driver_documents (
  id            uuid            primary key default uuid_generate_v4(),
  driver_id     uuid            not null references public.drivers(id) on delete cascade,
  document_type public.document_type not null,
  file_url      text,
  issued_at     date,
  expires_at    date,
  verified      boolean         not null default false,
  verified_by   uuid            references public.profiles(id) on delete set null,
  verified_at   timestamptz,
  created_at    timestamptz     not null default now(),
  updated_at    timestamptz     not null default now(),
  deleted_at    timestamptz
);

-- Un doc activo por tipo por conductor
create unique index driver_docs_unique_active
  on public.driver_documents(driver_id, document_type)
  where deleted_at is null;

create index driver_docs_driver_idx    on public.driver_documents(driver_id) where deleted_at is null;
create index driver_docs_expires_idx   on public.driver_documents(expires_at) where deleted_at is null;
create index driver_docs_unverified_idx on public.driver_documents(verified) where verified = false and deleted_at is null;

create trigger driver_documents_updated_at
  before update on public.driver_documents
  for each row execute function public.set_updated_at();
