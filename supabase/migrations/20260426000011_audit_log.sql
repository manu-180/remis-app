-- audit_log: append-only con hash chain SHA-256
-- Compliance: Ley 25.326, retención 5 años (10 para SOS)
-- NUNCA permitir UPDATE/DELETE en esta tabla

create table public.audit_log (
  id         bigserial     primary key,
  entity     text          not null,
  entity_id  text          not null,
  action     text          not null,
  actor_id   uuid,
  actor_role public.user_role,
  diff       jsonb,
  prev_hash  bytea,
  row_hash   bytea         not null,
  created_at timestamptz   not null default now()
);

create index audit_log_entity_idx
  on public.audit_log(entity, entity_id, created_at desc);

create index audit_log_actor_idx
  on public.audit_log(actor_id, created_at desc)
  where actor_id is not null;

-- Revocar UPDATE y DELETE para todos los roles
revoke update, delete on public.audit_log from public, authenticated, anon;

-- ─────────────────────────────────────────────
-- Función: computar hash chain
-- prev_hash = row_hash del registro anterior
-- row_hash  = sha256(prev_hash || entity || action || diff::text || ts::text)
-- pg_advisory_xact_lock previene race conditions en inserts concurrentes
-- ─────────────────────────────────────────────
create or replace function public.audit_log_hash_chain()
returns trigger language plpgsql security definer as $$
declare
  v_prev_hash bytea;
begin
  -- Lock transaccional para serializar inserts al hash chain
  perform pg_advisory_xact_lock(8675309);

  select row_hash
  into v_prev_hash
  from public.audit_log
  order by id desc
  limit 1
  for update;

  new.prev_hash := v_prev_hash;
  new.row_hash  := sha256(
    coalesce(v_prev_hash, ''::bytea)
    || convert_to(
         coalesce(new.entity, '')
         || coalesce(new.action, '')
         || coalesce(new.diff::text, '')
         || coalesce(new.created_at::text, ''),
         'UTF8'
       )
  );

  return new;
end;
$$;

create trigger audit_log_hash_chain_trigger
  before insert on public.audit_log
  for each row execute function public.audit_log_hash_chain();

-- ─────────────────────────────────────────────
-- Función genérica para auditar cambios en cualquier tabla
-- ─────────────────────────────────────────────
create or replace function public.audit_table_changes()
returns trigger language plpgsql security definer as $$
declare
  v_actor_id   uuid;
  v_actor_role public.user_role;
  v_diff       jsonb;
begin
  -- Intentar leer actor del contexto de sesión
  begin
    v_actor_id := (current_setting('app.current_user_id', true))::uuid;
  exception when others then
    v_actor_id := null;
  end;

  begin
    v_actor_role := (current_setting('app.current_user_role', true))::public.user_role;
  exception when others then
    v_actor_role := null;
  end;

  if TG_OP = 'INSERT' then
    v_diff := to_jsonb(new);
  elsif TG_OP = 'UPDATE' then
    -- Solo guardar campos que cambiaron (diff)
    select jsonb_object_agg(key, value)
    into v_diff
    from (
      select key, value from jsonb_each(to_jsonb(new))
      except
      select key, value from jsonb_each(to_jsonb(old))
    ) changed;
  elsif TG_OP = 'DELETE' then
    v_diff := to_jsonb(old);
  end if;

  insert into public.audit_log (entity, entity_id, action, actor_id, actor_role, diff)
  values (
    TG_TABLE_NAME,
    case TG_OP when 'DELETE' then (old).id::text else (new).id::text end,
    TG_OP,
    v_actor_id,
    v_actor_role,
    v_diff
  );

  return null;
end;
$$;

-- Aplicar auditoría a tablas críticas
create trigger rides_audit
  after insert or update or delete on public.rides
  for each row execute function public.audit_table_changes();

create trigger payments_audit
  after insert or update or delete on public.payments
  for each row execute function public.audit_table_changes();

create trigger drivers_audit
  after insert or update or delete on public.drivers
  for each row execute function public.audit_table_changes();

create trigger sos_events_audit
  after insert on public.sos_events
  for each row execute function public.audit_table_changes();
