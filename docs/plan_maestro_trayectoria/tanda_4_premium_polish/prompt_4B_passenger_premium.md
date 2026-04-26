# Prompt 4B — Passenger: animaciones de tracking, ilustraciones, recibo visual

> **LEÉ:** `00_design_language.md` (sec 7, 9, 11), `docs/brand/voice_tone.md`, `docs/brand/visual_narrative.md`, `00_file_ownership_matrix.md`.

## Objetivo

Llevar el passenger app de Tanda 3B a nivel premium: tracking del conductor con interpolación suave estilo Uber/Cabify, transiciones entre pantallas con coreografía clara, ilustraciones custom en empty/success states, recibo visual elegante post-viaje, sensación general de calidez.

**Premisa:** la app del pasajero es la cara del producto. **El cliente la mostrará a sus conocidos.** Si se siente genérica, perdimos.

## File ownership

✍️ `apps/passenger/lib/features/**` (refinar), `apps/passenger/lib/shared/widgets/**` (extender), `apps/passenger/assets/**` (sonidos, ilustraciones).

## Steps

### 1. Animación del marker del conductor en mapa

Reemplazar el marker default por un widget animado:

```dart
class DriverMarker extends StatefulWidget {
  final LatLng position;       // viene del Realtime stream
  final double heading;        // grados
  final DriverStatus status;
}
```

Implementación:
- `AnimationController` por marker, duration 800ms.
- Cuando cambia `position`: interpolar `Tween<LatLng>` desde la anterior con `Curves.easeInOutCubic`.
- Cuando cambia `heading`: interpolar `Tween<double>` con `Curves.easeOut` 200ms.
- Renderizar en mapa con `RotationTransition` + custom widget marker (no PNG asset — SVG vector del DS).
- Halo pulsante alrededor del marker cuando `status='waiting_passenger'` (3 anillos concentricos con escalonamiento 600ms cada uno).

### 2. Ruta dibujada con animación "draw-on"

Cuando llega `assigned`, la polyline del conductor a vos se dibuja:
- 800ms con `Curves.easeOut`.
- Color `--brand-accent` con stroke gradient (más opaco al inicio, más claro al final).
- Width 4px.

`google_maps_flutter` no soporta nativo "draw progresivo" — implementar con N polylines parciales reemplazando cada 16ms (60fps). Usar `Tween<int>` sobre el índice de puntos.

### 3. ETA viva con CountUp

Cuando ETA cambia (15 min → 12 min → 9 min):
- Usar `AnimatedFlipCounter` o `CountUp` package.
- Duration 600ms, easing `--ease-out`.
- Si baja: tipografía pulse sutil.

Tabular-nums (`fontFeatures: [FontFeature.tabularFigures()]`) para que el número no salte en ancho.

### 4. Transiciones entre pantallas

Coreografía premium:

#### Home → DestinationSearch (full screen overlay)
- Full screen modal slide-up con spring (stiffness 280, damping 28).
- 320ms.

#### Home → Waiting (después de pedir)
- Background card "¿A dónde vamos?" se hace shrink hacia el centro y se transforma en el indicador "Buscando".
- 600ms coreografía: card scale 1 → 0.85, opacity 1 → 0.4, mientras emerge la pantalla Waiting con scale 0.95 → 1.0.
- Hero animation (Flutter `Hero` widget) entre el ícono pickup del card y el ícono central del waiting.

#### Waiting → Tracking (asignación)
- Cross-fade 400ms con sutil scale 1.02 → 1.0.
- Vibration LightImpact + sonido `confirm_soft` 200ms.
- Toast "Mateo va a buscarte" entrando desde arriba.

#### Tracking → Final (completed)
- Mapa fades to overlay; resumen card emerge desde abajo con spring.
- Fondo: tinte sutil success-bg.

### 5. Pantalla "Buscando conductor" — premium

Reemplazar el placeholder de 3B con composición premium:

```
┌─────────────────────────────────┐
│  [×]                            │
│                                 │
│         🔍 (animation)          │ ← ilustración custom centro
│                                 │
│   Buscando un conductor         │ ← Inter Tight 28px 600
│                                 │
│   3 choferes recibieron         │ ← Inter 16px 400 neutral-600
│   tu pedido                     │
│                                 │
│   ⏱ Promedio: 2 min de espera   │ ← stat opcional
│                                 │
│   ▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░     │ ← progress bar sutil indeterminado
│                                 │
│                                 │
│   [ Cancelar pedido ]           │
└─────────────────────────────────┘
```

Animación central: 3 ondas concéntricas emergiendo desde un punto central (representando "broadcast a choferes"), cada onda pulsa cada 1.2s, opacity 0 → 0.6 → 0, scale 0.5 → 1.5. Encima un ícono de remís sutil estático.

Si pasan 90s sin asignación: copy cambia suavemente a "Estamos seguro tardando más de lo normal. Aguantá un toque." (sin alarmar).

### 6. Tracking — bottom sheet premium

Bottom sheet en `TrackingScreen`:
- 3 stops con `DraggableScrollableSheet`.
- Drag handle visible y obvio (44×4 neutral-300).
- Spring physics al soltar.
- Backdrop: cuando full-height, mapa pasa a opacity 0.5 con tinte primary.

Contenido del bottom sheet refinado:

```
┌─────────────────────────────────┐
│      ━━━━                       │ ← drag handle
│                                 │
│  [ avatar ]   Mateo Rodríguez   │
│               Móvil 12 · ⭐ 5.0 │
│                                 │
│   Toyota Corolla · Blanco       │
│   ABC 123                       │
│                                 │
│   ──────────────────────────    │
│                                 │
│   Llega en  ⌐3 min¬ (countup)  │ ← énfasis visual
│                                 │
│   ──────────────────────────    │
│                                 │
│  [📞] [💬] [📤 Compartir viaje] │
│                                 │
│  [ Cancelar ]                   │ ← ghost destructive
└─────────────────────────────────┘
```

Botón compartir abre share sheet nativo con auto-mensaje.

### 7. Recibo visual post-viaje

Pantalla `RideCompletedScreen` redesign premium:

```
┌─────────────────────────────────┐
│          ✓ (animation)          │
│                                 │
│       Viaje finalizado          │
│                                 │
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │   $1.200                │   │ ← display 48px
│   │   Efectivo              │   │
│   │                         │   │
│   │ ─────────────────────── │   │
│   │ 📍 Centenario 1234      │   │
│   │ 🏁 Plaza San Martín     │   │
│   │                         │   │
│   │ 3.4 km  ·  12 min       │   │
│   │ Hoy 15:32               │   │
│   │                         │   │
│   │ Mateo R. · Móvil 12     │   │
│   │ Toyota Corolla · ABC123 │   │
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │
│   ¿Cómo estuvo?                 │
│   ⭐ ⭐ ⭐ ⭐ ⭐                  │
│                                 │
│   [ Listo ]                     │
└─────────────────────────────────┘
```

Detalles premium:
- El check inicial: scale 0 → 1.1 → 1.0 spring + sutil glow `--success`.
- Card del recibo: bordes con `radius-xl`, sombra `--shadow-md`, fondo `--neutral-100`.
- El monto hace CountUp 800ms desde 0.
- Estrellas: tap → fill animation con stagger 80ms cada una.
- Línea divisoria con dash pattern (estilo recibo de papel).

Botón "Descargar recibo" → genera PDF (placeholder Tanda 5; por ahora copia al clipboard un texto con datos).

### 8. Empty states con ilustraciones

Encargar / placeholder ilustraciones flat-warm-paleta para:
- HistoryScreen vacío: "Tu primer viaje está esperando." + ilustración camino pampeano.
- Sin internet: ilustración nube tachada + "Sin conexión. Probá en un toque."
- Permiso ubicación denegado: pin tachado + "Necesitamos ver dónde estás."
- Pedido cancelado: corazón roto sutil + "Cancelado. Pedí otro cuando quieras."

