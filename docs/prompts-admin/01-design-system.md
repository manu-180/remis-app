# Sesión 01 — Design System Premium: tokens ampliados + 14 primitives + showcase

> **Antes de empezar**: leé `docs/prompts-admin/README.md` y `apps/dispatcher/CLAUDE.md`.
> **Sesión anterior**: 00-foundation (segmento `(admin)` + guards listos).

---

## Objetivo

Llevar el sistema de diseño del dispatcher al **nivel premium real** que requiere el admin: ampliar tokens, agregar primitives faltantes, y crear una página interna de showcase para verificar visualmente todo. Esta sesión define el "lenguaje visual" del resto del proyecto. **Si esta sesión sale bien, todas las páginas que vienen después se ven impecables.**

---

## Contexto que ya existe

- `apps/dispatcher/src/app/globals.css` con tokens completos: brand, neutrals (light/dark), semantic, typography, spacing, radii, shadows, motion. Density modes (`comfortable` / `compact` / `dense`).
- Primitives ya construidos: `badge`, `button`, `dialog`, `input`, `scroll-area`, `separator`, `tabs`, `tooltip` en `apps/dispatcher/src/components/ui/`.
- Stack: Tailwind v4 (CSS-first, sin `tailwind.config.ts`). Radix UI disponible. Lucide para iconos. `class-variance-authority`, `clsx`, `tailwind-merge` instalados.

---

## Entregables

### Parte A — Ampliar tokens en `globals.css`

Agregar al bloque `:root` y al `[data-theme="dark"]`:

```css
/* Glass surfaces */
--glass-bg: rgba(255, 255, 255, 0.72);
--glass-border: rgba(15, 23, 42, 0.06);
--glass-blur: 12px;

/* Premium gradients */
--gradient-brand: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-hover) 100%);
--gradient-accent: linear-gradient(135deg, var(--brand-accent) 0%, var(--brand-accent-hover) 100%);
--gradient-surface: linear-gradient(180deg, var(--neutral-0) 0%, var(--neutral-50) 100%);
--gradient-glow: radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--brand-accent) 20%, transparent) 0%, transparent 70%);

/* Focus rings — brand-accent dorado */
--focus-ring: 0 0 0 3px color-mix(in oklab, var(--brand-accent) 35%, transparent);
--focus-ring-danger: 0 0 0 3px color-mix(in oklab, var(--danger) 35%, transparent);

/* Status pills */
--pill-online: color-mix(in oklab, var(--success) 12%, transparent);
--pill-busy: color-mix(in oklab, var(--warning) 14%, transparent);
--pill-offline: color-mix(in oklab, var(--neutral-500) 14%, transparent);
--pill-danger: color-mix(in oklab, var(--danger) 14%, transparent);

/* Motion choreography */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* Overshoot suave */
--ease-emphasized: cubic-bezier(0.2, 0, 0, 1);      /* Material 3 emphasized */

/* Shimmer skeleton */
--shimmer: linear-gradient(
  90deg,
  transparent 0%,
  color-mix(in oklab, var(--neutral-300) 35%, transparent) 50%,
  transparent 100%
);

/* Number / mono */
--font-numeric: 'Inter', ui-monospace, sans-serif;
```

En `[data-theme="dark"]` ajustar `--glass-bg: rgba(15, 17, 23, 0.65)` y `--glass-border: rgba(255, 255, 255, 0.06)`.

Agregar al final del archivo:

```css
@keyframes shimmer-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes pulse-soft {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.7; transform: scale(1.05); }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes stripe-flow {
  to { background-position: -2rem 0; }
}

.tabular { font-variant-numeric: tabular-nums; }

.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  border: 1px solid var(--glass-border);
}

.shimmer {
  position: relative;
  overflow: hidden;
  background: var(--neutral-100);
}
.shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--shimmer);
  animation: shimmer-slide 1.6s var(--ease-out) infinite;
}

.focus-ring:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
```

### Parte B — Helper `cn` (si no existe)

Verificar que `apps/dispatcher/src/lib/utils.ts` tenga:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

### Parte C — 14 primitives nuevos

Crear cada uno en `apps/dispatcher/src/components/ui/`. Todos deben:
- Aceptar `className` y mergear con `cn`
- Soportar `forwardRef` cuando aplica
- Usar `var(--token)` en lugar de hex
- Respetar `prefers-reduced-motion`
- Tener focus ring con `.focus-ring`
- Type-safe (sin `any`)

