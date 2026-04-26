# Prompt 3D — Edge Functions: FCM, MP webhook stub, cron, health, purga

> **LEÉ:** `00_arquitectura.md` (sec 2.1, 2.5, 5, 6, 7, 8), `tanda_3_core_features/README.md` (contratos FCM), `00_file_ownership_matrix.md`.

## Objetivo

Levantar las Edge Functions necesarias para que el flujo end-to-end funcione: dispatch de FCM cuando se asigna un ride, stub de webhook MP (Tanda 4D lo completa), cron de docs vencidos + heartbeat health, purga de retención, health endpoint.

## File ownership

✍️ `supabase/functions/**`. Y SI necesitás migraciones nuevas (RPCs, tablas auxiliares como `fcm_tokens`, `driver_heartbeats`, `notification_log`): ✍️ `supabase/migrations/0050+`.

## Funciones a producir

| Nombre | Trigger | Descripción |
|--------|---------|-------------|
| `dispatch-fcm` | `net.http_post` desde trigger DB | Envía push al destinatario según `type` |
| `register-fcm-token` | HTTP POST desde apps | Guarda token FCM del device |
| `mp-webhook` | HTTP POST público | Recibe webhook MP. **Stub en Tanda 3D, completar en 4D**. |
| `mp-create-preference` | HTTP POST autenticado | Crea preference. **Stub en Tanda 3D, completar en 4D**. |
| `driver-heartbeat` | HTTP POST | Heartbeat del conductor cada 30s |
| `health` | HTTP GET | Healthcheck del sistema |
| `cron-doc-expiry` | pg_cron diario | Detecta docs por vencer y dispara push |
| `cron-purge-retention` | pg_cron diario | Aplica retention policy |
| `cron-heartbeat-monitor` | pg_cron cada 5 min | Detecta drivers con heartbeat caído |

## Steps

### 1. Setup base

`supabase/functions/_shared/`:
- `cors.ts` — headers CORS estándar.
- `supabase.ts` — `createServiceRoleClient()` y `createUserClient(req)`.
- `errors.ts` — `respondError(message, code)` con logging estructurado.
- `logger.ts` — JSON structured logging con redacción de PII.
- `types.ts` — reexport del schema generado.

Cada function tiene su `index.ts` y respeta el patrón:
```ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  // ...
});
```

### 2. `register-fcm-token`

Tabla nueva (migration):
```sql
create table public.fcm_tokens (
  id uuid pk default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android','ios','web')),
  device_id text,
  app_version text,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  unique (user_id, token)
);
```

Function `register-fcm-token`:
- POST `{ token, platform, device_id, app_version }` con JWT.
- UPSERT en `fcm_tokens`.
- Limpia tokens del mismo `device_id` con tokens distintos.

### 3. `dispatch-fcm`

Recibe POST del trigger DB con payload:
```json
{ "recipient_user_id": "...", "type": "ride_assigned", "ride_id": "...", "metadata": {...} }
```

Lógica:
- Busca todos los `fcm_tokens` del `recipient_user_id`.
- Construye payload FCM v1 (HTTP v1 API, no legacy):
  - title/body según `type` (mapeo en `_shared/notification_templates.ts` — strings desde `docs/brand/copy_library.md`).
  - data payload con `type`, `ride_id`, `click_action: 'OPEN_RIDE'`.
  - Android: `priority: high`, `channel_id: 'rides_critical'` o `general` según type.
  - iOS: `apns: { headers: { 'apns-priority': '10' }, payload: { aps: { sound: 'pedido.caf' for ride_assigned else default } } }`.
- Auth con Service Account JSON (`FCM_SERVICE_ACCOUNT_JSON` env). Generar JWT con `crypto.subtle.sign` o usar `firebase-admin` deno port.
- Insert a `notifications` con `fcm_message_id` recibido.
- Si token devuelve `UNREGISTERED` → eliminar token.

Idempotencia: dedupe key = `(recipient_user_id, type, ride_id)` — UNIQUE index en `notifications` para esa tupla.

### 4. Trigger DB → dispatch-fcm

Migration `0060_dispatch_fcm_trigger.sql`:
```sql
create or replace function trigger_dispatch_fcm() returns trigger language plpgsql as $$
declare
  driver_user_id uuid;
  passenger_user_id uuid;
begin
  if new.status = 'assigned' and (old.status is null or old.status <> 'assigned') then
    select id into driver_user_id from profiles where id = new.driver_id;
    perform net.http_post(
      url := current_setting('app.edge_url') || '/dispatch-fcm',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'recipient_user_id', driver_user_id,
        'type', 'ride_assigned',
        'ride_id', new.id
      )::text
    );
  end if;
  -- ... repetir para 'driver_arrived', 'trip_started', 'trip_ended', 'cancelled_*' ...
  return new;
end; $$;

create trigger rides_dispatch_fcm
  after insert or update of status on rides
  for each row execute function trigger_dispatch_fcm();
```

`app.edge_url` y `app.service_role_key` se setean con `alter database postgres set app.edge_url='...'`.

### 5. `driver-heartbeat`

Tabla:
```sql
create table public.driver_heartbeats (
  driver_id uuid primary key references drivers(id) on delete cascade,
  last_heartbeat_at timestamptz not null,
  battery_pct int,
  app_version text,
  device_info jsonb
);
```

Function: POST `{ battery, app_version, device_info }` con JWT del conductor → UPSERT.

### 6. `cron-heartbeat-monitor`

pg_cron cada 5 min:
```sql
select cron.schedule('heartbeat_monitor', '*/5 * * * *', $$
  select check_stale_heartbeats();
$$);
```