Mientras se resuelven los assets reales, generar SVGs minimalistas con la paleta cálida del DS (no usar Lottie genérico).

### 9. Frecuentes inteligentes

`HomeScreen` chips de frecuentes mejorados:
- "Casa" (primer viaje guardado o el más usado por noche).
- "Trabajo" (más usado por mañana).
- Top 3 destinos del último mes.

Algoritmo en `frequent_addresses_ranker.dart` que combina `use_count` + recencia + hora del día actual (boost a destinos consistentes con la hora actual).

### 10. Sonidos passenger

Pequeños, suaves:
- `assigned.mp3` 200ms (cuando llega conductor asignado).
- `arrived.mp3` 300ms (cuando dispatcher marca driver_arrived → push).
- Ninguno en cancelación (UI de error es suficiente, no agredir).

Default OFF en system mute. Toggle en settings.

### 11. Haptics

- LightImpact en CTAs principales.
- MediumImpact en confirmaciones (pedir remís, cancelar).
- HeavyImpact solo si hay error grave (pedido fallido).

### 12. Calidez de copy

Pasar todos los textos por la lente de `voice_tone.md`:
- "Buscando un conductor cerca tuyo" no "Procesando solicitud".
- "Llega en 3 min" no "ETA: 3 min".
- "Listo." no "Operación exitosa".
- "Algo salió mal — probá de nuevo o llamá al 02954-XXX-XXX." no "Error 500".

Crear archivo `lib/copy.dart` centralizando strings con IDs (preparado para i18n futuro).

### 13. Mapa dark style refinado

Style JSON custom para Google Maps que coincida con tokens dark del DS:
- Roads: neutral-200/300 lines on neutral-900 background.
- Water: brand-primary muy oscurecido.
- POIs: neutral-500 con íconos minimal.
- Sin chatarra (sin amenities innecesarias, sin labels comerciales pequeñas).

Archivo `assets/map_style_dark.json` cargado en `GoogleMap.style:`.

### 14. Performance

- Image cache para avatars (`cached_network_image`).
- Map markers reusables (no recrear en cada rebuild).
- Lista de history con virtualización (`ListView.builder` con `itemExtent`).

### 15. App icon + splash final

- `flutter_launcher_icons` con foreground/background del DS.
- Splash: gradient sutil brand-primary → un poco más claro + logo blanco centrado.
- iOS dark variant del splash.

## Acceptance criteria

- [ ] Marker del conductor se mueve fluido (sin jumps), heading rota suave.
- [ ] Polyline draw-on funciona y se ve profesional.
- [ ] Coreografía Home→Waiting→Tracking se siente continua, no abrupta.
- [ ] Recibo post-viaje impacta — mostrarlo a alguien que no conoce el proyecto y debería decir "qué linda app".
- [ ] Empty states tienen ilustración (placeholder OK pero ya en su lugar).
- [ ] Tracking ETA hace countup, no salta.
- [ ] `prefers-reduced-motion` respetado (todas las animaciones tienen fallback estático).
- [ ] 60fps sostenido durante el tracking (probar con DevTools profiler).
- [ ] Commit `feat(passenger): premium animations, illustrations, polished tracking`.

## Out of scope

- Pago MP (Tanda 4D — pero la pantalla de "Pagá con MP" debe estar **conectada visualmente** al flujo, los hooks vienen de 4D).
- KYC pasajero (Tanda 5D).
- PDF de recibo (Tanda 5).

## Notas

- **Coordinación con 4D:** la pantalla de selección de pago en confirmación de pedido la diseñás vos (UI), pero la lógica de generación de preferencia y Custom Tab la implementa 4D. Dejá los hooks/callbacks claros (`onPaymentMethodSelected(MpFlow.start())`).
- **Test físico:** abrir la app sin presentar contexto a alguien no técnico ("¿Pedirías un remís con esto?"). El feedback informal vale más que cualquier checklist.
