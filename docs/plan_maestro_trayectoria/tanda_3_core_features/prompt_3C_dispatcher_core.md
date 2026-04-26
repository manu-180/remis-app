# Prompt 3C — Dispatcher: cola realtime + asignación + lista chofer activa

> **LEÉ:** `00_design_language.md` (sec 6 componentes, 8 densidad), `00_arquitectura.md` (sec 2.4 dispatcher), `tanda_3_core_features/README.md`, `00_file_ownership_matrix.md`.

## Objetivo

Despachante abre el panel y ve: choferes online en mapa y lista (con estados en vivo), cola de pedidos entrantes (Realtime), puede asignar con click-to-dispatch + sugeridos, ver detalles de cada viaje, cancelar, hacer hold. **El click-to-dispatch en menos de 5s desde "pedido entrando" hasta "asignado".**

## File ownership

✍️ `apps/dispatcher/src/features/{drivers, rides, dispatch, assignment}/**`, `apps/dispatcher/src/components/dispatch/**`, `apps/dispatcher/src/app/(dashboard)/**` (rellenar).

## Steps

### 1. Realtime singleton

`lib/supabase/realtime.ts` — singleton que mantiene 3 canales activos al mount del shell:
- `agency:{id}:locations` (broadcast privado) — puebla store de posiciones.
- `agency:{id}:rides:queue` (postgres_changes) — INSERT/UPDATE de rides activos.
- `agency:{id}:drivers:status` (postgres_changes) — UPDATE de `drivers.is_online, current_status`.

Estado en Zustand stores tipados:
- `useDriversStore`: `Map<driverId, Driver>` con `position`, `lastSeen`.
- `useRidesStore`: `Map<rideId, Ride>` indexado y filtrado por status.

Cada UPDATE del WAL se reduce al store. Un único re-render diff via Zustand selectors.

**Crítico**: rehidratar al reconectar. Cuando el canal pasa a `joined`, hacer `fetch` de "snapshot" (`select * from rides where status in (...)` y `select * from drivers where is_online=true`) y mergear.

### 2. CenterColumn — Mapa con choferes

`components/map/dispatch-map.tsx`:
- `react-map-gl` + MapLibre.
- Markers: por cada chofer del store, render `<DriverMarker>` con color por estado.
- Heading: rotar marker según `position.heading` (transform).
- Click en marker → seleccionar chofer (popup con datos + acción "Ver pedidos asignados", "Mensaje", "Suspender turno").
- Bounding default: zoom al pueblo + extents.
- Cluster automático con `supercluster` cuando zoom < 12 (no debería pasar acá pero por si las dudas).

**Animación de movimiento:** interpolar entre updates con `requestAnimationFrame`. Sin jumps. ~300ms de duración entre posiciones.

### 3. CenterColumn — vista Zonas (toggle)

Grilla con cards de zona:
```
┌─────────────────────────────┐
│ Centro               4 cho. │
│ 2 pedidos en cola           │
│ 1 viaje activo              │
└─────────────────────────────┘
```

Lista basada en `tariff_zones` + agregaciones del store (filtrar choferes/rides cuya `pickup_zone_id` coincide).

Click en card → mapa hace zoom a la zona.

### 4. LeftColumn — Lista de choferes

Tabs "Choferes" / "Pedidos".

#### Tab Choferes

Lista virtualizada (`@tanstack/react-virtual`) con sort:
- Default: por `time_clear` (hace cuánto está libre) ascendente — los que están libres hace más tiempo arriba (FIFO sugerido).
- Toggle: por distancia al pickup seleccionado, alfabético, por móvil.

Card por chofer (densidad `dense`):
```
[●] 12  Mateo R.        ▶ asignado a #1234
                        Centenario 1234 · ETA 3min
```
- Dot de color por estado.
- Móvil interno (mono).
- Nombre.
- Estado contextual:
  - Available: "Libre desde 14:20".
  - On trip: "En viaje #1234 · ETA 8min".
  - On break: "Pausado" + duración.
- Tap → selecciona chofer, mapa centra en él, panel derecho muestra "Asignar a..."

#### Tab Pedidos

Cola de TODOS los pedidos activos (status in pending/assigned/en_route/etc.), con filtros (chips arriba): Todos · Sin asignar · Asignados · En curso · Programados.

### 5. RightColumn — Nuevo pedido + Cola

Tabs: "Nuevo (Espacio)" / "Cola (N)" / "Programados (N)".

#### Nuevo pedido form

`react-hook-form` + zod. Campos:
- Teléfono (con autocomplete de pasajeros existentes — match parcial a `phone`).
  - Si existe → autocompleta nombre + dirección habitual.
  - Si nuevo → input nombre.
- Pickup (input + autocomplete frecuentes + Google Places).
- Destino (idem).
- "Para ahora" / "Programar" (toggle F5).
- Vehículo: sedan / suv / van / accesible (radio).
- Pasajeros (1-7).
- Notas.
- Pago: efectivo / MP / cuenta.

Botón [Guardar] (F1) → INSERT a `rides` con `status='requested'` y `requested_via='phone'`.

Mocks de teclas (con `react-hotkeys-hook`):
- `Espacio` → focus primer campo del nuevo pedido.
- `F2` → focus pickup; `F2` segunda vez → focus destino.
- `F3` → focus teléfono.
- `F5` → toggle ahora/programado.
- `Enter` (con form válido) → guardar.
- `Esc` → limpiar form.

#### Cola

Lista virtualizada con cards de pedido. Cada card según el sistema de bordes/fondos definido en `00_design_language.md` sec 2 (colores de estado).

