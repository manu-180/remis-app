# Informe Completo del Proyecto `remis_app`

> **Fecha del informe:** 2026-04-30
> **Generado por:** investigación paralela de 8 agentes especializados
> **Alcance:** monorepo completo (apps Flutter, Next.js, packages, Supabase, docs, CI/CD)

---

## 1. Resumen Ejecutivo

`remis_app` es un **producto single-tenant** para una **remisería del área 2954** (cerca de Santa Rosa, La Pampa, Argentina). Cubre tres roles operativos —**pasajero, conductor y despachante**— con tarifa fija regulada por ordenanza municipal y asignación manual desde una agencia central. **No es un Uber-clone:** la operación es de ~50 conductores, despacho 8h/día, y todo viaje comienza en la agencia.

### Stack (no negociable)
- **Mobile (driver, passenger):** Flutter 3.27 + Dart 3.5 + Riverpod 2.6 (codegen) + go_router 14.6
- **Web (dispatcher, web):** Next.js 15 (App Router) + React 19 + Tailwind CSS v4 + shadcn/ui style + Zustand
- **Backend:** Supabase (Postgres 15 + PostGIS + Auth + Realtime + Storage + Edge Functions Deno)
- **Mapas:** Google Maps Flutter (mobile), MapLibre GL JS 5 + react-map-gl 8 (web)
- **Pagos:** MercadoPago Checkout Pro vía `flutter_custom_tabs` + webhook con HMAC SHA-256
- **Push:** FCM (firebase_messaging) + Edge Function `dispatch-fcm` con idempotencia
- **Observabilidad:** Sentry (error + replay con PII masking) + PostHog (analytics; sin session recording en admin)
- **KYC:** Didit + AWS Rekognition (~USD 100-150/mes)

### Estado general
- **176 commits, 4 días de desarrollo intensivo** (2026-04-26 → 2026-04-30) por un único autor.
- **Repo activo en `main`** (regla del proyecto: nada de branches/worktrees, todo a `main` + push directo).
- **Working tree:** 2 archivos modificados sin commitear (`apps/dispatcher/src/components/admin/dashboard/top-drivers.tsx`, `turbo.json`).
- **Tamaño total:** ~7.6 GB (incluyendo `node_modules` y `.dart_tool`).

### Madurez por capa

| Capa | Madurez | Notas |
|---|---|---|
| Backend Supabase | **Alta** | 35 migraciones, 17 Edge Functions, 50+ RLS policies, hash chain de auditoría, retención automatizada |
| Dispatcher (admin web) | **Alta** | 16 secciones admin completas + a11y axe-core + E2E Playwright + observabilidad PII-aware |
| Web (landing) | **Media-alta** | Landing + tarifas + conductores + FAQ + contacto + legales (~85% completo, faltan placeholders y og-image) |
| Flutter `passenger` | **Media** | Auth OTP, request ride, tracking realtime, FCM stub, MercadoPago integrado |
| Flutter `driver` | **Media** | Auth OTP, shift, ride lifecycle completo, location service + sync Supabase, FCM no configurado aún |
| Packages compartidos | **Heterogénea** | `flutter-core` y `shared-types` maduros; `design-system` web maduro pero stubs en Flutter |
| CI/CD | **Alta** | 9 workflows GitHub Actions (lint, test, typecheck, deploy web/mobile/supabase, nightly, release-please) |
| Documentación | **Muy alta** | Plan maestro de 6 tandas (21 prompts), 12 prompts admin-prod ejecutados, brand kit, compliance legal |

---

## 2. Arquitectura del Monorepo

### 2.1 Layout

