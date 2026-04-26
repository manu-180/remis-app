-- Tabla profiles: extiende auth.users con rol y datos de contacto

create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  role        public.user_role not null,
  full_name   text        not null,
  phone       text        unique,
  email       text        unique,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index profiles_role_idx     on public.profiles(role) where deleted_at is null;
create index profiles_phone_idx    on public.profiles(phone) where phone is not null and deleted_at is null;
create index profiles_deleted_idx  on public.profiles(deleted_at) where deleted_at is not null;

-- Trigger: actualizar updated_at automáticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Trigger: crear profile automáticamente al registrarse un usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
begin
  -- El rol viene en raw_user_meta_data.role; default = passenger
  v_role := coalesce(
    (new.raw_user_meta_data->>'role')::public.user_role,
    'passenger'::public.user_role
  );

  insert into public.profiles (id, role, full_name, phone, email)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.phone,
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
