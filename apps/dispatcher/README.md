# dispatcher — Panel Admin + Despacho Live

Aplicación Next.js para el panel de administración y despacho en tiempo real de RemisDespacho.

## Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui components
- **Estado**: Zustand
- **Backend**: Supabase (PostgreSQL + Realtime + Auth + Storage)
- **Mapas**: MapLibre GL JS via react-map-gl v8

## Desarrollo

### Requisitos
- Node.js 20+
- pnpm 9+

### Configuración inicial

1. Copiar variables de entorno desde la raíz del monorepo:
   ```bash
   # Desde la raíz del monorepo
   pnpm env:sync
   ```

2. El archivo `.env.local` en `apps/dispatcher/` se genera automáticamente con:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Correr en desarrollo

```bash
# Desde la raíz del monorepo
pnpm dev

# O desde apps/dispatcher
pnpm dev
```

La app corre en **http://localhost:3001**

## Crear usuario admin (SQL)

Ejecutar en Supabase SQL Editor:

```sql
-- 1. Crear usuario en Auth (desde Supabase Dashboard → Auth → Users → Invite user)

-- 2. Asignar rol admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'tu@email.com';
```

## Páginas del admin

| URL | Descripción |
|-----|-------------|
| `/admin` | Dashboard con KPIs y heatmap |
| `/admin/drivers` | Gestión de conductores |
| `/admin/drivers/[id]` | Perfil detallado de conductor |
| `/admin/rides` | Lista y búsqueda de viajes |
| `/admin/rides/[id]` | Detalle de viaje con mapa de ruta |
| `/admin/sos` | Alertas SOS activas |
| `/admin/sos/[id]` | Detalle de alerta SOS |
| `/admin/passengers` | Gestión de pasajeros |
| `/admin/payments` | Pagos y webhooks MercadoPago |
| `/admin/zones` | Editor de zonas tarifarias (MapLibre) |
| `/admin/fares` | Matriz de tarifas y simulador |
| `/admin/kyc` | Cola de revisión KYC |
| `/admin/feature-flags` | Activar/desactivar features |
| `/admin/audit` | Audit log con hash chain |
| `/admin/team` | Gestión de equipo admin/dispatcher |
| `/admin/settings` | Configuración de la organización |
| `/shared/[token]` | Vista pública de viaje compartido (sin auth) |

## Tests

```bash
# E2E con Playwright
pnpm test:e2e

# Con UI interactiva
pnpm exec playwright test --ui
```

Los tests viven en `apps/dispatcher/e2e/`.

## Variables de entorno requeridas

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key pública de Supabase |

## Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Cmd/Ctrl + K` | Abrir paleta de comandos |
| `?` | Mostrar ayuda de atajos |
| `/` | Enfocar búsqueda (en páginas con FilterBar) |
| `N` | Nuevo registro (en páginas de lista) |
| `Esc` | Cerrar modal/drawer |