```
remis_app/
├── apps/
│   ├── driver/                 # Flutter — app conductor (Riverpod + go_router)
│   ├── passenger/              # Flutter — app pasajero (Riverpod + go_router)
│   ├── dispatcher/             # Next.js 15 — panel admin + despacho live (port 3001)
│   └── web/                    # Next.js 15 — landing + admin owner (port 3002)
├── packages/
│   ├── design-system/          # tokens.json + Tailwind preset + Dart tokens
│   ├── flutter-core/           # Auth, Supabase client, location, time utils, Result type
│   └── shared-types/           # TypeScript types autogenerados desde Supabase + enums de dominio
├── supabase/
│   ├── config.toml             # Configuración local (puertos 54321-54323)
│   ├── migrations/             # 35 migraciones forward-only
│   ├── functions/              # 17 Edge Functions Deno
│   └── seed.sql                # Zonas + tarifas + feature flags
├── docs/                       # Plan maestro + prompts + brand + legal + ops + security
├── scripts/                    # sync-env, bump-mobile-version, pre-push, audit-rls
├── .github/workflows/          # 9 workflows (lint, test, typecheck, deploy-*, nightly, release)
├── turbo.json                  # Orquestador de tareas con env enforcement
├── pnpm-workspace.yaml         # apps/dispatcher, apps/web, packages/*
├── .env.example                # Plantilla — los .env reales son gitignored
└── package.json                # pnpm@9.15.0 + turbo + scripts raíz
```

**Flutter NO está en el workspace pnpm** (usa `pubspec.yaml` directo). Solo `apps/dispatcher`, `apps/web` y `packages/*` son workspaces pnpm.

### 2.2 Sistema de variables de entorno

**Single source of truth:** `.env` raíz alimenta todas las apps en sus formatos nativos vía `scripts/sync-env.mjs`:

```
.env (gitignored)
  ├── packages/flutter-core/env/dev.json   → driver + passenger (--dart-define-from-file)
  ├── apps/dispatcher/.env.local           → Next.js dispatcher
  ├── apps/web/.env.local                  → Next.js landing
  ├── apps/*/android/local.properties      → Google Maps key (Android)
  └── apps/*/ios/Flutter/Secrets.xcconfig   → Google Maps key (iOS)
```

- `pnpm env:sync` regenera todo. Hook `predev` lo corre automático antes de `pnpm dev`.
- Variables requeridas: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Opcionales: `GOOGLE_MAPS_API_KEY`, `MP_PUBLIC_KEY`, `MP_ACCESS_TOKEN`, `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_*`, `SUPABASE_SERVICE_ROLE_KEY`.

### 2.3 Tooling raíz

- **TypeScript** strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- **Prettier 3.4** con `prettier-plugin-tailwindcss`, line width 100, single quote.
- **ESLint 9** flat config (no `.eslintrc`) en cada app Next.js.
- **Turbo 2.3** con env vars enforcement (build necesita SUPABASE_URL, ANON_KEY, MAPLIBRE_STYLE_URL, GOOGLE_MAPS_API_KEY, POSTHOG_*, SENTRY_*).
- **No husky** local (validación delegada a CI).
- **Dart format** 100 cols, `analysis_options.yaml` raíz.

---

## 3. Backend Supabase

### 3.1 Esquema de base de datos

**~22 tablas core** distribuidas en 12 migraciones de schema:

| Dominio | Tablas |
|---|---|
| **Auth & perfiles** | `profiles`, `passengers`, `drivers`, `vehicles`, `frequent_addresses` |
| **Documentos & KYC** | `driver_documents`, `kyc_verifications` |
| **Geolocalización** | `driver_current_location` (hot, GIST), `driver_location_history` (particionada por mes con pg_cron) |
| **Tarifas** | `tariff_zones` (PostGIS Polygon), `fares` (matriz 4×4 con wildcard + night surcharge) |
| **Viajes** | `rides`, `ride_events` (audit transiciones), `ride_ratings` |
| **Pagos** | `payments`, `mp_webhook_events` (idempotencia por `x_request_id`) |
| **Mensajería & alerta** | `messages`, `notifications`, `sos_events` (append-only, retención 10 años), `shared_trips` (tokens públicos) |
| **Auditoría** | `audit_log` (append-only, hash chain SHA-256, advisory_xact_lock) |
| **Operaciones** | `feature_flags`, `fcm_tokens`, `driver_heartbeats`, `dispatcher_alerts` |

**Extensiones:** `uuid-ossp`, `postgis`, `pgcrypto`, `pg_cron`, `pg_net`.

