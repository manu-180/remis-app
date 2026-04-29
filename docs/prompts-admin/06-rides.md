# Sesión 06 — Viajes: histórico filtrable y detalle con timeline + mapa

> **Sesiones previas**: 00 → 05.

---

## Objetivo

Construir la vista de **viajes / pedidos**: una página de histórico con filtros avanzados y export, y una página de detalle por viaje con timeline visual de eventos, mapa de ruta, panel del pasajero/conductor/vehículo, pagos, ratings y mensajes. El admin debe poder reconstruir cualquier viaje pasado en segundos.

---

## Contexto Supabase

Tablas:
- `rides` (10 estados, requested_via, vehicle_type_requested, payment_method/status, fares, location, zones, todos los timestamps de transición)
- `ride_events` (timeline: from_status, to_status, actor_id, actor_role, metadata, created_at)
- `payments` (method, amount_ars, status, mp_*, paid_at)
- `messages` (sender_id, body, read_at)
- `ride_ratings` (stars, comment)
- `shared_trips` (token, expires_at)
- `passengers`, `drivers`, `vehicles`, `tariff_zones`, `profiles`

Lookup útil: `pickup_location` y `dest_location` son `geography(Point, 4326)`. Para extraer lat/lng en queries:
```sql
ST_Y(pickup_location::geometry) AS lat, ST_X(pickup_location::geometry) AS lng
```

`route_geometry` es `geography(LineString)` opcional.

---

## Entregables

### Parte A — Lista `/admin/rides`

Reescribir `apps/dispatcher/src/app/(admin)/admin/rides/page.tsx`.

Layout:
- `PageHeader`: "Viajes" + description, acciones: `<Button>Nuevo viaje manual</Button>` (drawer básico — opcional en esta sesión, dejar TODO si entra apretado), `<Button variant="ghost">Exportar CSV</Button>`.
- KPI strip (mini, fila):
  - Pedidos hoy
  - Completados
  - Cancelados
  - Tiempo promedio asignación (segundos entre `requested_at` y `assigned_at`)
- `FilterBar`:
  - Search (id corto, dirección pickup/dest, nombre pasajero/conductor)
  - Estado (multiselect 10 estados)
  - Conductor (combobox con search)
  - Pasajero (combobox con search)
  - Zona origen / destino (multiselect)
  - Rango de fechas (default: últimos 7 días)
  - Método de pago (multiselect)
- `DataTable` columnas:
  - **#**: short ID (primeros 8 chars del UUID, monospace)
  - **Estado**: StatusPill (ride)
  - **Solicitado**: fecha + hora + relative time
  - **Pasajero**: nombre + teléfono
  - **Origen**: address truncated con tooltip
  - **Destino**: address truncated
  - **Conductor**: nombre + plate
  - **Tarifa**: `final_fare_ars` o `estimated_fare_ars` con icono de pago (cash/MP)
  - **Acciones**: kebab con "Ver", "Cancelar" (si activo), "Compartir link"
- Pagination 50 por página.
- Click row → `/admin/rides/[id]`.

#### Export CSV

Botón "Exportar CSV" abre un `Drawer` con:
- Fields a incluir (multiselect, por default todos)
- Rango de fechas (re-confirma)
- Botón "Descargar"
- Triggers a un fetch que arma un CSV cliente-side. Si > 1000 filas, alerta "Para exports grandes contactar a soporte" (no hacemos backend export por ahora).

### Parte B — Detalle `/admin/rides/[id]`

Crear `apps/dispatcher/src/app/(admin)/admin/rides/[id]/page.tsx`.

Layout en grid:

```
┌──────────────────────────────────┬─────────────────────┐
│ Hero card (mapa + status grande) │ Pasajero card       │
│                                  │ Conductor card      │
│                                  │ Vehículo card       │
│                                  │ Pago card           │
│                                  │ Rating card         │
├──────────────────────────────────┴─────────────────────┤
│ Timeline de eventos (full-width)                       │
├────────────────────────────────────────────────────────┤
│ Mensajes del viaje (chat read-only)                    │
└────────────────────────────────────────────────────────┘
```

#### Hero card

- Background: gradient sutil + imagen de mapa (snapshot estático con MapLibre + capa de la ruta en color brand-accent).
- Status pill enorme arriba (text-base, padding más generoso).
- ID del viaje: corto + completo en tooltip + botón copiar.
- Origen → Destino con pin icons.
- Distancia + tiempo estimado.
- Tarifa estimada vs final.
- Acciones: "Cancelar viaje" (rojo, si activo), "Compartir link público" (genera shared_trip con `create_shared_trip` RPC), "Reasignar conductor" (si activo).

#### Cards laterales

**Pasajero**:
- Avatar + nombre + teléfono
- Total viajes histórico
- Blacklist badge si aplica
- Click → `/admin/passengers/[id]`

**Conductor** (si asignado):
- Avatar + nombre
- Vehículo
- Rating
- Click → `/admin/drivers/[id]`

