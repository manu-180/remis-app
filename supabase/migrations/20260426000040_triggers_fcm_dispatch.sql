-- Triggers para dispatchar FCM vía pg_net → Edge Function
-- Idempotencia garantizada por la Edge Function (ride_id + type)

-- ─────────────────────────────────────────────
-- Trigger: cuando un ride pasa a 'assigned' → notificar al conductor
-- ─────────────────────────────────────────────
create or replace function public.trigger_fcm_ride_assigned()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_supabase_url    text;
  v_service_role_key text;
begin
  -- Solo actuar cuando cambia status a 'assigned' y hay driver_id
  if new.status <> 'assigned' or new.driver_id is null then
    return new;
  end if;
  if old.status = 'assigned' then
    return new; -- evitar re-trigger en updates sucesivos
  end if;

  -- Leer configuración (las Edge Functions tienen las secrets, acá solo dispatch)
  v_supabase_url     := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);

  if v_supabase_url is null or v_service_role_key is null then
    -- En local dev o si no están configuradas, loguear y continuar sin FCM
    raise warning 'FCM dispatch omitido: app.supabase_url o app.service_role_key no configurados';
    return new;
  end if;

  -- pg_net: POST asíncrono a la Edge Function (no bloquea el trigger)
  perform net.http_post(
    url     := v_supabase_url || '/functions/v1/dispatch-fcm',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body    := jsonb_build_object(
      'ride_id',   new.id,
      'driver_id', new.driver_id,
      'type',      'ride_assigned'
    )::text
  );

  return new;
end;
$$;

create trigger rides_fcm_assigned
  after update of status on public.rides
  for each row
  when (new.status = 'assigned' and new.driver_id is not null)
  execute function public.trigger_fcm_ride_assigned();

-- ─────────────────────────────────────────────
-- Trigger: cuando un ride pasa a 'completed' → notificar al pasajero
-- ─────────────────────────────────────────────
create or replace function public.trigger_fcm_ride_completed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_supabase_url    text;
  v_service_role_key text;
begin
  v_supabase_url     := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);

  if v_supabase_url is null or v_service_role_key is null then
    raise warning 'FCM dispatch omitido: configuración faltante';
    return new;
  end if;

  perform net.http_post(
    url     := v_supabase_url || '/functions/v1/dispatch-fcm',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body    := jsonb_build_object(
      'ride_id',      new.id,
      'passenger_id', new.passenger_id,
      'type',         'ride_completed',
      'final_fare',   new.final_fare_ars
    )::text
  );

  return new;
end;
$$;

create trigger rides_fcm_completed
  after update of status on public.rides
  for each row
  when (new.status = 'completed')
  execute function public.trigger_fcm_ride_completed();

-- ─────────────────────────────────────────────
-- Trigger: SOS → notificar al dispatcher vía FCM inmediato
-- ─────────────────────────────────────────────
create or replace function public.trigger_fcm_sos()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_supabase_url    text;
  v_service_role_key text;
begin
  v_supabase_url     := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);

  if v_supabase_url is null or v_service_role_key is null then
    raise warning 'FCM SOS dispatch omitido: configuración faltante';
    return new;
  end if;

  perform net.http_post(
    url     := v_supabase_url || '/functions/v1/dispatch-fcm',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body    := jsonb_build_object(
      'sos_event_id', new.id,
      'ride_id',      new.ride_id,
      'triggered_by', new.triggered_by,
      'type',         'sos_triggered'
    )::text
  );

  return new;
end;
$$;

create trigger sos_events_fcm
  after insert on public.sos_events
  for each row
  execute function public.trigger_fcm_sos();

-- ─────────────────────────────────────────────
-- Cron: detectar conductores sin heartbeat por >5 min (OEMs chinos)
-- ─────────────────────────────────────────────
create or replace function public.detect_silent_drivers()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_supabase_url     text;
  v_service_role_key text;
begin
  v_supabase_url     := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);

  if v_supabase_url is null or v_service_role_key is null then
    return;
  end if;

  -- Notificar a cada conductor que no manda señal hace >5 min y debería estar activo
  perform net.http_post(
    url     := v_supabase_url || '/functions/v1/dispatch-fcm',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body    := jsonb_build_object(
      'driver_id', dcl.driver_id,
      'type',      'heartbeat_missing',
      'minutes_silent', extract(epoch from (now() - dcl.updated_at)) / 60
    )::text
  )
  from public.driver_current_location dcl
  join public.drivers d on d.id = dcl.driver_id
  where d.is_online = true
    and d.is_active = true
    and dcl.updated_at < now() - interval '5 minutes';
end;
$$;

-- Cron cada minuto para heartbeat check
select cron.schedule(
  'detect-silent-drivers',
  '* * * * *',
  'select public.detect_silent_drivers()'
);

-- Cron diario: marcar documentos vencidos
create or replace function public.check_expired_documents()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- No bloquea conductores automáticamente — solo loguea para que admin revise
  -- El bloqueo manual es responsabilidad del dispatcher/admin (compliance)
  insert into public.audit_log (entity, entity_id, action, diff)
  select
    'driver_documents',
    id::text,
    'DOCUMENT_EXPIRED',
    jsonb_build_object(
      'driver_id',     driver_id,
      'document_type', document_type,
      'expires_at',    expires_at
    )
  from public.driver_documents
  where expires_at < current_date
    and deleted_at is null
    and verified = true;
end;
$$;

select cron.schedule(
  'check-expired-documents',
  '0 8 * * *',
  'select public.check_expired_documents()'
);