### 3.2 RLS y seguridad

- **50+ policies** con helpers `current_user_role()`, `is_dispatcher_or_admin()`, `is_admin()`.
- **Roles:** `passenger`, `driver`, `dispatcher`, `admin`.
- **Patrón típico:** passenger ve solo lo propio; driver ve lo propio + ride asignado; dispatcher/admin ve todo.
- **`shared_trips`:** sin policy directa, acceso vía RPC `get_shared_trip(token)` con `SECURITY DEFINER`.
- **`audit_log`:** `REVOKE UPDATE, DELETE` para todos los roles.

### 3.3 RPCs principales (≥17)

- **Búsqueda/asignación:** `find_nearest_available_drivers`, `estimate_fare`, `assign_ride`, `reassign_ride`, `cancel_ride` (idempotente), `mark_ride_no_show`.
- **Lifecycle:** `driver_arrived_pickup`, `start_trip`, `end_trip`, `record_ride_distance`.
- **Realtime/location:** `upsert_driver_location`.
- **Compartir viaje:** `create_shared_trip`, `get_shared_trip`.
- **Operaciones admin:** `get_avg_assign_secs`, `get_shift_summary`, `list_pending_invites`.
- **Auditoría/seguridad:** `log_security_event`, `audit_log_hash_chain`.

### 3.4 Edge Functions (17)

| Categoría | Funciones |
|---|---|
| Push notifications | `dispatch-fcm`, `register-fcm-token` |
| Heartbeat & alerts | `driver-heartbeat`, `cron-alerts-monitor` |
| MercadoPago | `mp-create-preference`, `mp-webhook` (HMAC, sin JWT) |
| KYC | `kyc-create-session`, `kyc-didit-webhook`, `kyc-compare-face` |
| Twilio (masked calling) | `twilio-create-proxy-session`, `twilio-incoming-webhook` |
| Admin | `admin-create-driver`, `admin-invite-staff` |
| Otros | `notify-sos-contacts`, `health`, `rate-limit` |

### 3.5 Triggers, cron y partitioning

- **Auditoría automática** sobre `rides`, `payments`, `drivers`, `sos_events` con diff jsonb + hash chain.
- **FCM dispatch via `pg_net`** ante INSERT en `sos_events` y UPDATE de `rides.status` (assigned/completed).
- **pg_cron jobs:**
  - `check_stale_heartbeats` (5min) — alerta conductores sin heartbeat.
  - `check_document_expiry` (diario 7am) — alertas a 60/30/15/7/3/1/0 días + auto-`is_active=false`.
  - `purge_retention` (diario 3am) — borra messages >90d, MP events >1y, anonimiza pasajeros >2y inactividad.
  - `create_next_month_partition` (día 25 3am) — crea partición de `driver_location_history`.

### 3.6 Seed

- 4 zonas Santa Rosa: Centro, Norte, Sur, Periferia (PostGIS polygons).
- Matriz de tarifas 4×4 con base 2500-5000 ARS, per-km 350-420, night surcharge 20-25%.
- 6 feature flags (default `false` excepto `trip_share_enabled=true`).

---

## 4. Apps Flutter

### 4.1 Estado común

Ambas apps siguen **feature-first slicing** con separación `data/` (repositories, models) y `presentation/` (providers, screens, widgets), comparten `packages/flutter-core` y usan Riverpod 2.6 con codegen + go_router 14.6 + Supabase 2.8.

### 4.2 `apps/driver`

- **Features implementadas:**
  - Splash + login phone + OTP verify + KYC onboarding (8 pasos bloqueantes con permisos).
  - Home con shift management (`startShift`, `pauseShift`, `resumeShift`, `endShift`).
  - Ride flow completo: `incomingOfferStream` → accept/reject → `markEnRoute` → `arrivedPickup` → `startTrip` → `endTrip` → `ride_completed_screen`.
  - Chat con pasajero (`/chat/:rideId/:passengerId`).
  - History, settings, intra-shift verification (KYC re-check).
