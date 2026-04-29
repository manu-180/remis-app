# Sesión 08 — Centro SOS: panel crítico de emergencias

> **Sesiones previas**: 00 → 07.

---

## Objetivo

Construir el **Centro SOS**, un panel diseñado para gestionar emergencias en vivo con la urgencia visual y operacional que requieren. Cuando un pasajero o conductor activa el panic button, esta pantalla muestra todo lo necesario para responder en segundos: snapshot completo, ubicación en tiempo real, contactos, acciones rápidas, y registro de la resolución. Esta es probablemente la pantalla más sensible del producto — **tiene que transmitir calma + información clara, no caos**.

---

## Contexto Supabase

Tabla `sos_events`:
- `id` (uuid)
- `ride_id` (nullable — puede ser un SOS sin ride asociado)
- `triggered_by` (profile id)
- `triggered_role` (passenger / driver / dispatcher / admin)
- `location` (geography Point)
- `prior_locations` (jsonb — array de últimas posiciones antes del trigger)
- `driver_snapshot`, `passenger_snapshot`, `vehicle_snapshot` (jsonb con info al momento del SOS)
- `dispatched_to_dispatcher` (bool)
- `external_contacts_notified` (jsonb — lista de personas notificadas)
- `resolved_at`, `resolved_by`, `resolution_notes`
- `created_at`

RLS: `is_dispatcher_or_admin()` puede leer/update.

---

## Entregables

### Parte A — Página `/admin/sos`

Reescribir `apps/dispatcher/src/app/(admin)/admin/sos/page.tsx`.

Layout:
```
┌──────────────────────────────────────────────────────────┐
│ [Activos: 2] [Resueltos hoy: 5] [Tiempo prom resp: 3:42] │
├──────────────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌────────────────────────────────────┐  │
│ │ Cola activa │  │ Mapa overview con todos los SOS    │  │
│ │ (lista)     │  │ activos                            │  │
│ │             │  │                                    │  │
│ │             │  │                                    │  │
│ └─────────────┘  └────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│ Histórico (DataTable filtrable, últimos 30 días)         │
└──────────────────────────────────────────────────────────┘
```

#### Cola activa (lista lateral)

Lista de SOS abiertos (`resolved_at IS NULL`), ordenados por `created_at DESC`. Cada item:
- Background `bg-[var(--danger-bg)]` con left border 4px `var(--danger)`.
- Pulse soft 2s infinite.
- Triggered_role icon + nombre del actor + relative time ("hace 2 min").
- Si tiene `ride_id`: pequeño badge con short ID.
- Click → abre el detalle (drawer fullscreen o navega a `/admin/sos/[id]`).

> **Sonido**: cuando entra un SOS nuevo (postgres_changes INSERT), reproducir alarma específica (más urgente que el sonido de ride). Continuar reproduciendo cada 30s mientras haya un SOS activo no atendido (no `dispatched_to_dispatcher`).

#### Mapa overview

MapLibre con markers de cada SOS activo:
- Icono `AlertTriangle` rojo grande con pulse.
- Click → abre detalle.
- Auto-fit bounds.

#### Histórico DataTable

Columnas:
- Tiempo (relative + absoluto en tooltip)
- Triggered_by (avatar + nombre + rol)
- Ride (link short ID si aplica)
- Ubicación (dirección reverse-geocoded — para esta sesión: lat,lng simple)
- Estado: Resuelto (verde) / Activo (rojo pulsante)
- Resuelto por
- Tiempo de respuesta (resolved_at - created_at)
- Acciones: Ver

### Parte B — Detalle `/admin/sos/[id]`

Crear `apps/dispatcher/src/app/(admin)/admin/sos/[id]/page.tsx`.

Layout:
```
┌──────────────────────────────────────────────────────────┐
│ Hero rojo con info crítica + acciones rápidas            │
├──────────────────────────────────┬───────────────────────┤
│ Mapa fullscreen con trail        │ Persona que activó    │
│  - Punto SOS (rojo pulsante)     │ Conductor             │
│  - Trail de prior_locations      │ Pasajero              │
│  - Driver actual si activo       │ Vehículo              │
│                                  │ Ride (si aplica)      │
├──────────────────────────────────┴───────────────────────┤
│ Timeline de acciones tomadas + form para agregar nota    │
└──────────────────────────────────────────────────────────┘
```

#### Hero rojo

- Background `bg-[var(--danger)]` con gradient overlay.
- Texto blanco.
- Icon `AlertOctagon` 64px.
- "SOS activo · hace 5 min 23s" (cronómetro live).
- Triggered by: avatar + nombre + rol + teléfono (con click-to-call si `tel:` schema).
- Si tiene ride: link al ride.
- Acciones grandes:
  - **"Marcar como atendiendo"** (toggle `dispatched_to_dispatcher = true`) — si false, este botón es prominente
  - **"Llamar 911"** (link `tel:911`)
  - **"Llamar al conductor"** (si hay teléfono)
  - **"Llamar al pasajero"** (si hay teléfono)
  - **"Resolver"** (modal con notas + confirma)

#### Mapa con trail

