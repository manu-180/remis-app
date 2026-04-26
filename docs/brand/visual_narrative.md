> **Borrador para revisión con cliente. Versión 0.1.0**

# [NOMBRE] — Narrativa Visual

**Audiencia:** Diseñadores, animadores y desarrolladores que construyen assets visuales para [NOMBRE].
**Alcance:** UI productiva (app pasajero + app conductor + panel despachante) y landing/marketing.
**Filosofía:** "Premium Pampeano" — sobrio, confiable, denso de información sin ser cargado.

---

## Índice

1. [Fotografía e Ilustración](#1-fotografía--ilustración)
2. [Paleta Narrativa "Atardecer Pampeano"](#2-paleta-narrativa-atardecer-pampeano)
3. [Iconografía Custom](#3-iconografía-custom)
4. [Soundscape y Haptics](#4-soundscape--haptics)
5. [Motion Brand](#5-motion-brand)

---

## 1. Fotografía / Ilustración

### Principio rector

**Cero stock photos.** Sin excepciones. El uso de fotografía genérica destruye la credibilidad local que es el activo central del producto.

### Ilustración (onboarding, empty states, errores)

Encargar un **set custom de ilustraciones planas**, no comprar ilustraciones existentes. El brief para el ilustrador:

| Atributo | Especificación |
|---|---|
| Estilo de referencia | Cabify meets Whitespace Studio — lineal plano, no isométrico |
| Paleta | Cálida, anclada a `--brand-primary` (#1B2A4E) y `--brand-accent` (#D97706) |
| Trazo | 1.5px, mismo grosor que los íconos custom |
| Fondos | Siempre transparentes o con fondo de un solo color del sistema |
| Sombras | No drop shadows. Solo plano o sombra interna muy sutil (opacidad ≤ 0.08) |
| Figuras humanas | Estilizadas, no fotorrealistas. Sin caras detalladas. |
| Cantidad mínima inicial | 6 piezas: vacío de lista viajes, vacío de historial, onboarding ×3, error genérico |

**Criterio de aceptación:** Las ilustraciones deben leer bien en modo claro y oscuro. Pedir variante de fondo `--surface-0` para ambos modos.

### Fotografía (landing / comunicaciones de marketing)

La fotografía solo existe en el contexto landing y redes sociales. Nunca dentro de la UI productiva.

**Permitido:**
- Foto real del auto o autos de la flota, captados en horario dorado (golden hour), con la caja de techo iluminada visible
- Fotos de los pueblos de la zona en horario dorado (calles de pueblo, ruta pampeana, horizonte abierto)
- Retratos ambientales de conductores reales — no posados, sí en acción

**Prohibido:**
- Fotos con saturación alta o estética "Instagram moderno" (no combina con la paleta sobria)
- Fotos de archivo de autos genéricos o ciudades que no sean de la zona
- Mezcla de estilos: no combinar foto de alta saturación con paleta `--brand-primary`
- Filtros Instagram, efectos de luz artificial, bokeh exagerado

**Cohesión de paleta en fotografía:**
Toda foto que aparezca en landing debe pasar por un paso de color grading en post-producción que enfríe levemente los tonos medios y cálide los altos, reforzando la paleta "atardecer pampeano". Referencia de LUT: warm shadows, cool mids, golden highlights.

---

## 2. Paleta Narrativa "Atardecer Pampeano"

> Esta paleta es **exclusiva para landing y comunicaciones de marketing**. La UI productiva usa los tokens del design system ya definidos. No crear tokens nuevos para pantallas de producto.

### Los cuatro tonos narrativos

| Nombre evocador | Token CSS | Hex | Rol semántico |
|---|---|---|---|
| Cielo | `--brand-primary` | `#1B2A4E` | Color dominante, fondos oscuros, headers |
| Horizonte | `--brand-accent` | `#D97706` | Énfasis, CTAs, highlights, puntos de atención |
| Tierra | *(sin token de UI)* | `~#A0522D` | Acento secundario cálido, solo decorativo |
| Pasto seco | *(sin token de UI)* | `~#65733B` | Acento terciario, solo decorativo |

**Tierra** y **Pasto seco** no tienen token de UI porque no pertenecen a la interfaz productiva. Se usan únicamente en:
- Ilustraciones de landing
- Fondos de sección en la web
- Piezas de redes sociales
- Material impreso (si corresponde)

### Cuándo SE PUEDE usar esta paleta

- Hero section del landing
- Secciones "Cómo funciona" y "Quiénes somos" del landing
- OG images y thumbnails de redes sociales
- Emailings de bienvenida y comunicaciones de marketing
- Ilustraciones de onboarding (con la paleta cálida, no los 4 tonos narrativos todos juntos)

### Cuándo NO se puede usar

- Pantallas de la app pasajero o conductor (usar tokens del design system)
- Panel del despachante
- Notificaciones push (el sistema operativo define el estilo)
- Cualquier pantalla posterior al login

### Proporciones recomendadas en una composición de landing

Una composición equilibrada usa esta proporción aproximada:

- **60% Cielo** (`#1B2A4E`) — domina el fondo
- **25% Horizonte** (`#D97706`) — énfasis y CTAs
- **10% Tierra** (`#A0522D`) — acento secundario, uso muy puntual
- **5% Pasto seco** (`#65733B`) — acento terciario, casi no debe notarse

No hace falta usar los cuatro en cada pieza. Con Cielo y Horizonte ya se construye la identidad. Tierra y Pasto seco son opcionales y deben usarse con criterio, no para "completar la paleta".

---

## 3. Iconografía Custom

### Sistema base

| Atributo | Valor |
|---|---|
| Familia | RemisIcons (set custom del proyecto) |
| Stroke | 1.5px, round cap, round join |
| Tamaños estándar | 16px / 20px / 24px |
| Grid base | 24×24px, con zona segura interna de 20×20px |
| Baseline | Alineado al baseline tipográfico de Inter (body) |
| Color | Hereda del contexto (`currentColor`), nunca hardcodeado |
| Formato entregable | SVG optimizado + componente React `<RemisIcon />` + widget Flutter `RemisIcon` |

### API de componentes

**React:**
```tsx
<RemisIcon name="remis" size={24} color="currentColor" strokeWidth={1.5} />
// Sizes: 16 | 20 | 24
```

**Flutter:**
```dart
RemisIcon.small()   // 16px
RemisIcon.medium()  // 20px
RemisIcon.large()   // 24px
// Ejemplo: RemisIcon.large(name: RemisIconName.remis, color: context.colors.onSurface)
```

---

### 3.1 Remís (vista 3/4)

**Descripción visual:** Sedan visto en perspectiva 3/4 frontal-lateral. La caja de techo (taxímetro estilizado) está presente como elemento diferenciador: un rectángulo delgado levemente iluminado sobre el techo, trazo 1.5px. Ruedas indicadas con círculos simples, no detalladas. El contorno del auto es reconocible pero simplificado: capó, parabrisas inclinado, techo, maletero. Sin ventanillas detalladas, solo una línea que sugiere la división. El conjunto debe leerse como "remís" a 16px.

**Uso:** Identificación del vehículo en listas, marcadores de mapa, encabezados de sección relacionados a la flota.

**Nota de animación:** La caja de techo puede tener una variante con un punto parpadeante para indicar "disponible". Esto es una variante, no el ícono base.

---

### 3.2 Pin de Pickup

**Descripción visual:** Drop pin estándar (forma de gota invertida) con base redondeada. Dentro del bulbo superior del pin, tres puntos horizontales pequeños en fila, equidistantes, que sirven como indicador de espera animable. El pin tiene trazo 1.5px en todo su contorno. La base termina en punta fina.

**Uso:** Punto de origen del viaje en mapa, confirmación de punto de recogida.

**Nota de animación:** Los tres puntos interiores son animables con fade secuencial (tipo "typing indicator") para indicar estado "esperando conductor". En SVG exportar cada punto como elemento independiente con `id="dot-1/2/3"` para facilitar la animación. La animación en sí se define en la sección Motion Brand.

---

### 3.3 Pin de Destino

**Descripción visual:** Una bandera a cuadros minimalista montada sobre un poste delgado vertical. La bandera muestra exactamente 4 cuadros: 2×2, alternados en blanco y trazo (no relleno sólido para no perder legibilidad). El poste termina en punta en la base, igual que el pin de pickup, para mantener consistencia en el sistema. La bandera vuela levemente hacia la derecha del poste. Trazo 1.5px.

**Uso:** Punto de destino del viaje en mapa y resumen de viaje.

---

### 3.4 Paradero

**Descripción visual:** Un poste vertical delgado, con base cuadrada o rectangular pequeña que indica que está plantado en el suelo. En la parte superior del poste, un cartel rectangular horizontal (proporción ~3:1 ancho:alto), con el texto suprimido (no hay texto en el ícono). El cartel tiene trazo 1.5px en su contorno. El conjunto evoca una parada de transporte público. Sin personas ni flechas adicionales.

**Uso:** Indicar paraderos o puntos fijos de la flota en el mapa; secciones de configuración de paradas frecuentes.

---

### 3.5 Móvil Interno

**Descripción visual:** Un círculo perfecto (trazo 1.5px) con el número "12" centrado en su interior en tipografía Geist Mono, tamaño ajustado para que sea legible dentro del círculo a 20px de ícono. El "12" es un placeholder que en producción se reemplaza por el número de unidad real del conductor. En la exportación SVG, el texto debe ser un elemento `<text>` editable, no outline, para permitir la sustitución programática.

**Uso:** Identificación del móvil/unidad en la lista de conductores disponibles, asignación de viajes, encabezado de la vista del conductor.

**Nota de implementación:** En el componente React y Flutter, el número se pasa como prop/parámetro:
```tsx
<RemisIcon name="movil" size={24} label="12" />
```
```dart
RemisIcon.large(name: RemisIconName.movil, label: '12')
```

---

### 3.6 Reloj Programado

**Descripción visual:** Reloj analógico circular, trazo 1.5px en el contorno. Marcas de hora indicadas solo en las posiciones 12, 3, 6 y 9 (ticks cortos, no números). Las manecillas apuntan a una posición sugerida de "futuro" (~10:10 o similar). Una flecha curva de rotación rodea el exterior del reloj en el cuadrante superior derecho, indicando "programado hacia adelante". La flecha curva tiene punta y un arco de aproximadamente 60°.

**Uso:** Viajes programados, recordatorios, historial con fecha futura.

**Nota de animación:** La flecha exterior puede girar suavemente (360° en 3s, loop) para indicar "programando". Exportar la flecha como grupo separado con `id="arrow-rotating"`.

---

### 3.7 SOS

**Descripción visual:** Escudo redondeado (shield shape con esquinas suaves, similar a un superhéroe pero sin detalles), trazo 1.5px. Dentro del escudo, un triángulo de alerta equilátero con el vértice hacia arriba, centrado. El triángulo tiene el mismo trazo 1.5px. Sin texto dentro del triángulo. El conjunto comunica "alerta de seguridad" de forma inmediata.

**Uso:** Botón y pantalla de SOS/emergencia, exclusivamente. No usar este ícono en otros contextos.

**Color:** Este ícono tiene una variante de color fijo `#DC2626` (rojo semántico del sistema) para el estado de alerta activa. Es la única excepción al principio de `currentColor`.

---

### 3.8 Cinturón

**Descripción visual:** Representación minimal de un cinturón de seguridad. Una línea diagonal (de esquina inferior izquierda a esquina superior derecha, aproximadamente 45°) con trazo 1.5px, que atraviesa el área del ícono. En el punto central de la diagonal, una hebilla rectangular pequeña (un rectángulo de aproximadamente 4×6px en la grilla de 24px), que interrumpe la línea y la ancla visualmente. La línea continúa a ambos lados de la hebilla. El resultado es abstracto pero reconocible como cinturón de seguridad de un vistazo.

**Uso:** Recordatorio de cinturón en el inicio del viaje (pantalla del conductor), indicador de seguridad en resumen de viaje.

---

## 4. Soundscape / Haptics

> Los archivos de audio son assets del producto, no de marketing. Deben estar versionados en el repositorio bajo `/assets/sounds/`.

### 4.1 Notificación — App Pasajero

**Función:** Confirmar acciones relevantes para el pasajero: viaje confirmado, conductor asignado, conductor llegó.

| Atributo | Valor |
|---|---|
| Duración | 200ms |
| Carácter | Suave, no intrusivo. Referencia: Things 3 (iOS). Una nota, sin eco pronunciado. |
| Frecuencia base | ~880Hz con decay rápido |
| Formato entregable | `passenger_notification.mp3` (128kbps) + `passenger_notification.caf` (iOS) + Sound Asset en Xcode / Flutter assets |
| Cuándo suena | Viaje confirmado, conductor en camino, conductor llegó al punto de recogida |
| Cuándo NO suena | Actualizaciones de posición en mapa, mensajes de estado intermedios |

### 4.2 Notificación — App Conductor (NUEVO PEDIDO)

**Función:** Alertar al conductor de un pedido entrante que requiere acción inmediata.

| Atributo | Valor |
|---|---|
| Duración base | 500ms (primera nota) |
| Segunda nota | +200ms si el conductor no responde en 5s (nota más alta, más urgente) |
| Carácter | Más insistente que el del pasajero. Dos notas en secuencia. |
| Frecuencia base | ~660Hz primera nota, ~880Hz segunda nota |
| Formato entregable | `driver_new_request.mp3` + `driver_new_request_followup.mp3` + assets equivalentes |
| Lógica de escalada | Timer de 5s en la app; si no hay tap en el banner, reproducir `_followup`. No exceder 3 repeticiones. |
| Cuándo suena | Exclusivamente en nuevo pedido entrante |

### 4.3 Haptics — App Conductor

**Función:** Reforzar la notificación de nuevo pedido, especialmente en contextos de ruido (el conductor está en el auto).

| Evento | Patrón |
|---|---|
| Pedido entrante (impacto inicial) | `HeavyImpact` (un pulso fuerte) |
| Seguimiento (3 pulsos) | Patrón: `[0, 200, 100, 200, 100, 200]` ms (espera, vibra, pausa, vibra, pausa, vibra) |

**Implementación Flutter:**
```dart
// Pedido entrante
HapticFeedback.heavyImpact();
// Seguido de patrón custom (Android)
// iOS: usar UIImpactFeedbackGenerator con repetición manual vía Timer
```

**Cuándo se ejecuta:** Solo en nuevo pedido. No en otras notificaciones. No en acciones de UI.

### 4.4 Haptics — App Pasajero

**Principio:** Minimal. El pasajero no necesita confirmación física de cada acción.

| Evento | Haptic |
|---|---|
| CTAs principales (confirmar viaje, confirmar destino) | `LightImpact` |
| Cualquier otra acción | Ninguno |

**Prohibido:** Haptics en actualizaciones de mapa, cambios de estado intermedios, inputs de texto, scroll.

### 4.5 SOS — Haptics especiales

**Comportamiento:** Mientras el usuario mantiene presionado el botón SOS, vibración fuerte continua con ciclo de 1 segundo.

**Patrón:** `[0, 500, 500]` repetido en loop mientras dure el press.

**Motivo:** El botón SOS requiere press prolongado para evitar activaciones accidentales. La vibración continua confirma al usuario que el sistema está registrando el gesto y que no debe soltar.

**Implementación:** Cancelar el loop de vibración en `onLongPressEnd`. En iOS, usar `UINotificationFeedbackGenerator` con tipo `.warning` ciclado.

---

## 5. Motion Brand

> Todas las duraciones y curvas referencian los tokens del design system. No hardcodear valores de timing en los componentes.

### Tokens de motion del sistema

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--dur-fast:   150ms;
--dur-normal: 240ms;
```

### 5.1 Transiciones de pantalla

#### Mobile (Flutter)

| Transición | Easing | Duración | Dirección |
|---|---|---|---|
| Push forward (navegar hacia adelante) | `--ease-out` | `--dur-normal` (240ms) | Slide horizontal →→ |
| Pop back (volver) | `--ease-out` | `--dur-fast` (150ms) | Slide horizontal ←← |
| Modal bottom sheet | `--ease-out` | `--dur-normal` (240ms) | Slide vertical ↑↑ |
| Dismiss bottom sheet | `--ease-out` | `--dur-fast` (150ms) | Slide vertical ↓↓ |

**Implementación Flutter:**
```dart
// PageRouteBuilder con curva del sistema
PageRouteBuilder(
  transitionDuration: AppDurations.normal, // 240ms
  transitionsBuilder: (context, animation, secondaryAnimation, child) {
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(1.0, 0.0),
        end: Offset.zero,
      ).animate(CurvedAnimation(
        parent: animation,
        curve: AppCurves.easeOut, // cubic-bezier(0.16, 1, 0.3, 1)
      )),
      child: child,
    );
  },
)
```

#### Web (Next.js — landing)

| Transición | Easing | Duración |
|---|---|---|
| Entre páginas del landing | Fade | `--dur-fast` (150ms) |
| Entrada de secciones en scroll | Fade + translate Y 8px | `--dur-normal` (240ms) |

No usar slide horizontal en web. El paradigma de navegación web es diferente al mobile.

### 5.2 Hero del Landing — Parallax

El hero del landing contiene al menos dos capas: un fondo (cielo/horizonte pampeano) y un elemento en primer plano (auto o texto).

**Comportamiento de parallax:**
- La capa de fondo se mueve al **10% de la velocidad** del scroll del usuario
- La capa de texto/foreground se mueve al 100% (sin parallax, sigue el scroll normalmente)
- El efecto es sutil: en un hero de 600px de alto, el fondo no se desplaza más de ~60px en toda la sección

**Implementación:**
```tsx
// Usar CSS transform, no background-attachment: fixed (performance)
const parallaxOffset = scrollY * 0.10; // 10% de la velocidad
<div style={{ transform: `translateY(${parallaxOffset}px)` }}>
  {/* capa de fondo */}
</div>
```

**Precaución:** Desactivar el parallax en `prefers-reduced-motion: reduce`. No es negociable.

```css
@media (prefers-reduced-motion: reduce) {
  .hero-background {
    transform: none !important;
  }
}
```

### 5.3 Marker en mapa

El marker del conductor en el mapa se mueve en tiempo real. La posición se actualiza desde el backend vía Supabase Realtime.

**Regla:** El marker nunca debe "saltar" de una posición a otra. Siempre animar la transición de coordenadas.

| Propiedad | Valor |
|---|---|
| Easing de movimiento | `--ease-out` |
| Duración de movimiento | `--dur-normal` (240ms) |
| Rotación (heading) | Animada, misma curva y duración |

**Comportamiento de heading:**
Cuando el conductor cambia de dirección, el marker rota gradualmente hacia el nuevo heading. No rotar instantáneamente. Si el delta de rotación es mayor a 180°, elegir el camino más corto (evitar vuelta completa).

**Implementación Google Maps Flutter:**
```dart
// Actualizar marker con animación interpolando LatLng y bearing
// Usar Timer periódico para interpolar entre posición anterior y nueva
// Duración de interpolación: 240ms
```

**Puntos de animación para los 3 dots del Pin de Pickup:**
Cuando el pasajero está esperando confirmación, los 3 dots dentro del pin de pickup realizan una animación de fade secuencial:
- `dot-1`: opacity 0→1→0, duración 600ms, delay 0ms
- `dot-2`: opacity 0→1→0, duración 600ms, delay 200ms
- `dot-3`: opacity 0→1→0, duración 600ms, delay 400ms
- Loop continuo mientras el estado sea "esperando"

**Curva:** `ease-in-out` para los dots (distinto al ease-out del sistema, es intencional — el "typing indicator" se siente más orgánico con ease-in-out).

---

## Apéndice: Checklist de entregables por disciplina

### Para el ilustrador

- [ ] 6 ilustraciones de empty states / onboarding (PNG @2x + SVG)
- [ ] Guía de paleta y restricciones
- [ ] Revisión de legibilidad en fondo claro y oscuro

### Para el diseñador de íconos

- [ ] 8 SVGs exportados y optimizados (Svgo)
- [ ] Variantes de tamaño: 16 / 20 / 24
- [ ] Componente React `<RemisIcon />` con tipos TypeScript
- [ ] Widget Flutter `RemisIcon` con enum `RemisIconName`
- [ ] Ícono SOS en variante de color fijo (`#DC2626`)

### Para el productor de audio

- [ ] `passenger_notification.mp3` + `.caf`
- [ ] `driver_new_request.mp3` + `.caf`
- [ ] `driver_new_request_followup.mp3` + `.caf`

### Para el desarrollador Flutter

- [ ] Constantes de haptic pattern exportadas en `lib/core/haptics.dart`
- [ ] Constantes de duración y curvas de animación en `lib/core/motion.dart`
- [ ] Lógica de escalada de sonido en conductor (timer 5s)
- [ ] Loop de vibración SOS con cancel en `onLongPressEnd`
- [ ] Parallax desactivado en `AccessibilityFeatures.reduceMotion`

### Para el desarrollador web (Next.js)

- [ ] Token CSS de motion en `globals.css`
- [ ] Hook `useParallax` con respeto a `prefers-reduced-motion`
- [ ] Transición de páginas con fade 150ms
- [ ] Entrada de secciones con Intersection Observer

---

*Versión 0.1.0 — Borrador para revisión con cliente. No distribuir sin aprobación.*
