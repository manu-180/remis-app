# Prompt 11 — Vista pública /shared/[token] con mapa realtime

## Objetivo

`/shared/[token]` hoy muestra info textual: estado, origen, destino, conductor, ETA en número. Para una "vista compartida del viaje" eso es una decepción visual brutal — el usuario espera **ver el auto moverse en un mapa**.

Este prompt deja la página pública con:
- Mapa MapLibre full-screen con la posición del conductor en realtime
- Línea de ruta hasta el pickup / destino
- ETA refresh cada 30s
- Botón "Llamar conductor" en mobile (con caveat, masked calling no está)
- Estado del viaje arriba (banner)

**Tiempo estimado:** 2 horas.

## Contexto del proyecto

Mismo que prompts anteriores. Tabla `driver_current_location` con PostGIS, `rides` con pickup_location y dest_location. Realtime ya está habilitado a nivel proyecto. RPC `get_shared_trip(p_token)` devuelve datos sin auth.

**La página es PÚBLICA** (sin login). Importante: no exponer PII innecesaria.

## Tareas concretas

### 1. Validar / extender la RPC `get_shared_trip`

Vía MCP, ver el body actual de la función:

```sql
SELECT pg_get_functiondef('public.get_shared_trip(uuid)'::regprocedure);
```

(O `\df+ get_shared_trip` en SQL editor.)

La función debería devolver al menos:
- ride_id
- status
- pickup_lat, pickup_lng, pickup_address
- dest_lat, dest_lng, dest_address
- driver_first_name (solo nombre, NO apellido completo — privacy)
- vehicle_make, vehicle_model, vehicle_color, vehicle_plate (último útil para el pasajero identificar el auto)
- driver_lat, driver_lng (si está available)
- driver_heading
- estimated_arrival_seconds
- requested_at

Si **no incluye `driver_lat/lng/heading`**, extender la función vía `apply_migration`:

```sql
CREATE OR REPLACE FUNCTION public.get_shared_trip(p_token uuid)
RETURNS TABLE (
  ride_id uuid,
  status ride_status,
  pickup_lat double precision,
  pickup_lng double precision,
  pickup_address text,
  dest_lat double precision,
  dest_lng double precision,
  dest_address text,
  driver_first_name text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  vehicle_plate text,
  driver_lat double precision,
  driver_lng double precision,
  driver_heading double precision,
  eta_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.status,
    ST_Y(r.pickup_location::geometry),
    ST_X(r.pickup_location::geometry),
    r.pickup_address,
    ST_Y(r.dest_location::geometry),
    ST_X(r.dest_location::geometry),
    r.dest_address,
    split_part(p_drv.full_name, ' ', 1),
    v.make, v.model, v.color, v.plate,
    ST_Y(dcl.location::geometry),
    ST_X(dcl.location::geometry),
    dcl.heading,
    NULL::integer  -- TODO: calcular ETA si tenés routing engine
  FROM public.shared_trips st
  JOIN public.rides r ON r.id = st.ride_id
  LEFT JOIN public.profiles p_drv ON p_drv.id = r.driver_id
  LEFT JOIN public.drivers d ON d.id = r.driver_id
  LEFT JOIN public.vehicles v ON v.id = d.vehicle_id
  LEFT JOIN public.driver_current_location dcl ON dcl.driver_id = r.driver_id
  WHERE st.token = p_token
    AND st.revoked_at IS NULL
    AND st.expires_at > NOW();
END;
$$;
```

(Nota: `SECURITY DEFINER` es necesario porque el caller es anónimo. Asegurate de que la función NO devuelva nada si el token no es válido.)

Regenerar tipos con MCP.

### 2. Layout fullscreen del mapa

`apps/dispatcher/src/app/shared/[token]/page.tsx`

Hoy renderiza una página de info. Reemplazar por:

```
[Header banner: estado del viaje, mini-info del conductor + auto]
[ === MAPA fullscreen === ]
[Botón flotante "Llamar conductor" abajo derecha (solo mobile)]
```

El mapa ocupa toda la pantalla. El header es overlay translúcido arriba. Sin sidebar (la página NO usa el shell admin).

### 3. Componente cliente con realtime

Crear `apps/dispatcher/src/app/shared/[token]/shared-trip-client.tsx` (`'use client'`):

- Recibe `initialTrip: SharedTrip` del server component (RPC call inicial).
- Mantiene state local con la info actualizada.
- Suscribirse a Supabase realtime en `driver_current_location` con filtro por `driver_id = trip.driver_id`:

```ts
useEffect(() => {
  if (!trip.driver_id) return;
  const ch = supabase
    .channel(`shared-${token}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'driver_current_location',
      filter: `driver_id=eq.${trip.driver_id}`,
    }, (payload) => {
      setTrip(prev => ({ ...prev, driver_lat: payload.new.location.lat, driver_lng: payload.new.location.lng, driver_heading: payload.new.heading }));
    })
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}, [trip.driver_id, token]);
```

(Adaptá según el shape real del payload — PostGIS geography puede venir como WKB / WKT, requiere parseo. Si es problema, usar polling cada 5s a la RPC en vez de realtime puro.)

- Suscribirse también a `rides` para detectar cambios de status (`assigned` → `en_route_to_pickup` → `on_trip` → `completed`).

### 4. Mapa MapLibre

Configurar el mapa:
- Centro inicial: punto medio entre pickup y conductor (si hay) o pickup solo.
- Zoom: 14.
- Marcadores:
  - Pickup: pin azul/verde (origen)
  - Dest: pin rojo/morado (destino)
  - Conductor: ícono de auto rotado según `heading`. Animar transiciones al recibir nuevo location.
- Línea (LineString) de pickup → dest si el viaje no empezó.
- Línea de driver → pickup si está `en_route_to_pickup`.
- Línea de driver → dest si está `on_trip`.

Usá `react-map-gl/maplibre` y `maplibre-gl` (mismo stack que dispatch live).

Para íconos del auto, podés usar un SVG inline rotado con `transform: rotate(${heading}deg)`. Tamaño 40px.

### 5. Header banner con info

Arriba del mapa, un card translúcido fijo:

```
┌────────────────────────────────────────────────┐
│ 🚖 Tu remis está en camino                      │
│ Sebastián • Chevrolet Onix gris (AE125XY)       │
│ Llega en aproximadamente 4 minutos              │
└────────────────────────────────────────────────┘
```

- Estado: cambia según `ride.status`:
  - `assigned`: "Asignamos un remis a tu pedido"
  - `en_route_to_pickup`: "Tu remis está en camino"
  - `waiting_passenger`: "Tu remis llegó. Esperando que subas."
  - `on_trip`: "En viaje a [destino]"
  - `completed`: "Viaje completado. ¡Gracias!"
  - `cancelled_*`: "Viaje cancelado"

- Info: nombre del conductor (solo primer nombre), make + model + color + plate, ETA.

### 6. Refresh ETA / fallback

Si la RPC no calcula ETA hoy (es `NULL`), implementar un cálculo simple client-side:

```ts
function estimateEta(driverLat, driverLng, destLat, destLng): string {
  const distanceKm = haversineKm({lat: driverLat, lng: driverLng}, {lat: destLat, lng: destLng});
  const speedKmh = 30; // promedio urbano
  const minutes = Math.max(1, Math.round((distanceKm / speedKmh) * 60));
  return `${minutes} min`;
}
```

(Para producción real querés integrar con un routing engine — OSRM, Mapbox Directions, Google Directions. Para el demo, haversine alcanza.)

Refrescar cada 30s aunque no llegue un evento de realtime (failsafe).

### 7. Botón "Llamar conductor" en mobile

Floating action button abajo derecha:

```tsx
<a href={`tel:${trip.driver_mobile}`} className="md:hidden fixed bottom-6 right-6 ...">
  <Phone />
  Llamar
</a>
```

(Como con el SOS, en desktop mostrar dialog con el número visible para copiar.)

**IMPORTANTE**: hoy `get_shared_trip` no devuelve `driver_mobile` (es PII). Decisión:
- **Opción A**: omitir el botón llamar.
- **Opción B**: extender la RPC para devolver el número con masked calling enabled (caller_id Twilio).
- **Opción C**: devolver el número directo (privacy weak, pero funcional para demo).

Recomendado: **Opción A para el demo** (no incluir botón). Cuando se integre Twilio masked calling, agregar.

### 8. Mensaje de "expirado / revocado"

Si la RPC devuelve null (token expirado o revocado), `notFound()` lleva a la 404 default. Mejor: una página propia.

Crear `apps/dispatcher/src/app/shared/[token]/expired/page.tsx` con mensaje "El link del viaje compartido expiró o fue revocado". Y desde `page.tsx` redirige acá si no encuentra trip.

(O dejar el `error.tsx` del prompt 01 hacer el trabajo si redirige a una variante.)

### 9. Open Graph / metadata

Si alguien comparte el link en WhatsApp / Twitter, queremos que se vea premium:

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { token } = await params;
  // No queremos llamar a la RPC para metadata si es gratis cada vez
  return {
    title: 'Seguí tu remis en vivo • RemisDespacho',
    description: 'Mirá la ubicación de tu remis en tiempo real.',
    openGraph: {
      title: 'Tu remis en camino',
      description: 'Seguí en vivo la ubicación del conductor.',
      images: [{ url: '/og-shared-trip.png' }],
    },
  };
}
```

Crear `public/og-shared-trip.png` (1200x630) con un mockup del mapa + brand. Si no querés diseñar uno, usar un placeholder con texto.

## Verificación

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint
pnpm dev
```

Manual:
1. Como admin, abrir `/admin/rides/{ride-activo-id}` (uno con status `en_route_to_pickup` o `on_trip`).
2. Generar link compartido (prompt 07) → copiar URL.
3. Abrir URL en otra pestaña / browser incógnito (sin sesión).
4. Ver mapa fullscreen con:
   - Marcadores de pickup, dest, conductor.
   - Línea de ruta dinámica según status.
   - Header con estado, conductor, vehículo, ETA.
5. En el admin, mover el conductor (UPDATE driver_current_location) → en el shared, el marcador se mueve en realtime.
6. Cambiar el status del ride (`UPDATE rides SET status = 'on_trip'`) → el header se actualiza.
7. Revocar el shared (`UPDATE shared_trips SET revoked_at = NOW()`) → recargar la URL → mensaje "expirado".
8. Compartir el link en WhatsApp → preview con title + description + image.

## Commit

```
feat(shared-trip): mapa MapLibre fullscreen con realtime

- RPC get_shared_trip: extendida con driver_lat/lng/heading + vehicle info
- shared-trip-client: realtime subscribe a driver_current_location y rides
- Mapa fullscreen con marcadores pickup/dest/driver y línea de ruta
- Header overlay con estado del viaje (5 variantes), conductor, vehículo, ETA
- Auto-rotación del ícono del auto según heading
- ETA cliente con haversine como fallback (refresh cada 30s)
- Página /expired para token revocado o vencido
- OG metadata para que se vea premium en WhatsApp / redes
```