**Vehículo** (si asignado):
- Patente grande
- Marca / Modelo / Color / Año
- Tipo

**Pago**:
- Método (icono cash / MercadoPago / cuenta)
- Estado (pending / approved / rejected / refunded)
- Monto tabular
- Si MP: link a "Ver en MP" (mp_payment_id)
- Botón "Reembolsar" si admin y status='approved'

**Rating** (si existe):
- 5 estrellas con fill
- Comentario en bloque cita

#### Timeline de eventos

Card full-width con vertical timeline:
- Lee `ride_events` ordenados por `created_at`
- Cada evento: dot a la izquierda con color según `to_status`, línea vertical, contenido a la derecha
- Contenido: timestamp (fecha + hora), actor (nombre + rol pill), descripción ("Estado cambió de X a Y")
- Si tiene `metadata`, mostrar JSON colapsable
- Animación de entrada secuencial (stagger 80ms)

Mapping de status a label / color:
- `requested` → gris, "Solicitado"
- `assigned` → azul, "Asignado a [conductor]"
- `en_route_to_pickup` → naranja, "Yendo al punto"
- `waiting_passenger` → naranja, "Esperando al pasajero"
- `on_trip` → brand, "En viaje"
- `completed` → verde, "Completado"
- `cancelled_by_*` → rojo, "Cancelado por [actor]"
- `no_show` → rojo, "No-show"

#### Mensajes

Card con lista chat-style (read-only):
- Avatar + nombre + timestamp + mensaje
- Diferenciar lado izquierdo (driver) vs derecho (passenger) con backgrounds distintos.
- Si vacío, empty state "No hubo mensajes en este viaje".

### Parte C — Acción cancelar viaje

Botón "Cancelar viaje" abre `ConfirmDialog` danger con:
- Reason textarea (requerido)
- Confirma → llama RPC `cancel_ride(p_ride_id, p_actor_id, p_reason)` (ya existe).
- Toast con resultado.

### Parte D — Compartir viaje

Botón "Compartir link público":
- Llama RPC `create_shared_trip(p_ride_id, p_user_id)` (ya existe) → devuelve `token`.
- Modal mostrando URL `https://{base}/shared/{token}` + botón copiar + QR opcional (icon `Qr` de lucide, abre dialog con SVG QR generado).
- Indicar expira en X horas (lee `expires_at`).

### Parte E — Mapa de ruta

Componente `apps/dispatcher/src/components/admin/rides/route-map.tsx`:
- MapLibre con estilo dark.
- Marker pickup verde, marker dest rojo.
- Si `route_geometry` existe → polyline brand-accent.
- Si no, traza línea recta entre puntos como fallback.
- Si el viaje está activo y hay `driver_current_location` del driver_id → marker animado pulsante.
- Auto-fit bounds.
- Lazy-loaded con `dynamic` + Skeleton.

### Parte F — Realtime para viaje activo

Si el ride está en estado activo, suscribirse a:
- `rides` UPDATE filtrado por id
- `ride_events` INSERT filtrado por ride_id
- `messages` INSERT filtrado por ride_id
- `driver_current_location` UPDATE filtrado por driver_id

Cualquier update → refresca la sección correspondiente sin recargar la página.

---

## Detalles premium imprescindibles

- **Hero card** del detalle: mapa de fondo con overlay glass (60% opacity dark) sobre el cual flota el contenido. Sensación cinemática.
- **Timeline**: dot tiene halo pulsante si es el último estado y el ride está activo.
- **Status pill enorme** con shadow sutil y leve tilt (-1deg) para impacto visual.
- **Cards laterales**: stagger fade-up al cargar (delay 100ms cada una).
- **Botón Compartir**: al copiar URL, anima el icono → check verde por 2s.
- **Tarifa**: tabular grande (text-2xl), si difiere estimated vs final mostrar diff con flecha.
- **Mensajes chat**: bubbles con tail (CSS `clip-path` o pseudo elemento), max-width 70%.
- **Vacío en lista**: empty state con ilustración "No hay viajes en el rango seleccionado" + botón "Ampliar a 30 días".

---

## Validación

1. Navegar `/admin/rides`, filtrar por fecha y estado.
2. Click un row → detalle con timeline correcto, mapa con ruta, cards laterales pobladas.
3. Cancelar un viaje activo → confirma, status cambia, timeline agrega evento.
4. Compartir un viaje → URL copiable, abrirla en otra pestaña incógnito (sesión 11 implementa la pública; por ahora puede ser placeholder).
5. Mensajes muestran chat correctamente.
6. Realtime: cambiar manualmente status de un ride en SQL → la página actualiza.

---

## No hacer

- ❌ Implementar el creador de viaje manual (placeholder con TODO si no entra)
- ❌ Página pública `/shared/[token]` — eso es sesión 11
- ❌ Dispatcher live (sesión 07)

---

## Commit final

```bash
git add .
git commit -m "feat(admin): rides history table and detail view with timeline, route map, realtime"
git push
```
