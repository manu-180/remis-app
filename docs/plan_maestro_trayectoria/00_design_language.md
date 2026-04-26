# Design Language — "Premium Pampeano"

> Este documento es la **biblia visual**. Todos los prompts de UI lo referencian. Si un prompt entra en conflicto con este doc, gana este doc. Cualquier desviación necesita justificación explícita.

---

## 1. Filosofía

### Tres principios

1. **Confiable antes que llamativo.** Es una app de servicio, no un juego. La estética sirve a la función. Cada decisión visual responde a "¿esto ayuda al despachante / chofer / pasajero a hacer su tarea más rápido y con menos error?".
2. **Densidad sin ruido.** Los profesionales valoran densidad de información. El ruido viene de jerarquías mal calibradas, no de "muchos elementos". Inspiración: Linear, Stripe Dashboard, Things 3.
3. **Calidez sobre frialdad.** Un Uber-clone genérico se siente corporativo y frío. Acá hay un guiño regional sutil: tipografía con personalidad, micro-detalles de textura, un acento de color que evoca el atardecer pampeano. NO folclore explícito (NO ponchos, NO mate en íconos), solo paleta y proporciones.

### Inspiraciones cruzadas (con qué tomar de cada una)

| Producto | Qué tomar |
|----------|-----------|
| **Cabify** | Calidez tipográfica, generosidad de espacio en flujos del pasajero, ilustraciones planas con paleta cálida |
| **Linear** | Densidad del despachante, modo oscuro como default, transiciones milimetradas, atajos de teclado visibles |
| **Stripe Dashboard** | Jerarquía de información, tablas densas legibles, micro-tipografía mono para datos numéricos |
| **Things 3** | Sensación táctil, micro-animaciones que dan feedback sin distraer, sombras sutiles |
| **Bolt (driver app)** | Mapa fullscreen con HUD mínimo, botones de acción gigantes para uso con guantes/manos sucias |
| **Apple Maps (iOS 17+)** | Cards flotantes sobre el mapa con blur de fondo, tipografía SF-like |

---

## 2. Sistema de color

### Paleta núcleo

Definida como tokens CSS / Dart constants. **Nunca usar hex directo en UI** — siempre referenciar el token.

#### Marca

| Token | Hex (light) | Hex (dark) | Uso |
|-------|-------------|------------|-----|
| `--brand-primary` | `#1B2A4E` | `#7CA0FF` | Identidad, headers, links primarios |
| `--brand-primary-hover` | `#243762` | `#9CB7FF` | Hover sobre primary |
| `--brand-accent` | `#D97706` | `#F59E0B` | CTA crítico, "atardecer pampeano" |
| `--brand-accent-hover` | `#B45309` | `#FBBF24` | Hover sobre accent |

`--brand-primary` es **azul medianoche profundo** (no Bootstrap-blue). Comunica confianza, es bajo en saturación.
`--brand-accent` es **ámbar quemado** (no naranja-fluo). Aparece SOLO en 1 elemento por pantalla — "el botón al que el ojo va primero".

#### Neutrales (escala 11 pasos, contrasta 4.5:1+ entre extremos)

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--neutral-0`  | `#FFFFFF` | `#0A0B0F` | Fondo base |
| `--neutral-50` | `#FAFAFA` | `#101218` | Fondo elevado nivel 0 |
| `--neutral-100`| `#F4F4F5` | `#181B23` | Fondo elevado nivel 1 (cards) |
| `--neutral-200`| `#E4E4E7` | `#23262F` | Borde sutil, divisor |
| `--neutral-300`| `#D4D4D8` | `#2E323D` | Borde input default |
| `--neutral-400`| `#A1A1AA` | `#52576B` | Texto disabled / placeholder |
| `--neutral-500`| `#71717A` | `#7B8194` | Texto secundario |
| `--neutral-600`| `#52525B` | `#A4AABB` | Texto terciario |
| `--neutral-700`| `#3F3F46` | `#C7CCDB` | Texto cuerpo (dark) |
| `--neutral-800`| `#27272A` | `#E4E7EF` | Texto cuerpo (light) |
| `--neutral-900`| `#18181B` | `#F4F5F9` | Headings, texto contraste alto |

Escala calibrada con OKLCH para garantizar steps perceptualmente uniformes. **NO usar Tailwind `gray` o `zinc` directo** — tenemos nuestros tokens.

