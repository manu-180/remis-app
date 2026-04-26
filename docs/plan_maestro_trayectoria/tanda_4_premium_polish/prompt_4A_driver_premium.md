# Prompt 4A — Driver: animaciones, sonido, haptics, chat, micro-interacciones

> **LEÉ:** `00_design_language.md` (sec 7, 9, 11), `docs/brand/voice_tone.md`, `docs/brand/visual_narrative.md` (sec soundscape/haptics), `00_file_ownership_matrix.md`.

## Objetivo

Convertir el driver app funcional de Tanda 3A en una app **premium**: cada transición tiene curva intencional, cada estado tiene su micro-interacción, hay sonido y haptics calibrados, el chat con pasajero funciona, los botones gigantes responden a guantes y manos sucias. Sin agregar features fuera de chat — solo polish + chat.

## File ownership

✍️ `apps/driver/lib/features/**` (refinar), `apps/driver/lib/shared/widgets/**` (extender), `apps/driver/assets/**` (sonidos, haptics, ilustraciones).

## Steps

### 1. Sistema de animaciones del flujo

Usar `flutter_animate` package para coreografías. Cada transición de estado del ride tiene su animación:

#### `requested → assigned (acabo de aceptar)`

Splash de "Aceptado!" 600ms con:
- Fondo de tinte `--success-bg` con fade.
- Ícono check 64px que entra con scale 0 → 1.1 → 1.0 (spring).
- Vibration `MediumImpact`.
- Sonido confirm-soft 200ms.
- Después: fade hacia el `RideInProgressScreen`.

#### `en_route_to_pickup`

Mapa con cámara animada hacia bounds (mi ubicación + pickup) con `--ease-out` 800ms, padding generoso. Después follow-mode (cámara me sigue con bearing del heading).

Bottom sheet entra desde abajo con spring (stiffness 300, damping 30).

#### `waiting_passenger`

Cuando llego: animación celebratory **discreta** — el botón "Iniciar viaje" tiene un pulse sutil (scale 1.0 → 1.02 → 1.0 cada 2s) para invitar al tap. Cesar pulse después de 30s.

Timer de espera (`Esperando hace 1:23`) con tipografía mono que **no salta** (tabular-nums).

#### `on_trip → completed`

Pantalla resumen con coreografía:
- Mapa zoom-out con fade-in 400ms.
- Card de resumen entra desde abajo.
- Stats (km, min, $) hacen CountUp animation 600ms `--ease-out`.

### 2. Sonidos y haptics

Crear `assets/sounds/`:
- `pedido_nuevo.mp3` — 500ms, suave, distintivo (NO el default Android).
- `pedido_perdido.mp3` — descendente 300ms para auto-rechazo.
- `confirm_soft.mp3` — 200ms para confirmaciones.
- `sos_alert.mp3` — sirena suave para SOS.

`shared/audio_service.dart`:
```dart
class DriverAudio {
  static Future<void> play(SoundEffect e) async {
    if (await _shouldPlay()) await _player.play(AssetSource('sounds/${e.file}'));
    await _haptic(e.haptic);
  }
}
```

Mapping de eventos a (sonido + haptic):
- `RideOffer`: `pedido_nuevo` + `HeavyImpact` + `pattern [0,200,100,200,100,200]`.
- `RideAccepted`: `confirm_soft` + `MediumImpact`.
- `Arrived`: silencioso + `LightImpact`.
- `TripStarted`: silencioso + `LightImpact`.
- `TripEnded`: `confirm_soft` + `MediumImpact`.
- `RideOfferLost`: `pedido_perdido` + `LightImpact`.
- `SOSTriggered`: `sos_alert` (loop) + vibración continua.

Settings: el conductor puede mutear sonidos pero NO el haptic del nuevo pedido (regla del negocio).

### 3. Botones para guantes / manos sucias

`RPremiumActionButton` en `shared/widgets/`:
- Altura **72px** (no 64) en CTAs principales del flujo de ride.
- Padding horizontal 32.
- Tipografía 18px peso 600.
- Hit area extiende 8px más allá del visual.
- Touch feedback: ripple grande + scale 0.98 al press.
- Loading state: barra de progreso interna (no spinner).
- Confirmable hold-press (opcional): para "Finalizar viaje" agregar variante con hold 800ms para evitar tap accidental.

Aplicar en:
- "Aceptar pedido" (RideOfferModal).
- "Llegué al pickup".
- "Iniciar viaje".
- "Finalizar viaje".

### 4. Chat conductor↔pasajero

