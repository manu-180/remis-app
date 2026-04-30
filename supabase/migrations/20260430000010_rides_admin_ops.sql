-- Operaciones admin para rides: reassign, no-show, KPI de asignación,
-- y permitir al dispatcher/admin enviar mensajes vía RLS.

-- ═══════════════════════════════════════════════
-- reassign_ride
-- Cambia el conductor de un ride en curso. Libera al anterior, asigna al nuevo
-- y deja un ride_event con metadata { action, reason, prev_driver_id, new_driver_id }.
-- ═══════════════════════════════════════════════
create or replace function public.reassign_ride(
  p_ride_id        uuid,
  p_new_driver_id  uuid,
  p_dispatcher_id  uuid,
  p_reason         text default null
)
returns public.rides
language plpgsql security definer set search_path = public as $$
declare
  v_ride         public.rides;
  v_prev_status  public.ride_status;
  v_prev_driver  uuid;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then
    raise exception 'Ride no encontrado' using errcode = 'P0002';
  end if;

  if v_ride.status not in ('assigned', 'en_route_to_pickup', 'waiting_passenger') then
    raise exception 'Ride no reasignable en estado %', v_ride.status
      using errcode = 'P0001', hint = 'ride_not_reassignable';
  end if;

  v_prev_status := v_ride.status;
  v_prev_driver := v_ride.driver_id;

  if v_prev_driver = p_new_driver_id then
    raise exception 'El conductor seleccionado ya está asignado al ride'
      using errcode = 'P0001', hint = 'same_driver';
  end if;

  -- Liberar al conductor anterior
  if v_prev_driver is not null then
    update public.drivers
       set current_status = 'available', updated_at = now()
     where id = v_prev_driver;
    update public.driver_current_location
       set status = 'available', updated_at = now()
     where driver_id = v_prev_driver;
  end if;

  -- Asignar al nuevo (vuelve a 'assigned' aunque viniera de en_route/waiting)
  update public.rides
     set driver_id     = p_new_driver_id,
         dispatcher_id = p_dispatcher_id,
         status        = 'assigned',
         assigned_at   = now(),
         updated_at    = now()
   where id = p_ride_id
  returning * into v_ride;

  update public.drivers
     set current_status = 'en_route_to_pickup', updated_at = now()
   where id = p_new_driver_id;

  update public.driver_current_location
     set status = 'en_route_to_pickup', updated_at = now()
   where driver_id = p_new_driver_id;

  insert into public.ride_events(ride_id, from_status, to_status, actor_id, actor_role, metadata)
  values (
    p_ride_id, v_prev_status, 'assigned'::public.ride_status,
    p_dispatcher_id, 'dispatcher',
    jsonb_build_object(
      'action',         'reassign',
      'reason',         p_reason,
      'prev_driver_id', v_prev_driver,
      'new_driver_id',  p_new_driver_id
    )
  );

  return v_ride;
end;
$$;

grant execute on function public.reassign_ride(uuid, uuid, uuid, text) to authenticated;

-- ═══════════════════════════════════════════════
-- mark_ride_no_show
-- Solo válido desde waiting_passenger. Pasa el ride a 'no_show', libera al conductor
-- e incrementa el contador del pasajero.
-- ═══════════════════════════════════════════════
create or replace function public.mark_ride_no_show(
  p_ride_id  uuid,
  p_actor_id uuid
)
returns public.rides
language plpgsql security definer set search_path = public as $$
declare
  v_ride         public.rides;
  v_prev_status  public.ride_status;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then
    raise exception 'Ride no encontrado' using errcode = 'P0002';
  end if;

  if v_ride.status <> 'waiting_passenger' then
    raise exception 'Solo se puede marcar no-show desde waiting_passenger'
      using errcode = 'P0001', hint = 'invalid_state_for_no_show';
  end if;

  v_prev_status := v_ride.status;

  update public.rides
     set status              = 'no_show',
         cancelled_at        = now(),
         ended_at            = now(),
         cancellation_reason = coalesce(cancellation_reason, 'Pasajero no se presentó'),
         updated_at          = now()
   where id = p_ride_id
  returning * into v_ride;

  insert into public.ride_events(ride_id, from_status, to_status, actor_id, actor_role, metadata)
  values (p_ride_id, v_prev_status, 'no_show'::public.ride_status, p_actor_id, 'dispatcher',
          jsonb_build_object('reason', 'no_show'));

  if v_ride.driver_id is not null then
    update public.drivers
       set current_status = 'available', updated_at = now()
     where id = v_ride.driver_id;
    update public.driver_current_location
       set status = 'available', updated_at = now()
     where driver_id = v_ride.driver_id;
  end if;

  if v_ride.passenger_id is not null then
    update public.passengers
       set total_no_shows = total_no_shows + 1
     where id = v_ride.passenger_id;
  end if;

  return v_ride;
end;
$$;

grant execute on function public.mark_ride_no_show(uuid, uuid) to authenticated;

-- ═══════════════════════════════════════════════
-- get_avg_assign_secs
-- Promedio de segundos entre requested_at y assigned_at en un período.
-- ═══════════════════════════════════════════════
create or replace function public.get_avg_assign_secs(p_from timestamptz)
returns numeric
language sql stable security definer set search_path = public as $$
  select round(extract(epoch from avg(assigned_at - requested_at))::numeric, 2)
  from public.rides
  where assigned_at is not null
    and requested_at is not null
    and requested_at >= p_from;
$$;

grant execute on function public.get_avg_assign_secs(timestamptz) to authenticated;

-- ═══════════════════════════════════════════════
-- messages_insert_involved (override)
-- Permite también al dispatcher/admin escribir, manteniendo el guard de estado
-- activo solo para passenger/driver.
-- ═══════════════════════════════════════════════
drop policy if exists "messages_insert_involved" on public.messages;

create policy "messages_insert_involved"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.rides r
      where r.id = messages.ride_id
      and (
        (
          (r.passenger_id = (select auth.uid()) or r.driver_id = (select auth.uid()))
          and r.status in ('assigned', 'en_route_to_pickup', 'waiting_passenger', 'on_trip')
        )
        or public.is_dispatcher_or_admin()
      )
    )
  );
