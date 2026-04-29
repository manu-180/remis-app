# Sesión 07 — Despacho en vivo: hidratar el AppShell con Supabase realtime

> **Sesiones previas**: 00 → 06.

---

## Objetivo

Conectar el **AppShell de despacho live** (`/`, segmento `(dashboard)`) con datos reales de Supabase: hidratar los stores Zustand desde queries iniciales, suscribir realtime para drivers/rides/SOS, conectar todas las acciones del operador a las RPCs (assign / cancel / start_trip / etc.). Hoy el AppShell ya existe estructuralmente; esta sesión lo hace **funcional**.

---

## Contexto

- AppShell montado en `apps/dispatcher/src/components/layout/app-shell.tsx` con `TopBar`, `LeftColumn`, `CenterColumn`, `RightColumn`, `BottomBar`.
- Stores Zustand:
  - `rides-store.ts` (Map<id, Ride>, selectedRideId)
  - `drivers-store.ts` (Map<id, Driver>, posiciones)
  - `ui-store.ts` (theme, density, command palette, lock)
- `AssignPanel` existe en `components/dispatch/assign-panel.tsx` con búsqueda RPC `find_nearest_available_drivers`.
- `RideDetailDialog` placeholder existe.
- Supabase realtime via `@/lib/supabase/realtime.ts` y `use-realtime-setup.ts` (verificar implementación actual).
- Hotkeys ya cableados en `use-app-shortcuts.ts`.

---

## Entregables

### Parte A — Cliente Supabase realtime y broadcast

Verificar y completar `apps/dispatcher/src/lib/supabase/realtime.ts`:

- Helper `subscribeRealtime(channelName, handlers)` que devuelve un cleanup.
- Soporta `postgres_changes` (insert/update/delete) y `broadcast`.
- Maneja reconexiones automáticas con backoff.
- Logs vía `@/lib/observability/logger`.

### Parte B — Hidratación inicial

Crear `apps/dispatcher/src/lib/dispatch/initial-load.ts`:

```ts
export async function loadInitialDispatchData(supabase: SupabaseClient<Database>): Promise<{
  rides: Ride[];
  drivers: Driver[];
}> {
  const [{ data: ridesRaw }, { data: driversRaw }] = await Promise.all([
    supabase.from('rides').select(`
      id, status, requested_at, scheduled_for, requested_via,
      passenger_id, driver_id,
      pickup_address, pickup_zone_id, vehicle_type_requested, passengers_count,
      payment_method, notes, dest_address,
      passenger:passengers!rides_passenger_id_fkey(
        id, profile:profiles!passengers_id_fkey(full_name, phone)
      )
    `).in('status', ['requested', 'assigned', 'en_route_to_pickup', 'waiting_passenger', 'on_trip']),

    supabase.from('drivers').select(`
      id, current_status, is_online, vehicle_id, rating, total_rides,
      profile:profiles!drivers_id_fkey(full_name, phone, avatar_url),
      vehicle:vehicles(plate, make, model, color, vehicle_type),
      location:driver_current_location(location, heading, speed_mps, battery_pct, updated_at)
    `).eq('is_active', true),
  ]);
  // Transformar a tipos del store...
}
```

> Notar: `pickup_location` es geography. Usar `select('id, ST_Y(...), ST_X(...)')` no funciona directo via PostgREST. Mejor crear una **view** `rides_dispatch_view` que ya extraiga lat/lng:

```sql
CREATE OR REPLACE VIEW public.rides_dispatch_view AS
SELECT
  r.*,
  ST_Y(r.pickup_location::geometry) AS pickup_lat,
  ST_X(r.pickup_location::geometry) AS pickup_lng,
  ST_Y(r.dest_location::geometry) AS dest_lat,
  ST_X(r.dest_location::geometry) AS dest_lng
FROM rides r;

GRANT SELECT ON public.rides_dispatch_view TO authenticated;
```

Y `drivers_dispatch_view` similar combinando drivers + profiles + vehicles + driver_current_location:

```sql
CREATE OR REPLACE VIEW public.drivers_dispatch_view AS
SELECT
  d.id, d.is_active, d.is_online, d.current_status, d.rating, d.total_rides,
  p.full_name, p.phone, p.avatar_url,
  v.plate, v.make, v.model, v.color, v.vehicle_type,
  ST_Y(dcl.location::geometry) AS lat,
  ST_X(dcl.location::geometry) AS lng,
  dcl.heading, dcl.speed_mps, dcl.battery_pct, dcl.updated_at AS location_updated_at
FROM drivers d
JOIN profiles p ON p.id = d.id
LEFT JOIN vehicles v ON v.id = d.vehicle_id
LEFT JOIN driver_current_location dcl ON dcl.driver_id = d.id;

GRANT SELECT ON public.drivers_dispatch_view TO authenticated;
```

Aplicar via `apply_migration` y regenerar types.

> Las views heredan RLS de las tablas base — verificar.

### Parte C — Hook `useDispatchHydration`

Crear `apps/dispatcher/src/hooks/use-dispatch-hydration.ts`:

- Al montar: llama `loadInitialDispatchData`, popula stores.
- Suscribe realtime:
  - `rides_dispatch_view` no — suscribir `rides` directo (postgres_changes).
  - `drivers` (status changes).
  - `driver_current_location` (broadcast a través del realtime de Postgres). Si hay alta frecuencia (1Hz por driver), considerar canal **broadcast** en vez de postgres_changes.
  - `ride_events` para detectar transiciones críticas.
