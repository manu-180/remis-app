# Plan de construcción — Admin Web Premium (RemisDespacho)

> Esta carpeta contiene **12 prompts secuenciales** para construir el admin web completo de la remisería.
> Cada archivo está pensado para ejecutarse en **una sesión nueva de Claude Code**, sin necesidad de contexto previo.

---

## Cómo usar esto

1. Abrí una sesión nueva de Claude Code en este repo.
2. Pegá el contenido de `00-foundation.md` (o el siguiente en orden).
3. Dejá que Claude trabaje. Al final, hacés `git add . && git commit -m "..." && git push`.
4. Cerrá la sesión, abrís otra, y vas con el siguiente prompt.
5. **No saltees pasos.** Cada prompt asume que los anteriores ya están mergeados en `main`.

---

## Filosofía

- **Un solo admin web** en `apps/dispatcher` (Next.js 15 + React 19 + Tailwind v4 + Supabase SSR).
- **Dispatcher live** y **admin** conviven con dos layouts distintos pero comparten primitives, stores y supabase clients.
- **Premium en cada detalle**: glass panels, micro-motion, focus rings dorados, skeletons con shimmer, status pills pulsantes, tabular-nums, page transitions, undo toasts.
- **Datos reales desde el día 1**: cero mocks pasada la fase 0. Todo contra Supabase via RLS.
- **Sin worktrees, sin branches** — todo a `main` (regla del proyecto).

---

## Mapa de prompts

| # | Archivo | Sesión enfoca | Sale con |
|---|---------|---------------|----------|
| 00 | [00-foundation.md](./00-foundation.md) | Tipos generados, env, segmento `(admin)`, guards, fix del 431, layouts vacíos | Routing y auth listos |
| 01 | [01-design-system.md](./01-design-system.md) | Tokens premium ampliados + 14 primitives nuevos + showcase | Component library completa |
| 02 | [02-app-shell.md](./02-app-shell.md) | Sidebar + TopBar + breadcrumbs + page transitions + theme toggle | Shell del admin perfecto |
| 03 | [03-data-engine.md](./03-data-engine.md) | DataTable (TanStack), Drawer, Form primitives, hooks utilitarios | Motor para todas las páginas |
| 04 | [04-dashboard.md](./04-dashboard.md) | KPIs, sparklines, mapa heatmap, actividad reciente, top conductores | Dashboard ejecutivo |
| 05 | [05-drivers.md](./05-drivers.md) | Lista + perfil tabbed + alta/edición wizard | Gestión de conductores |
| 06 | [06-rides.md](./06-rides.md) | Histórico + detalle con timeline + mapa de ruta + acciones | Gestión de viajes |
| 07 | [07-live-dispatch.md](./07-live-dispatch.md) | Conectar AppShell existente con Supabase realtime + RPCs | Despacho en vivo funcional |
| 08 | [08-sos-center.md](./08-sos-center.md) | Centro SOS con eventos pulsantes + snapshot completo + resolución | Operación crítica |
| 09 | [09-zones-fares.md](./09-zones-fares.md) | Editor de zonas (polígonos en mapa) + matriz de tarifas + simulador | Configuración de pricing |
| 10 | [10-passengers-payments.md](./10-passengers-payments.md) | Pasajeros + payments + KYC review + feature flags | Operaciones secundarias |
| 11 | [11-polish.md](./11-polish.md) | Command palette global, empty states ilustrados, perf, tests clave | Pulido final |

---

## Stack confirmado

- **Frontend**: Next.js 15 (App Router, Turbopack), React 19, TypeScript estricto
- **Estilos**: Tailwind CSS v4 (CSS-first con `@theme`), tokens en `apps/dispatcher/src/app/globals.css`
- **Componentes**: primitives custom estilo shadcn (no shadcn directo), Radix UI para a11y, Lucide para iconos
- **Estado**: Zustand (stores ya creados: rides/drivers/ui)
- **Datos**: Supabase SSR (`@supabase/ssr`), realtime via channels, RPCs Postgres
- **Mapa**: MapLibre GL + react-map-gl
- **Tablas**: TanStack Table v8 + TanStack Virtual
- **Forms**: react-hook-form + zod
- **Observability**: Sentry + PostHog
- **Hotkeys**: react-hotkeys-hook

---

## Schema Supabase relevante (proyecto `kmdnsxbpzidpkinlablf` / `remis-app`)

### Tablas principales

