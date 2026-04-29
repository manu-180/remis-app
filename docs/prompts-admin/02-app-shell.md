# Sesión 02 — App Shell del admin: Sidebar, TopBar, transiciones

> **Antes de empezar**: leé `docs/prompts-admin/README.md` y `apps/dispatcher/CLAUDE.md`.
> **Sesiones previas**: 00 (foundation), 01 (design system).

---

## Objetivo

Construir el shell completo del admin: un sidebar premium colapsable con navegación jerárquica, una topbar con breadcrumbs / búsqueda global / perfil / theme toggle, transiciones de página suaves, y soporte responsive básico (sidebar drawer en mobile). Al final de esta sesión todas las páginas placeholder del admin tienen que verse profesionales.

---

## Contexto

- Segmento `(admin)` ya existe con `layout.tsx` que usa `requireRole(['admin'])`. Hoy renderiza solo `{children}`.
- Páginas placeholder ya creadas: `/admin`, `/admin/drivers`, `/admin/rides`, `/admin/sos`, `/admin/zones`, `/admin/fares`, `/admin/passengers`, `/admin/payments`, `/admin/kyc`, `/admin/feature-flags`, `/admin/audit`, `/admin/team`, `/admin/settings`.
- Primitives ampliados disponibles: `Card`, `Stat`, `Skeleton`, `Drawer`, `Toast`, `EmptyState`, `Switch`, `Select`, `Combobox`, `Textarea`, `Field`, `Pagination`, `Breadcrumbs`, `StatusPill`, `Tooltip`, `Tabs`, etc.

---

## Entregables

### 1. Layout admin completo

Reescribir `apps/dispatcher/src/app/(admin)/layout.tsx`:

```tsx
import { requireRole } from '@/lib/auth/require-role';
import { AdminShell } from '@/components/admin/admin-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(['admin']);
  return <AdminShell profile={profile}>{children}</AdminShell>;
}
```

### 2. `AdminShell` — composición principal

Crear `apps/dispatcher/src/components/admin/admin-shell.tsx`:

- Grid `[sidebar 264px] [main 1fr]` en desktop. Sidebar colapsable a 72px.
- En mobile (`< 1024px`): sidebar oculto, abre como Drawer.
- Estado de "colapsado" persistido en `localStorage` con key `admin:sidebar-collapsed`.
- TopBar fija arriba (height 64px) con `sticky top-0 z-30`, background glass.
- Main area con `<PageTransition>` wrapping children.

Estructura JSX:

```tsx
<div className="min-h-screen bg-[var(--neutral-50)]" data-density="comfortable">
  <Sidebar collapsed={collapsed} onToggle={...} />
  <div className="flex flex-col" style={{ marginLeft: collapsed ? 72 : 264 }}>
    <TopBar profile={profile} breadcrumbs={breadcrumbs} />
    <main className="flex-1">
      <PageTransition>{children}</PageTransition>
    </main>
  </div>
  <CommandPalette /> {/* placeholder, expand en sesión 11 */}
</div>
```

### 3. `Sidebar` premium

Crear `apps/dispatcher/src/components/admin/sidebar.tsx`. Especificaciones:

#### Estructura

- Logo "RemisDespacho" arriba: en expandido muestra texto + icono, en colapsado solo icono. Onclick → `/admin`.
- Botón de colapsar/expandir en la parte inferior con icono `PanelLeft`.
- Secciones con divider sutil:
  - **Operación**: Dashboard (`/admin`), Despacho live (`/`), SOS (`/admin/sos` con badge si hay activos)
  - **Datos**: Viajes (`/admin/rides`), Conductores (`/admin/drivers`), Pasajeros (`/admin/passengers`), Pagos (`/admin/payments`)
  - **Configuración**: Zonas (`/admin/zones`), Tarifas (`/admin/fares`), KYC (`/admin/kyc`), Feature flags (`/admin/feature-flags`), Equipo (`/admin/team`), Settings (`/admin/settings`)
  - **Auditoría**: Audit log (`/admin/audit`)

#### Item de navegación

Component `NavItem`:
- Hover: `bg-[var(--neutral-100)]`
- Active (URL match): `bg-[var(--brand-primary)] text-white` con left border 3px `var(--brand-accent)`
- Icon 18px lucide a la izquierda, label, badge opcional a la derecha
- En modo colapsado: solo icon, tooltip `<Tooltip side="right">` con el label
- Transition: `duration-150 ease-out`
- Focus ring dorado

#### Badges

`SOS` muestra un badge rojo pulsante con count si `count > 0`. Hacer query realtime a `sos_events` con `resolved_at IS NULL` (suscripción `useSosCount` hook).

```ts
// hooks/use-sos-count.ts
export function useSosCount() {
  // count de sos_events.resolved_at IS NULL + listen channel postgres_changes
  // retorna número en tiempo real
}
```

`Despacho live` muestra count de `rides` con status `requested` (en `rides_store`).

#### Active state via `usePathname`

Usar `usePathname()` de `next/navigation`. Match exacto para `/admin`, prefix match para nested.

### 4. `TopBar` premium

Crear `apps/dispatcher/src/components/admin/top-bar.tsx`. Especificaciones:

- Background `glass`, `border-b border-[var(--glass-border)]`.
- Layout flex: `[breadcrumbs ........ search profile theme]`.
- Breadcrumbs auto-generados desde `usePathname()` con map a labels en español. Ej: `/admin/drivers/abc123` → `Admin / Conductores / abc123`.
- Buscador con `Cmd+K` shortcut visible (placeholder "Buscar… ⌘K"). Al click o `Cmd+K` abre el `CommandPalette`.
- Avatar del admin (con initials fallback si no hay `avatar_url`). Click abre `DropdownMenu` con: "Mi cuenta", "Configuración", separator, "Cerrar sesión" (rojo).
- Theme toggle: Sun/Moon icon, click toggle entre `light` / `dark` y persiste en `localStorage` como `theme`. Al montar lee del storage y aplica a `document.documentElement.dataset.theme`.

> Verificar que los hooks de tema no causen flash de tema incorrecto en SSR (usar `useEffect` para aplicar, default tema viene del HTML).

### 5. `PageTransition`

Crear `apps/dispatcher/src/components/admin/page-transition.tsx`:

```tsx
'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [key, setKey] = useState(pathname);
  useEffect(() => { setKey(pathname); }, [pathname]);
  return (
    <div key={key} className="animate-[fade-up_240ms_var(--ease-emphasized)]">
      {children}
    </div>
  );
}
```

Respetar `prefers-reduced-motion` (la regla global ya lo hace).

### 6. `CommandPalette` placeholder

Crear `apps/dispatcher/src/components/admin/command-palette.tsx` con scaffold básico:
- Trigger global `Cmd+K` / `Ctrl+K`.
- Modal con `Command` de `cmdk` y lista de acciones de navegación a cada `/admin/*`.
- Cada item tiene icono y label.
- Categorías: "Ir a", "Acciones rápidas" (placeholder por ahora).
- Estética: glass surface, animación scale-in suave.

> En sesión 11 se expanden las acciones (asignar viaje, crear conductor, etc.). Por ahora solo navegación.

### 7. Layout adjustments

Las páginas placeholder de la sesión 00 tienen `min-h-screen flex items-center justify-center`. **Quitar eso** ahora que viven dentro del shell. Cada página debe empezar con:

```tsx
<div className="space-y-6 p-6 lg:p-8">
  <header>
    <h1 className="text-2xl font-bold tracking-tight">{TITLE}</h1>
    <p className="text-sm text-[var(--neutral-500)]">{DESCRIPTION}</p>
  </header>
  <Card><CardContent className="py-12 text-center">En construcción</CardContent></Card>
</div>
```

Crear un componente `apps/dispatcher/src/components/admin/page-header.tsx` para reutilizar:

```tsx
<PageHeader title="Conductores" description="..." action={<Button>Nuevo</Button>} />
```

### 8. Theme toggle correcto

El sistema de density del dispatcher live usa `data-density` en `<html>`. El admin debería forzar `data-density="comfortable"` siempre (es un panel administrativo, no de operación rápida). Setear en `AdminShell` con `useEffect`.

Importante: cuando el usuario navega de `/admin/...` a `/` (dispatch live), restaurar density anterior. Usar un cleanup en el `useEffect`.

---

## Detalles premium imprescindibles

- **Sidebar collapse**: animación 200ms `var(--ease-emphasized)` con stagger de los labels (fade out primero, luego shrink).
- **Active item**: además del background, un dot dorado pequeño a la derecha si está activo.
- **Hover scale ligero** en avatar: `hover:scale-105 transition-transform duration-150`.
- **Search field** dentro de TopBar: en focus crece +20px de width con animación.
- **Theme toggle**: morfología sun→moon con `transition-transform rotate-180` o cross-fade entre dos icons.
- **Glass topbar**: `backdrop-filter: blur(var(--glass-blur))`. Verificar que se ve bien sobre fondos de mapas o tablas.
- **Mobile drawer**: usar el primitive `Drawer` de la sesión 01 (slide-in).
- **Logo**: si querés algo distintivo, podés crear un SVG inline simple (un rombo / iso con el color brand). No usar emoji.

---

## Validación

1. `pnpm typecheck`, `pnpm lint` limpios.
2. `pnpm dev` → `/admin`:
   - Sidebar visible, todos los links navegan
   - Active state funciona en cada ruta
   - Toggle collapse anima bien
   - Reload mantiene el estado collapsed
3. Resize a mobile (320px) → sidebar se esconde, hamburger aparece, drawer se abre con todos los items.
4. `Cmd+K` abre command palette. Type "drivers" → filtra. Enter → navega.
5. Breadcrumbs cambian al navegar entre rutas.
6. Theme toggle: light → dark sin flash, persiste reload.
7. Logout funciona.
8. Lighthouse a11y > 95 en `/admin`.

---

## No hacer

- ❌ Implementar lógica de páginas (es 04+)
- ❌ Conectar realtime a SOS/rides badges (sí mostrar el badge si está hardcodeado mock; conexión real va en sesión correspondiente — pero el hook `useSosCount` debe quedar funcional con count real de Supabase)
- ❌ Tocar el segmento `(dashboard)` (dispatch live)
- ❌ Construir DataTable (es sesión 03)

---

## Commit final

```bash
git add .
git commit -m "feat(admin): premium app shell with sidebar, topbar, page transitions"
git push
```