- **Location service:** `geolocator` con Android foreground notification, `distanceFilter: 20m`, sync a Supabase via `upsert_driver_location` RPC, broadcast stream público.
- **Background location:** planificado con `flutter_background_geolocation` (Transistorsoft Starter, USD 399 por bundle ID) — aún no integrado.
- **FCM:** paquetes presentes, no configurado todavía (Tanda 5).
- **Sentry sí, PostHog no** (solo passenger usa PostHog).
- **State management:** codegen pesado (`auth_controller.g.dart`, `ride_controller.g.dart`, `shift_controller.g.dart`, `theme_controller.g.dart`).

### 4.3 `apps/passenger`

- **Features implementadas:**
  - Auth OTP + onboarding name.
  - Home con búsqueda de destino (Google Places autocomplete con bias de ubicación), direcciones frecuentes y POIs.
  - Ride request: `estimate_fare` RPC + ruta polyline (Google Directions) + confirmación.
  - Waiting screen → tracking realtime con `driverLocationStreamProvider` + `activeRideStreamProvider`.
  - Trip complete con tarifa final y rating 1-5 estrellas.
  - History + settings.
- **MercadoPago:** integrado vía `flutter_custom_tabs 2.4.0` (NO WebView).
- **FCM:** **arquitectura lista** (`FcmService`, `notification_router.dart` mapea tipos a rutas go_router) pero stub hasta Tanda 4.
- **Sentry + PostHog ambos** (con `disable_session_recording` para PII).
- **State management:** providers manuales con `Provider.family`, menos codegen que driver.

### 4.4 `packages/flutter-core`

Maduro. Exporta:
- Auth: `AuthRepository` (interface) + `SupabaseAuthRepository` (OTP por phone) + `AuthController` + `AuthError`.
- Supabase: `supabaseClientProvider` (Riverpod, keepAlive) + `userId` + `session` providers.
- Location: `geolocatorProvider`, `PermissionHelper`, `Bounds`, `AddressFormat`.
- Time: `EtaFormat`, `RelativeTime`.
- Core: `Result<Ok, Err>`, `AppError`, `AppLogger`, `Env`, `phone_utils`, `currency_format`.
- Widgets: `MapLoadingPlaceholder`.

---

## 5. Apps Next.js

### 5.1 `apps/dispatcher` (port 3001)

**Panel admin + despacho live + vista compartida pública.**

#### Estructura por route groups
- `(auth)`: `login`, `reset-password`, `accept-invite`.
- `(admin)`: 16 secciones admin completas — todas detrás de `requireRole(['admin'])` excepto algunas que aceptan dispatcher.
- `(dashboard)`: redirect por rol; rutas `/rides`, `/drivers`, `/reports` aún placeholders (despacho live, Tanda 3C).
- `dispatch/map-fullscreen`: mapa MapLibre fullscreen.
- `shared/[token]`: vista pública sin auth con MapLibre realtime + ETA + datos del conductor (vía RPC `get_shared_trip`).
- `api/health`: healthcheck Supabase.

#### Páginas admin implementadas (16)

| Ruta | Estado | Realtime |
|---|---|---|
| `/admin` (dashboard) | KPIs, heatmap demanda, sparklines, top drivers clickeables, activity feed, períodos clickeables | sí |
| `/admin/drivers` + `/[id]` | Lista filtrable + perfil con tabs (resumen, vehículo, docs, KYC, viajes, ubicación) | sí |
| `/admin/rides` + `/[id]` | Lista + detalle con mapa, timeline, reasignar, compartir, mensajes realtime | sí |
| `/admin/sos` + `/[id]` | Mapa realtime + audio/notif browser + acciones de despacho | sí |
| `/admin/payments` | Tabla paginada server-side, refunds simulados | — |
| `/admin/kyc` | Cola de revisión con aprobación inline | — |
| `/admin/zones` | Editor MapLibre (draw/edit polígonos) | — |
| `/admin/fares` | Matriz origen×destino + simulador | — |
| `/admin/feature-flags` | Toggle, búsqueda, crear flag | — |
| `/admin/audit` | Audit log paginado server-side + verify hash chain on-demand | — |
| `/admin/team` | Invite real (Edge Function `admin-invite-staff`) + roles | — |
| `/admin/passengers` | Tabla + CSV + UserAvatar premium | — |
| `/admin/settings` | Cambio password real + 2FA TOTP (enroll/challenge/unenroll) | — |