- Fullscreen del card (height 480px).
- Marker rojo del punto SOS (pulse heavy).
- Polyline animada con `prior_locations` (color naranja → rojo gradient, breadcrumb dots cada N).
- Si hay `ride.driver_id` y el driver tiene `driver_current_location` → marker driver actualizándose en realtime.
- Auto-zoom para mostrar todo.
- Botón "Ver dirección" → reverse geocode (placeholder por ahora; usar Nominatim free tier o solo lat/lng).

#### Snapshots

Cards con `driver_snapshot`, `passenger_snapshot`, `vehicle_snapshot` formateados. Mostrar el JSON estructurado (campos comunes: nombre, teléfono, plate, etc.).

#### Timeline + notas

- Lista de acciones registradas (mock por ahora — guardar en `audit_log` cuando admin haga click "marcar atendiendo", "agregó nota", etc.). Cada acción con timestamp + actor + descripción.
- Form para agregar nota: textarea + botón "Agregar". Insert en `audit_log` con entity='sos_events', action='note', diff con la nota.

#### Resolver

ConfirmDialog con:
- Notas finales (textarea, requerido)
- Botón rojo "Resolver SOS"
- Update: `resolved_at = now(), resolved_by = profile.id, resolution_notes = ...`
- Toast confirmación + redirect a la lista.

### Parte C — Hook global de SOS

Crear `apps/dispatcher/src/hooks/use-sos-watcher.ts`:

- Suscribe a `sos_events` INSERT donde `resolved_at IS NULL`.
- Cuando entra un nuevo SOS:
  - Toast crítico (variante danger, sin auto-dismiss, con action "Ver SOS" → navega a `/admin/sos/[id]`)
  - Sonido `playSosSound`
  - Si la pestaña está hidden → notificación browser + title flash
- Mantener un store mini con count de activos para badge sidebar.

Montar en `AdminShell` (siempre activo cuando admin esté logueado, en cualquier página del admin).

### Parte D — Sonido SOS

Crear `apps/dispatcher/public/sos-alarm.mp3` (placeholder — usar un beep generado o un asset libre). Implementar en `@/lib/sounds`:

```ts
export function playSosSound() { /* loop until stopped */ }
export function stopSosSound() { /* ... */ }
```

> Si no se puede asset, generar tono con Web Audio API (`OscillatorNode` 880Hz alternando 440Hz, 200ms cada uno, 3 ciclos).

### Parte E — Reverse geocoding (opcional, microsegundo)

Crear `apps/dispatcher/src/lib/geocode.ts`:

```ts
export async function reverseGeocode(lat: number, lng: number): Promise<string | null>
```

Usar Nominatim public (`https://nominatim.openstreetmap.org/reverse?format=json&lat=...&lon=...`). Cachear por par lat,lng round 4 decimales. Rate limit cliente: max 1 req/seg. Si falla, retornar `null`.

> Esto es opcional — si entra apretado, mostrar lat,lng raw.

---

## Detalles premium imprescindibles

- **Hero rojo**: NO usar rojo saturado plano — usar gradient `linear-gradient(135deg, var(--danger), color-mix(in oklab, var(--danger) 80%, black))`. Sutil pero presente.
- **Cronómetro live**: actualiza cada segundo, formato `mm:ss` o `Xh Ym Zs` si > 1h, tabular.
- **Trail polyline**: dasharray animado `stroke-dashoffset` para sensación de "recorrido".
- **Marker SOS**: 3 capas concéntricas con pulse staggered (delay 200/400/600ms).
- **Toasts SOS**: side `top-center`, mucho más grandes que toasts normales, no auto-dismiss, ring `var(--danger)` y left icon `AlertOctagon`.
- **Botones de acción**: grandes (h-12), full-width en mobile, con iconos prominentes.
- **Sonido**: volumen 80% por default (alto a propósito), control de mute global.
- **Empty state lista activa**: cuando no hay SOS — verde claro con check + texto "Sin emergencias activas". Microcopy "Buen turno 🙏" (sí, emoji acá está OK por el efecto humano).
- **Resolved**: cuando un SOS se resuelve con éxito, micro-confeti opcional desde el botón (no exagerar — 6 partículas CSS).

---

## Validación

1. `pnpm typecheck`, `pnpm lint`.
2. Insertar SOS via SQL:
   ```sql
   INSERT INTO sos_events (triggered_by, triggered_role, location)
   VALUES ((SELECT id FROM profiles LIMIT 1), 'passenger', ST_GeogFromText('SRID=4326;POINT(-64.27 -36.62)'));
   ```
   → Sonar alarma, toast crítico, badge sidebar +1.
3. Visitar `/admin/sos` → SOS aparece en lista activa con pulse.
4. Click → detalle con cronómetro, mapa, snapshots.
5. Marcar "Atendiendo" → cambia visualmente (pulse menos agresivo, badge cambia color).
6. Resolver con notas → desaparece de lista activa, aparece en histórico.
7. Probar con SOS sin `ride_id` y SOS asociado a ride.

---

## No hacer

- ❌ Implementar el flow real de notificación a contactos externos
- ❌ Llamadas integradas (Twilio Proxy) — usar `tel:` link simple
- ❌ Tocar admin core o dispatcher live

---

## Commit final

```bash
git add .
git commit -m "feat(admin): SOS center with live queue, map trail, snapshots and resolution flow"
git push
```
