-- Extensiones requeridas por el proyecto
-- Orden: uuid-ossp → postgis → pgcrypto → pg_cron → pg_net

create extension if not exists "uuid-ossp" schema extensions;
create extension if not exists postgis schema extensions;
create extension if not exists pgcrypto schema extensions;
create extension if not exists pg_cron schema extensions;
create extension if not exists pg_net schema extensions;

-- Verificar PostGIS
do $$
begin
  if not exists (
    select 1 from pg_extension where extname = 'postgis'
  ) then
    raise exception 'PostGIS no se instaló correctamente';
  end if;
end $$;