#### Semánticos

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--success` | `#16A34A` | `#22C55E` | Conductor libre, viaje OK |
| `--success-bg` | `#F0FDF4` | `#0E2417` | Fondo badge success |
| `--warning` | `#CA8A04` | `#EAB308` | Esperando pasajero, doc por vencer |
| `--warning-bg` | `#FEFCE8` | `#1F1B0E` | Fondo badge warning |
| `--danger` | `#DC2626` | `#EF4444` | Cancelación, SOS, doc vencido |
| `--danger-bg` | `#FEF2F2` | `#27110F` | Fondo badge danger |
| `--info` | `#2563EB` | `#60A5FA` | Yendo al pickup, programado |
| `--info-bg` | `#EFF6FF` | `#0E1B2D` | Fondo badge info |

#### Estados de conductor (CRÍTICOS — copiar a la letra)

Mapeo de estado → color de pin en mapa y badge en lista. Verificado con TaxiCaller, Yelowsoft, iCabbi, Autocab.

| Estado | Token | Visual |
|--------|-------|--------|
| `available` (libre) | `--success` | 🟢 |
| `en_route_to_pickup` (yendo) | `--info` | 🔵 |
| `waiting_passenger` (esperando) | `--warning` | 🟠 ámbar |
| `on_trip` (en viaje) | `--danger` | 🔴 |
| `on_break` (descanso) | `#FACC15` | 🟡 amarillo |
| `offline` | `--neutral-500` | ⚫ gris |
| `suspended` | `#A855F7` | 🟣 violeta |

#### Estados de pedido en cola (borde + fondo)

| Estado | Borde | Fondo |
|--------|-------|-------|
| Sin asignar (urgente) | `--danger` 2px | `--neutral-100` |
| Difundido a varios | `--info` 2px | `--neutral-100` |
| En ventana de asignación | `--warning` 1px | `--warning-bg` |
| Programado | `--info` 1px | `--info-bg` |
| En curso | `--success` 1px | `--success-bg` |
| Hold | `--neutral-400` 1px dashed | `--neutral-100` |

---

## 3. Tipografía

### Fuentes

- **Display / Headings:** `Inter Tight` (variable, weights 400–700). Letterforms más estrechas → headlines compactos sin sentirse condensed.
- **Body / UI:** `Inter` (variable, weights 400–600). El estándar de SaaS por una razón.
- **Numeric / Mono:** `Geist Mono` (variable). Para precios, IDs de viaje, móviles internos, coordenadas, telemetría.
- **Flutter:** mismas tres fuentes vía `google_fonts` package; cachear en bundle para offline rural.