#### Componentes clave

- **`src/components/ui/`:** ~26 primitivas estilo shadcn (Radix UI + Tailwind tokens en `globals.css`, sin `tailwind.config.ts`).
- **`src/components/admin/data-table/`:** DataTable virtualizada (TanStack Table + Virtual), FilterBar, column-helpers, ExportCsvButton (chunks 1000, max 10k).
- **`src/components/admin/dashboard/`:** KPIs, demand heatmap (MapLibre grid), sparklines, top drivers, activity feed.
- **`src/lib/`:** clientes Supabase (browser/server SSR), `realtime.ts` (canales locations/rides/drivers), `auth/require-role.ts`, `env.ts` (zod), `postgrest-safe.ts` (escape `.or()`), `validation.ts` (UUID), `export-csv.ts` (UTF-8 BOM), `observability/` (Sentry + PostHog + logger PII-aware).
- **`src/stores/`:** Zustand para `rides-store`, `drivers-store`, `ui-store`.
- **`src/hooks/`:** `useSupabaseQuery`, `useRealtimeTable`, `useExportCsv`, `useSosWatcher`, `useAppShortcuts`, `usePageShortcuts`.

#### Auth y middleware

- **`middleware.ts`:** cookie bloat guard (>6KB → clear + redirect login, evita 431), `getUser()` check para `/admin*` y `/dispatch*`, redirect `/login?redirect=...` si no auth.
- **MFA TOTP:** login chequea `getAuthenticatorAssuranceLevel` post-signin → si `aal1→aal2` abre dialog challenge antes de `redirectByRole`.

#### Testing

- **Playwright + axe-core:** suites en `tests/e2e/` — `login`, `a11y` (sobre todas páginas admin con WCAG 2A/AA + 21A/AA), `admin-smoke`, `dashboard-loads`, `drivers-crud`, `assign-ride`, `queue-realtime`, `sos-flow`, `shortcuts`, `multi-monitor`.
- E2E vars: `E2E_BASE_URL`, `TEST_ADMIN_*`, `TEST_DISPATCHER_*`, `TEST_PASSENGER_*`.

#### Configuración

- **`next.config.ts`:** CSP estricta (Sentry/PostHog/Mapbox/MapLibre/Supabase wss), `transpilePackages: ['@remis/shared-types']`, `optimizePackageImports`, `withSentryConfig`.
- **`build`:** `NODE_OPTIONS=--max-old-space-size=4096` (sticky para evitar OOM en Vercel).
- **Sentry replay:** `maskAllText`, `maskAllInputs`, `blockAllMedia` + unmask via `[data-sentry-unmask]`.
- **PostHog:** `disable_session_recording: true` (admin tiene PII en DOM).

### 5.2 `apps/web` (port 3002)

**Landing pública + admin owner.**

- **Stack:** Next.js 15.2.4 + React 19 + Tailwind 4 + Framer Motion 12 + Radix UI + RHF + Zod + Vercel Analytics.
- **Rutas marketing (`(marketing)`):** `/`, `/tarifas`, `/conductores`, `/faq`, `/contacto` — **funcionales, ~85% completas**.
- **Rutas legales:** `/legal/privacidad`, `/legal/terminos`.
- **Rutas admin (esqueleto):** `/admin/login`, `/admin` (dashboard), `/admin/conductores`, `/admin/flota`, `/admin/reportes`, `/admin/slo`, `/admin/heartbeat-monitor`, `/admin/audit` — la mayoría son páginas creadas pero sin contenido.
- **SEO:** `sitemap.ts` dinámico, `robots.ts` (Disallow /admin, /api), Schema FAQPage JSON-LD, OG locale `es_AR`, fuentes Inter + Inter Tight.
- **Pendiente:** placeholders `[PUEBLO]`, teléfono `(0000) 000-0000`, email genérico, `og.png` no subido.
- **Design system:** CSS vars en `globals.css` (paleta `#1B2A4E` / `#D97706` + neutrales + semánticos + radii + motion), dark mode preparado.

