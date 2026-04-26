-- Tests de RLS
-- Ejecutar con: supabase test db (o pgTAP en Tanda 5C)
-- Por ahora son queries documentadas con resultados esperados
-- Tanda 5C los convierte a pgTAP formal

-- ─────────────────────────────────────────────
-- TEST 1: Pasajero NO puede leer audit_log
-- Esperado: 0 rows
-- ─────────────────────────────────────────────
-- set local role authenticated;
-- set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0002-000000000001","role":"authenticated"}';
-- select count(*) from public.audit_log;
-- → Debe retornar 0 (RLS bloquea a no-admin)

-- ─────────────────────────────────────────────
-- TEST 2: Driver NO puede asignarse a sí mismo
-- Esperado: ERROR (RLS bloquea INSERT directo a rides con driver_id)
-- ─────────────────────────────────────────────
-- set local role authenticated;
-- set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0001-000000000001","role":"authenticated"}';
-- insert into public.rides (passenger_id, pickup_location, driver_id, status, payment_method)
-- values ('00000000-0000-0000-0002-000000000001',
--         st_makepoint(-64.3, -36.62)::geography,
--         '00000000-0000-0000-0001-000000000001',
--         'assigned', 'cash');
-- → Debe fallar: el driver no puede insertar rides con status != 'requested' ni asignarse

-- ─────────────────────────────────────────────
-- TEST 3: assign_ride falla si ride ya fue asignado (race condition)
-- Esperado: exception P0001 'ride_not_assignable'
-- ─────────────────────────────────────────────
-- Para testear: correr assign_ride dos veces con el mismo ride_id
-- Primera vez OK, segunda vez debe lanzar excepción

-- ─────────────────────────────────────────────
-- TEST 4: find_nearest_available_drivers excluye is_online=false
-- Esperado: driver 00000000-0000-0000-0001-000000000003 (offline) NO aparece
-- ─────────────────────────────────────────────
-- select driver_id from public.find_nearest_available_drivers(
--   -36.62, -64.30, 50000, 10
-- );
-- → Driver 000...0003 (is_online=false) NO debe aparecer en resultados

-- ─────────────────────────────────────────────
-- TEST 5: Pasajero solo puede ver sus propios rides
-- ─────────────────────────────────────────────
-- set local role authenticated;
-- set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0002-000000000001","role":"authenticated"}';
-- select count(*) from public.rides;
-- → Debe retornar solo los rides del pasajero 1

-- ─────────────────────────────────────────────
-- TEST 6: get_shared_trip funciona para anon con token válido
-- ─────────────────────────────────────────────
-- set role anon;
-- select * from public.get_shared_trip('00000000-0000-0000-0000-000000000000'::uuid);
-- → Con token inválido: exception P0003 'Token inválido o expirado'

-- ─────────────────────────────────────────────
-- TEST 7: audit_log no permite DELETE
-- ─────────────────────────────────────────────
-- set role authenticated;
-- delete from public.audit_log where id = 1;
-- → 0 rows deleted (rule sos_events_no_delete bloquea)

-- ─────────────────────────────────────────────
-- Verificaciones de setup (correr en supabase db reset)
-- ─────────────────────────────────────────────
do $$
declare
  v_tables_with_rls int;
  v_total_tables    int;
  v_rls_coverage    numeric;
begin
  -- Contar tablas con RLS activado
  select count(*) into v_tables_with_rls
  from pg_tables pt
  join pg_class c on c.relname = pt.tablename
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = pt.schemaname
  where pt.schemaname = 'public'
    and c.relrowsecurity = true;

  select count(*) into v_total_tables
  from pg_tables
  where schemaname = 'public';

  if v_total_tables > 0 then
    v_rls_coverage := (v_tables_with_rls::numeric / v_total_tables) * 100;
  else
    v_rls_coverage := 0;
  end if;

  raise notice '=== RLS Coverage: %/% tablas (%.1f%%) ===',
    v_tables_with_rls, v_total_tables, v_rls_coverage;

  if v_rls_coverage < 90 then
    raise warning 'ATENCIÓN: Menos del 90%% de las tablas tienen RLS activado';
  end if;
end $$;
