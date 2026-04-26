# Prompt 1A — Supabase: schema, RLS, RPCs, tipos

> **LEÉ PRIMERO:** `00_arquitectura.md` (secciones 2, 4, 6), `00_file_ownership_matrix.md` (Tanda 1A).

## Objetivo

Dejar la base de datos lista para que las apps de Tanda 2 puedan autenticarse, leer y escribir contra ella sin que nada bloquee. Esto incluye: extensiones, schema completo, RLS exhaustivo, RPCs críticos, partition de history, seeds para dev, y types TypeScript generados.

## File ownership

✍️ `supabase/**`, `packages/shared-types/**`. NADA fuera de eso.

## Steps

### 1. Init Supabase local

```bash
cd supabase && supabase init
```

Editar `config.toml`:
- Project ID descriptivo (ej. `remis-pampa`).
- Activar `realtime` con `max_payload_size_kb = 1024`.
- `auth.enable_phone_signup = true` (los conductores se logean por teléfono).
- `auth.enable_confirmations = false` para dev; en prod sí.

### 2. Migration `0001_extensions.sql`

```sql
create extension if not exists "uuid-ossp";
create extension if not exists postgis;
create extension if not exists pgcrypto;
create extension if not exists pg_cron;       -- cron de docs vencidos
create extension if not exists pg_net;        -- net.http_post para FCM
```

### 3. Migration `0002_enums.sql`

Definir todos los enums centralizados:
- `user_role` (`passenger`, `driver`, `dispatcher`, `admin`)
- `driver_status` (`available`, `en_route_to_pickup`, `waiting_passenger`, `on_trip`, `on_break`, `offline`, `suspended`)
- `ride_status` (`requested`, `assigned`, `en_route_to_pickup`, `waiting_passenger`, `on_trip`, `completed`, `cancelled_by_passenger`, `cancelled_by_driver`, `cancelled_by_dispatcher`, `no_show`)
- `payment_status` (`pending`, `approved`, `rejected`, `refunded`, `cash_at_arrival`)
- `payment_method` (`cash`, `mp_checkout`, `account`)
- `vehicle_type` (`sedan`, `suv`, `van`, `accessible`)
- `kyc_status` (`pending`, `approved`, `rejected`, `expired`)
- `document_type` (`luc_d1`, `vtv`, `insurance_rc`, `insurance_passengers`, `health_card`, `vehicle_authorization`, `criminal_record`)

### 4. Migration `0003_profiles_and_auth.sql`

Tabla `profiles`:
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  phone text unique,
  email text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index profiles_role_idx on profiles(role) where deleted_at is null;