Card:
```
┌──────────────────────────────────┐
│ #1234 · 14:32 (hace 1 min)       │ ← title strip
│ María Pérez · 02954-555-1234     │
│ ◉ Centenario 1234 → 🏁 Plaza    │
│ Sedán · Efectivo · "portón"      │
│ [ A ] [ Más ]                    │ ← acciones
└──────────────────────────────────┘
```

`A` o click "Asignar" → abre **AssignPanel** lateral (overlay sobre RightColumn).

Doble-click → abrir DetailModal.

#### Programados

Pedidos con `scheduled_for is not null and status='requested'`. Ordenados por scheduled_for asc. Resaltar los próximos 30min con border `--info` y dot pulsante.

Alerta sonora (sonido distintivo, 1 vez) 15 min antes de `scheduled_for`.

### 6. AssignPanel — el corazón del flujo

Cuando hago click en "Asignar" sobre un pedido:

```
┌─────────────────────────────────┐
│  Asignar pedido #1234           │
│  ◉ Centenario 1234              │
│  🏁 Plaza San Martín            │
│                                 │
│  Sugeridos                      │
│  ┌─────────────────────────┐   │
│  │ ★ 12 Mateo R.   1.2km · 3m │ ← más cercano
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │   17 Carlos    1.8km · 4m  │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │   23 Ezequiel  2.1km · 5m  │
│  └─────────────────────────┘   │
│                                 │
│  [ Ver todos ]                  │
│  [ Difundir a varios ]          │ ← future
│  [ Cancelar (Esc) ]             │
└─────────────────────────────────┘
```

- Llamar RPC `find_nearest_available_drivers(pickup_lat, pickup_lng, max_distance: 10000, limit: 5, max_gps_age_seconds: 60)`.
- Resultados ordenados por distancia.
- Tap (o `Enter`) en uno → confirm + RPC `assign_ride(ride_id, driver_id, dispatcher_id)`.
- Mostrar toast deshacible 30s "Asignado a Mateo R. · [Deshacer]".
- Si Deshacer → RPC `unassign_ride` (reset a `requested`).

Atajos:
- `1`, `2`, `3` → seleccionar sugerido N.
- `Enter` → confirmar el seleccionado.
- `M` → modo "Designar manualmente" (abre lista completa de choferes online filtrable).
- `Esc` → cerrar.

### 7. Click-to-dispatch desde el mapa

Click derecho sobre un chofer en mapa → context menu:
- "Asignar a pedido seleccionado" (si hay uno selected).
- "Mensaje".
- "Suspender turno".

Click en marker → selecciona chofer (highlight).

Si tengo un pedido **y** un chofer ambos seleccionados, atajo `A` asigna directo.

### 8. Detail modal de un ride

Doble-click en card de cola → `<RideDetailDialog>`:
- Timeline de `ride_events` (status transitions).
- Mapa con pickup, destino, ruta, chofer (si asignado).
- Datos del pasajero, conductor, vehículo.
- Acciones: Editar, Reasignar, Cancelar, Hold, Mensaje al chofer.
- Atajos: `E` editar, `R` reasignar, `C` cancelar, `H` hold.

### 9. Búsqueda global

`Cmd/Ctrl+K` o `S` → command palette con:
- Buscar pasajero por nombre / teléfono.
- Buscar viaje por # ID.
- Buscar conductor por móvil / nombre.

Tap → navega a la entidad + abre detalle.

### 10. Indicador de conexión

Bottom bar dot de Realtime:
- Verde: conectado.
- Amarillo: reconectando.
- Rojo: desconectado >30s — alerta visible "Sin conexión — los pedidos pueden no llegar. Recargá la página."

### 11. Sound + visual del nuevo pedido

Cuando entra un INSERT en cola con status=requested:
- Sonido distintivo (ding suave 200ms).
- Card aparece con animación slide+fade (240ms).
- Si la app no está en foco (window blur): título tab parpadea "(N) [NOMBRE] Despacho".

### 12. Densidades respetadas

Tablas y listas reaccionan a `data-density` del shell. Verificar las 3 densidades.

## Acceptance criteria

- [ ] Cola muestra pedidos en tiempo real (probado con INSERT directo a la DB).
- [ ] Choferes en mapa se actualizan al moverse (probado simulando broadcast).
- [ ] Click "Asignar" → sugeridos cargan (RPC), seleccionar → asigna.
- [ ] Toast deshacible 30s + acción de undo funciona.
- [ ] Pedido programado dispara alerta 15 min antes con sonido.
- [ ] Detail modal con timeline funciona.
- [ ] Búsqueda global encuentra pasajeros, viajes, choferes.
- [ ] Indicador de conexión refleja estado real.
- [ ] Click-to-dispatch desde mapa funciona.
- [ ] Atajos del panel y del shell funcionan en parallel.
- [ ] Probado con dispatcher + 5 driver mocks + 10 rides simulados.
- [ ] Commit `feat(dispatcher): realtime queue, click-to-dispatch, assignment flow`.

## Out of scope

- Caller-ID Twilio (Tanda 4C).
- Multi-monitor (Tanda 4C).
- Reportes (Tanda 5).
- Animaciones premium pulidas (Tanda 4C — acá funcional, después polish).

## Notas

- **Performance:** con 50 choferes + 30 rides activos no debería haber jank. Profile con React DevTools si hay re-renders.
- **Selectors de Zustand:** usar selectores derivados (`useDriversStore(s => s.available)`) para evitar re-renders globales.
- **Reconexión Realtime:** confirmar que el rehidratado funciona — desconectar internet 60s, reconectar, ver que los rides nuevos aparecen.