Nueva feature `features/chat/`. UI minimal estilo iMessage:
- Botón "Mensaje" en bottom sheet del flujo.
- Apertura: bottom sheet full-height.
- Lista mensajes (consume `messages` table con realtime).
- Input simple + 5 quick replies pre-armados ("En camino", "Llego en 2 min", "Estoy afuera", "No te encuentro", "Llamame").
- Send: INSERT a `messages`.
- Read receipt: `read_at = now()` cuando el receptor abre el chat.
- Indicador "..." cuando el otro lado está escribiendo (broadcast realtime "typing" event, ephemeral).
- Push notification al pasajero para mensajes nuevos (Tanda 3D `dispatch-fcm` con `type='message_received'`).

UI con tokens del DS, paleta cálida, esquinas redondeadas grandes en bubbles (radius-xl).

### 5. Mejoras de mapa

- **Marker propio** (auto del conductor): icono custom del DS, rotación suave en cambios de heading (interpolar 200ms).
- **Ruta animada**: dibujar polyline con animación "draw-on" 600ms al asignar.
- **Pin de pickup**: drop animation desde +20px con bounce al llegar.
- **Cluster** de varios pickup pendientes (raro pero posible): badges con número.

### 6. Empty states con personalidad

- HomeScreen offline: ilustración de auto estacionado al lado del pueblo (placeholder SVG hasta Tanda 1D entregue ilustraciones). Copy "Iniciá turno cuando estés listo".
- Sin pedidos en cola: "Tranquilo. Te avisamos cuando entre uno." (no spinner).

### 7. Toasts deshacibles

Sistema de toasts custom (NO el de Material por default):
- Aparición: slide-up + fade 240ms `--ease-out`.
- Persistencia: 4s (info), 8s (error), 30s (con acción).
- Stack vertical, max 3.
- Botón "Deshacer" inline en los relevantes.

Aplicar en: confirmaciones de aceptar/rechazar, fin de viaje, etc.

### 8. Modo conducción simple

Toggle en settings: "Modo conducción". Cuando está ON:
- Tipografía 1.15× más grande en pantallas del flujo.
- Botones todavía más grandes (h80).
- Mapa con menos detalles (declutter).
- Auto-activa con detección de movimiento >40 km/h por 30s sostenidos.

### 9. Indicador de batería del dispositivo

En el HUD de turno activo: si `battery < 20%` mostrar warning sutil "Tu batería está baja — conectá el cargador". Si `< 10%`: warning rojo permanente.

### 10. SOS premium polish

`RSosButton` ya en DS, pero acá pulir:
- Hold-press 2.5s.
- Countdown numérico visible (5...4...3...2...1).
- Anillo concéntrico que se llena.
- Vibración fuerte cada 0.5s mientras se sostiene.
- En liberación temprana: feedback "SOS cancelado".
- En completar: pantalla full red brevemente con "SOS enviado" antes de ir a la pantalla post-SOS.

### 11. Accessibility pass

- Todos los CTAs con `Semantics(label: ...)`.
- Anuncios de cambio de estado: cuando cambia status, `SemanticsService.announce`.
- Soporte de TextScale del sistema (probar con 1.5x).
- Foco lógico en cada pantalla (TalkBack/VoiceOver).

### 12. Rendimiento

- Eliminar `setState` granulares — usar Riverpod selectors.
- Cachear assets de mapa.
- Marker re-renders solo cuando cambia posición/estado, no en cada frame.

### 13. App icon, splash y launcher

Generar definitivos con `flutter_launcher_icons` y `flutter_native_splash` (o `flutter_native_splash`):
- Icon: foreground del DS.
- Splash: brand-primary fondo + logo blanco.
- Adaptive icon Android.

Asumir que el logo final existe (placeholder hasta Tanda 1D).

## Acceptance criteria

- [ ] Probar el flujo end-to-end y sentir las animaciones — no hay nada "duro" o brusco.
- [ ] Sonidos y haptics se disparan correctamente.
- [ ] Chat funciona con realtime + push.
- [ ] Botones premium responden bien con guantes (test físico).
- [ ] SOS premium con countdown.
- [ ] Modo conducción auto-activa a 40+ km/h.
- [ ] Accessibility: TalkBack/VoiceOver narra correctamente.
- [ ] No hay jank en transiciones (60fps mínimo, 90 cuando display lo soporta).
- [ ] Commit `feat(driver): premium animations, audio, haptics, chat`.

## Out of scope

- Pago al conductor (Tanda 4D).
- Masked calling Twilio (Tanda 5D).
- KYC selfie (Tanda 5D).

## Notas

- **No abusar de animaciones.** El conductor opera 8h. Una animación que se siente "wow" la primera vez se vuelve "agh" la décima. Si dudás, contenete.
- **`prefers-reduced-motion`:** respetá. Hay conductores con motion sickness.