---

## 6. Packages compartidos

### 6.1 `packages/design-system`

**Estado:** dual (web maduro / Flutter stubs).

- **Web:** `tokens.json` compilado con Style Dictionary → `tokens.ts` + `tailwind-preset.ts`. Helpers tipados `getDriverStatusColor()`, `getRideStatusBadge()`. Exports modulares (`.`, `./tailwind`, `./css`).
- **Flutter:** `tokens/{colors,spacing,typography}.dart` + `theme/app_theme.dart` listos. Widgets (`RButton`, `RCard`, `RInput`, `RBadge`, `RDivider`, `RAppBar`, `RSkeleton`) son **stubs** (`SizedBox.shrink()`) — pendiente implementación.

### 6.2 `packages/flutter-core`

**Estado:** maduro. (Detalle en sección 4.4.)

### 6.3 `packages/shared-types`

**Estado:** funcional. Genera `database.ts` con `pnpm supabase:types` (project id `kmdnsxbpzidpkinlablf`). Expone `Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>`, `Enums<T>` y aliases de dominio: `UserRole`, `DriverStatus`, `RideStatus`, `PaymentStatus`, `PaymentMethod`, `VehicleType`, `KycStatus`, `DocumentType`. Consumido por dispatcher (transpilado por Next.js).

---

## 7. CI/CD y operaciones

### 7.1 Workflows GitHub Actions (9)

| Workflow | Trigger | Función |
|---|---|---|
| `lint.yml` | push/PR a main/staging | Prettier + ESLint (JS), `flutter analyze` (driver+passenger), Deno lint+format (Edge Functions) |
| `typecheck.yml` | push/PR | `tsc --noEmit` workspace-wide |
| `test.yml` | push/PR | `pnpm -r test` con Supabase local, Flutter test, Playwright E2E (artifact en fallo), pgTAP |
| `deploy-web.yml` | push main/staging + cambios web | Vercel pull → build → deploy (dispatcher + web en paralelo) |
| `deploy-mobile.yml` | manual | Fastlane Android (keystore base64) + iOS (MATCH + App Store Connect API) por app y track |
| `deploy-supabase.yml` | push main/staging + cambios `supabase/**` | `supabase db push` + deploy de las 17 Edge Functions (mp-webhook y health con `--no-verify-jwt`) |
| `build-demo-apk.yml` | manual | APK de demo (driver/passenger/both) |
| `nightly.yml` | cron 3am UTC | E2E dispatcher + integration tests Flutter (tag `e2e`) + golden tests driver |
| `release.yml` | push main | `release-please-action@v4` + `bump-mobile-version.sh` post-release |

### 7.2 Despliegue

