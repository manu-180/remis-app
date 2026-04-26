# Prompt 5A — Observability: Sentry + PostHog + dashboards operativos

> **LEÉ:** `00_arquitectura.md` (sec 8), `00_file_ownership_matrix.md` (Tanda 5A).

## Objetivo

Saber en tiempo real qué pasa con la operación: errores agrupados por componente, traces de requests críticos, métricas de producto (cuántos pedidos/h, tiempo de asignación promedio), heartbeat de los conductores (Xiaomi-killing detector), alertas que llegan al dueño/dispatcher cuando algo importante se rompe.

## File ownership

✍️ `apps/*/lib/core/observability/**` (Flutter), `apps/*/src/lib/observability/**` (Next.js), `apps/dispatcher/instrumentation.ts`, `apps/dispatcher/sentry.*.config.ts`, `supabase/functions/_shared/observability.ts`, `docs/operations/runbook.md`, `docs/operations/launch_checklist.md`.

## Steps

### 1. Sentry — setup en las 4 apps

#### Next.js (dispatcher + web)

```bash
cd apps/dispatcher && pnpm add @sentry/nextjs
pnpm dlx @sentry/wizard@latest -i nextjs
```

Configs separadas:
- `sentry.client.config.ts` — browser, sample 0.1 traces en prod, 1.0 errors.
- `sentry.server.config.ts` — Server Components + Route Handlers.
- `sentry.edge.config.ts` — middleware.
- `instrumentation.ts` registra ambos.

DSN env: `NEXT_PUBLIC_SENTRY_DSN`. Tags por defecto: `app`, `release`, `environment`.

Releases automáticos desde GHA (Tanda 5B).

#### Flutter (driver + passenger)

```yaml
sentry_flutter: ^8.13.0
```

`main.dart`:
```dart
await SentryFlutter.init(
  (options) {
    options.dsn = Env.sentryDsn;
    options.tracesSampleRate = Env.flavor == 'prd' ? 0.1 : 1.0;
    options.profilesSampleRate = 0.1;
    options.environment = Env.flavor;
    options.release = '${Env.appName}@${Env.appVersion}+${Env.appBuild}';
    options.enableAutoSessionTracking = true;
    options.beforeSend = (event, hint) {
      // redactar PII
      if (event.user != null) {
        event = event.copyWith(user: event.user!.copyWith(email: null, ipAddress: null));
      }
      return event;
    };
  },
  appRunner: () => runApp(const ProviderScope(child: MyApp())),
);
```

#### Edge Functions

`supabase/functions/_shared/observability.ts`:
```ts
import * as Sentry from 'https://deno.land/x/sentry@8.13.0/index.mjs';

export function initSentry() {
  Sentry.init({
    dsn: Deno.env.get('SENTRY_DSN_EDGE'),
    environment: Deno.env.get('ENVIRONMENT') ?? 'dev',
    tracesSampleRate: 0.2,
  });
}

export function captureWithContext(err: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureException(err);
  });
}
```

Cada Edge Function importa y llama `initSentry()` al inicio.

### 2. Structured logging (JSON)

`_shared/logger.ts` para Edge Functions:
```ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export function log(level: LogLevel, event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level, event, ...redactPII(data),
  }));
}
```

Redacción PII:
- `phone` → mostrar últimos 4: `***1234`.
- `dni` → completamente redactado: `[redacted]`.
- `email` → user@***.com.
- `ride_id`, `driver_id`, `passenger_id` → OK pasarlos.

Aplicar el mismo patrón en Flutter (`flutter-core/logger/logger.dart`) y Next.js (`lib/observability/logger.ts`).

### 3. PostHog — producto

#### Apps que lo usan

- **Dispatcher** (web): tracking de uso del despachante (qué shortcuts usa, tiempo entre asignaciones).
- **Passenger** (mobile): funnels de conversión (intent → request → assigned → completed).
- **NO** en Driver (PII pesada del conductor + ahorro de costo). Eventos del driver van a tabla custom `driver_analytics_events` (admin BI).

#### Setup Next.js

```bash
pnpm add posthog-js
```

```ts
// lib/observability/posthog.ts
import posthog from 'posthog-js';
export function initPosthog() {
  if (typeof window !== 'undefined' && !posthog.__loaded) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: 'https://app.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // manual con app router
    });
  }
}
```

`PostHogProvider` Client Component que llama init + captura pageviews en navigation events.

Identificar usuario al login: `posthog.identify(user.id, { role, agency_id })`.

#### Setup Flutter (passenger)

```yaml
posthog_flutter: ^4.7.0
```

Config en main, identify al login. Eventos custom: `ride_requested`, `payment_method_selected`, `cancelled`, etc.

#### Eventos clave