```

Trigger para crear profile al registrarse + trigger `updated_at`.

### 5. Migration `0004_passengers.sql`

```sql
create table public.passengers (
  id uuid primary key references profiles(id) on delete cascade,
  default_payment_method payment_method default 'cash',
  blacklisted boolean not null default false,
  blacklist_reason text,
  total_rides int not null default 0,
  total_no_shows int not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
```

Tabla `frequent_addresses`:
```sql
create table public.frequent_addresses (
  id uuid primary key default uuid_generate_v4(),
  passenger_id uuid not null references passengers(id) on delete cascade,
  label text,
  address_text text not null,
  location geography(Point, 4326) not null,
  use_count int not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index frequent_addresses_passenger_idx on frequent_addresses(passenger_id);
create index frequent_addresses_location_gist on frequent_addresses using gist(location);
```

### 6. Migration `0005_drivers_and_vehicles.sql`

`drivers`:
- `id uuid pk references profiles`
- `is_active boolean default false`
- `is_online boolean default false`
- `current_status driver_status default 'offline'`
- `vehicle_id uuid references vehicles`
- `mobile_number text` (móvil interno: "Móvil 12")
- `rating numeric(3,2) default 5.00`
- `total_rides int default 0`
- `joined_at timestamptz`

`vehicles`:
- `id uuid pk default uuid_generate_v4()`
- `plate text unique not null`
- `make text`, `model text`, `color text`, `year int`
- `vehicle_type vehicle_type default 'sedan'`
- `mobile_number text`
- `is_active boolean default true`

`driver_documents`:
- `id uuid pk`
- `driver_id uuid references drivers(id)`
- `document_type document_type`
- `file_url text`
- `issued_at date`
- `expires_at date`
- `verified boolean default false`
- UNIQUE `(driver_id, document_type)` para WHERE deleted_at is null.

### 7. Migration `0006_locations.sql` ⭐ crítico

`driver_current_location` (1 row/conductor, hot path):
```sql
create table public.driver_current_location (
  driver_id uuid primary key references drivers(id) on delete cascade,
  location geography(Point, 4326) not null,
  heading double precision,
  speed_mps double precision,
  accuracy_m double precision,
  battery_pct int,
  status driver_status not null,
  updated_at timestamptz not null default now()
);
create index dcl_status_location_gist on driver_current_location using gist(location)
  where status = 'available';
create index dcl_updated_at_idx on driver_current_location(updated_at desc);

alter table driver_current_location set (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.02
);
```

`driver_location_history` (append-only, particionada por mes):
```sql
create table public.driver_location_history (
  id bigserial,
  driver_id uuid not null,
  ride_id uuid,
  location geography(Point, 4326) not null,
  heading double precision,
  speed_mps double precision,
  accuracy_m double precision,
  recorded_at timestamptz not null,
  primary key (id, recorded_at)
) partition by range (recorded_at);

create index dlh_driver_recorded_idx on driver_location_history(driver_id, recorded_at desc);
create index dlh_recorded_brin on driver_location_history using brin(recorded_at);
create index dlh_ride_idx on driver_location_history(ride_id) where ride_id is not null;
```

Crear función para crear partitions automáticamente vía pg_cron + 12 partitions iniciales (mes actual + 11 a futuro).

### 8. Migration `0007_zones_and_fares.sql`

```sql
create table public.tariff_zones (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  polygon geography(Polygon, 4326) not null,
  priority int not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index tariff_zones_polygon_gist on tariff_zones using gist(polygon);

create table public.fares (
  id uuid primary key default uuid_generate_v4(),
  origin_zone_id uuid references tariff_zones(id),
  dest_zone_id uuid references tariff_zones(id),
  base_amount_ars numeric(10,2) not null,
  per_km_ars numeric(10,2) default 0,
  flat_amount_ars numeric(10,2),  -- si está, sobreescribe el cálculo
  night_surcharge_pct numeric(5,2) default 0,  -- 22:00-06:00
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_at timestamptz default now()
);
```

### 9. Migration `0008_rides.sql`

`rides`:
- `id uuid pk`
- `passenger_id uuid references passengers`
- `driver_id uuid references drivers`
- `dispatcher_id uuid references profiles` (quién asignó)
- `status ride_status not null default 'requested'`
- `pickup_address text`
- `pickup_location geography(Point, 4326) not null`
- `dest_address text`
- `dest_location geography(Point, 4326)`
- `pickup_zone_id uuid`, `dest_zone_id uuid`
- `scheduled_for timestamptz` (null = inmediato)
- `requested_via text` (`app`, `phone`, `walk_in`)
- `vehicle_type_requested vehicle_type`
- `passengers_count int default 1`
- `notes text` (despachante)
- `estimated_fare_ars numeric(10,2)`
- `final_fare_ars numeric(10,2)`
- `payment_method payment_method`
- `payment_status payment_status default 'pending'`
- `requested_at timestamptz default now()`
- `assigned_at timestamptz`
- `pickup_arrived_at timestamptz`
- `started_at timestamptz`
- `ended_at timestamptz`
- `cancelled_at timestamptz`, `cancellation_reason text`
- `distance_meters double precision`
- `route_geometry geography` (LineString del recorrido real)
- `created_at`, `updated_at`

Indices: `(status) where status in (...)` para queries del dispatcher; `(driver_id, created_at desc)`; `(passenger_id, created_at desc)`; `(scheduled_for) where status='requested'`.

`ride_events` (audit de transiciones):
```sql
create table public.ride_events (
  id bigserial primary key,
  ride_id uuid not null references rides(id) on delete cascade,
  from_status ride_status,
  to_status ride_status not null,
  actor_id uuid,                -- quien dispara
  actor_role user_role,
  metadata jsonb,
  created_at timestamptz default now()
);
create index ride_events_ride_idx on ride_events(ride_id, created_at);
```

### 10. Migration `0009_payments_and_mp.sql`

`payments`:
- `id uuid pk`
- `ride_id uuid references rides`
- `method payment_method`
- `amount_ars numeric(10,2)`
- `status payment_status`
- `mp_payment_id text` (id de MP)
- `mp_preference_id text`
- `mp_external_reference text` (= ride_id)
- `paid_at timestamptz`
- `created_at`

`mp_webhook_events` (idempotencia):
```sql
create table public.mp_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  x_request_id text unique not null,
  data_id text not null,
  action text,
  raw_body jsonb not null,
  signature_valid boolean not null,
  processed_status text not null default 'pending',
  processed_at timestamptz,
  error_message text,
  received_at timestamptz default now()
);
create unique index mp_webhook_data_action_unique on mp_webhook_events(data_id, action) where action is not null;
```

### 11. Migration `0010_messages_notifications_sos.sql`

`messages` (chat conductor↔pasajero, vía Supabase Realtime sobre table):
- `id`, `ride_id`, `sender_id`, `body text`, `read_at`, `created_at`

`notifications` (log de FCM enviadas):
- `id`, `recipient_id`, `type text`, `title`, `body`, `data jsonb`, `fcm_message_id text`, `sent_at`, `delivered_at`, `read_at`

`sos_events` (CRÍTICO — append-only, retención 10 años):
- `id`, `ride_id`, `triggered_by uuid`, `triggered_role user_role`
- `location geography(Point,4326)`
- `prior_locations jsonb` (60s previos)
- `driver_snapshot jsonb`, `passenger_snapshot jsonb`, `vehicle_snapshot jsonb`
- `dispatched_to_dispatcher boolean default false`
- `external_contacts_notified jsonb`
- `resolved_at`, `resolved_by`, `resolution_notes`
- `created_at`

`shared_trips`:
- `token uuid pk default uuid_generate_v4()`
- `ride_id`, `expires_at`, `revoked_at`, `created_at`, `created_by`

### 12. Migration `0011_audit_log.sql`

Append-only con hash chain (HARD requirement):
```sql
create table public.audit_log (
  id bigserial primary key,
  entity text not null,
  entity_id text not null,
  action text not null,
  actor_id uuid,
  actor_role user_role,
  diff jsonb,
  prev_hash bytea,
  row_hash bytea not null,
  created_at timestamptz not null default now()
);
revoke update, delete on public.audit_log from public, authenticated, anon;
create index audit_log_entity_idx on audit_log(entity, entity_id, created_at desc);
```

Trigger function que computa `row_hash = sha256(prev_hash || entity || action || diff || ts)`. Aplicar trigger sobre `rides`, `payments`, `drivers`, `sos_events`.

### 13. Migration `0012_kyc_and_features.sql`

`kyc_verifications`: `id`, `driver_id`, `provider text` (`didit`, `aws_rekognition`), `status kyc_status`, `score numeric(5,4)`, `metadata jsonb`, `verified_at`.

`feature_flags`: `key text pk`, `enabled boolean`, `description text`, `updated_at`. Seed con `caller_id_enabled`, `mp_payment_enabled`, `kyc_strict_mode`, `auto_dispatch_enabled` (todos default false).

### 14. Migration `0020_rls_policies.sql`

Activar RLS en TODAS las tablas. Policies por rol — patrón:
- `profiles`: lee su propio row + dispatcher/admin lee todos.
- `passengers`: pasajero ve el suyo; dispatcher/admin todos.
- `drivers`: chofer ve el suyo; dispatcher/admin todos; pasajero solo el campo público (nombre, móvil interno, foto, rating) cuando hay un ride compartido.
- `driver_current_location`: chofer escribe (UPSERT) solo el suyo; dispatcher/admin lee todos; pasajero lee el del chofer asignado a su ride.
- `rides`: pasajero ve los suyos; chofer ve los asignados; dispatcher/admin todos. Insert por pasajero (status=requested) o dispatcher (cualquier status). Update por dispatcher (asignación) o por triggers.
- `audit_log`: nadie puede update/delete; lectura solo admin.
- `sos_events`: insert por driver/passenger; read por dispatcher/admin.
- `shared_trips`: anon puede SELECT vía RPC `get_shared_trip(token)` con SECURITY DEFINER (no policy directa).

### 15. Migration `0030_rpcs.sql`

#### `find_nearest_available_drivers`

Definida en `00_arquitectura.md` sec 2.2 — implementar exactamente.

#### `estimate_fare`

```sql
create or replace function public.estimate_fare(
  pickup_lat double precision, pickup_lng double precision,
  dest_lat double precision, dest_lng double precision,
  at_time timestamptz default now()
) returns table (
  origin_zone_id uuid, dest_zone_id uuid,
  estimated_distance_m double precision,
  estimated_amount_ars numeric, breakdown jsonb
) language plpgsql stable as $$ ...
$$;
```

Calcula zona origen/destino con `ST_Contains`, busca `fares` por par, computa con factor 1.3.

#### `assign_ride`

```sql
create or replace function public.assign_ride(
  p_ride_id uuid, p_driver_id uuid, p_dispatcher_id uuid
) returns rides language plpgsql security definer as $$
declare r rides;
begin
  update rides set
    driver_id = p_driver_id,
    dispatcher_id = p_dispatcher_id,
    status = 'assigned',
    assigned_at = now()
  where id = p_ride_id and status = 'requested'  -- bloqueo optimista
  returning * into r;
  if not found then
    raise exception 'ride not assignable (already taken or wrong status)' using errcode = 'P0001';
  end if;
  insert into ride_events(ride_id, from_status, to_status, actor_id, actor_role)
    values (p_ride_id, 'requested', 'assigned', p_dispatcher_id, 'dispatcher');
  return r;
end; $$;
```

#### `cancel_ride`, `start_trip`, `end_trip`, `record_ride_distance`

Patrón similar — máquina de estados con guards.

#### `get_shared_trip`

SECURITY DEFINER, recibe token, devuelve datos públicos del ride + última posición del conductor. Validar `expires_at > now() and revoked_at is null`.

### 16. Migration `0040_triggers_fcm_dispatch.sql`

Trigger sobre `rides` AFTER UPDATE: cuando `OLD.status='requested' AND NEW.status='assigned'`, hacer `net.http_post` a Edge Function `dispatch-fcm` con payload `{ride_id, driver_id, type:'ride_assigned'}`.

Idempotencia: la Edge Function tiene su propia idempotencia por `ride_id+type`.

### 17. Migration `0050_seed_zones_and_fares.sql`

Seed mínimo de 4 zonas (centro, norte, sur, periferia) con polígonos plausibles para un pueblo de La Pampa cercano a Santa Rosa. **Documentar** que estos polígonos son placeholder y deben revisarse contra el GIS municipal real antes de producción.

Seed `fares` matriz 4×4 con valores plausibles (consultar al cliente — dejar TODO en comentario).

### 18. `supabase/seed.sql`

Datos de dev:
- 1 admin
- 1 dispatcher
- 5 drivers (con docs vigentes)
- 10 passengers (algunos blacklisted, algunos VIP frecuentes)
- 20 rides en distintos estados
- 5 zonas tarifarias con polígonos pampeanos plausibles
- 1 fare matrix completa

Solo se carga con `supabase db reset` en local. **NO** se aplica en prod.

### 19. Edge Function stub `_shared/types.ts`

Crear directorio `supabase/functions/_shared/` con `types.ts` que reexporta los tipos generados de Postgres. Las Edge Functions reales van en Tanda 3D.

```typescript
export type { Database } from '../../../packages/shared-types/database.ts';
```

### 20. Generar types

```bash
supabase gen types typescript --local > packages/shared-types/database.ts
```

Crear `packages/shared-types/package.json`:
```json
{
  "name": "@remis/shared-types",
  "version": "0.0.0",
  "type": "module",
  "main": "./database.ts",
  "types": "./database.ts"
}
```

Y `packages/shared-types/index.ts` que reexporta + agrega tipos derivados (`Tables<'rides'>`, `Enums<'ride_status'>` helpers).

### 21. Tests SQL básicos (`supabase/tests/`)

Archivo `01_rls.sql.test.sql` con pgTAP testing:
- Pasajero NO puede leer `audit_log`.
- Driver NO puede asignarse a sí mismo (insert directo a `rides.driver_id` debe fallar).
- `assign_ride` falla si ride ya asignado (race condition).
- `find_nearest_available_drivers` excluye drivers con `is_online=false`.

(Si pgTAP es overkill para Tanda 1, dejar los tests como `.sql` queries documentando casos esperados; Tanda 5C lo implementa.)

## Acceptance criteria

- [ ] `supabase db reset` corre sin error.
- [ ] `supabase gen types typescript --local` produce `database.ts` con todos los tipos.
- [ ] RLS activado en todas las tablas (`select * from pg_tables where schemaname='public'` cruzar con `pg_policies`).
- [ ] `select find_nearest_available_drivers(...)` con seed devuelve resultados ordenados por distancia.
- [ ] `select estimate_fare(...)` devuelve tarifa coherente.
- [ ] El advisor de seguridad de Supabase no marca CRÍTICOS (warnings tolerables si están documentados).
- [ ] Commit `feat(db): full schema with RLS, RPCs, partitions, audit chain`.

## Notas

- **Particionado mensual** de `driver_location_history` requiere maintenance — incluir función `create_next_month_partition()` con pg_cron mensual día 25.
- **Hash chain** del audit_log: el `prev_hash` es el `row_hash` del row anterior (`(select row_hash from audit_log order by id desc limit 1 for update)`). Cuidado con concurrencia — usar `pg_advisory_xact_lock(8675309)` dentro del trigger.
- **PostGIS:** verificar `select postgis_version();` después del enable.
- **Tipos en TS:** después de generar, hacer `pnpm -F @remis/shared-types build` (o solo verificar que los archivos están).
- **Ordenanza local pendiente:** la matriz de tarifas debe revisarse con el cliente; dejar TODO bien marcado.

## Out of scope

- Edge Functions productivas (Tanda 3D y 4D).
- KYC providers (Tanda 5D).
- Frontend (Tandas 2-4).