- **Web:** Vercel (production en main, preview en staging). Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_DISPATCHER`, `VERCEL_PROJECT_ID_WEB`.
- **Mobile:** Fastlane → Play Store (Android) + TestFlight/App Store (iOS). Tracks `internal`/`beta`/`production`.
- **Supabase:** CLI v1, project id `kmdnsxbpzidpkinlablf`. Secrets edge function: `FCM_SERVICE_ACCOUNT_JSON`, `MP_WEBHOOK_SECRET`, `MP_ACCESS_TOKEN`, `TWILIO_*`, `DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET`, `AWS_REKOGNITION_ROLE_ARN`.

### 7.3 Convenciones

- **Branches:** `main` (única local). Regla del proyecto: **nada de branches/worktrees**, todo a main + push directo.
- **Commits:** Conventional Commits en inglés.
- **Scripts útiles:** `pnpm env:sync`, `pnpm env:check`, `pnpm supabase:types`, `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format`.
- **Mobile run:** `flutter run -d <device> --dart-define-from-file=env/dev.json` (ver `COMANDOS.md`).

---

## 8. Documentación y planificación

### 8.1 Plan maestro (`docs/plan_maestro_trayectoria/`)

**6 tandas secuenciales, 21 prompts totales, paralelizables ~90% intra-tanda:**

| Tanda | Nombre | Prompts | Estado |
|---|---|---|---|
| 0 | Fundación monorepo | 1 | **Completa** |
| 1 | Backend + Design System | 4 (1A schema, 1B design, 1C compliance, 1D brand) | **1A, 1D OK; 1B, 1C sin verificar** |
| 2 | Skeletons apps | 4 (driver, passenger, dispatcher, web) | **2A, 2B completas; 2C, 2D pendientes** |
| 3 | Core features | 4 (driver core, passenger core, dispatcher core, edge functions) | EN CURSO |
| 4 | Premium polish | 4 (driver, passenger, dispatcher, MP integration) | pendiente |
| 5 | Producción | 4 (observability, CI/CD, testing, security/KYC) | pendiente |

**Documentos clave:**
- `00_arquitectura.md`: decisiones de Realtime (Broadcast vs Postgres Changes), PostGIS (`geography(Point,4326)` con GIST + `<->` operator), background location (Transistorsoft Starter), MercadoPago (Custom Tabs, no WebView), compliance (Ley Pcial. 987 + AAIP RNBD + retención 5/10 años + KYC Didit+AWS), schema base (22+ tablas, RLS universal, RPCs).
- `00_design_language.md`: **"Premium Pampeano"** — paleta `#1B2A4E` (primary) + `#D97706` (accent ámbar quemado, solo 1 elemento por pantalla) + neutrales 11 pasos + estados conductor 7 colores. Tipografía Inter Tight (display) + Inter (UI) + Geist Mono (numeric). Espaciado 4px base, radii sm-2xl, motion ease-out 150-360ms, dark mode default en dispatcher. Voseo rioplatense, sin admiraciones excepto SOS.
- `00_file_ownership_matrix.md`: matriz de qué archivos puede tocar cada prompt para evitar conflictos.

### 8.2 Plan admin-prod (`docs/prompts-admin-prod/`)

**12 prompts de pulido pre-demo (~20h secuencial / ~9.5h paralelizado en 5 tandas):**

| # | Prompt | Estado |
|---|---|---|
| 00 | purgar-placeholders | ✅ commit `6dfd854` |
| 01 | error-loading-not-found | ✅ commit `b616598` |
| 02 | robustez-validacion | ✅ commit `c3ee1a5` (lib/validation, postgrest-safe, .maybeSingle, env safe) |
| 03 | export-csv-real | ✅ commit `70b77e9` (UTF-8 BOM, chunks, max 10k) |
| 04 | team-invite-real | EN CURSO (working tree con Edge Function + migraciones sin commit) |
| 05 | password-2fa | ✅ commit `87c8f3a` (RHF+Zod, strength meter, re-auth, MFA TOTP enroll/challenge/unenroll) |
| 06 | dashboard-period-clickable | sin verificar |
| 07 | rides-detalle-completo | ✅ commit `1e0a0d6` (reasignar, shared trip, mensajes realtime) |
| 08 | sos-mapa-acciones | sin verificar |
| 09 | paginacion-perf-build | ✅ commit `c67ad6e` (server-side range/count, sticky NODE_OPTIONS) |
| 10 | security-pii-observability | ✅ commit `abc7c1a` (Sentry mask, PostHog disable, middleware) |
| 11 | shared-trip-mapa | ✅ commit `1f46df6` (MapLibre fullscreen + realtime + ETA haversine) |
| 12 | polish-final-a11y | ✅ commit `67bfe85` (axe-core suite, useConfirm, focus-visible, KYC empty states, feature-flags real, audit verify) |

### 8.3 Otros docs

- **`docs/legal/` (9 docs):** `privacy_policy`, `terms`, `aaip_registration`, `municipal_compliance`, `data_retention`, `incident_response`, `consent_flows`, `dpa_template`, `sos_protocol` — **borradores**, requieren revisión legal La Pampa antes de lanzamiento.
- **`docs/brand/`:** `voice_tone`, `logo_brief`, `naming` (placeholder `[NOMBRE]` pendiente decisión cliente), `visual_narrative`, `copy_library`, `social_landing_brief`.
- **`docs/operations/`:** `release_process`, `secrets_management`, `launch_checklist`, `runbook`.
- **`docs/security/`:** `threat_model`, `pentest_checklist`, `responsible_disclosure`.
- **`docs/seeds/demo-seed.sql`:** 159 viajes, 18 conductores, 41 pasajeros (datos de demo).