| Tabla | Propósito | RLS clave |
|-------|-----------|-----------|
| `profiles` | Auth users + role (passenger/driver/dispatcher/admin) | Self + staff |
| `drivers` | Estado, vehículo, rating, total_rides | `is_dispatcher_or_admin()` |
| `vehicles` | Patente, marca/modelo, tipo, activo | Admin write |
| `passengers` | Blacklist, no_shows, notas | `is_dispatcher_or_admin()` |
| `rides` | 10 estados, payment, fare, location, zones | `is_dispatcher_or_admin()` |
| `ride_events` | Timeline de cambios de estado | Involved + staff |
| `payments` | cash / mp_checkout / account, status | Staff |
| `tariff_zones` | 4 zonas con polígonos PostGIS | Admin write |
| `fares` | Matriz origen→destino, recargo nocturno | Admin write |
| `kyc_verifications` | didit / aws_rekognition, score | Admin |
| `driver_documents` | LUC D1, VTV, seguros, etc. | Staff |
| `sos_events` | Panic button con snapshot completo | Staff |
| `notifications` | FCM | Self |
| `messages` | Chat ride pasajero-driver | Involved |
| `audit_log` | Hash chain | Admin |
| `feature_flags` | 6 flags ya creados | Admin write |
| `ride_ratings` | 1-5 estrellas + comentario | — |
| `driver_current_location` | GPS live | Staff + assigned passenger |
| `driver_location_history` | Particionada por mes | Staff |

### RPCs disponibles

| Función | Firma | Para |
|---------|-------|------|
| `assign_ride` | `(ride_id, driver_id, dispatcher_id)` | Asignar viaje |
| `cancel_ride` | `(ride_id, actor_id, reason)` | Cancelar viaje |
| `start_trip` | `(ride_id, driver_id)` | Iniciar viaje |
| `end_trip` | `(ride_id, driver_id, fare, distance)` | Terminar viaje |
| `driver_arrived_pickup` | `(ride_id, driver_id)` | Conductor llegó |
| `find_nearest_available_drivers` | `(lat, lng, max_m, limit, vehicle_type)` | Sugerir choferes cercanos |
| `estimate_fare` | `(pickup_lat, pickup_lng, dest_lat, dest_lng, at_time)` | Calcular tarifa |
| `get_shift_summary` | `(driver_id)` | Resumen de turno |
| `create_shared_trip` | `(ride_id, user_id)` | Link público |
| `is_admin()` / `is_dispatcher_or_admin()` / `current_user_role()` | — | Helpers RLS |

### Edge functions

- `kyc-create-session` (verify_jwt: true)
- `driver-heartbeat` (verify_jwt: true)

### Feature flags actuales

- `auto_dispatch_enabled` (off)
- `caller_id_enabled` (off)
- `kyc_strict_mode` (off)
- `masked_calling_enabled` (off)
- `mp_payment_enabled` (off)
- `trip_share_enabled` (on)

---

## Reglas de oro para todas las sesiones

1. **NO crear branches ni worktrees.** Trabajar en `main` directo.
2. **NO sugerir alternativas tecnológicas** a Supabase / Next.js / Tailwind v4.
3. **Usar el MCP de Supabase** (`mcp__70d9e470-49b9-42e9-8795-0e7b7617562a__*`) cuando se necesite consultar schema, ejecutar SQL o aplicar migraciones. Project ID: `kmdnsxbpzidpkinlablf`.
4. **No mockear datos** después de la fase 0. Si una tabla está vacía, seedearla con SQL via MCP y dejar comentario en `docs/seeds/`.
5. **Premium siempre**: si el componente no se ve premium, no está terminado. Animaciones <240ms, focus rings dorados, glass donde corresponda, tabular-nums para números, microcopy en español rioplatense.
6. **Accesibilidad obligatoria**: foco visible, ARIA roles, contraste AA mínimo, teclado navegable, `prefers-reduced-motion` respetado.
7. **Type safety obligatorio**: nada de `any` sin justificar; usar tipos de `@remis/shared-types/database` para todo lo de Supabase.
8. **Antes de terminar la sesión**: `pnpm typecheck` y `pnpm lint` en `apps/dispatcher` deben pasar limpios.
9. **Commit final**: mensaje convencional (`feat(admin): ...`, `feat(dispatcher): ...`, `chore(design-system): ...`) y `git push`.

---

## Dudas frecuentes

**¿Por qué Tailwind v4 sin `tailwind.config.ts`?**
Tailwind v4 con `@import "tailwindcss"` y tokens vía CSS variables ya está configurado. No tocar. Toda la paleta vive en `globals.css` y se consume con `var(--token)` o utilities de Tailwind.

**¿Dónde van los nuevos componentes UI?**
`apps/dispatcher/src/components/ui/` para primitives, `apps/dispatcher/src/components/admin/` para componentes de dominio admin, `apps/dispatcher/src/components/shared/` para los que usan ambos layouts.

**¿Y el design-system package?**
Por ahora todo nuevo va en `apps/dispatcher`. Si en el futuro hay que reutilizar en otra app web, se mueve a `packages/design-system/web/` (no existe aún). No se mueve nada en estos prompts.

---

## Verificación final (cuando los 12 estén hechos)

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint && pnpm build
pnpm dev   # abrir http://localhost:3001
```

Login con un user que tenga `role = 'admin'` en `profiles` → tiene que ir a `/admin` (dashboard) con todos los menús accesibles.
Login con `role = 'dispatcher'` → tiene que ir a `/` (dispatch live).
