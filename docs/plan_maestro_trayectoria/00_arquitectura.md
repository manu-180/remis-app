# Arquitectura Técnica

> Documento de decisiones técnicas. Todos los prompts referencian este doc. Las decisiones acá están **cerradas** salvo que un hallazgo nuevo lo justifique. Si querés cambiar algo, hacelo en una tanda dedicada.

---

## 1. Estructura del monorepo

```
remis_app/
├── apps/
│   ├── driver/           # Flutter (Android + iOS)
│   ├── passenger/        # Flutter (Android + iOS)
│   ├── dispatcher/       # Next.js 15 App Router (panel del despachante)
│   └── web/              # Next.js 15 App Router (landing + admin del dueño)
├── packages/
│   ├── design-system/    # tokens.json + outputs (css/ts/dart)
│   ├── shared-types/     # types compartidos TS (DB schema, contratos)
│   ├── flutter-core/     # Dart package compartido entre driver+passenger
│   └── eslint-config/    # config ESLint compartida
├── supabase/
│   ├── migrations/       # SQL versionadas
│   ├── functions/        # Edge Functions (Deno)
│   ├── seed.sql          # datos de seed
│   └── config.toml
├── docs/
│   └── plan_maestro_trayectoria/
├── .github/
│   └── workflows/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md
```

**Razonamiento:**
- Monorepo único porque hay tipos compartidos (DB schema → TS + Dart) y design tokens transversales.
- `apps/` para things que se deployean. `packages/` para libs internas.
- Flutter dentro del monorepo: cada app tiene su `pubspec.yaml`; el `flutter-core` package se referencia por path.
- `pnpm` + `turbo` para JS/TS. Flutter usa `melos` opcionalmente para orquestar `pub get` cross-app (decisión en Tanda 0).

---

## 2. Decisiones del informe técnico embebidas

### 2.1 Realtime — qué canal para qué evento

| Evento | Modalidad | Razón |
|--------|-----------|-------|
| GPS conductor (cada 5–10s) | **Broadcast cliente→cliente, canal privado por agencia** + persistencia muestreada cada 30s | Postgres Changes en un thread es el cuello; broadcast tiene latencia p50 ~6ms |
| Estado del viaje (pending → assigned → en_route → on_trip → completed) | **Postgres Changes** filtrado por `id` o agencia | Volumen bajo, ACID, consultas posteriores |
| Online/offline del conductor | **Postgres Changes** sobre `drivers.is_online` | Persistible para reportes. NUNCA Presence (50 msg/s cap) |
| Cola de pedidos (despachante) | **Postgres Changes** filtrado por status pending | 1 cliente, decenas/hora |
| Notificación de asignación al conductor | **Postgres Changes** (app abierta) **+ FCM** (siempre, vía trigger → Edge Function) | Realtime no llega con app cerrada |
| Trip share público | **Postgres Changes** anon con RPC `SECURITY DEFINER` | Token UUID en URL |

**Anti-patterns confirmados:**
- Postgres Changes para GPS → 17M writes/mes innecesarios al WAL.
- Presence para online/offline de conductores → cap de 50 msg/s, pierde info en reconexiones.
- Olvidar `supabase.realtime.setAuth()` antes de `subscribe()` con canal privado → CHANNEL_ERROR.
- DELETE no es filtrable en Postgres Changes — workaround: soft delete (`deleted_at`).

### 2.2 PostGIS

- **Tipo de columna:** `geography(Point, 4326)` para todo lo espacial. NO `geometry` proyectado.
- **Indices:** `GIST` sobre la columna geography. Para history tables: `BRIN` sobre `recorded_at`.
- **Query de cercanía canónico:**
  ```sql
  WHERE ST_DWithin(location, $point, max_meters)
  ORDER BY location <-> $point
  LIMIT n;
  ```
  NUNCA `ST_Distance(...) < n` en WHERE (no usa índice).
- **Tablas split:**
  - `driver_current_location` (1 row/conductor, UPSERT, GIST tiny en RAM).
  - `driver_location_history` (append-only, particionada por mes, BRIN).
- **Autovacuum agresivo** en `driver_current_location` (`scale_factor = 0.02`).
- **Distancia para tarifa:** PostGIS × 1.3 al cotizar; suma de tramos del histórico al cobrar real.

### 2.3 Background location (Flutter driver)