**Fallback stack:**
```css
font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Escala modular (Major Third = 1.25)

Base `16px` (1rem). Cada paso ×1.25.

| Token | px | Uso |
|-------|----|----|
| `--text-2xs` | 10 | Labels micro (tablas densas) |
| `--text-xs`  | 12 | Captions, metadatos, badges |
| `--text-sm`  | 14 | Body secundario, controles |
| `--text-base`| 16 | Body principal |
| `--text-md`  | 18 | Subtítulos pequeños |
| `--text-lg`  | 20 | Card titles |
| `--text-xl`  | 24 | Section titles |
| `--text-2xl` | 30 | Page titles |
| `--text-3xl` | 36 | Display |
| `--text-4xl` | 48 | Hero (landing only) |
| `--text-5xl` | 60 | Hero XL (landing only) |

### Pesos por contexto

- **Headings:** Inter Tight 600–700.
- **Body:** Inter 400.
- **Énfasis en body:** Inter 500 (NO 600 — luce demasiado pesado en body).
- **UI controls (botones, tabs):** Inter 500.
- **Numeric/mono:** Geist Mono 400–500.

### Line-height / letter-spacing

| Tamaño | line-height | letter-spacing |
|--------|-------------|-----------------|
| Display ≥ 36px | 1.05 | -0.02em |
| Headings 20–30px | 1.2 | -0.01em |
| Body | 1.5 | 0 |
| Mono numeric | 1.4 | 0 |
| All-caps labels | 1.3 | +0.06em |

---

## 4. Espaciado, radii, sombras

### Escala de espaciado (base 4px)

`0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`. Tokens `--space-0` … `--space-128`. **No inventar valores intermedios.**

### Radii

| Token | px | Uso |
|-------|----|----|
| `--radius-sm` | 4 | Chips, badges |
| `--radius-md` | 8 | Inputs, buttons |
| `--radius-lg` | 12 | Cards |
| `--radius-xl` | 16 | Modales, sheets |
| `--radius-2xl`| 24 | Hero blocks (landing) |
| `--radius-full` | 9999 | Pills, avatars |

### Sombras (escala 5)

Calibradas para el modo claro. En modo oscuro las sombras se reemplazan por **borde sutil interno** (`inset 0 0 0 1px rgba(255,255,255,0.05)`).

```css
--shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.05);
--shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
--shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05);
--shadow-lg: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.05);
--shadow-xl: 0 25px 50px -12px rgba(15, 23, 42, 0.18);
```

### Glassmorphism (uso restringido)

Solo en cards flotantes sobre el mapa. **Nunca** en panel de despachante (mata legibilidad en sesión larga).

```css
background: rgba(255, 255, 255, 0.72);
backdrop-filter: blur(20px) saturate(140%);
border: 1px solid rgba(255, 255, 255, 0.5);
```

En dark:
```css
background: rgba(16, 18, 24, 0.72);
backdrop-filter: blur(20px) saturate(140%);
border: 1px solid rgba(255, 255, 255, 0.06);
```

---

## 5. Iconografía

### Set base

- **Lucide** (lucide-react / lucide_icons en Flutter) como set principal. Stroke 1.5px (no 2px — luce más refinado), tamaños `16/20/24`.
- **Custom 8 íconos del rubro** (deben crearse en SVG, vector clean):
  1. Remís (vista 3/4, NO sedan genérico)
  2. Pin de pickup con marcador de espera
  3. Pin de destino bandera a cuadros estilizada
  4. Paradero (poste con cartel)
  5. Móvil interno (número en círculo con borde)
  6. Reloj de programado (con flecha rotando)
  7. Botón SOS (escudo con signo)
  8. Cuero/cinturón de seguridad estilizado

### Reglas

- **Nunca emoji en UI productiva** (sí en mensajes de chat libres).
- **Nunca íconos rellenos mezclados con stroke** en la misma vista.
- **Iconos siempre alineados a baseline tipográfico**, no centrados visualmente "a ojo".

---

## 6. Componentes — anatomía y reglas

### Botón

| Variante | Light bg | Dark bg | Uso |
|----------|----------|---------|-----|
| `primary` | `--brand-primary` | `--brand-primary` (text negro) | Acción principal (1 por pantalla) |
| `accent` | `--brand-accent` | `--brand-accent` (text negro) | CTA crítico, max 1 por pantalla |
| `secondary` | `--neutral-100` borde `--neutral-300` | `--neutral-100` borde `--neutral-300` | Acción alternativa |
| `ghost` | transparente | transparente | Acción terciaria |
| `destructive` | `--danger` | `--danger` | Cancelar, eliminar (con confirm) |

**Tamaños:** `sm` (h32, px-12), `md` (h40, px-16), `lg` (h48, px-20), `xl` (h56, px-24 — solo CTAs principales).

**Estados:** default / hover (lift 1px shadow + bg shift) / active (press 1px) / focus (ring 2px `--brand-primary` offset 2px) / loading (spinner reemplaza ícono, texto opacity 0.7) / disabled (opacity 0.5, cursor not-allowed).

**Reglas:**
- Mínimo 44×44 px de touch target en mobile.
- En el driver app, botón principal del HUD: `h64`, full-width, peso 600. "Aceptar viaje" / "Llegué" / "Iniciar" / "Finalizar". El conductor lo presiona con guantes.

### Input

- Altura `h44` (mobile) / `h40` (desktop).
- Borde `--neutral-300`. Focus: borde `--brand-primary` + ring 3px alpha-15.
- Placeholder en `--neutral-400`.
- Label flotante NO (se ve bonito pero hace que la jerarquía cambie al escribir, mata legibilidad en formularios densos del despachante). Label fijo arriba.
- Error: borde + texto debajo en `--danger`.

### Card

- Fondo `--neutral-100`, borde `1px --neutral-200`, radius `--radius-lg`, padding `--space-16` o `--space-20`.
- Hover (si clickable): `--neutral-50` + shadow-sm.

### Modal / Sheet

- Mobile: bottom sheet con drag handle (`44×4 --neutral-300`).
- Desktop: modal centrado, max-width 560 (sm), 720 (md), 960 (lg).
- Backdrop: `rgba(0,0,0,0.5)` con `backdrop-filter: blur(4px)`.
- Cerrar con Esc, click backdrop, botón X.

### Toast

- Bottom-right (desktop) / top (mobile). Auto-dismiss 4s default, 8s para errores, **30s con botón "Deshacer"** para asignaciones (despachante).
- Stack vertical, max 3 visibles.

### Map markers

- **Conductor:** círculo h32, color por estado, borde blanco 2px, **flecha de rumbo si moviéndose** (>5 km/h). Sombra suave.
- **Pickup pin:** drop pin alto h44, color `--brand-accent`, sombra ground.
- **Destino pin:** bandera, color `--brand-primary`.
- **Cluster:** círculo blanco con número, borde `--brand-primary`. Aparecer a zoom < 12.

---

## 7. Movimiento

### Curvas (cubic-bezier)

| Token | Curva | Uso |
|-------|-------|-----|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrada de elementos (panels, sheets) |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Salida de elementos |
| `--ease-in-out` | `cubic-bezier(0.83, 0, 0.17, 1)` | Loops, reversibles |
| `--ease-spring` | `Flutter Curves.easeOutBack` o `framer-motion spring(stiffness:300, damping:30)` | Bottom sheets, modals, drag |

### Duraciones

| Token | ms | Uso |
|-------|----|----|
| `--dur-instant` | 80 | Hover micro feedback |
| `--dur-fast` | 150 | Color change, opacity |
| `--dur-normal` | 240 | Slide, scale, fade |
| `--dur-slow` | 360 | Sheets, route transitions |
| `--dur-deliberate` | 600 | Onboarding choreography |

### Reglas

- **Nunca animar `top/left/width/height`** — usar `transform/opacity` (60fps).
- **`prefers-reduced-motion`** respetado en TODA la app (Flutter: `MediaQuery.disableAnimations`; web: `@media`).
- **Skeleton loaders** en vez de spinners para listas (>200ms de carga). Spinner solo para acciones puntuales.
- En el despachante, animaciones **muy contenidas**. No queremos que algo se mueva mientras el ojo está leyendo otra cosa.

---

## 8. Densidades por superficie

Tres modos de densidad. Cada superficie elige el suyo y NO mezcla.

| Modo | Row height | Padding | Font body | Superficie típica |
|------|------------|---------|-----------|-------------------|
| `comfortable` | 56 | 16 | 16 | App pasajero, landing |
| `compact` | 44 | 12 | 14 | App conductor en lista, admin |
| `dense` | 32 | 8 | 13 | Dispatcher (tablas de cola, lista de choferes) |

Toggle de densidad en dispatcher (Cmd/Ctrl + 1/2/3).

---

## 9. Layouts canónicos por app

### Driver app (Flutter)

**Default screen — turno activo / esperando pedidos:**
```
┌─────────────────────────────────┐
│  [≡]    Turno activo  [SOS]    │ ← header h56, fondo translúcido sobre mapa
├─────────────────────────────────┤
│                                 │
│         MAPA FULLSCREEN         │ ← FlutterMap con mi posición
│       (mi ubicación + zona)     │
│                                 │
├─────────────────────────────────┤
│ ●  Disponible                   │ ← card flotante h80
│    En zona Centro · 0 pedidos   │
└─────────────────────────────────┘
                              [⏸] ← FAB pausar/reanudar
