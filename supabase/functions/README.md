# Edge Functions — Remís App

## Funciones disponibles

| Función | Método | Auth | Descripción |
|---------|--------|------|-------------|
| `dispatch-fcm` | POST | Service Role | Envía push FCM al destinatario. Llamada desde triggers DB via pg_net. |
| `register-fcm-token` | POST | JWT usuario | Registra/actualiza token FCM del device. |
| `driver-heartbeat` | POST | JWT conductor | Heartbeat del conductor (cada 30s). |
| `health` | GET | Público | Estado del sistema. |
| `mp-webhook` | POST | Público (HMAC) | Recibe webhooks de MercadoPago. Stub — completo en Tanda 4D. |
| `mp-create-preference` | POST | JWT pasajero | Crea preferencia de pago MP. Stub — completo en Tanda 4D. |

## Secrets requeridos

Setear con `supabase secrets set <KEY>=<VALUE>`:

| Secret | Función(es) | Descripción |
|--------|-------------|-------------|
| `FCM_SERVICE_ACCOUNT_JSON` | `dispatch-fcm`, `health` | Service Account de Firebase. JSON plano o en base64. |
| `MP_WEBHOOK_SECRET` | `mp-webhook` | Clave HMAC para verificar firma de webhooks MP. |
| `MP_ACCESS_TOKEN` | `mp-create-preference` | Access token de MercadoPago (Tanda 4D). |

Los secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` son inyectados automáticamente por Supabase.

## Deploy

```bash
supabase functions deploy dispatch-fcm
supabase functions deploy register-fcm-token
supabase functions deploy driver-heartbeat
supabase functions deploy health --no-verify-jwt
supabase functions deploy mp-webhook --no-verify-jwt
supabase functions deploy mp-create-preference
```

## Tests

```bash
deno test --allow-all supabase/functions/_shared/tests.ts
```

## Notas

- **FCM HTTP v1**: se usa la API HTTP v1 (OAuth 2.0 con Service Account). La API legacy fue deprecada en junio 2024.
- **pg_net**: los triggers DB llaman a `dispatch-fcm` vía `net.http_post` (extensión `pg_net`). Requiere `app.supabase_url` y `app.service_role_key` configurados como parámetros de DB.
- **mp-webhook**: se despliega con `--no-verify-jwt` ya que MercadoPago no envía JWT de Supabase. La autenticación es por HMAC.
- **Idempotencia FCM**: deduplicado por `(user_id, type, ride_id)` en la tabla `notifications`.
- **Idempotencia MP webhook**: deduplicado por `x_request_id` en `mp_webhook_events`.
