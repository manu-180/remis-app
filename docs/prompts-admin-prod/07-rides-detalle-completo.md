# Prompt 07 — Ride detail: reasignar, compartir, mensajes, navegación

## Objetivo

`/admin/rides/[id]` muestra timeline + mapa + datos pero le faltan acciones operativas clave:
- No se puede **reasignar conductor**.
- No se puede **generar link de viaje compartido** (la ruta `/shared/[token]` existe pero solo se llega vía token externo).
- Los mensajes son **read-only** (no hay input para que el dispatcher escriba).
- Las cards de Conductor / Vehículo no linkean al perfil del driver.
- Después de cancelar, redirige a la lista en vez de quedarse en el detalle.

**Tiempo estimado:** 2 horas.

## Contexto del proyecto

Mismo que prompts anteriores. RPCs disponibles: `assign_ride(ride_id, driver_id, dispatcher_id)`, `cancel_ride(ride_id, actor_id, reason)`, `create_shared_trip(ride_id, user_id)`. Tabla `messages` ya existe con RLS.

## Tareas concretas

### 1. Botón "Reasignar conductor"

`apps/dispatcher/src/components/admin/rides/ride-detail-client.tsx`

En el hero card del viaje, junto al botón "Cancelar viaje", agregar un botón "Reasignar conductor" que:

Solo se muestra cuando `ride.status IN ('assigned', 'en_route_to_pickup', 'waiting_passenger')`. Si `ride.status === 'on_trip'` no se reasigna (el viaje ya empezó), si es `completed` / `cancelled` tampoco.

Click → abre dialog con:
- Lista de conductores disponibles (filtrar por `current_status = 'available'` y `is_active = true`).
- Si el viaje pidió `vehicle_type` específico, filtrar por ese type.
- Mostrar nombre, vehículo, distancia al pickup (usando RPC `find_nearest_available_drivers`), rating, viajes completados.
- Permitir seleccionar uno → confirm.
- Submit: llamar RPC `assign_ride(ride_id, new_driver_id, dispatcher_id)` (que internamente debería liberar al conductor anterior y asignar el nuevo, idealmente en una transacción).

Si la RPC `assign_ride` no soporta reasignación (tira error si ya hay driver), agregamos una RPC nueva `reassign_ride(ride_id, new_driver_id, dispatcher_id, reason)` o hacemos:

```ts
// transaction-ish: cancelar el assignment actual y crear el nuevo
await sb.from('rides').update({ driver_id: null, assigned_at: null }).eq('id', ride.id);
await sb.rpc('assign_ride', { p_ride_id: ride.id, p_driver_id: new_driver_id, p_dispatcher_id: user.id });
```

Crear evento en `ride_events` con `from_status = ride.status`, `to_status = ride.status`, `metadata = { reason, prev_driver_id, new_driver_id }`.

### 2. Botón "Compartir viaje"

En la sección de "Acciones" (o nuevo card "Vista pública"):

- Botón "Generar link compartido".
- Click → llama RPC `create_shared_trip(ride_id, user_id)` que devuelve un `token`.
- Mostrar el link generado: `${origin}/shared/${token}` con botón "Copiar al portapapeles".
- Mostrar fecha de expiración (probablemente 24h o 7d según la RPC).
- Botón "Revocar" si ya hay un shared trip activo (UPDATE `shared_trips.revoked_at = NOW()`).

Si ya existía un shared trip vigente, mostrar el link existente sin generar uno nuevo. Query:

```sql
SELECT token, expires_at FROM shared_trips
WHERE ride_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
ORDER BY created_at DESC LIMIT 1;
```

Esta sección debe ser visible solo en viajes `IN ('assigned', 'en_route_to_pickup', 'waiting_passenger', 'on_trip')` — cuando ya terminó no tiene sentido compartir.

### 3. Mensajes con write

`apps/dispatcher/src/components/admin/rides/ride-detail-client.tsx:730-778`

Hoy es read-only. Agregar:

- Input textarea o single-line con `maxLength={2000}` (constraint de la tabla).
- Botón "Enviar".
- Submit:
  ```ts
  await sb.from('messages').insert({
    ride_id: ride.id,
    sender_id: user.id,
    body: text,
  });
  ```
  (RLS validará que el sender tenga permiso. El dispatcher / admin debería poder mandar en cualquier ride.)
- Después del insert, refetch la lista de mensajes (o realtime via channel).