```

**Pedido entrante (overlay full screen):**
- Mapa de fondo blureado.
- Card central con: foto del pasajero (avatar), nombre, dirección de pickup, distancia, ETA, tarifa estimada.
- Botón ACEPTAR full-width h64 `--brand-accent`.
- Botón rechazar pequeño debajo.
- Countdown 15s con barra de progreso.
- Vibración al aparecer (3 pulsos cortos), ringtone configurable.

**En viaje:**
- Mapa con ruta dibujada, mi ubicación moviéndose.
- Bottom sheet **expandible** (3 stops: collapsed h120, half h360, full).
  - Collapsed: estado actual + botón principal.
  - Half: + datos del pasajero, dirección, navegación.
  - Full: + chat, llamar (masked), histórico.

### Passenger app (Flutter)

**Home — pedir viaje:**
```
┌─────────────────────────────────┐
│  Hola, Juan         [perfil]   │
├─────────────────────────────────┤
│         MAPA con mi ubic.       │
│                                 │
│  [pin pickup confirmable]       │
│                                 │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ ◉ Mi ubicación              │ │ ← card pickup
│ │ ◯ ¿A dónde vamos?           │ │ ← card destino, tap → autocomplete
│ └─────────────────────────────┘ │
│                                 │
│ Frecuentes:                     │
│ [Casa] [Trabajo] [Mamá]         │ ← chips
│                                 │
│ ┌─────────────────────────────┐ │
│ │  Pedir remís        $1.200  │ │ ← CTA accent
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Tracking del viaje (post-asignación):**
- Mapa con conductor moviéndose.
- Bottom sheet con datos del conductor (foto, nombre, móvil interno, patente, teléfono masked, rating si aplica).
- Botón compartir viaje, botón cancelar (con countdown), SOS discreto.

