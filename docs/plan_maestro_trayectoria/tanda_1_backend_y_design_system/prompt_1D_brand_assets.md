# Prompt 1D — Brand: voz, naming, brief de logo y narrativa visual

> **LEÉ PRIMERO:** `00_design_language.md` (entero), `00_file_ownership_matrix.md` (Tanda 1D).

## Objetivo

Definir la capa narrativa de la marca. **No es código.** Son docs que: (a) le dan al cliente material para decidir nombre/logo/tono, (b) le dan a las Tandas 2-4 una base para escribir copy y elegir ilustraciones sin reinventar.

Este es el complemento "alma" del design system — los tokens dicen *cómo se ve*, estos docs dicen *cómo se siente y qué dice*.

## File ownership

✍️ `docs/brand/**`. NADA fuera.

## Steps

### 1. `docs/brand/README.md`

Índice + estado. Aclarar que el **nombre de la app aún no está decidido**; los docs usan placeholder `[NOMBRE]` consistente.

### 2. `docs/brand/voice_tone.md`

#### Personalidad de marca (5 dimensiones, escala 1-5)

| Dimensión | Valor | Significa |
|-----------|-------|-----------|
| Formal ↔ Informal | 4 (informal, no chabacano) | Voseo, contracciones; sin slang excesivo |
| Serio ↔ Divertido | 2 (mayormente serio) | Es transporte, hay seguridad de por medio |
| Distante ↔ Cercano | 4 (cercano) | "Estamos buscando tu remís" no "Se está procesando su solicitud" |
| Conservador ↔ Innovador | 3 (sobrio) | No queremos sonar a startup techie ni a empresa de los 90 |
| Cooperativo ↔ Asertivo | 4 (asertivo amable) | Indicaciones claras, no sugerencias suaves |

#### Voz (constante)

- **Voseo rioplatense.** Siempre.
- **Frases cortas.** Si una frase tiene >18 palabras, partila.
- **Verbos activos en presente.** "Buscando conductor" no "Se está buscando".
- **Sin diminutivos infantilizantes.** "Tu remís" no "tu remisito".
- **Sin signos de exclamación** salvo SOS y notificaciones críticas.
- **Sin emoji en UI productiva.** Sí en chat libre entre pasajero y conductor.
- **Sin tecnicismos** en passenger-facing. "Asignando conductor" no "Dispatch en curso".

#### Tono (cambia según contexto)

| Contexto | Tono | Ejemplo |
|----------|------|---------|
| Bienvenida / onboarding | Cálido, simple | "Bienvenido a [NOMBRE]. Pedí tu remís en segundos." |
| Operación normal | Neutro, informativo | "Tu remís llega en 4 minutos." |
| Espera / loading | Tranquilizador | "Estamos buscando un conductor cerca." |
| Error recuperable | Directo, accionable | "No pudimos procesar el pago. Probá con otra tarjeta o pagá en efectivo." |
| Error grave | Serio, con salida | "Algo salió mal. Llamanos al 02954-XXX." |
| Confirmación | Afirmativo, breve | "Listo." / "Pedido cargado." |
| SOS / emergencia | Calma operativa | "Mantené la calma. Estamos avisando a la agencia." |
| Conductor (driver app) | Más utilitario | "Aceptaste — vas a María, calle Centenario 123." |
| Dispatcher | Mínimo, operativo | (Casi sin copy — el dispatcher es UI funcional, datos + estados) |

#### Glossário interno

Términos preferidos (usar):
- "Remís" (no "auto", no "vehículo" salvo en contextos formales)
- "Pedido" (no "request", no "solicitud")
- "Conductor" (no "chofer" en passenger-facing; "chofer" sí en dispatcher informal)
- "Pasajero" (default), "cliente" (en contexto de agencia)
- "Móvil" (n° interno: "Móvil 12") — no "vehículo 12"

Términos prohibidos:
- "Plataforma", "ride-hailing", "viaje compartido"
- "Driver" (anglicismo innecesario)
- "Premium" (lo somos, no lo decimos)
- "Tu remisito", "esperá un toquecito" (infantilizante)
- "¡Bienvenido!" (sin signo)

#### Plantillas de copy (10 mensajes canónicos)

Listar 10 strings clave con su variante final aprobada:

1. Welcome onboarding pasajero (≤60 chars).
2. CTA pedir remís (≤20 chars).
3. Búsqueda conductor (≤40).
4. Conductor asignado (≤80).
5. Conductor en camino (≤60).
6. Conductor llegó (≤40).
7. Viaje finalizado (≤60).
8. Cancelación por pasajero (texto del modal de confirm).
9. Error genérico fallback (≤80).
10. Push notification de asignación (≤40 título, ≤80 body).

Cada uno con 2-3 alternativas y una marcada como aprobada.

### 3. `docs/brand/naming.md`