- **Package:** `flutter_background_geolocation` (Transistorsoft, **USD 399 una vez por bundle ID**, plan Starter).
- **Config:** `distanceFilter: 20`, `heartbeatInterval: 30s`, `stopTimeout: 5min`, `activityType: ACTIVITY_TYPE_AUTOMOTIVE_NAVIGATION`.
- **Sync:** capa HTTP integrada apuntando a `$SUPABASE_URL/rest/v1/driver_locations` con strategy JWT + refreshUrl (crítico — JWT expira a 1h, sin refresh hay 401 en cadena).
- **Onboarding bloqueante 8 pasos** (ver `tanda_3/prompt_3A_driver_core.md`).
- **OEMs chinos (Xiaomi/Realme/Huawei):** mitigación con heartbeat + push de "tu app está caída" si no llega heartbeat por 5 min.

### 2.4 Dispatcher

- **Layout:** 3 columnas + barra inferior + top bar de KPIs. Modo oscuro default.
- **Mapa:** MapLibre GL JS (no Leaflet — clusters mejores para 50 markers en tiempo real). Estilo dark custom.
- **Tabla cola:** `@tanstack/react-table` + `@tanstack/react-virtual`.
- **Shortcuts** (copiar Autocab/iCabbi):
  - `Espacio` nuevo pedido
  - `F1` guardar
  - `F2` campo pickup (×2 → destino)
  - `F3` teléfono
  - `F5` toggle ahora/programado
  - `Enter` abrir detalle
  - `A` asignar
  - `M` designar chofer
  - `E` editar
  - `C` cancelar
  - `H` hold
  - `R` reasignar
  - `S` buscar global
  - `F9` mensaje al chofer
  - `Tab` ciclar paneles
  - `Esc` cerrar
  - `Ctrl+Z` deshacer asignación (window 30s)
- **Caller-ID:** Twilio Voice JS SDK + match contra `passengers` table. POC en 2-3 días, ROI altísimo.
- **Multi-monitor:** `window.open('/dispatch/map-fullscreen')` + `BroadcastChannel` API para sincronizar.
- **Click-to-dispatch + sugeridos:** sistema sugiere los 3 más cercanos (RPC `find_nearest_available_drivers`), despachante decide. NO auto-dispatch.

### 2.5 MercadoPago

- **Producto:** Checkout Pro vía `flutter_custom_tabs ^2.4.0`. NO WebView embebido (deprecated dic-2024).
- **Comisión recomendada:** 14 días = 3,49% (balance cashflow/costo).
- **Webhook:** Edge Function con HMAC SHA-256 verificada, manifest:
  ```
  id:<data.id lowercase>;request-id:<x-request-id>;ts:<ts>;
  ```
- **Idempotencia:** UNIQUE en `mp_webhook_events.x_request_id` + UNIQUE en `(data_id, action)`.
- **Procesamiento async:** `EdgeRuntime.waitUntil()`. Responder 200 rápido.
- **Pivote:** `external_reference = ride.id` siempre.
- **Polling exponencial** del cliente Flutter al volver del Custom Tab si webhook tarda >5s.

### 2.6 Compliance / Legal

- **Marco:** Ley Pcial. 987 + ordenanzas municipales (Santa Rosa Ord. 4226/2010 + 5868/2018 como referencia).
- **Distinción:** REMÍS ≠ TAXI. Solo se toma por agencia, sin paseo callejero, sin tarifa dinámica.
- **Privacidad:** Ley 25.326 vigente. Inscribir base en RNBD/AAIP **antes de lanzar**.
- **Docs por conductor (con vencimiento bloqueante):** LUC D1, VTV, Seguro RC + pasajeros, libreta sanitaria, habilitación vehículo, Reincidencia (recomendado 6 meses).
- **Auditoría:** `audit_log` append-only con hash chain SHA-256. Retención 5 años (10 para SOS).
- **SOS:** hold-press 2-3s + `tel:911` + Realtime al despachante + SMS a contactos. NO API pública del 911 AR.
- **Trip share:** token UUID + RPC `SECURITY DEFINER` + Realtime anon.
- **KYC:** Didit free (onboarding) + AWS Rekognition CompareFaces (selfies intra-turno). ~USD 100-150/mes total.
- **Masked calling:** Twilio Proxy con número AR (~USD 30-80/mes).

---

## 3. Clean Architecture — capas

### Para apps Flutter (driver + passenger)