Dispatcher:
- `dispatcher_login`, `dispatcher_logout`, `dispatcher_lock`
- `ride_assigned` (props: time_to_assign_s, driver_count_online, sugested_used)
- `ride_cancelled` (reason)
- `caller_id_call_received`, `caller_id_call_answered`
- `shortcut_used` (key)

Passenger:
- `app_opened`
- `ride_destination_selected` (source: frequent | recent | search)
- `ride_estimated` (amount, distance)
- `ride_requested`
- `ride_assigned_received` (time_waiting_s)
- `ride_completed`
- `ride_cancelled_by_passenger`
- `payment_method_selected` (method)
- `payment_completed`

Edge functions: NO PostHog directo; usar logs estructurados que un job exporta a PostHog (Tanda 5 advanced).

#### Funnels críticos

Configurar en PostHog dashboard:
1. **Conversión pasajero**: app_opened → destination_selected → requested → assigned → completed.
2. **Cancelación temprana**: requested → cancelled antes de assigned.
3. **Pago MP**: payment_method=mp → payment_completed.

#### Privacy

- Opt-in para analytics en consent flow.
- Si opt-out: `posthog.opt_out_capturing()`.

### 4. Heartbeat dashboard (operativo, no Sentry/PostHog)

El detector de Xiaomi-killing necesita dashboard propio porque es **crítico para operación**.

Tabla nueva (si no existe en 1A): `driver_heartbeats` (de Tanda 3D).

Vista admin `/admin/heartbeat-monitor`:
- Lista de conductores online ahora.
- Para cada uno: última señal hace X segundos, batería %, app version.
- Highlight rojo si última señal >2 min.
- Histograma de "tiempo entre heartbeats" para detectar patrones (un conductor cuyo dispositivo da heartbeat cada 4-5 min muy probablemente está siendo killed).

Realtime suscripción a `driver_heartbeats`.

### 5. Dashboard operativo del dueño

`/admin` dashboard renovado con métricas en vivo:

KPIs en cards:
- Viajes activos ahora (badge con conteo).
- Ingresos hoy.
- Conductores online / total.
- Tiempo promedio de asignación últimas 24h.
- % de pedidos cancelados últimas 24h.
- Heartbeat losses últimas 24h.

Charts (recharts o tremor):
- Pedidos por hora (24h).
- Heatmap día×hora últimas 4 semanas.
- Top 10 zonas origen (mapa choropleth con `tariff_zones`).
- Distribución de tiempos de espera al pickup.

Datos vía Server Component que llama RPCs Postgres con CTE pesados (cacheados 60s).

### 6. Alertas críticas (PagerDuty / email / Telegram)

Edge Function `cron-alerts-monitor` cada 5 min:
- Si `driver_heartbeat_lost > 30%` de drivers online → ALERTA.
- Si `ride_unassigned > 10min` y `available_drivers > 0` → ALERTA (problema de despacho).
- Si `mp_webhook_errors > 5` última hora → ALERTA.
- Si `sos_event` insertado → ALERTA INMEDIATA AL DUEÑO + dispatcher.

Canal: webhook a Telegram bot del dueño (más simple que PagerDuty para flota chica) + email backup.

