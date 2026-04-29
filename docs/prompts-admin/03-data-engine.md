# Sesión 03 — Data Engine: DataTable, FilterBar, hooks y formularios

> **Sesiones previas**: 00 (foundation), 01 (design system), 02 (app shell).

---

## Objetivo

Construir los **engines reusables** que van a alimentar todas las páginas del admin: una `DataTable` premium con TanStack Table, una `FilterBar` con chips de filtros activos, hooks utilitarios (`useDebounce`, `useLocalStorage`, `useShortcut`, `useSupabaseQuery`), y patrones de formularios con react-hook-form + zod. Esta sesión es 100% infraestructura: no construye páginas finales, pero **las próximas 6 sesiones dependen de esto**.

---

## Contexto

- TanStack Table v8 (`@tanstack/react-table`) y TanStack Virtual (`@tanstack/react-virtual`) ya instalados.
- react-hook-form + zod + @hookform/resolvers instalados.
- `cmdk`, `lucide-react`, Radix primitives disponibles.
- `Field`, `Input`, `Select`, `Combobox`, `Textarea`, `Switch`, `Pagination`, `Drawer`, `Toast`, `Skeleton`, `EmptyState` ya creados en sesión 01.

---

## Entregables

### Parte A — Hooks utilitarios

Crear en `apps/dispatcher/src/hooks/`:

#### `use-debounce.ts`
```ts
export function useDebounce<T>(value: T, delay = 300): T
```

#### `use-local-storage.ts`
```ts
export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void]
```
SSR-safe (lee `window` solo en `useEffect`).

#### `use-shortcut.ts`
```ts
export function useShortcut(combo: string, handler: (e: KeyboardEvent) => void, opts?: { enabled?: boolean })
```
Wrap sobre `react-hotkeys-hook` o nativo. Que ignore inputs/textareas a menos que `combo` empiece con `Cmd+`.

#### `use-supabase-query.ts`
Wrapper liviano para queries Supabase con cache simple (key-based) + abort signals. API:

```ts
const { data, error, isLoading, refetch } = useSupabaseQuery(['drivers', filters], async (supabase) => {
  return supabase.from('drivers').select(...).match(filters);
});
```

Si tienen `@tanstack/react-query` instalado, usarlo en vez de implementar custom. Si no, hacer una versión minimal con `useState` + `useEffect` + AbortController. **No instalar paquetes nuevos**.

#### `use-realtime-table.ts`
Suscripción a `postgres_changes` de una tabla, con callback que recibe el payload:

```ts
useRealtimeTable('rides', { event: '*', filter: 'status=eq.requested' }, (payload) => {
  // upsert/delete en cache local
});
```

### Parte B — `DataTable` engine

Crear `apps/dispatcher/src/components/admin/data-table/`:

#### `data-table.tsx` — el principal
- Generic: `<DataTable<TData, TValue>>`.
- Props:
  - `columns: ColumnDef<TData>[]`
  - `data: TData[]`
  - `loading?: boolean` → muestra Skeleton rows
  - `error?: Error | null` → muestra error state
  - `emptyState?: ReactNode` → cuando data length = 0
  - `onRowClick?: (row: TData) => void` → cursor pointer + hover stronger
  - `pagination?: { pageIndex, pageSize, total, onChange }`
  - `sortable?: boolean` (default true)
  - `density?: 'comfortable' | 'compact' | 'dense'` (default lee de `<html>`)
  - `stickyHeader?: boolean` (default true)
  - `selection?: { selected, onSelectionChange }` → checkbox column
  - `virtualizer?: boolean` → si true, virtualiza con TanStack Virtual cuando data > 100

#### Estética premium

- Container: `Card` glass cuando aplique.
- Header: `bg-[var(--neutral-100)]` (light) / `bg-[var(--neutral-50)]` (dark), sticky, height 44px, `text-xs uppercase tracking-wide font-semibold text-[var(--neutral-600)]`.
- Sort icon (`ArrowUpDown` / `ArrowUp` / `ArrowDown`) animado al cambiar.
- Rows: height variable según density. Hover `bg-[var(--neutral-50)]` + left accent border `var(--brand-primary)` 3px (translate body 3px o usar `box-shadow inset 3px 0 0`).
- Cursor pointer si `onRowClick`. Onclick anima un sutil `scale(0.998)` y dispara handler.
- Cells: padding según density. Truncate con tooltip si overflow.
- Empty: usa `EmptyState` con icono `Inbox`.
- Loading: 5 rows de Skeleton imitando estructura.
- Error: `EmptyState` con icono `AlertTriangle` rojo y botón "Reintentar".

#### Helpers de columnas

Crear `data-table/columns/` con factories reusables:

- `createTextColumn(key, label, opts?)` — texto plano
- `createTabularColumn(key, label, opts?)` — números con `tabular`
- `createDateColumn(key, label, opts?)` — formato `dd MMM, HH:mm` con date-fns + locale `es`
- `createStatusColumn(getStatus, type: 'driver' | 'ride')` — usa `StatusPill`
- `createCurrencyColumn(key, label)` — `$ 1.234` con `tabular`
- `createAvatarColumn(getAvatar, getName)` — avatar 28px + nombre
- `createActionsColumn(actions: { icon, label, onClick }[])` — botones icon con tooltip

### Parte C — `FilterBar`

Crear `apps/dispatcher/src/components/admin/data-table/filter-bar.tsx`:

- Search input grande con icon a la izquierda. Debounced 300ms.
- Botón "+ Filtro" abre Popover con lista de campos filtrables.
- Filtros activos como chips: `<chip>label: value × </chip>`. Click x → remueve filtro. Botón "Limpiar todo" cuando hay >0.
- Range pickers para fechas (component custom liviano con Radix Popover + calendar de `date-fns`).
- Select multi-valor para enums.
- Persistir filtros en URL search params para bookmarking (`?q=&status=&from=&to=`).

API:
```tsx
<FilterBar
  filters={[
    { id: 'q', type: 'search', placeholder: 'Buscar por nombre...' },
    { id: 'status', type: 'multiselect', label: 'Estado', options: [...] },
    { id: 'date', type: 'daterange', label: 'Fecha' },
  ]}
  value={filters}
  onChange={setFilters}
/>
```

### Parte D — `useFormSchema` pattern

Crear `apps/dispatcher/src/lib/forms/index.ts` con un wrapper sobre react-hook-form + zod:

```ts
export function useZodForm<T extends z.ZodSchema>(schema: T, defaultValues?: z.infer<T>)
```

Y `apps/dispatcher/src/components/admin/form/`:

- `form-section.tsx` — `<FormSection title description>` para agrupar.
- `submit-bar.tsx` — sticky bottom bar con cancel + submit.
- `field-row.tsx` — layout label-left / input-right responsive.

### Parte E — `ConfirmDialog`

Crear `apps/dispatcher/src/components/admin/confirm-dialog.tsx`:

- Wrapper sobre `Dialog` con título, descripción, acciones (cancelar + confirmar).
- Variante `danger` (botón confirmar rojo, icon `AlertTriangle`).
- Soporta `loading` durante async confirm.

API:
```ts
const confirm = useConfirm();
const ok = await confirm({ title, description, danger: true });
if (ok) { /* ... */ }
```

Implementar como context provider montado en `AdminShell`.

### Parte F — Format utilities

Crear `apps/dispatcher/src/lib/format.ts`:

```ts
export function formatARS(amount: number): string             // "$ 1.234"
export function formatDateShort(date: Date | string): string  // "29 abr, 14:32"
export function formatDistance(meters: number): string        // "2,3 km"
export function formatDuration(seconds: number): string       // "12 min"
export function formatPhone(phone: string): string            // "+54 9 2954 ..."
export function relativeTime(date: Date | string): string     // "hace 5 min"
export function initials(fullName: string): string            // "JR"
```

Usar date-fns con locale `es`. Ya está instalado.

### Parte G — Pequeño `PageBack`

Crear `apps/dispatcher/src/components/admin/page-back.tsx`:

```tsx
<PageBack href="/admin/drivers">Conductores</PageBack>
```

Renderiza un link con icon `ArrowLeft` que se anima a la izquierda en hover.

---

## Detalles premium imprescindibles

- **DataTable row hover**: el accent border izquierdo aparece con `transform: scaleY(0)` → `scaleY(1)` en 150ms.
- **Sort icon**: rotación animada al alternar.
- **FilterBar**: chips animan entrada (fade-in + scale 0.95→1, 200ms).
- **Empty state** dentro de DataTable: vertical centrado, icon en círculo con gradient sutil.
- **Loading row**: shimmer continuo, alturas variables para que no se vea todo igual.
- **Pagination**: foco en input directo de número de página al hacer Cmd+G (atajo).
- **Tabular nums siempre** en cells numéricos.

---

## Validación

Para verificar, montar una mini-demo en `__showcase`:

- Una `DataTable` con 50 filas mock de "drivers" (nombre, estado pill, rating, vehículo, viajes).
- Pagination 10 por página.
- FilterBar con search por nombre + multiselect estado.
- Click en row → toast "row clickeado: ID".
- Toggle loading state con un button "Simular carga".
- Toggle error state con otro button.

`pnpm typecheck` y `pnpm lint` limpios.

---

## No hacer

- ❌ Conectar a tablas reales (es 04+)
- ❌ Implementar las 14 features de TanStack (column resize, pinning, etc.) — solo lo descrito
- ❌ Instalar paquetes nuevos
- ❌ Reemplazar primitives existentes

---

## Commit final

```bash
git add .
git commit -m "feat(admin): data engine with DataTable, FilterBar, hooks and form patterns"
git push
```