```
lib/
├── main.dart
├── app.dart                      # MaterialApp + theming + go_router
├── core/                         # cross-cutting (no domain logic)
│   ├── env/
│   ├── errors/
│   ├── result/                   # Result<T, AppError> pattern
│   ├── logger/
│   └── theme/                    # consume design tokens
├── features/                     # feature-first slicing
│   └── <feature_name>/
│       ├── data/
│       │   ├── datasources/      # SupabaseDataSource, LocalDataSource
│       │   ├── models/           # DTOs (json_serializable)
│       │   └── repositories/     # impls
│       ├── domain/
│       │   ├── entities/         # plain Dart, sin libs
│       │   ├── repositories/     # interfaces
│       │   └── usecases/         # AcceptRide, StartTrip, EndTrip
│       └── presentation/
│           ├── providers/        # Riverpod providers (typed)
│           ├── controllers/      # AsyncNotifier
│           ├── widgets/
│           └── screens/
├── routing/
│   └── app_router.dart           # go_router
└── shared/                       # widgets cross-feature, hooks
```

**Riverpod 2.x con code-gen:** `riverpod_generator` + `riverpod_annotation`. Providers tipados con `@riverpod`.

**Resultado de operaciones:** `Result<T, AppError>` (no excepciones para flujo de control). `AppError` es sealed class con casos `NetworkError`, `AuthError`, `PermissionError`, `Domain(message)`.

**Inyección:** Riverpod como contenedor (no `get_it` adicional). Cada repositorio es un provider.

### Para Next.js 15 (dispatcher + web)

```
src/
├── app/                          # App Router
│   ├── (auth)/
│   ├── (dashboard)/              # dispatcher mounted aquí
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── rides/
│   │   ├── drivers/
│   │   └── reports/
│   └── api/                      # route handlers (poco — preferir Edge Functions)
├── features/
│   └── <feature>/
│       ├── components/           # client components
│       ├── server/               # server actions, queries
│       ├── hooks/                # client hooks
│       └── types.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # browser client
│   │   ├── server.ts             # server client (cookies)
│   │   ├── service.ts            # service role (admin only, NUNCA al cliente)
│   │   └── realtime.ts           # singleton de canales
│   ├── utils/
│   └── env.ts                    # zod-validated env
├── components/
│   ├── ui/                       # shadcn/ui base
│   └── layout/                   # AppShell, Sidebar, etc.
└── styles/
    └── globals.css               # tokens + tailwind
```

**Server-first:** componentes server por defecto, `'use client'` solo donde se requiere (mapas, formularios complejos, Realtime).

**Datos:** Server Components con `createServerClient` (cookies). Mutaciones con Server Actions o Edge Functions. Client subscribe a Realtime para diff incremental.

**Forms:** `react-hook-form` + `zod`. UI: `shadcn/ui` extendido con tokens propios.

**Estado cliente complejo:** Zustand. Para estado de servidor: `@tanstack/react-query` SOLO si Realtime no alcanza (el caso default es Realtime + Supabase JS).

---

## 4. Schema base de la DB (resumen — la versión completa va en Tanda 1A)

Tablas raíz:

- `profiles` (extends `auth.users`, role: passenger | driver | dispatcher | admin)
- `passengers`
- `drivers` (con docs y vencimientos)
- `vehicles`
- `driver_current_location` (1 row/conductor)
- `driver_location_history` (particionada por mes)
- `tariff_zones` (polígonos)
- `fares` (matriz zona-zona o flat)
- `frequent_addresses`
- `rides` (estado: requested | assigned | en_route | waiting | on_trip | completed | cancelled | no_show)
- `ride_events` (audit log de transiciones)
- `payments`
- `mp_webhook_events`
- `messages` (chat conductor↔pasajero)
- `notifications` (FCM dispatch log)
- `sos_events`
- `shared_trips`
- `audit_log` (append-only con hash chain)
- `driver_documents` (con `expires_at`)
- `kyc_verifications`

**RLS:** activado en TODAS. Policies por rol. Service role solo desde Edge Functions.

**Funciones RPC clave:**
- `find_nearest_available_drivers(...)`
- `estimate_fare(origin_zone, dest_zone, ...)`
- `get_shared_trip(token)` SECURITY DEFINER
- `assign_ride(ride_id, driver_id)` con bloqueo optimista
- `cancel_ride(ride_id, reason)`

---

## 5. Principios transversales

