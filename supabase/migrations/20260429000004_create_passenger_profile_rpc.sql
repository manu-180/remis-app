create or replace function public.create_passenger_profile(
  p_user_id   uuid,
  p_full_name text,
  p_phone     text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- Actualizar el nombre en profiles (el trigger ya creó la fila con full_name = '')
  update public.profiles
  set full_name  = p_full_name,
      updated_at = now()
  where id = p_user_id;

  -- Crear fila en passengers (idempotente)
  insert into public.passengers (id)
  values (p_user_id)
  on conflict (id) do nothing;
end;
$$;