Brief para nombrear la app. **No proponer nombre final** — proponer 8-12 candidatos con análisis. Decisión es del cliente.

#### Criterios de naming

- **Pronunciable en español sin esfuerzo.**
- **<10 letras.**
- **`.com.ar` y `.com` con disponibilidad razonable** (no chequear ahora — listar candidatos para chequeo posterior).
- **App store name disponible** (sin colisión con apps de remis existentes).
- **No incluir "Uber", "Cab", "Taxi"** (ni guiños, ni anti-guiños).
- **Resonancia regional sutil OK** (palabra de pampa o quechua corta) pero NO folclórico explícito.
- **Verbalizable como CTA**: "Pedí un X" debe sonar bien.

#### Familias de nombres a explorar

1. **Verbos cortos** (acción): "Vamos", "Llevá", "Andá".
2. **Sustantivos pampa-tinged** (no folclore): "Pampa", "Cardo", "Ñire", "Caldén" (árbol pampeano), "Sereno" (nochero).
3. **Compuestos sintéticos**: "Chofé", "Kilometra", "Vialá".
4. **Conceptos de servicio**: "Pasaje", "Trayecto", "Tramo".
5. **Nombre del pueblo + sufijo**: si el pueblo es ej. "Anguil", "Doblas", "Alta Italia" → "Anguil App", etc. (probable rechazo del cliente, pero listar 1).

Tabla con 8-12 candidatos:

| Nombre | Tipo | Pros | Contras | Disponibilidad sugerida |
|--------|------|------|---------|-------------------------|
| ... | ... | ... | ... | (chequear .com.ar, AppStore) |

#### Nomenclatura técnica del proyecto

Independiente del nombre comercial:
- Código repo: `remis-app` (ya está).
- Bundle IDs: `com.[cliente].remis.driver`, `com.[cliente].remis.passenger`.
- Display names en stores: definir post-naming.

### 4. `docs/brand/logo_brief.md`

Brief para diseñador (interno o externo). **No diseñar el logo** — escribir el brief.

#### Concept brief

- **Atributos**: confianza, cercanía, sobriedad, regionalidad sutil, premium sin pretensión.
- **NO**: auto, volante, llave, mapa pin, signos de tráfico, gradientes saturados.
- **Inspiración deliberada**:
  - Geometría limpia (Cabify, Bolt — sin imitar).
  - Tipografía con personalidad (logos custom o monolinear premium).
  - Guiño a la pampa: horizonte (línea), atardecer (gradiente sutil ámbar→azul medianoche), o un símbolo abstracto.

#### Especificaciones técnicas

- **Lockups**:
  - Símbolo (ícono cuadrado para app icon).
  - Logotipo (símbolo + wordmark horizontal).
  - Wordmark (solo).
- **Variantes**:
  - Color (sobre claro y sobre oscuro).
  - Mono negro / mono blanco.
- **Formatos entregables**: SVG vector + PNG @1x/2x/3x + PDF + Figma source.
- **Min size legible**: 24px (símbolo), 80px (logotipo horizontal).
- **Clear space**: equivalente a la altura de la "x" del wordmark, en cada lado.
- **App icon**:
  - 1024×1024 master.
  - iOS: NO transparencia; padding interno.
  - Android adaptive: foreground (108dp safe zone) + background.
  - Web favicons: 16/32/192/512 + maskable.
- **Splash screen**: símbolo centrado sobre `--brand-primary` en mobile, sin texto.

#### Paleta del logo

Usa los tokens — `--brand-primary` y `--brand-accent` como base. La versión mono negra debe seguir leyéndose impecable a 16px.

#### Don'ts del brief

- No mascotas (no remís sonriente, no camionero amigable).
- No banderas / símbolos políticos.
- No siglas tipo "RPA" / "RPL" — preferir nombre completo.
- No emojis incrustados en el wordmark.

### 5. `docs/brand/visual_narrative.md`

Lo que NO está en `00_design_language.md` y sirve a las apps de Tandas 2-4:

#### Fotografía / ilustración

- **Cero stock photos.** Si se necesitan ilustraciones (onboarding, empty states), encargar set custom de **ilustraciones planas con paleta cálida**, estilo Cabify-meets-Whitespace.
- **Si se usa fotografía** (landing): foto real del auto típico de la flota, fotos de los pueblos pampeanos en horario dorado, **siempre con paleta cohesiva** (no mezclar fotos saturadas modernas con paleta sobria).

#### Paleta narrativa "atardecer pampeano"

Solo para landing y comunicaciones de marketing — NO para UI productiva:
- Cielo (`--brand-primary`)
- Horizonte (`--brand-accent`)
- Tierra (terracota suave `#A0522D`-derivado)
- Pasto seco (verde-oliva apagado `#65733B`)

Estos colores **NO** son tokens del design system. Aparecen solo en assets gráficos del landing (héro, ilustraciones de "cómo funciona", footer).