#### 1. `card.tsx`
- `<Card>` — surface principal con `border` `var(--neutral-200)`, `radius-lg`, `shadow-sm`, padding configurable (`size: 'sm' | 'md' | 'lg'`).
- Variantes con `cva`: `default`, `elevated` (shadow-md), `glass` (clase `.glass`), `accent` (left border 4px var(--brand-accent)).
- Sub-componentes: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.

#### 2. `stat.tsx`
- `<Stat label value delta? icon? trend?>` — KPI card.
- `value` con clase `tabular text-3xl font-bold tracking-tight`.
- `delta` con flecha (Lucide `TrendingUp/Down`) y color `success` o `danger`.
- Microanimación de count-up al montar (usar `requestAnimationFrame`, 600ms, `--ease-emphasized`).
- Soporta `loading` → muestra `Skeleton`.

#### 3. `skeleton.tsx`
- `<Skeleton className w h>` aplica clase `.shimmer` con `radius-md`.

#### 4. `drawer.tsx`
- Wrapper sobre Radix Dialog con animación slide-in desde la derecha. Width default 480px, configurable `width: 'sm' | 'md' | 'lg' | 'xl'` (380/480/640/800).
- Backdrop con `bg-black/40` y `backdrop-blur-sm`.
- Header sticky con título + close button.
- Footer sticky para acciones.
- Animaciones con `data-[state=open]:animate-in slide-in-from-right` (Radix data-attrs).

#### 5. `toast.tsx` + `use-toast.ts`
- Sistema de toasts en stack abajo a la derecha. Implementar con `sonner` si está instalado, sino con un store Zustand propio.
- Si no hay `sonner` instalado, **NO instalarlo**: implementar custom con Zustand. API:
  ```ts
  toast.success(message, { undo?: () => void })
  toast.error(message)
  toast.info(message)
  toast.loading(message)  // devuelve id para descartar
  ```
- Cada toast es un `Card` con icon, mensaje, action button (Undo) y close button. Animación fade-up al entrar, fade-out al salir. Auto-dismiss 4s (configurable).
- Montar `<Toaster />` en `apps/dispatcher/src/app/layout.tsx`.

#### 6. `empty-state.tsx`
- `<EmptyState icon title description action?>` — placeholder visual cuando no hay datos.
- Icono grande (64px) en círculo con `bg-[var(--neutral-100)]` y color `var(--neutral-400)`.
- Título `text-lg font-semibold`, descripción `text-sm text-[var(--neutral-500)]` max-w 480px.
- Acción opcional con `<Button>`.

#### 7. `switch.tsx`
- Toggle switch usando Radix Switch. Track `bg-[var(--neutral-300)]` → `bg-[var(--brand-primary)]` cuando checked. Thumb con shadow-sm. Transición 240ms `--ease-spring`.

#### 8. `select.tsx`
- Wrapper sobre Radix Select. Trigger estilo Input con chevron animado (rota 180° abierto). Content con `glass` surface, items con hover `bg-[var(--neutral-100)]`, check icon a la derecha del seleccionado.

#### 9. `combobox.tsx`
- Combinación Radix Popover + cmdk para search-select. Usar `Command` de `cmdk` (ya instalado). Trigger igual a Input. Soporta `loading`, `emptyMessage`, `onSearch` async.

#### 10. `textarea.tsx`
- `<Textarea>` con mismo styling que `Input` pero auto-resize (`field-sizing: content` o medición JS). Min-height 80px.

#### 11. `label.tsx`
- `<Label htmlFor>` con `text-sm font-medium text-[var(--neutral-700)]`. Variante `required` agrega un asterisco rojo.

#### 12. `field.tsx`
- Componente de orquestación: `<Field label description error?> <input/> </Field>`. Aplica spacing y muestra error con icon `AlertCircle` rojo + mensaje. Usable con react-hook-form.

#### 13. `pagination.tsx`
- `<Pagination page totalPages onPageChange>` con botones prev/next, números, ellipsis. Foco visible. Disabled states.

#### 14. `breadcrumbs.tsx`
- `<Breadcrumbs items={[{label, href}]} />`. Separador chevron sutil. Último item sin link, color más fuerte. Truncate con tooltip si muy largo.

### Parte D — Status Pill premium