1. **Single Source of Truth para tipos:** Supabase emite TS types vía `supabase gen types typescript`. Para Dart se usa un script propio que mapea desde el mismo SQL → Dart classes.
2. **Migraciones forward-only.** Nunca `DROP TABLE` en migración aplicada en prod. Soft deletes.
3. **Feature flags:** tabla `feature_flags` consultada al startup, cacheada 60s. Ej. `caller_id_enabled`, `mp_payment_enabled`, `kyc_strict_mode`.
4. **Idempotencia obligatoria** en cualquier mutación crítica (Edge Function, RPC con efectos externos): UNIQUE keys, `If-None-Match` headers.
5. **Logs estructurados** (JSON) en Edge Functions. PII redactada (DNI, teléfono → `***1234`).
6. **Secrets:** nunca en repo. `supabase secrets set` para Edge Functions, Vercel env vars para Next.js, `--dart-define-from-file` para Flutter.
7. **Tests:** integración mínima viable. Unitarios sólo para reglas de negocio puras (cálculo de tarifa, máquina de estados de ride). E2E con Playwright para 5 flujos críticos del dispatcher.
8. **Errores:** todos los errores que llegan al usuario son friendly + accionables. Stack traces a Sentry, NO al user.
9. **Performance budgets:**
   - Dispatcher: TTI < 2.5s, LCP < 1.8s, INP < 200ms.
   - Passenger app: cold start < 2s, "abrir → ver mapa con mi ubic" < 3s.
   - Driver app: cold start < 1.5s (es la pieza más crítica para la operación).
10. **Versioning:** SemVer en cada app. La versión sale en el header de logs y en una pantalla "Acerca de" oculta (tap 7 veces en el logo).

---

## 6. Variables de entorno (estandarizadas)

### Compartidas
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo backend / Edge Functions)

### Edge Functions
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `FCM_SERVICE_ACCOUNT_JSON` (base64)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PROXY_SID`
- `AWS_REKOGNITION_ACCESS_KEY`, `AWS_REKOGNITION_SECRET`, `AWS_REGION`

### Next.js (NEXT_PUBLIC_* solo si va al cliente)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MAPLIBRE_STYLE_URL`
- `NEXT_PUBLIC_GOOGLE_PLACES_KEY` (restringido por dominio)
- `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`

### Flutter (`--dart-define-from-file=env/{dev|stg|prd}.json`)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `GOOGLE_MAPS_API_KEY` (restringido por SHA + bundle ID)
- `MP_PUBLIC_KEY` (no access token)
- `SENTRY_DSN`

---

## 7. Despliegue

| App | Donde | CI |
|-----|-------|-----|
| `apps/web` (landing) | Vercel | GitHub Actions |
| `apps/dispatcher` | Vercel (proyecto separado, dominio `dispatch.<domain>`) | GitHub Actions |
| Edge Functions | Supabase | GitHub Actions con `supabase functions deploy` |
| `apps/driver` | Play Store + App Store (interno + cerrado primero) | GitHub Actions con Fastlane |
| `apps/passenger` | Play Store + App Store | GitHub Actions con Fastlane |

**Branches:** `main` → producción. `staging` → entorno staging. PRs feature-branched.

**Migraciones:** se aplican vía `supabase db push` desde GHA en `main` después de pasar checks. **Nunca aplicar a mano en prod.**

---

## 8. Observabilidad

- **Sentry** en dispatcher + driver + passenger + Edge Functions.
- **PostHog** para producto (eventos de uso, funnels). Solo en dispatcher + passenger app. NO en driver app (eventos clave van directo a tabla `driver_events` para análisis interno + ahorro de costos).
- **Supabase logs** para postgres, realtime, edge functions.
- **Health endpoint** `/api/health` en Next.js que toca Supabase + cuenta Realtime.
- **Heartbeat del conductor:** dashboard interno que muestra "última señal hace Xm" para detectar Xiaomi-killing.

---

## 9. Decisiones cerradas (no re-discutir sin justificación)

- ✅ Monorepo único pnpm + turbo
- ✅ Riverpod 2.x con code-gen, no Bloc
- ✅ go_router, no auto_route
- ✅ shadcn/ui como base, no MUI/Mantine/Chakra
- ✅ Tailwind v4
- ✅ MapLibre en web, google_maps_flutter en mobile
- ✅ Postgres + PostGIS, no MongoDB ni nada exótico
- ✅ Edge Functions Deno, no servidor propio
- ✅ flutter_background_geolocation pago, no DIY
- ✅ MP Checkout Pro, no Bricks ni SDK fragmentado
- ✅ Modo oscuro default en dispatcher

---

## 10. Decisiones que se difieren (cuando aplique)

- ❓ Notificaciones in-app (Supabase Realtime ya, OneSignal solo si saturamos FCM gratis).
- ❓ Multi-tenant futuro: schema deja la puerta abierta con `agency_id` en todas las tablas, pero por ahora hay 1 sola agencia.
- ❓ Dashboard del dueño con BI: probablemente Metabase apuntando a un read-replica. Decisión en Tanda 5.