UX:
- Sender propio (admin/dispatcher) alineado a la derecha, color distinto.
- Read-receipts si la columna `read_at` se llena (mostrar "Leído").
- Auto-scroll al fondo cuando llega un mensaje nuevo.
- Suscribirse a realtime: `sb.channel(\`messages-${ride.id}\`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: \`ride_id=eq.${ride.id}\` }, ...).subscribe()`.

### 4. Cards de Conductor y Vehículo linkean a perfil

`apps/dispatcher/src/components/admin/rides/ride-detail-client.tsx:562-631`

Cards que muestran "Conductor" / "Vehículo" no son clickeables. Hacerlas:

- Card Conductor → wrappear con `<Link href={\`/admin/drivers/${ride.driver_id}\`}>` y agregar `cursor-pointer`. Hover: `bg-[var(--neutral-50)]`.
- Card Vehículo → si querés, link a `/admin/drivers/{driver_id}?tab=vehicle` para ir directo al tab del vehículo en el perfil del conductor.

Si el viaje no tiene driver asignado (`requested`), no mostrar las cards.

### 5. Después de cancelar, refetch en vez de redirect

`apps/dispatcher/src/components/admin/rides/ride-detail-client.tsx:782-787`

Hoy `CancelDialog` al éxito hace `router.push('/admin/rides')`.

Cambiar a:
- `await refetch()` (que el detail-client ya tiene).
- Mostrar toast "Viaje cancelado".
- Mantenerse en la página: el ride ahora con status `cancelled_by_dispatcher` y `cancellation_reason` visibles.
- El timeline se actualiza con el nuevo evento.
- Las acciones (reasignar, compartir) se ocultan automáticamente porque el viaje terminó.

### 6. Acción "No-show" cuando waiting_passenger

Si `ride.status === 'waiting_passenger'`, agregar acción "Marcar como no-show" en el menú de acciones:

```ts
await sb.from('rides').update({
  status: 'no_show',
  cancelled_at: new Date().toISOString(),
  cancellation_reason: 'Pasajero no se presentó',
  ended_at: new Date().toISOString(),
}).eq('id', ride.id);

// Crear ride_event
await sb.from('ride_events').insert({
  ride_id: ride.id,
  from_status: 'waiting_passenger',
  to_status: 'no_show',
  actor_id: user.id,
  actor_role: 'dispatcher',
  metadata: { reason: 'no_show' },
});

// Bumpeamos counter del passenger
await sb.rpc('increment_passenger_no_shows', { p_passenger_id: ride.passenger_id });
// (si la RPC no existe, hacelo en cliente: SELECT total_no_shows + UPDATE)
```

### 7. Avg KPI fix en lista de rides

`apps/dispatcher/src/components/admin/rides/rides-list-client.tsx:148`

KPI "T. prom. asignación" hardcodeado a `null`. Calcular:

```sql
SELECT EXTRACT(EPOCH FROM AVG(assigned_at - requested_at))::numeric(10,2) AS avg_assign_secs
FROM rides
WHERE status NOT IN ('requested') AND assigned_at IS NOT NULL
  AND requested_at >= $from;
```

Implementar como RPC o como query directa en el client (con paginación si es necesario).

## Verificación

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint
pnpm dev
```

Manual:
1. `/admin/rides` → click un viaje activo (status `assigned` / `en_route` / `waiting`).
2. Botón "Reasignar conductor" visible → click → dialog con conductores disponibles → seleccionar otro → confirma → ride actualizado, timeline muestra el cambio.
3. Botón "Compartir viaje" → genera link → copiar → abrir en pestaña incógnita → ve la página pública.
4. Mensajes: escribir uno → aparece en la conversación → otro user (driver/passenger del seed) lo vería en realtime.
5. Click en card "Conductor" → navega a `/admin/drivers/{id}`.
6. Click en card "Vehículo" → idem.
7. Cancelar viaje → no redirige, se queda en detail con status actualizado.
8. Para un waiting_passenger, marcar como no-show → status cambia, contador del passenger se incrementa.
9. `/admin/rides` lista → KPI "T. prom. asignación" muestra valor real (no `—`).

## Commit

```
feat(rides): detail page operativa — reasignar, compartir, mensajes

- Botón "Reasignar conductor" con dialog de disponibles + assign_ride RPC
- Botón "Compartir viaje" con create_shared_trip RPC, copy-to-clipboard,
  expiración visible, revoke
- Mensajes con write + realtime subscribe + auto-scroll
- Cards Conductor/Vehículo linkean a /admin/drivers/[id]
- Cancelar: refetch en vez de redirect
- Acción "Marcar no-show" en waiting_passenger
- KPI "T. prom. asignación" calculado real en rides-list
```
