-- Fix cancel_ride: v_ride populated via RETURNING * reflects the NEW (cancelled)
-- status, so using v_ride.status as from_status always recorded the wrong value.
-- Capture the original status with a SELECT before the UPDATE instead.

create or replace function public.cancel_ride(
  p_ride_id uuid,
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
  select role into v_actor_role
  from public.profiles where id = p_actor_id;

  v_new_status := case v_actor_role
    when 'passenger'   then 'cancelled_by_passenger'
    when 'driver'      then 'cancelled_by_driver'
    when 'dispatcher'  then 'cancelled_by_dispatcher'
    when 'admin'       then 'cancelled_by_dispatcher'
    else 'cancelled_by_dispatcher'
  end::public.ride_status;

  -- Capture status before UPDATE (RETURNING * gives the post-update row)
  select status into v_old_status
  from public.rides
  where id = p_ride_id;

  update public.rides
  set
    status              = v_new_status,
    cancelled_at        = now(),
    cancellation_reason = p_reason,
    updated_at          = now()
  where id = p_ride_id
    and status not in ('completed', 'cancelled_by_passenger', 'cancelled_by_driver',
                       'cancelled_by_dispatcher', 'no_show')
  returning * into v_ride;

  if not found then
    raise exception 'Ride no cancelable: ya está completado o cancelado'
      using errcode = 'P0001', hint = 'ride_not_cancellable';
  end if;

  insert into public.ride_events(ride_id, from_status, to_status, actor_id, actor_role, metadata)
  values (p_ride_id, v_old_status, v_new_status, p_actor_id, v_actor_role,
          jsonb_build_object('reason', p_reason));

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