#### Iconografía custom (set de 8) — brief

Listar los 8 íconos de `00_design_language.md` sec 5 con **brief específico** de cada uno:

1. **Remís (vista 3/4)** — sedan con caja de techo iluminada estilizada; trazo 1.5px.
2. **Pin de pickup** — drop pin con marcador de espera (puntos animables).
3. **Pin de destino** — bandera a cuadros minimalista, 4 cuadros.
4. **Paradero** — poste con cartel rectangular, base.
5. **Móvil interno** — círculo con número placeholder "12".
6. **Reloj programado** — reloj analógico con flecha rotando.
7. **SOS** — escudo redondeado con triángulo de alerta.
8. **Cinturón** — diagonal con hebilla central, mínimo.

Cada uno: tamaños 16/20/24, stroke 1.5px, alineados a baseline tipográfico. Entregable SVG + componente React (`<RemisIcon size={24} />`) y Flutter (`RemisIcon.medium()`).

#### Soundscape / haptics

- **Notification sound app pasajero**: tono corto de 200ms, suave (similar a Things 3). Custom mp3 + Sound Asset.
- **Notification sound conductor (NUEVO PEDIDO)**: tono más insistente, 500ms, con segunda nota a 200ms si no se atiende en 5s.
- **Haptics conductor**: `HeavyImpact` al entrar pedido + 3 pulsos cortos (vibration pattern `[0, 200, 100, 200, 100, 200]`).
- **Haptics pasajero**: `LightImpact` en CTA principales, ninguna fuera de eso.
- **SOS**: vibración fuerte continua cada 1s mientras se mantiene presionado.

#### Motion brand

- **Página → página**: slide horizontal 240ms `--ease-out` (mobile); fade 150ms en web.
- **Hero del landing**: parallax sutil (10% velocidad) en el horizonte.
- **Marker en mapa**: easing animation cuando se mueve (no jumps); rotación animada en cambio de heading.

### 6. `docs/brand/copy_library.md`

Biblioteca de copy listo para Tandas 2-4. Estructura:

```
[ID] [contexto] [audiencia] [carácter límite]
TEXTO
```

Ejemplo:
```
[push.ride.assigned] [push notification driver] [conductor] [80c title, 120c body]
title: Nuevo pedido — Móvil 12
body: Recoger a María Pérez en Centenario 1234. ETA 5 min.
```

Mínimo 50 strings:
- Onboarding driver (8 strings, uno por paso).
- Onboarding passenger (3 strings).
- Push notifications (10 strings).
- Estados de viaje pasajero (8 strings).
- Estados de viaje conductor (8 strings).
- Errores (10 strings).
- Empty states (5 strings).
- Confirmaciones (5 strings).

Cada string con su contexto en árbol. Servirá como **fuente para i18n futuro** aunque por ahora la app es 100% español.

### 7. `docs/brand/social_landing_brief.md`

Brief para el landing público (Tanda 2D y refinamiento en 4):
- Estructura: Hero → Cómo funciona → Tarifas → Para conductores (CTA "trabajá con nosotros") → FAQ → Contacto/Footer.
- Hero copy: 1 headline (≤60c) + 1 subhead (≤120c) + 1 CTA principal.
- 3 features destacados (cards): "Pedí desde la app", "Conductores verificados", "Pagá como prefieras".
- FAQ: 8 preguntas tipo (cuándo, cómo, costos, métodos de pago, cancelación, viajes programados, equipaje, mascotas).
- Footer: contacto agencia, dirección, teléfono, links a legal, redes (placeholder).

## Acceptance criteria

- [ ] Los 7 docs existen.
- [ ] `voice_tone.md` tiene los 10 mensajes canónicos con variante final marcada.
- [ ] `naming.md` tiene 8-12 candidatos.
- [ ] `logo_brief.md` está listo para enviar a un diseñador (le falta solo decidir nombre).
- [ ] `copy_library.md` tiene ≥50 strings con IDs estables.
- [ ] Disclaimer arriba de cada doc: "Borrador para revisión con cliente. Versión 0.1.0".
- [ ] Commit `docs(brand): voice, naming brief, logo brief, copy library, narrative`.

## Notas

- **El cliente decide naming y logo** — no avances con un nombre tentado.
- **Coherencia con `00_design_language.md`** es obligatoria. Si tu propuesta narrativa requiere romper algo de ese doc, anotalo en BLOCKERS y seguí.
- **El copy library es semilla** — Tandas 2-4 lo van a expandir; mantenerlo en formato fácilmente parseable a JSON/i18n más adelante.

## Out of scope

- Crear el logo. Eso lo hace un diseñador después.
- Crear las ilustraciones. Encargo externo.
- Generar audios de notificación. Encargo o stock libre con licencia.
- Implementar i18n. Por ahora español único.
