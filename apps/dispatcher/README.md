# dispatcher — Panel Admin + Despacho Live

Aplicación Next.js para el panel de administración y despacho en tiempo real.

## Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **UI**: Tailwind CSS v4 + tokens en `src/app/globals.css`
- **Estado**: Zustand
- **Backend**: Supabase (Postgres + PostGIS + Realtime + Auth + Edge Functions)
- **Mapas**: MapLibre GL JS (web), Google Maps (mobile)
- **Observabilidad**: Sentry + PostHog (con masking de PII en admin)

## Desarrollo

### Requisitos

- Node.js 20+
- pnpm 9+

### Configuración inicial

Variables de entorno en la raíz del monorepo. Sincronizar derivados:

```bash
# Desde la raíz del monorepo
pnpm env:sync
```

El archivo `apps/dispatcher/.env.local` se genera automáticamente con las variables `NEXT_PUBLIC_SUPABASE_*` y demás secrets.

### Correr en desarrollo

```bash
# Desde la raíz del monorepo
pnpm dev

# O sólo dispatcher
pnpm --filter dispatcher dev
```

La app corre en **http://localhost:3001**.

### Seed de demo

Para una demo realista (12 conductores, 50+ viajes, KYC pendientes, pagos, SOS, etc.) usar el seed dedicado:

```bash
# Aplicar seed contra la DB local de Supabase
psql "$DATABASE_URL" -f docs/seeds/demo-seed.sql
```

Para más detalles ver [docs/seeds/demo-seed.sql](../../docs/seeds/demo-seed.sql).

### Credenciales de demo

| Rol | Email | Password |
|-----|-------|----------|
| Admin | `admin@demo.local` | `demo1234` |
| Dispatcher | `dispatcher@demo.local` | `demo1234` |

> Cambiar las contraseñas antes de cualquier ambiente compartido. Las credenciales reales del cliente nunca van al repo.

## Páginas implementadas

| URL | Descripción | Estado |
|-----|-------------|--------|
| `/admin` | Dashboard con KPIs, heatmap y períodos clickeables | ✅ |
| `/admin/drivers` | Lista de conductores con filtros + CSV | ✅ |
| `/admin/drivers/[id]` | Perfil detallado: docs, KYC, viajes, suspender | ✅ |
| `/admin/rides` | Lista y búsqueda de viajes + KPIs | ✅ |
| `/admin/rides/[id]` | Detalle: reasignar, compartir, mensajes, mapa | ✅ |
| `/admin/sos` | Mapa con activos en realtime + acciones | ✅ |
| `/admin/sos/[id]` | Detalle de alerta con resolución | ✅ |
| `/admin/passengers` | Gestión de pasajeros + CSV | ✅ |
| `/admin/payments` | Pagos + webhooks MP + refund (simulado) | ✅ |
| `/admin/zones` | Editor de zonas tarifarias (MapLibre) | ✅ |
| `/admin/fares` | Matriz de tarifas y simulador | ✅ |
| `/admin/kyc` | Cola de revisión KYC con aprobación inline | ✅ |
| `/admin/feature-flags` | Toggle, búsqueda, filtro, crear nuevo flag | ✅ |
| `/admin/audit` | Audit log + verificación de hash chain on-demand | ✅ |
| `/admin/team` | Gestión equipo admin/dispatcher + invite real | ✅ |
| `/admin/settings` | Cuenta, password, 2FA TOTP, organización | ✅ |
| `/shared/[token]` | Vista pública de viaje compartido (sin auth) | ✅ |

## Tests

```bash
# Todos los E2E (Playwright)
pnpm --filter dispatcher test:e2e

# UI interactiva
pnpm --filter dispatcher test:e2e:ui

# Sólo a11y (axe-core)
pnpm --filter dispatcher test:e2e a11y

# Type check + lint
pnpm --filter dispatcher typecheck
pnpm --filter dispatcher lint
```

Los tests viven en [tests/e2e/](tests/e2e/). El test de a11y (`a11y.spec.ts`) corre axe-core sobre cada página del admin y falla si aparece alguna violación con `impact: critical`.

### Variables E2E

| Variable | Descripción |
|----------|-------------|
| `E2E_BASE_URL` | Default `http://localhost:3001` |
| `TEST_ADMIN_EMAIL` | Email de un usuario admin (default `admin@test.com`) |
| `TEST_ADMIN_PASSWORD` | Password del admin (default `test123456`) |

## Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Cmd/Ctrl + K` | Abrir paleta de comandos |
| `?` | Mostrar ayuda de atajos |
| `/` | Enfocar búsqueda (en páginas con FilterBar) |
| `N` | Nuevo registro (en páginas de lista) |
| `Esc` | Cerrar modal/drawer |

## Arquitectura

- **Auth & rol**: `requireRole()` de `@/lib/auth/require-role` corre en server components.
- **Segmentos**:
  - `(auth)` para login,
  - `(dashboard)` para dispatch live,
  - `(admin)` para panel administrativo.
- **Confirms destructivos**: `useConfirm()` de `@/components/admin/confirm-dialog`.
- **Datos**: `useSupabaseQuery` (lectura paginada + refetch) y `useExportCsv` (CSV en chunks).
- **Realtime**: `useRealtimeTable` para refrescar listas ante cambios en DB.
- **Observabilidad**: Sentry replay con masking total + PostHog con session recording deshabilitado en admin.

Tipos Supabase: `import type { Database } from '@remis/shared-types/database'`.