### Dispatcher panel (Next.js, modo oscuro default)

Ver `00_arquitectura.md` sección Dispatcher para layout 3 columnas + barra inferior. Anchura total mínima soportada: 1280px. Recomendada: 1440px+. Multi-monitor: ventana secundaria con solo el mapa fullscreen (ruta `/dispatch/map-fullscreen`).

### Landing público (Next.js)

Sobrio, NO una página de SaaS-startup genérica. Hero con foto real (no stock) del auto típico de la agencia. Secciones: Cómo funciona (3 pasos), Tarifas (tabla por zona), Conductores (CTA "trabajá con nosotros"), Footer con datos del municipio + responsable de datos.

---

## 10. Accesibilidad

- **Contraste:** WCAG AA mínimo (4.5:1 body, 3:1 large text). AAA donde sea barato.
- **Focus visible** SIEMPRE (ring 2px offset 2px). Nunca `outline: none` sin reemplazo.
- **Navegación por teclado completa** en dispatcher (es la pieza crítica — el dispo NO debería necesitar el mouse para 80% del flujo).
- **Lectores de pantalla:** labels semánticos en cada control (`Semantics()` en Flutter, `aria-label` en web).
- **Tamaño de texto del sistema** respetado (Flutter: `MediaQuery.textScaler`).
- **Modo high-contrast** del SO detectado y aplicado.

---

## 11. Tono de voz (UI copy)

- **Voseo rioplatense:** "querés", "fijate", "tu viaje".
- **Directo, sin diminutivos infantilizantes:** evitar "tu remisito", "esperá un toquecito".
- **Verbos en presente activo:** "Buscando conductor" no "Se está buscando un conductor".
- **Errores con salida:** nunca solo "Algo salió mal". Siempre "Algo salió mal — [acción concreta para resolver]".
- **Confirmaciones afirmativas:** "Listo", "Pedido cargado", "Viaje finalizado".
- **Sin signos de admiración** salvo en el SOS y notificaciones críticas.

Ejemplos:
- ✅ "Tu remís llega en 4 minutos"
- ❌ "¡Tu remisito ya está en camino! 🚕"
- ✅ "No pudimos asignar conductor. Probá de nuevo o llamá al 02954-XXX."
- ❌ "Ups, no encontramos remís disponible :("

---

## 12. Don'ts (anti-patterns observados en el rubro)

1. **Splash screen con auto en movimiento animado** — innecesario, alarga el TTI.
2. **Gradientes saturados azul→violeta tipo SaaS-2018** — luce cheap.
3. **Modo claro forzado en dispatcher** — el dispo trabaja 8h, modo oscuro es default no negociable.
4. **Confirm modal en cada acción** — usar toasts deshacibles 30s.
5. **Skeuomorfismo de "remís de juguete"** en mapa — pin abstracto, no auto 3D.
6. **Onboarding de 12 slides** — 3 max en passenger, 8 BLOQUEANTES en driver (porque son críticos para que la app funcione).
7. **Colores institucionales del municipio** — no somos el municipio, somos un servicio privado.

---

## 13. Entregables del design system (pertenece a Tanda 1B)

Los tokens viven en `packages/design-system/` y se exportan triple:

1. **CSS variables** (`tokens.css`) consumidas por Tailwind v4 en Next.js.
2. **TypeScript constants** (`tokens.ts`) tipadas.
3. **Dart constants** (`tokens.dart`) generadas con script `build_tokens.dart` desde el JSON canónico.

**Fuente única de verdad:** `packages/design-system/tokens.json` (formato Style Dictionary). Cualquier cambio se propaga vía build script.