Crear `apps/dispatcher/src/components/ui/status-pill.tsx`:

```tsx
type Status = 'online' | 'busy' | 'offline' | 'danger' | 'pending';
```

Pill con:
- Background semi-transparente correspondiente (`var(--pill-online)` etc.)
- Texto bold del color sólido
- Dot 6px a la izquierda; si `pulse: true` y status es `online`/`danger`, animación pulse-soft 2s infinite
- Padding `px-2 py-0.5`, radius-full, font-size xs

Mappings semánticos a usar después:
- Driver: `available` → online, `en_route_to_pickup` / `waiting_passenger` / `on_trip` → busy, `offline` → offline, `suspended` → danger
- Ride: `requested` → pending pulse, `assigned` / `en_route_to_pickup` / `waiting_passenger` / `on_trip` → busy, `completed` → online, `cancelled_*` / `no_show` → danger

Crear helpers `apps/dispatcher/src/lib/status.ts`:

```ts
export function driverStatusToPill(status: DriverStatus): { variant: PillVariant; label: string }
export function rideStatusToPill(status: RideStatus): { variant: PillVariant; label: string }
```

Con labels en español: "Disponible", "Yendo al punto", "Esperando", "En viaje", etc.

### Parte E — Showcase page

Crear `apps/dispatcher/src/app/(admin)/admin/__showcase/page.tsx` (con doble underscore prefix para indicar "interno"):

- Background `var(--neutral-50)`, padding `p-8`.
- Sections con título grande mostrando cada primitive en sus variantes.
- Toggle de tema (light/dark) que cambie `data-theme` en `<html>`.
- Toggle de density.
- Botón de cada `toast.*` para probar.
- Drawer demo con un form completo (Input, Textarea, Select, Combobox, Switch, Field con error).
- Tabla mock de Skeleton states.
- Dos `Stat` cards con números crecientes.
- 5 `StatusPill` con cada variante incluyendo pulse.
- 1 `EmptyState` ilustrado.

> Esta página es **solo para verificación visual interna**. NO se va a deployar en prod. Agregar en `next.config.ts` o vía middleware: si `NODE_ENV === 'production'`, retornar 404 para esta ruta.

### Parte F — Tipografía & números

En `globals.css`, body usa Inter. Aplicar globalmente `font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'` (variantes alternativas de Inter más modernas) y para números mostrar `tabular-nums` cuando se aplique la clase `.tabular`.

---

## Detalles premium imprescindibles

- **Focus rings dorados** en todos los interactivos (no el azul default del browser).
- **Animaciones <240ms** para microinteracciones, 360ms máximo para drawers/modals.
- **Glass** en TopBar, Drawer header, dropdowns, toasts.
- **Tabular nums** en todos los números (KPIs, tablas, paginadores).
- **Hover lift** en Cards interactivos: `hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`.
- **Iconos 16px** en botones inline, **20px** en headers, **24px+** en empty states.
- **`prefers-reduced-motion`**: ya está manejado en `globals.css`. Verificar que ninguna animación nueva se "salte" la regla.
- **Microcopy en español rioplatense**: nada de "Está bien" → usá "Listo", "Dale", "Ok"; nada de "ingrese" → "ingresá"; nada de "click" → "tocá" / "hacé click".

---

## Validación

1. `pnpm typecheck` y `pnpm lint` limpios.
2. Visitar `http://localhost:3001/admin/__showcase` (estando logueado como admin). Verificar:
   - Toggle theme cambia colores instantáneo
   - Toggle density cambia espaciado
   - Cada primitive responde, tiene focus ring dorado, y se ve premium
   - Toasts apilados con stagger animation
   - Drawer entra desde derecha con spring suave
   - StatusPill `online` y `danger` pulsantes se ven sutiles, no agresivos
   - Skeleton tiene shimmer continuo

---

## No hacer

- ❌ Instalar nuevas dependencias (todo lo necesario ya está). Si pensás que falta algo, justificá y preguntá.
- ❌ Modificar primitives existentes (`badge`, `button`, etc.) — extender, no reemplazar.
- ❌ Construir el sidebar / topbar (es la sesión 02).
- ❌ Conectar a Supabase desde la showcase — es 100% visual.

---

## Commit final

```bash
git add .
git commit -m "feat(design-system): premium tokens + 14 primitives + showcase page"
git push
```
