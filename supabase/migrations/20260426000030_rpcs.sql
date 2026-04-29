-- RPCs principales del dominio
-- Todas usan SECURITY DEFINER donde necesitan saltear RLS temporalmente
-- Todas son idempotentes o tienen guards de estado

-- ═══════════════════════════════════════════════
-- find_nearest_available_drivers
-- Query canónico PostGIS: ST_DWithin + <-> operator
-- NUNCA usar ST_Distance en WHERE — no usa índice
-- ═══════════════════════════════════════════════
create or replace function public.find_nearest_available_drivers(
  pickup_lat    double precision,
  pickup_lng    double precision,
  max_distance_m double precision default 10000,
  limit_count   int              default 5,
  p_vehicle_type public.vehicle_type default null
)
returns table (
  driver_id      uuid,
  full_name      text,
  mobile_number  text,
  rating         numeric,
  distance_m     double precision,
  heading        double precision,
  vehicle_type   public.vehicle_type,
  plate          text
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_point geography;
begin
  v_point := st_makepoint(pickup_lng, pickup_lat)::geography;

  return query
  select
    d.id                                          as driver_id,
    p.full_name,
    d.mobile_number,
    d.rating,
    st_distance(dcl.location, v_point)            as distance_m,
    dcl.heading,
    v.vehicle_type,
    v.plate
  from public.driver_current_location dcl
  join public.drivers d     on d.id = dcl.driver_id
  join public.profiles p    on p.id = d.id
  left join public.vehicles v on v.id = d.vehicle_id
  where
    dcl.status = 'available'
    and d.is_online = true
    and d.is_active = true
    and p.deleted_at is null
    and st_dwithin(dcl.location, v_point, max_distance_m)
    and (p_vehicle_type is null or v.vehicle_type = p_vehicle_type)
  order by
    dcl.location <-> v_point
  limit limit_count;
end;
$$;

-- ═══════════════════════════════════════════════
-- estimate_fare
-- Calcula zona origen/destino, busca tarifa, aplica factor 1.3 (distancia en ruta)
-- ═══════════════════════════════════════════════
create or replace function public.estimate_fare(
  pickup_lat    double precision,
  pickup_lng    double precision,
  dest_lat      double precision,
  dest_lng      double precision,
  at_time       timestamptz default now()
)
returns table (
  origin_zone_id      uuid,
  dest_zone_id        uuid,
  estimated_distance_m double precision,
  estimated_amount_ars numeric,
  breakdown           jsonb
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_pickup        geography;
  v_dest          geography;
  v_origin_zone   uuid;
  v_dest_zone     uuid;
  v_fare          public.fares%rowtype;
  v_dist_straight double precision;
  v_dist_route    double precision;
  v_amount        numeric;
  v_is_night      boolean;
  v_breakdown     jsonb;
begin
  v_pickup := st_makepoint(pickup_lng, pickup_lat)::geography;
  v_dest   := st_makepoint(dest_lng, dest_lat)::geography;

  -- Distancia en línea recta (metros)
  v_dist_straight := st_distance(v_pickup, v_dest);
  -- Distancia estimada de ruta = distancia recta × 1.3 (factor de tortuosidad)
  v_dist_route    := v_dist_straight * 1.3;

  -- Zona de origen: polígono que contiene el pickup (mayor prioridad si hay superposición)
  -- Cast a geometry: st_contains no existe para geography
  select tz.id into v_origin_zone
  from public.tariff_zones tz
  where tz.is_active = true
    and st_contains(tz.polygon::geometry, v_pickup::geometry)
  order by tz.priority desc
  limit 1;

  -- Zona de destino
  select tz.id into v_dest_zone
  from public.tariff_zones tz
  where tz.is_active = true
    and st_contains(tz.polygon::geometry, v_dest::geometry)
  order by tz.priority desc
  limit 1;

  -- Buscar tarifa vigente para el par de zonas
  -- Alias `f.` evita ambigüedad con las columnas declaradas en RETURNS TABLE
  select f.* into v_fare
  from public.fares f
  where (f.origin_zone_id = v_origin_zone or f.origin_zone_id is null)
    and (f.dest_zone_id   = v_dest_zone   or f.dest_zone_id   is null)
    and f.effective_from <= at_time
    and (f.effective_to is null or f.effective_to > at_time)
  order by
    -- Preferir match exacto sobre wildcard (null = cualquier zona)
    (case when f.origin_zone_id is not null then 1 else 0 end) desc,
    (case when f.dest_zone_id   is not null then 1 else 0 end) desc,
    f.effective_from desc
  limit 1;

  if not found then
    raise exception 'No hay tarifa configurada para este recorrido' using errcode = 'P0002';
  end if;

  -- ¿Es horario nocturno? (22:00–06:00)
  v_is_night := extract(hour from at_time at time zone 'America/Argentina/Buenos_Aires')
                >= 22
                or extract(hour from at_time at time zone 'America/Argentina/Buenos_Aires') < 6;

  -- Calcular monto
  if v_fare.flat_amount_ars is not null then
    -- Tarifa plana sobreescribe todo
    v_amount := v_fare.flat_amount_ars;
  else
    v_amount := v_fare.base_amount_ars
                + (v_dist_route / 1000.0) * v_fare.per_km_ars;
  end if;

  -- Aplicar recargo nocturno
  if v_is_night and v_fare.night_surcharge_pct > 0 then
    v_amount := v_amount * (1 + v_fare.night_surcharge_pct / 100);
  end if;

  -- Redondear a 2 decimales
  v_amount := round(v_amount, 2);

  v_breakdown := jsonb_build_object(
    'origin_zone_id',      v_origin_zone,
    'dest_zone_id',        v_dest_zone,
    'distance_straight_m', round(v_dist_straight::numeric, 0),
    'distance_route_m',    round(v_dist_route::numeric, 0),
    'base_amount',         v_fare.base_amount_ars,
    'per_km',              v_fare.per_km_ars,
    'flat_amount',         v_fare.flat_amount_ars,
    'night_surcharge_pct', case when v_is_night then v_fare.night_surcharge_pct else 0 end,
    'is_night',            v_is_night,
    'total',               v_amount
  );

  return query select
    v_origin_zone,
    v_dest_zone,
    v_dist_route,
    v_amount,
    v_breakdown;
end;
$$;

-- ═══════════════════════════════════════════════
-- assign_ride
-- Asignación con bloqueo optimista: falla si el ride ya fue tomado
-- ═══════════════════════════════════════════════
create or replace function public.assign_ride(
  p_ride_id       uuid,
  p_driver_id     uuid,
  p_dispatcher_id uuid
)
returns public.rides
language plpgsql security definer set search_path = public as $$
declare
  v_ride public.rides;
begin
  update public.rides
  set
    driver_id      = p_driver_id,
    dispatcher_id  = p_dispatcher_id,
    status         = 'assigned',
    assigned_at    = now(),
    updated_at     = now()
  where id = p_ride_id
    and status = 'requested'
  returning * into v_ride;

  if not found then
    raise exception 'Ride no asignable: ya fue tomado o tiene estado incorrecto'
      using errcode = 'P0001', hint = 'ride_not_assignable';
  end if;

  insert into public.ride_events(ride_id, from_status, to_status, actor_id, actor_role)
  values (p_ride_id, 'requested', 'assigned', p_dispatcher_id, 'dispatcher');

  -- Actualizar estado del conductor
  update public.drivers
  set current_status = 'en_route_to_pickup', updated_at = now()
  where id = p_driver_id;

  update public.driver_current_location
  set status = 'en_route_to_pickup', updated_at = now()
  where driver_id = p_driver_id;

  return v_ride;
end;
$$;

-- ═══════════════════════════════════════════════
-- cancel_ride
-- ═══════════════════════════════════════════════
create or replace function public.cancel_ride(
  p_ride_id uuid,
  p_actor_id uuid,
  p_reason   text default null
)
returns public.rides
language plpgsql security definer set search_path = public as $$
declare
  v_ride      public.rides;
  v_actor_role public.user_role;
  v_new_status public.ride_status;
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
  values (p_ride_id, v_ride.status, v_new_status, p_actor_id, v_actor_role,
          jsonb_build_object('reason', p_reason));

  -- Si tenía conductor asignado, liberarlo
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

-- ═══════════════════════════════════════════════
-- start_trip: driver confirma que inició el viaje
-- ═══════════════════════════════════════════════
create or replace function public.start_trip(
  p_ride_id  uuid,
  p_driver_id uuid
)
returns public.rides
language plpgsql security definer set search_path = public as $$
declare
  v_ride public.rides;
begin
  update public.rides
  set
    status     = 'on_trip',
    started_at = now(),
    updated_at = now()
  where id = p_ride_id
    and driver_id = p_driver_id
    and status in ('en_route_to_pickup', 'waiting_passenger')
  returning * into v_ride;

  if not found then
    raise exception 'No se puede iniciar el viaje: estado o conductor incorrecto'
      using errcode = 'P0001', hint = 'trip_not_startable';
  end if;

  insert into public.ride_events(ride_id, from_status, to_status, actor_id, actor_role)
  values (p_ride_id, v_ride.status, 'on_trip', p_driver_id, 'driver');

  update public.drivers
  set current_status = 'on_trip', updated_at = now()
  where id = p_driver_id;

  update public.driver_current_location
  set status = 'on_trip', updated_at = now()
  where driver_id = p_driver_id;

  return v_ride;
end;
$$;

-- ═══════════════════════════════════════════════
-- end_trip: driver finaliza el viaje
-- ═══════════════════════════════════════════════
create or replace function public.end_trip(
  p_ride_id       uuid,
  p_driver_id     uuid,
  p_final_fare    numeric default null,
  p_distance_m    double precision default null
)
returns public.rides
language plpgsql security definer set search_path = public as $$
declare
  v_ride public.rides;
begin
  update public.rides
  set
    status          = 'completed',
    ended_at        = now(),
    final_fare_ars  = coalesce(p_final_fare, estimated_fare_ars),
    distance_meters = coalesce(p_distance_m, distance_meters),
    payment_status  = case payment_method
                        when 'cash' then 'cash_at_arrival'
                        else 'pending'
                      end,
    updated_at      = now()
  where id = p_ride_id
    and driver_id = p_driver_id
    and status = 'on_trip'
  returning * into v_ride;

  if not found then
    raise exception 'No se puede finalizar: el viaje no está en curso'
      using errcode = 'P0001', hint = 'trip_not_endable';
  end if;

  insert into public.ride_events(ride_id, from_status, to_status, actor_id, actor_role,
    metadata)
  values (p_ride_id, 'on_trip', 'completed', p_driver_id, 'driver',
    jsonb_build_object('final_fare', v_ride.final_fare_ars, 'distance_m', v_ride.distance_meters));

  -- Conductor vuelve a disponible
  update public.drivers
  set current_status = 'available', total_rides = total_rides + 1, updated_at = now()
  where id = p_driver_id;

  update public.driver_current_location
  set status = 'available', updated_at = now()
  where driver_id = p_driver_id;

  -- Incrementar contador de viajes del pasajero
  update public.passengers
  set total_rides = total_rides + 1
  where id = v_ride.passenger_id;

  return v_ride;
end;
$$;

-- ═══════════════════════════════════════════════
-- driver_arrived_pickup: conductor llegó al punto de recogida
-- ═══════════════════════════════════════════════
create or replace function public.driver_arrived_pickup(
  p_ride_id   uuid,
  p_driver_id uuid
)
returns public.rides
language plpgsql security definer set search_path = public as $$
declare
  v_ride public.rides;
begin
  update public.rides
  set
    status            = 'waiting_passenger',
    pickup_arrived_at = now(),
    updated_at        = now()
  where id = p_ride_id
    and driver_id = p_driver_id
    and status = 'en_route_to_pickup'
  returning * into v_ride;

  if not found then
    raise exception 'Estado inválido para marcar llegada al pickup'
      using errcode = 'P0001', hint = 'invalid_state_for_arrival';
  end if;

  insert into public.ride_events(ride_id, from_status, to_status, actor_id, actor_role)
  values (p_ride_id, 'en_route_to_pickup', 'waiting_passenger', p_driver_id, 'driver');

  update public.drivers
  set current_status = 'waiting_passenger', updated_at = now()
  where id = p_driver_id;

  update public.driver_current_location
  set status = 'waiting_passenger', updated_at = now()
  where driver_id = p_driver_id;

  return v_ride;
end;
$$;

-- ═══════════════════════════════════════════════
-- get_shared_trip: acceso anónimo con token UUID
-- SECURITY DEFINER saltea RLS — solo devuelve datos públicos
-- ═══════════════════════════════════════════════
create or replace function public.get_shared_trip(p_token uuid)
returns table (
  ride_id          uuid,
  status           public.ride_status,
  driver_name      text,
  driver_mobile    text,
  vehicle_plate    text,
  vehicle_color    text,
  pickup_address   text,
  dest_address     text,
  started_at       timestamptz,
  driver_lat       double precision,
  driver_lng       double precision,
  driver_heading   double precision,
  expires_at       timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  -- Validar token activo
  if not exists (
    select 1 from public.shared_trips st
    where st.token = p_token
      and st.expires_at > now()
      and st.revoked_at is null
  ) then
    raise exception 'Token inválido o expirado' using errcode = 'P0003';
  end if;

  return query
  select
    r.id,
    r.status,
    p.full_name        as driver_name,
    d.mobile_number    as driver_mobile,
    v.plate            as vehicle_plate,
    v.color            as vehicle_color,
    r.pickup_address,
    r.dest_address,
    r.started_at,
    st_y(dcl.location::geometry)  as driver_lat,
    st_x(dcl.location::geometry)  as driver_lng,
    dcl.heading        as driver_heading,
    st.expires_at
  from public.shared_trips st
  join public.rides r       on r.id = st.ride_id
  left join public.drivers d on d.id = r.driver_id
  left join public.profiles p on p.id = d.id
  left join public.vehicles v on v.id = d.vehicle_id
  left join public.driver_current_location dcl on dcl.driver_id = d.id
  where st.token = p_token;
end;
$$;

-- ═══════════════════════════════════════════════
-- upsert_driver_location: actualizar posición en tiempo real
-- Llamada cada 5-10s por flutter_background_geolocation
-- ═══════════════════════════════════════════════
create or replace function public.upsert_driver_location(
  p_driver_id  uuid,
  p_lat        double precision,
  p_lng        double precision,
  p_heading    double precision default null,
  p_speed_mps  double precision default null,
  p_accuracy_m double precision default null,
  p_battery_pct int             default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status public.driver_status;
begin
  -- Verificar que el driver existe y está activo
  select current_status into v_status
  from public.drivers
  where id = p_driver_id and is_active = true;

  if not found then
    raise exception 'Driver no encontrado o inactivo' using errcode = 'P0004';
  end if;

  insert into public.driver_current_location (
    driver_id, location, heading, speed_mps, accuracy_m, battery_pct, status, updated_at
  ) values (
    p_driver_id,
    st_makepoint(p_lng, p_lat)::geography,
    p_heading, p_speed_mps, p_accuracy_m, p_battery_pct,
    v_status,
    now()
  )
  on conflict (driver_id) do update set
    location    = excluded.location,
    heading     = excluded.heading,
    speed_mps   = excluded.speed_mps,
    accuracy_m  = excluded.accuracy_m,
    battery_pct = excluded.battery_pct,
    updated_at  = now();
end;
$$;

-- ═══════════════════════════════════════════════
-- record_ride_distance: acumular recorrido real del viaje
-- ═══════════════════════════════════════════════
create or replace function public.record_ride_distance(
  p_ride_id    uuid,
  p_driver_id  uuid,
  p_distance_m double precision
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.rides
  set
    distance_meters = coalesce(distance_meters, 0) + p_distance_m,
    updated_at      = now()
  where id = p_ride_id
    and driver_id = p_driver_id
    and status = 'on_trip';
end;
$$;