---

## 9. Decisiones pendientes y deuda visible

### 9.1 Bloqueantes de cliente
- **Nombre comercial de la app:** placeholder `[NOMBRE]` en todo el material. Sin esto no avanzan logo final ni stores.
- **Datos de contacto reales** en landing (`apps/web`): teléfono `(0000) 000-0000`, email `info@remis.com.ar`, dirección `[Calle] 000`, número de habilitación `N° XXX`.
- **`og.png`** no subido a `apps/web/public`.

### 9.2 Compliance pendiente
- Revisión legal La Pampa de los 9 documentos en `docs/legal/`.
- Tramitación AAIP RNBD antes de producción.
- Implementación de flujos de consentimiento en passenger (copys ya están en `consent_flows.md`).

### 9.3 Tareas técnicas pendientes
- **Tanda 1B/1C:** completar design system Flutter (widgets son stubs) + compliance copies en apps.
- **Tanda 2C/2D:** completar dispatcher despacho live (`/rides`, `/drivers`, `/reports` siguen placeholders) y web admin owner (esqueletos vacíos).
- **Tanda 3-5:** features core mobile + premium polish + producción (observability, CI/CD, testing, security/KYC).
- **Driver background location:** integrar `flutter_background_geolocation` (Transistorsoft Starter, USD 399) en Tanda 3A.
- **FCM driver:** configurar `flutterfire`, agregar `google-services.json` / `GoogleService-Info.plist`, handlers foreground/background.
- **MercadoPago:** webhook implementado, falta extremo Tanda 4D (link real con `mp-create-preference` + Custom Tabs).
- **Twilio masked calling:** Edge Functions creadas, integración pendiente.
- **Migración pendiente sin aplicar:** `supabase/migrations/20260430000004_log_security_event_rpc.sql` (Manuel debe correr `supabase db push`).
- **Side fix conocido:** `apps/dispatcher/src/app/global-error.tsx:118` tiene `<a>` en lugar de `<Link>` (lint pre-existente, no bloquea typecheck).
- **Working tree dirty:** `apps/dispatcher/src/components/admin/dashboard/top-drivers.tsx`, `turbo.json` modificados sin commitear.

### 9.4 Oportunidades de mejora DevOps
- Husky + lint-staged para feedback pre-commit local (hoy todo va a CI).
- Turbo cache remoto para acelerar rebuilds en CI.
- Coverage reports en CI (Jest/Vitest).
- Vercel deploy previews per-PR (hoy solo deploy en main/staging).

---

## 10. Métricas finales

| Métrica | Valor |
|---|---|
| **Apps activas** | 4 (driver, passenger, dispatcher, web) |
| **Packages compartidos** | 3 (design-system, flutter-core, shared-types) |
| **Migraciones Supabase** | 35 |
| **Edge Functions** | 17 |
| **Tablas DB** | ~22 core + auxiliares |
| **RLS policies** | 50+ |
| **RPCs** | 17+ |
| **Páginas admin completas** | 16 |
| **Workflows CI/CD** | 9 |
| **Suites Playwright** | 10+ |
| **Commits** | 176 en 4 días |
| **Tamaño repo** | ~7.6 GB (con node_modules) |
| **Autor principal** | manu-180 (175 commits) |

---

**Conclusión:** `remis_app` es un monorepo **maduro y bien arquitecturado** para una operación de remisería single-tenant. El backend Supabase, el dispatcher admin y la landing están en estado avanzado o de pulido final. Las apps Flutter tienen el lifecycle core implementado pero requieren las tandas 3-5 (background location, FCM, MercadoPago final, observability, testing y security/KYC) para llegar a producción. Los principales bloqueantes son **decisiones de cliente** (nombre comercial, datos de contacto reales) y **revisión legal** de los documentos de compliance.
