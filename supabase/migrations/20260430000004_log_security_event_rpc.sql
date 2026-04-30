-- RPC para registrar eventos de seguridad del propio usuario en audit_log.
-- audit_log no tiene policy de INSERT (solo SELECT para admin), por lo que
-- los clientes no pueden escribir directamente. Esta funcion corre con
-- security definer y solo permite registrar acciones del usuario autenticado
-- referidas a su propio profile (password_changed / mfa_enabled / mfa_disabled).

create or replace function public.log_security_event(
  p_action text
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_actor_id   uuid := auth.uid();
  v_actor_role public.user_role;
begin
  if v_actor_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_action not in ('password_changed', 'mfa_enabled', 'mfa_disabled') then
    raise exception 'invalid security action: %', p_action using errcode = '22023';
  end if;

  select role
    into v_actor_role
    from public.profiles
   where id = v_actor_id;

  insert into public.audit_log (entity, entity_id, action, actor_id, actor_role, diff)
  values ('profiles', v_actor_id::text, p_action, v_actor_id, v_actor_role, '{}'::jsonb);
end;
$$;

revoke execute on function public.log_security_event(text) from public, anon;
grant execute on function public.log_security_event(text) to authenticated;