- En cada evento: re-fetch parcial (un ride, un driver) o aplicar el delta del payload directamente al store.
- Return `{ isLoading, error, retry }`.

Montar en `AppShell` con `useEffect` al inicio. Mientras `isLoading`, mostrar overlay glass con spinner + texto "Conectando…".

### Parte D — Conectar acciones del dispatcher

#### Asignar viaje

`AssignPanel` actualmente usa `find_nearest_available_drivers`. Conectar el botón "Asignar" a:

```ts
await supabase.rpc('assign_ride', {
  p_ride_id: selectedRideId,
  p_driver_id: pickedDriverId,
  p_dispatcher_id: profile.id,
});
```

Optimistic update: marcar el ride como `assigned` en el store inmediatamente, revert si falla. Toast "Asignado a [conductor]" con undo (cancela en backend en 5s window).

#### Cancelar viaje

Hotkey `C` o botón en RightColumn:
- ConfirmDialog con reason textarea
- Llama RPC `cancel_ride`
- Toast con resultado

#### Otras transiciones

Estos los hace el driver desde su app, pero el dispatcher puede forzarlos en escenarios edge:
- `driver_arrived_pickup(ride_id, driver_id)`
- `start_trip(ride_id, driver_id)`
- `end_trip(ride_id, driver_id, fare?, distance?)`

Dejar botones discretos en RightColumn cuando aplique. Cada uno con confirm.

### Parte E — RightColumn populated

Reescribir `apps/dispatcher/src/components/layout/right-column.tsx` para mostrar contenido real:

- Si hay `selectedRideId`:
  - Header con status pill + ID + tiempo desde requested
  - Pasajero: nombre, teléfono (con botón "llamar" — si `caller_id_enabled` flag, abre modal con info; sino, copy a clipboard)
  - Origen + Destino con icons
  - Tarifa estimada
  - Si tiene driver asignado: card driver
  - Notas
  - Acciones según status
  - Mini timeline de eventos
- Si no hay selección: empty state amigable

### Parte F — CenterColumn (mapa)

El mapa ya existe en `center-column.tsx`. Verificar/asegurar:
- Markers de drivers usando `drivers-store` con animación de transición de posición (interpolación 1.5s entre updates).
- Cluster cuando hay >50 markers cerca (MapLibre cluster style spec).
- Markers de rides activos (pickup + dest).
- Click en marker driver → selecciona en LeftColumn.
- Click en marker ride → selecciona ride.
- Botón "Centrar en seleccionado" / "Ver todo".

### Parte G — Sonidos

- Nuevo ride `requested` que llega → `playNewRideSound`
- SOS → sonido distinto (más urgente). Crear `playSosSound` en `@/lib/sounds`.
- Mute toggle persistido en localStorage (`dispatch:muted`).

### Parte H — Optimistic updates pattern

Crear `apps/dispatcher/src/lib/dispatch/optimistic.ts` con un helper:

```ts
export async function withOptimistic<T>(
  apply: () => void,
  revert: () => void,
  remote: () => Promise<T>,
): Promise<T> { ... }
```

Aplica optimista, espera remoto, si falla revierte y muestra toast error. Usar para asignar/cancelar.

---

## Detalles premium imprescindibles

- **Marker driver**: ícono de auto con halo pulsante si está `available`, halo más fuerte si `on_trip`. Heading roto el ícono según `heading`.
- **Transiciones de posición**: interpolar lat/lng con tween 1.5s para que no salten los markers.
- **Top bar dispatch live**: KPIs en tiempo real con count-up suave.
- **LeftColumn**: pestañas "Drivers" y "Rides" con dot rojo si hay `requested` esperando asignación.
- **AssignPanel**: la lista de sugerencias entra con stagger fade-up. La opción seleccionada con ring brand-accent.
- **Hotkey help (Shift+?)**: overlay con todos los atajos visibles, glass.
- **Conexión perdida**: si realtime se cae, banner amarillo arriba con "Reconectando…" y dot pulsante. Reconectar automáticamente.
- **Sonido**: volumen low por default (60%), control en LockScreen / settings rápidos.

---

## Validación

1. `pnpm typecheck`, `pnpm lint`.
2. Dos pestañas abiertas como dispatcher: en una crear un ride manual con SQL → la otra lo ve aparecer sin reload, suena el sonido.
3. Asignar el ride desde AssignPanel → en SQL `select status from rides where id=...` muestra `assigned`.
4. El driver simulado actualiza posición (insert en `driver_current_location` via SQL) → el marker se mueve interpolado.
5. Cancelar → ride sale de la lista activa.
6. Mute toggle funciona y persiste.
7. Hotkeys: Espacio enfoca el campo de búsqueda en LeftColumn, A asigna el ride seleccionado al driver primero del AssignPanel, S abre SOS view, etc.
8. SOS event creado en SQL → sonido + alerta visual.

---

## No hacer

- ❌ Hacer el centro SOS completo (es sesión 08)
- ❌ Tocar el admin (`(admin)`)
- ❌ Implementar caller-id real
- ❌ Resolver bugs estéticos del shell admin

---

## Commit final

```bash
git add .
git commit -m "feat(dispatcher): hydrate live dispatch with Supabase realtime + RPC actions"
git push
```
