-- ─────────────────────────────────────────────────────────────────────────────
-- cancel_ride v3 — idempotente + concurrency-safe
--
-- Cambios respecto a la versión anterior:
--   • Si el pedido YA está en cualquier estado cancelado → devuelve el row
--     sin lanzar excepción (idempotente). El cliente puede cancelar dos veces
--     sin recibir un error.
--   • Solo lanza para 'completed' y 'no_show', que son realmente no cancelables.
--   • Usa SELECT ... FOR UPDATE para serializar accesos concurrentes y evitar
--     race conditions entre el RPC y el trigger de realtime.
--   • Si el UPDATE no encuentra filas por un cambio concurrente, re-lee el estado
--     y vuelve a evaluar (loop de un solo reintento).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.cancel_ride(
  p_ride_id  uuid,
  p_actor_id uuid,
  p_reason   text default null
)
returns public.rides
language plpgsql security definer set search_path = public as $$
declare
  v_ride       public.rides;
  v_actor_role public.user_role;
  v_new_status public.ride_status;
  v_old_status public.ride_status;
begin
  -- ── 1. Determinar rol del actor ───────────────────────────────────────────
  select role into v_actor_role
  from public.profiles
  where id = p_actor_id;

  v_new_status := case v_actor_role
    when 'passenger'  then 'cancelled_by_passenger'
    when 'driver'     then 'cancelled_by_driver'
    when 'dispatcher' then 'cancelled_by_dispatcher'
    when 'admin'      then 'cancelled_by_dispatcher'
    else                   'cancelled_by_dispatcher'
  end::public.ride_status;

  -- ── 2. Leer estado actual con bloqueo de fila ─────────────────────────────
  select * into v_ride
  from public.rides
  where id = p_ride_id
  for update;                        -- serializa con actualizaciones concurrentes

  if not found then
    raise exception 'Pedido no encontrado'
      using errcode = 'P0001', hint = 'ride_not_found';
  end if;

  -- ── 3. Idempotencia: ya cancelado → éxito silencioso ─────────────────────
  if v_ride.status in (
    'cancelled_by_passenger',
    'cancelled_by_driver',
    'cancelled_by_dispatcher'
  ) then
    return v_ride;
  end if;

  -- ── 4. No cancelable: completado o no_show ────────────────────────────────
  if v_ride.status in ('completed', 'no_show') then
    raise exception 'El pedido ya finalizó y no puede cancelarse'
      using errcode = 'P0001', hint = 'ride_not_cancellable';
  end if;

  -- ── 5. Cancelar ──────────────────────────────────────────────────────────
  v_old_status := v_ride.status;

  update public.rides
  set
    status              = v_new_status,
    cancelled_at        = now(),
    cancellation_reason = p_reason,
    updated_at          = now()
  where id = p_ride_id
    and status = v_old_status          -- optimistic-lock en el status
  returning * into v_ride;

  -- Si otro proceso cambió el estado justo antes → re-evaluar
  if not found then
    select * into v_ride from public.rides where id = p_ride_id;
    -- Ya cancelado por alguien más → idempotente
    if v_ride.status in (
      'cancelled_by_passenger',
      'cancelled_by_driver',
      'cancelled_by_dispatcher'
    ) then
      return v_ride;
    end if;
    -- Estado inesperado (completed, no_show, etc.)
    raise exception 'El pedido cambió de estado inesperadamente'
      using errcode = 'P0001', hint = 'concurrent_state_change';
  end if;

  -- ── 6. Registrar evento ───────────────────────────────────────────────────
  insert into public.ride_events(
    ride_id, from_status, to_status, actor_id, actor_role, metadata
  ) values (
    p_ride_id, v_old_status, v_new_status, p_actor_id, v_actor_role,
    jsonb_build_object('reason', p_reason)
  );

  -- ── 7. Liberar conductor si había uno asignado ────────────────────────────
  if v_ride.driver_id is not null then
    update public.drivers
    set current_status = 'available', updated_at = now()
    where id = v_ride.driver_id;

    update public.driver_current_location
    set status = 'available', updated_at = now()
    where driver_id = v_ride.driver_id;
  end if;

  return v_ride;
end;
$$;