`secrets`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID_OWNER`, `TELEGRAM_CHAT_ID_DISPATCHER`.

### 7. Performance monitoring

#### Web Vitals (dispatcher + web)

`lib/observability/web-vitals.ts`:
```ts
import { onLCP, onFID, onCLS, onINP, onTTFB, onFCP } from 'web-vitals';
function sendToAnalytics(metric) {
  posthog.capture('web_vital', { name: metric.name, value: metric.value, rating: metric.rating });
}
onLCP(sendToAnalytics); onINP(sendToAnalytics); onCLS(sendToAnalytics);
```

Performance budgets monitoreados:
- LCP < 1.8s
- INP < 200ms
- CLS < 0.1

Si en producción >P95 supera el budget durante 24h: alerta.

#### Flutter

`SentryFlutter` + `enableAutoPerformanceTracking: true`. Métricas del frame rate:
- Slow frames > 16ms (60fps)
- Frozen frames > 700ms

Sentry los reporta automáticamente. Custom transactions para flujos críticos:
```dart
final tx = Sentry.startTransaction('ride_request_flow', 'ui');
// ...
await tx.finish();
```

### 8. Audit trail visualizable

Vista admin `/admin/audit` que renderiza `audit_log`:
- Filtros: entidad, actor, acción, rango de fechas.
- Búsqueda full-text en `diff jsonb`.
- Verificación de hash chain (botón "Verificar integridad" recomputa los hashes y muestra si rompió).

### 9. Health checks

#### Apps Flutter

Pantalla oculta `/__diagnostic` (acceso: tap 7 veces en versión de Settings → screen):
- Última heartbeat enviado.
- Permisos de OS.
- Versión.
- Endpoint de Supabase ping.
- FCM token actual (truncado).

#### Web (dispatcher + web)

`/api/health` (ya en Tanda 2):
- DB ping.
- Realtime connection.
- FCM (verifica que Service Account JWT renovó).
- MP API ping.
- Twilio API ping (si caller-id activo).

Output JSON estructurado. Usable por Supabase Pro health checker o BetterStack.

### 10. Logs centralizados

`docs/operations/logs_access.md` documenta cómo acceder:
- Sentry → errores.
- PostHog → eventos.
- Supabase Logs → SQL logs, edge function logs.
- Vercel Logs → Next.js runtime.
- Telegram bot → alertas operativas.

### 11. Runbook

`docs/operations/runbook.md` — el doc que abre el dispatcher / dueño cuando algo se rompe.

Capítulos:
1. **El conductor dice que no le entran pedidos** → checklist de 8 pasos (battery opt, autostart, permission, foreground service, force-quit y volver a abrir).
2. **El pasajero dice que no llegó la confirmación** → revisar FCM token, revisar push log.
3. **MP webhook no procesa** → revisar firma, revisar logs, ejecutar reconciliación manual.
4. **Realtime se cae** → ver indicador, ver Supabase status, refresh.
5. **DB lenta** → revisar advisor, revisar slow queries.
6. **SOS triggered** → protocolo paso a paso (ver `docs/legal/sos_protocol.md`).
7. **Brecha de datos** → IR plan (ver `docs/legal/incident_response.md`).
8. **Cómo hacer rollback de un deploy** → procedimiento.
9. **Cómo restaurar de backup** → procedimiento Supabase PITR.

Cada uno: síntoma, diagnóstico, fix, prevención.

### 12. Launch checklist

`docs/operations/launch_checklist.md`:

**Pre-launch (T-2 semanas):**
- [ ] Reunión municipio confirmada.
- [ ] Ordenanza vigente verificada.
- [ ] Inscripción AAIP en trámite.
- [ ] Tarifas configuradas en DB.
- [ ] Polígonos de zona verificados con GIS municipal.
- [ ] 2-3 conductores onboardeados con app.
- [ ] Despachante entrenado (sesión 2h + runbook impreso).
- [ ] Sentry alerting configurado.
- [ ] Backups Supabase activos (Pro).
- [ ] Domain `.com.ar` apuntado a Vercel.
- [ ] Apps en stores (closed testing primero).
- [ ] Twilio número AR adquirido.

**Día de launch:**
- [ ] Habilitar feature flag `mp_payment_enabled` (si va).
- [ ] Anunciar cliente.
- [ ] Monitor activo 4h post-launch.
- [ ] Telegram alerts funcionando.

**Post-launch (semana 1):**
- [ ] Daily check de heartbeats.
- [ ] Daily check de errores Sentry.
- [ ] Reunión semanal con dispatcher para feedback.
- [ ] Ramp-up a más conductores (semana 2-3).

### 13. SLOs

Definir y documentar:
- **Disponibilidad backend (Supabase + Edge Functions):** 99.5% mensual.
- **Tiempo de asignación P95:** < 3 min.
- **Tiempo de asignación P50:** < 60 s.
- **Heartbeat loss rate:** < 5% diario.
- **Crash-free sessions (apps):** > 99%.

Dashboard de SLOs en `/admin/slo`.

## Acceptance criteria

- [ ] Sentry recibe errores de las 4 apps (probado provocando un error a propósito).
- [ ] PostHog captura eventos críticos en dispatcher + passenger.
- [ ] `/admin/heartbeat-monitor` muestra estado en vivo.
- [ ] `/admin` dashboard tiene KPIs reales conectados.
- [ ] Alertas críticas llegan a Telegram bot.
- [ ] `cron-alerts-monitor` corre cada 5 min.
- [ ] `runbook.md` cubre los 9 escenarios listados.
- [ ] `launch_checklist.md` listo y aprobado por el cliente.
- [ ] Health endpoint `/api/health` responde correctamente bajo carga simulada.
- [ ] Audit log tiene viewer + verificación de integridad.
- [ ] Commit `feat(observability): sentry, posthog, alerts, runbook, dashboards`.

## Out of scope

- BI tool externo (Metabase) — opcional roadmap.
- Datadog / NewRelic completo — overkill para flota chica.
- ML para predicción de demanda — overkill.

## Notas

- **Telegram bot** es la opción más simple y barata para alertas en este volumen. PagerDuty cuesta caro y es overkill.
- **Sample rates en Sentry:** 0.1 en producción está bien. Subir a 1.0 temporalmente para diagnosticar problemas específicos.
- **Privacy first:** asegurate de que ningún log/event tiene PII completa. Antes de mergear, grep por `dni`, `phone:`, `email:` en logs estructurados.
