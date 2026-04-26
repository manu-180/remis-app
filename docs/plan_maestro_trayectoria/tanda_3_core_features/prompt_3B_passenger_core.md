# Prompt 3B — Passenger app: pedir + tracking + cancelar + historial

> **LEÉ:** `00_design_language.md` (sec 9, 11), `00_arquitectura.md`, `tanda_3_core_features/README.md`, `00_file_ownership_matrix.md`.

## Objetivo

Pasajero abre app, ve mapa, busca destino, pide remís (estimación de tarifa), espera asignación con UI honesta de "buscando conductor", cuando se asigna ve la posición en vivo del conductor (Realtime), durante el viaje sigue el avance, al final ve el resumen + opción de calificar (placeholder).

## File ownership

✍️ `apps/passenger/lib/features/{home, ride_request, tracking, history}/**`, `apps/passenger/lib/shared/widgets/**`.

## Steps

### 1. Búsqueda de destino

`features/ride_request/screens/destination_search_screen.dart` — full screen overlay sobre la home cuando el pasajero toca "¿A dónde vamos?".

UI:
```
┌─────────────────────────────────┐
│  [×]                            │
│                                 │
│  ¿A dónde vamos?                │
│                                 │
│  🔍 [input autocomplete]        │
│                                 │
│  Frecuentes                     │
│  📍 Casa — Centenario 1234      │
│  📍 Trabajo — San Martín 567    │
│                                 │
│  Recientes                      │
│  📍 Hospital                    │
│  📍 Terminal                    │
│                                 │
│  Sugerencias del pueblo         │
│  📍 Plaza San Martín            │
│  📍 Estación de servicio YPF    │
│  📍 Banco Nación                │
└─────────────────────────────────┘
```

Stack:
1. `frequent_addresses` del pasajero (top 5 por `use_count`).
2. Recientes (últimos 10 viajes únicos).
3. Sugerencias del pueblo (tabla `place_pois` que se seedea — POIs típicos del pueblo).
4. Si nada matchea, llamada a Google Places API restringida a una zona ~30 km del pueblo.

Al seleccionar destino → vuelve al home con destino seteado.

### 2. Confirmación + estimación de tarifa

Bottom sheet expandido con:
```
Origen
┌─────────────────────────────┐
│ ◉ Centenario 1234 (mi ubic) │
└─────────────────────────────┘

Destino
┌─────────────────────────────┐
│ 🏁 Plaza San Martín         │
└─────────────────────────────┘

Estimado
$1.200 — 8 min — 3.4 km
(Tarifa según ordenanza)

Pago
○ Efectivo  ● Mercado Pago

Notas (opcional)
[ esperar en el portón ]

[ Pedir remís ] (CTA accent xl full)
```

Lógica:
- Llamar RPC `estimate_fare(pickup_lat, pickup_lng, dest_lat, dest_lng)` al cargar.
- Mostrar breakdown si tap en el monto (popup).
- Pago default: efectivo (MP solo si `feature_flags.mp_payment_enabled=true`).
- Notas opcional, max 200 chars.

"Pedir remís" → INSERT en `rides` con `status='requested'`. Provider sub al canal `passenger:{me}:rides` para detectar transiciones.

### 3. Estado "Buscando conductor"

Después de pedir, navegamos a `WaitingScreen` full:

```
[ Cancelar pedido ]  ←  top button (subtle)

         🔍 (animation)
       Buscando conductor

   Estamos avisando a los choferes
   disponibles cerca tuyo.

   Esto puede tardar hasta 5 minutos.

   Si pasan 5 min y no asignamos,
   te llamamos por teléfono.
```

Animación: 3 puntos pulsantes + "🔍" suavemente moviéndose en círculo. NO una rueda de carga genérica.

Time-out: si pasan 5 min sin asignación, mostrar dialog "Estamos teniendo demora. ¿Querés que te llamemos?" (acción manual del despachante por ahora).

Botón cancelar: confirma → `cancel_ride(ride_id, 'passenger_cancelled_before_assign')` → vuelve al home.

### 4. Tracking del viaje (post-asignación)

Cuando llega UPDATE con `status='assigned'`:

`TrackingScreen` reemplaza el waiting:

```
┌─────────────────────────────────┐
│  [×]                            │
│                                 │
│         MAPA con conductor      │
│                                 │
│  📍 yo (pickup)                 │
│  🚗 conductor moviéndose        │
│                                 │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Mateo R. · Móvil 12         │ │
│ │ Toyota Corolla · ABC 123    │ │
│ │                             │ │
│ │ Llega en ~3 min             │ │
│ │                             │ │
│ │ [📞 llamar] [💬 mensaje]    │ │
│ │                             │ │
│ │ [Compartir viaje]           │ │
│ │ [Cancelar]                  │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

- Sub al canal Realtime `agency:{id}:locations` filtrando por `driver_id` asignado.
- Marker del conductor se mueve con interpolación suave (ver `00_design_language.md` sec 7 Movimiento — animar transform, no top/left).
- ETA recalculada cada UPDATE de posición (estimación naive: distancia restante / velocidad media).

Estados visuales por status:
- `assigned`: "Tu remís está saliendo" + ruta del conductor a vos.
- `en_route_to_pickup`: "Tu remís llega en X min" + ruta + ETA.
- `waiting_passenger`: "Tu remís está afuera" + foto pulsante del auto + número de móvil grande.
- `on_trip`: ruta del viaje, ETA al destino, "Estás en viaje" + scroll a abajo muestra route summary.
- `completed`: ver paso 5.

### 5. Compartir viaje

Botón → modal con:
- Link generado (`https://[domain]/v/{token}`).
- Botones nativos: WhatsApp, SMS, Copiar.
- Auto-mensaje: "Estoy yendo a [destino]. Seguí mi viaje: [link] (vence en X min)".
- Token UUID generado por RPC `create_shared_trip(ride_id)` con expiración default `ended_at + 30min` o 4h si no terminó aún.

### 6. Cancelar

Botón → confirm modal. Reglas:
- Antes de asignar: gratis.
- Asignado pero conductor aún no en pickup: gratis si <2min desde asignación; cargo $X después.
- Conductor llegó a pickup: cargo $X (no-show del pasajero).
- En viaje: NO cancelable desde app — instruir al pasajero a hablar con el conductor.

Confirmación: `cancel_ride(ride_id, reason)` RPC con role-aware reason.

### 7. Final del viaje

Cuando llega `status='completed'`:

```
✅ Viaje finalizado

Mateo R. · Móvil 12
Toyota Corolla · ABC 123

3.4 km · 12 min
$1.200 — Efectivo

¿Cómo estuvo?
⭐⭐⭐⭐⭐
[ Comentar (opcional) ]
[ Saltar ]
```

Calificación insertada en tabla `ride_ratings` (placeholder — crear migración mínima si no existe en Tanda 1A; sino dejar el insert para Tanda 5).

Volver al home con CTA "Volver a pedir" hacia el mismo destino frecuente.

### 8. HistoryScreen

Lista real (no mock). Query: `rides` del pasajero ordenados por `created_at desc`, paginado infinite-scroll de a 20.

Card de ride:
```
26 abr · 15:32                $1.200
🟢 Centenario 1234
🔴 Plaza San Martín
Mateo R. · Móvil 12 · ⭐ 5
[ Volver a pedir ] [ Ayuda ]
```

Tap → detalle con timeline + mapa de ruta + recibo (PDF generable en Tanda 5).

### 9. Notificaciones

Configurar FCM al inicio de la app. Tipos esperados (definidos en `tanda_3_core_features/README.md`):
- `ride_assigned`: "Tu remís está saliendo"
- `driver_arrived`: "Tu remís está afuera — Móvil 12"
- `trip_started`: "Viaje iniciado"
- `trip_ended`: "Viaje finalizado · $1.200"
- `ride_cancelled` (por conductor o despachante): "Tu pedido fue cancelado — buscamos otro conductor"

Tap en push → deep link a `TrackingScreen` con `ride_id`.

### 10. Mapa dark style

Cuando system theme es dark, aplicar JSON style oscuro a `GoogleMap` (custom style coherente con tokens). En light, el default de Google Maps con estilo limpio.

## Acceptance criteria

- [ ] Pedir remís inserta `rides` y la app pasa a "buscando".
- [ ] Cuando dispatcher asigna, la app navega a tracking automáticamente vía Realtime.
- [ ] Marker del conductor se mueve suavemente (no jumps).
- [ ] Compartir viaje genera link funcional (sin auth) que muestra el progreso.
- [ ] Cancelar respeta las reglas de tiempo / estado.
- [ ] HistoryScreen carga viajes reales paginados.
- [ ] FCM entrega los 4 tipos críticos.
- [ ] Commit `feat(passenger): full ride lifecycle with realtime tracking`.

## Out of scope

- MP integration (Tanda 4D).
- Chat con conductor (Tanda 4B).
- KYC pasajero (Tanda 5D).
- Recibo PDF (Tanda 5).

## Notas

- **No bloquear UI mientras se cancela:** mostrar el botón en estado loading, pero la app debe responder a tap del back.
- **Animar ETA:** cuando ETA cambia (15 → 12 → 9), animar el número con CountUp.
- **Página /v/{token} (web):** la maneja `apps/web` en Tanda 4D — pero la generación del token y compartir es responsabilidad acá.
