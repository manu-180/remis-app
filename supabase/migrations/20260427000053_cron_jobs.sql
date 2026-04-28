-- ─────────────────────────────────────────────
-- Cron: heartbeat monitor (cada 5 min)
-- ─────────────────────────────────────────────
create or replace function public.check_stale_heartbeats()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_supabase_url     text;
  v_service_role_key text;
  r                  record;
begin
  v_supabase_url     := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);

  if v_supabase_url is null or v_service_role_key is null then
    return;
  end if;

  for r in
    select d.id as driver_id, d.user_id
    from public.driver_heartbeats dh
    join public.drivers d on d.id = dh.driver_id
    where d.is_online = true
      and d.is_active = true
      and dh.last_heartbeat_at < now() - interval '5 minutes'
  loop
    -- Push al conductor
    perform net.http_post(
      url     := v_supabase_url || '/functions/v1/dispatch-fcm',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body    := jsonb_build_object(
        'recipient_user_id', r.user_id,
        'type',              'heartbeat_missing'
      )::text
    );

    -- Alerta en panel dispatcher
    insert into public.dispatcher_alerts (type, driver_id, message)
    values ('heartbeat_lost', r.driver_id, 'Conductor sin señal por más de 5 min')
    on conflict do nothing;
  end loop;
end;
$$;

select cron.schedule(
  'heartbeat-monitor',
  '*/5 * * * *',
  'select public.check_stale_heartbeats()'
);

-- ─────────────────────────────────────────────
-- Cron: vencimiento de documentos (diario 7am)
-- ─────────────────────────────────────────────
create or replace function public.check_document_expiry()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_supabase_url     text;
  v_service_role_key text;
  r                  record;
  v_days_left        int;
begin
  v_supabase_url     := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);

  if v_supabase_url is null or v_service_role_key is null then
    return;
  end if;

  for r in
    select dd.id, dd.driver_id, dd.document_type, dd.expires_at,
           d.user_id,
           (dd.expires_at::date - current_date) as days_left
    from public.driver_documents dd
    join public.drivers d on d.id = dd.driver_id
    where dd.deleted_at is null
      and dd.verified = true
      and (dd.expires_at::date - current_date) in (60, 30, 15, 7, 3, 1, 0)
  loop
    v_days_left := r.days_left;

    if v_days_left = 0 then
      -- Marcar conductor inactivo
      update public.drivers set is_active = false where id = r.driver_id;

      insert into public.dispatcher_alerts (type, driver_id, message)
      values ('document_expired', r.driver_id,
              'Documento vencido: ' || r.document_type);
    end if;

    -- Push al conductor
    perform net.http_post(
      url     := v_supabase_url || '/functions/v1/dispatch-fcm',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body    := jsonb_build_object(
        'recipient_user_id', r.user_id,
        'type',              case when v_days_left = 0 then 'document_expired' else 'document_expiring' end,
        'metadata', jsonb_build_object(
          'document_type', r.document_type,
          'days_left',     v_days_left::text,
          'expires_at',    r.expires_at::text
        )
      )::text
    );

    insert into public.audit_log (entity, entity_id, action, diff)
    values ('driver_documents', r.id::text, 'DOCUMENT_EXPIRY_NOTIFICATION',
            jsonb_build_object('days_left', v_days_left, 'document_type', r.document_type));
  end loop;
end;
$$;

select cron.schedule(
  'doc-expiry-check',
  '0 7 * * *',
  'select public.check_document_expiry()'
);

-- ─────────────────────────────────────────────
-- Cron: purga de retención (diario 3am)
-- ─────────────────────────────────────────────
create or replace function public.purge_retention()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_deleted int;
begin
  -- Mensajes > 90 días
  delete from public.messages where created_at < now() - interval '90 days';
  get diagnostics v_deleted = row_count;
  insert into public.audit_log (entity, entity_id, action, diff)
  values ('messages', 'bulk', 'RETENTION_PURGE', jsonb_build_object('deleted_rows', v_deleted, 'policy', '90d'));

  -- MP webhook events > 1 año
  delete from public.mp_webhook_events where received_at < now() - interval '1 year';
  get diagnostics v_deleted = row_count;
  insert into public.audit_log (entity, entity_id, action, diff)
  values ('mp_webhook_events', 'bulk', 'RETENTION_PURGE', jsonb_build_object('deleted_rows', v_deleted, 'policy', '1y'));

  -- Anonimizar PII de pasajeros sin actividad > 2 años
  update public.profiles set
    full_name = 'Usuario eliminado',
    phone     = null
  where role = 'passenger'
    and id in (
      select passenger_id from public.rides
      group by passenger_id
      having max(created_at) < now() - interval '2 years'
    );
  get diagnostics v_deleted = row_count;
  insert into public.audit_log (entity, entity_id, action, diff)
  values ('profiles', 'bulk', 'PII_ANONYMIZED', jsonb_build_object('rows', v_deleted, 'policy', '2y_inactive'));
end;
$$;

select cron.schedule(
  'purge-retention',
  '0 3 * * *',
  'select public.purge_retention()'
);