Function `check_stale_heartbeats()` (PL/pgSQL): para cada driver con `is_online=true and last_heartbeat_at < now() - interval '5 minutes'`, dispara `dispatch-fcm` con `type='heartbeat_lost'` (push al CONDUCTOR) y INSERT en `dispatcher_alerts` (tabla nueva) para que aparezca en bottom bar del dispatcher.

### 7. `cron-doc-expiry`

pg_cron diario:
- Detecta `driver_documents` con `expires_at` en (60, 30, 15, 7, 3, 1, 0) días.
- Dispara push al conductor por cada hito.
- A día 0: `update drivers set is_active=false`.
- Insert a `dispatcher_alerts`.

### 8. `cron-purge-retention`

pg_cron diario madrugada:
- Aplica política de `docs/legal/data_retention.md`.
- Para `messages` >90 días: DELETE.
- Para `driver_location_history`: DROP partition mes >5 años (excepto las marcadas como vinculadas a SOS o reclamo).
- Para `mp_webhook_events` >1 año: DELETE.
- Anonimiza PII de pasajeros con `last_ride_at < now() - interval '2 years'`.
- Logs cada acción a `audit_log`.

### 9. `mp-webhook` (stub para Tanda 3D, completo para 4D)

Crear el archivo y handler **base** con verificación HMAC (algoritmo en `00_arquitectura.md` 2.5), insert a `mp_webhook_events` con idempotencia, response 200 inmediato. Procesamiento real (`process_mp_payment`) lo completa Tanda 4D.

```ts
// supabase/functions/mp-webhook/index.ts
serve(async (req) => {
  const xSig = req.headers.get('x-signature');
  const xReqId = req.headers.get('x-request-id');
  const url = new URL(req.url);
  const dataId = url.searchParams.get('data.id') || (await req.json()).data?.id;
  
  const secret = Deno.env.get('MP_WEBHOOK_SECRET')!;
  const valid = await verifyMpSignature(xSig, xReqId, dataId, secret);
  
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('mp_webhook_events').insert({
    x_request_id: xReqId, data_id: dataId, signature_valid: valid,
    raw_body: await req.json(), action: req.headers.get('x-action') || null,
  });
  
  if (error?.code === '23505') return Response.json({ ok: true, dup: true });
  if (!valid) return Response.json({ error: 'invalid signature' }, { status: 401 });
  
  EdgeRuntime.waitUntil(Promise.resolve()); // Tanda 4D popula con processWebhook
  return Response.json({ ok: true });
});
```

Deploy con `--no-verify-jwt` (MP no manda nuestro JWT).

### 10. `mp-create-preference` (stub)

Recibe `{ ride_id }` con JWT del pasajero. Tanda 4D implementa el llamado real a MP. Por ahora: devuelve `{ init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=MOCK' }`.

### 11. `health`

GET público:
```json
{
  "status": "ok",
  "checks": {
    "db": "ok",
    "realtime": "ok",
    "fcm": "ok"
  },
  "version": "tanda-3",
  "timestamp": "..."
}
```

Pinging a Postgres + check de fecha de Service Account JWT (no del FCM real).

### 12. Configurar secrets

```bash
supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$(base64 < firebase-sa.json)"
supabase secrets set MP_WEBHOOK_SECRET=...
supabase secrets set MP_ACCESS_TOKEN=...
```

Documentar en `supabase/functions/README.md` qué secret necesita cada function.

### 13. Deploy

```bash
supabase functions deploy dispatch-fcm
supabase functions deploy register-fcm-token
supabase functions deploy mp-webhook --no-verify-jwt
supabase functions deploy mp-create-preference
supabase functions deploy driver-heartbeat
supabase functions deploy health --no-verify-jwt
```

### 14. Tests mínimos

`supabase/functions/_shared/tests.ts`:
- `verifyMpSignature` con un manifest conocido y firma válida.
- `dispatchFcm` con mock de fetch (sin red real).
- Idempotencia de `mp-webhook` con mismo `x-request-id` dos veces.

Run: `deno test --allow-all supabase/functions/`.

## Acceptance criteria

- [ ] Asignar un ride desde el dispatcher dispara push real al device del conductor (verificable en Firebase Console).
- [ ] `register-fcm-token` upsert funciona.
- [ ] `driver-heartbeat` recibe POSTs y se ven en `driver_heartbeats`.
- [ ] `cron-heartbeat-monitor` detecta heartbeats caídos (probar bajando el conductor).
- [ ] `cron-doc-expiry` detecta vencimientos (probar con doc forzado a vencer).
- [ ] `mp-webhook` con firma válida → 200 + insert; con inválida → 401.
- [ ] `health` devuelve estado correcto.
- [ ] Commit `feat(edge-fns): FCM dispatch, MP webhook stub, cron + health`.

## Out of scope

- Procesamiento completo MP (Tanda 4D).
- KYC providers (Tanda 5D).
- Twilio Proxy (Tanda 5D).

## Notas

- **HTTP v1 vs Legacy FCM:** legacy fue deprecated en jun-2024. Usar HTTP v1 con OAuth 2.0 (Service Account) sí o sí.
- **`net.http_post` desde Postgres:** requiere extensión `pg_net` activada (Tanda 1A ya lo hizo).
- **Permisos del trigger:** el trigger corre con el role del usuario que disparó la transacción; usar `security definer` en la function que llama `net.http_post` con `set search_path = public`.
- **Edge Function logs:** cada Edge function imprime structured JSON; consumibles desde `supabase functions logs <name>`.
