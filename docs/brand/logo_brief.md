> **Borrador para revisión con cliente. Versión 0.1.0**

# Brief de Logo — [NOMBRE]
## App de Remisería Regional · La Pampa, Argentina

**Fecha:** Abril 2026
**Versión:** 0.1.0
**Para:** Diseñador gráfico externo
**Contacto del proyecto:** manunv97@gmail.com

---

## 1. Contexto del Producto

### ¿Qué es?
**[NOMBRE]** es una aplicación móvil de gestión de remisería de tipo single-tenant. Centraliza la operación de una empresa de remises localizada en un pueblo de la zona de Santa Rosa, La Pampa (código de área 2954). No es una plataforma marketplace: es una herramienta interna para una empresa con identidad propia, aproximadamente 50 conductores y asignación manual de viajes.

### ¿Para quién es?
- **Pasajeros:** vecinos del pueblo y zona. Personas que conocen al chofer, que llaman siempre al mismo número, que esperan confiabilidad y puntualidad por encima de todo.
- **Conductores:** profesionales locales, adultos, no nativos digitales en su mayoría. Necesitan una interfaz clara, sin ruido visual.
- **Operador/despachante:** el responsable de asignar viajes de forma manual. Necesita eficiencia y claridad.

### ¿Qué sensación debe transmitir?
La marca debe sentirse como una empresa seria de una ciudad real, no como una startup de capital. Confiable, cercana, sin pretensiones metropolitanas. El producto es premium en su categoría local, pero no es Uber ni intenta parecerlo. Es el remís de siempre, pero organizado y digital.

**Palabras clave de la marca:** confianza, cercanía, sobriedad, regionalidad sutil, premium sin pretensión.

---

## 2. Filosofía Visual: "Premium Pampeano"

El concepto rector es **"Premium Pampeano"**: un equilibrio entre la austeridad de la llanura y la presencia de una marca bien construida. La identidad visual debe evocar La Pampa sin folklorizarla. No hay gauchos, no hay ombúes, no hay calles de tierra. Hay horizonte, amplitud, silencio, cielo.

El logo debe poder vivir en:
- Una pantalla de celular de $80.000 ARS
- Un sticker en la luneta de una camioneta Ford Ranger
- Una tarjeta de presentación impresa en imprenta local

---

## 3. Atributos de Marca

### Lo que debe transmitir
| Atributo | Descripción |
|---|---|
| **Confianza** | Solidez visual, sin artificios. La persona que lo ve sabe que esto es serio. |
| **Cercanía** | No es una corporación. Tiene temperatura humana, aunque no sea literal. |
| **Sobriedad** | Economía de elementos. Nada que sobre. |
| **Regionalidad sutil** | Hay algo de La Pampa ahí, pero no necesitás ser pampeano para entenderlo. |
| **Premium sin pretensión** | Cuidado en el detalle, pero sin arrogancia visual. |

### Lo que NO debe transmitir
- Urgencia (no es delivery)
- Tecnología futurista (no es una FinTech)
- Masividad urbana (no es Cabify, aunque puede aprender de su geometría)
- Folklore regionalista (no es una marca de turismo pampeano)

---

## 4. Elementos Prohibidos (Hard Don'ts)

Los siguientes elementos están explícitamente excluidos. No como sugerencia, sino como restricción no negociable:

- **Iconografía de transporte literal:** autos, camionetas, volantes, llaves, semáforos, señales de tráfico, mapas pin, rutas, flechas de GPS
- **Gradientes saturados o neones:** sin degradados tipo app de delivery 2019
- **Mascotas o personajes:** sin remisero amigable, sin automóvil con ojos, sin personaje mascota
- **Símbolos políticos o regionales institucionales:** sin banderas provinciales, escudos, colores del municipio
- **Siglas genéricas:** evitar iniciales tipo "RA", "RP", "RPS" como solución tipográfica primaria — preferir el nombre completo
- **Emojis incrustados en el wordmark**
- **Decoración superficial:** rayos, coronas, wings, estrellas decorativas

---

## 5. Paleta de Color del Logo

La paleta proviene directamente del sistema de design tokens de la aplicación.

### Colores primarios

| Token | Hex | Uso |
|---|---|---|
| `--brand-primary` | `#1B2A4E` | Azul medianoche profundo. Color base del logo en light mode. |
| `--brand-accent` | `#D97706` | Ámbar quemado. Acento, detalles, punto de calor. |

### Colores en dark mode (referencia)

| Token | Hex | Uso |
|---|---|---|
| `--brand-primary` dark | `#7CA0FF` | Versión iluminada del azul para fondos oscuros. |
| `--brand-accent` dark | `#F59E0B` | Ámbar más vivo para contraste en dark. |

### Notas de uso de color
- El logo principal usa `#1B2A4E` como color dominante y `#D97706` como acento controlado (no dominante)
- La versión sobre fondo oscuro invierte o adapta, según criterio del diseñador, priorizando contraste y legibilidad
- Los colores monocromáticos (negro/blanco) son variantes obligatorias, no opcionales
- **La versión mono negra debe leerse con nitidez a 16px de tamaño**

---

## 6. Sistema Tipográfico

Las fuentes de la aplicación son:

| Rol | Familia | Uso en la app |
|---|---|---|
| Display / Headings | **Inter Tight** | Titulares, nombre de la app |
| Body | **Inter** | Texto corriente |
| Números | **Geist Mono** | Tarifas, horas, códigos |

### Implicancias para el wordmark
- El wordmark puede estar construido sobre **Inter Tight** (con o sin modificaciones de letterspace/kerning custom) o sobre una tipografía custom monolinear que dialogue con ese stack sin copiarlo
- Si el diseñador propone una tipografía alternativa, debe ser: geométrica o humanista, sin serifa, con buen rendimiento en pequeño tamaño, disponible en licencia comercial
- **Evitar** tipografías con personalidad excesivamente decorativa, condensadas extremas, o con serifas

---

## 7. Lockups Requeridos

El sistema de logo debe contemplar exactamente tres lockups:

### 7.1 Símbolo (Symbol / App Icon)
- Ícono cuadrado autónomo
- Funciona solo, sin wordmark
- Es el elemento principal del app icon en iOS y Android
- Debe ser reconocible y distinguible a 24px de tamaño mínimo
- Composición contenida en un área cuadrada (el diseñador decide si incluye o no contenedor/forma de fondo)

### 7.2 Logotipo (Lockup horizontal)
- Símbolo + wordmark en disposición horizontal (símbolo a la izquierda)
- Es la versión de uso primario en pantalla
- Tamaño mínimo legible: **80px de ancho total**
- Puede existir una variante en disposición vertical (stacked) si el diseñador lo considera, pero no es obligatoria

### 7.3 Wordmark (Solo tipográfico)
- El nombre **[NOMBRE]** en tipografía, sin símbolo
- Para uso en contextos donde el símbolo ya está presente o hay restricciones de espacio horizontal muy reducido

---

## 8. Variantes Requeridas

Para cada lockup, entregar las siguientes variantes:

| Variante | Descripción |
|---|---|
| **Color sobre fondo claro** | Versión principal. Fondo blanco o claro neutro. |
| **Color sobre fondo oscuro** | Versión dark. Fondo `#1B2A4E` o negro. |
| **Monocromático negro** | Un solo tono, negro puro (`#000000`). Sobre fondo blanco. |
| **Monocromático blanco** | Un solo tono, blanco puro (`#FFFFFF`). Sobre fondo negro o dark. |

---

## 9. Especificaciones Técnicas

### 9.1 Tamaños mínimos
- Símbolo solo: **24px**
- Logotipo horizontal: **80px** de ancho
- Wordmark solo: **80px** de ancho

### 9.2 Clear Space (Zona de respeto)
- En todos los lockups, la zona de respeto mínima en cada uno de los cuatro lados equivale a **la altura de la x-height (ojo medio) de la tipografía del wordmark**
- Esta regla aplica tanto en digital como en impreso

### 9.3 App Icon

#### Master
- Dimensiones: **1024 × 1024 px**
- Color space: sRGB
- Profundidad: 32-bit

#### iOS
- **Sin transparencia** (canal alpha plano, fondo relleno)
- El símbolo debe tener **padding interno** generoso (el sistema iOS recorta las esquinas con radio automático — tener en cuenta al componer)
- Fondo recomendado: `#1B2A4E` (brand-primary)

#### Android Adaptive Icon
- Capa de **foreground**: símbolo centrado, respetando la **safe zone de 108dp** (el símbolo debe quedar dentro del círculo central de 72dp teórico)
- Capa de **background**: color plano `#1B2A4E` o según criterio del diseñador, consistente con la paleta
- Entregar ambas capas por separado como archivos independientes

#### Web Favicons
Entregar en los siguientes tamaños:
- 16 × 16 px
- 32 × 32 px
- 192 × 192 px
- 512 × 512 px
- **Maskable** (512 × 512, con safe zone del 80% del área total para PWA)

### 9.4 Splash Screen
- Símbolo centrado (vertical y horizontal) sobre fondo de color `#1B2A4E`
- **Sin texto** en la pantalla de splash
- Formato: especificación para mobile (9:19.5 aprox.), puede ser referencia visual, no necesariamente asset final de exportación

---

## 10. Formatos de Entrega

| Formato | Descripción |
|---|---|
| **SVG** | Vector maestro. Uno por lockup + variante. Texto convertido a outlines. |
| **PNG @1x** | Resolución base (72 ppi) |
| **PNG @2x** | Retina (144 ppi) |
| **PNG @3x** | Super Retina (216 ppi) — requerido para iOS |
| **PDF** | Para uso en impresión. Un archivo por lockup. |
| **Figma source** | Archivo .fig o link a Figma Community / Draft compartido. Componentes con variantes organizadas. |

### Estructura de carpetas sugerida para la entrega
```
[NOMBRE]_logo_v1/
├── 01_symbol/
│   ├── color_light/
│   ├── color_dark/
│   ├── mono_black/
│   └── mono_white/
├── 02_logotipo_horizontal/
│   └── ...
├── 03_wordmark/
│   └── ...
├── 04_app_icon/
│   ├── ios/
│   ├── android/
│   └── web_favicon/
├── 05_splash_reference/
└── figma_source.fig
```

---

## 11. Referentes Visuales (Inspiración, no imitación)

Los siguientes referentes son puntos de partida para la conversación, no modelos a copiar:

### Geometría limpia
- **Cabify:** uso de formas geométricas simples, paleta oscura premium, sin iconografía de transporte literal
- **Bolt:** símbolo abstracto que no representa un auto, identidad coherente en distintos tamaños

### Tipografía con personalidad
- Logos monolineares de empresas de servicios profesionales latinoamericanas: escritura custom con tracking generoso, sin ornamento
- Wordmarks que usan una tipografía estándar (Inter, Neue Haas, etc.) con micro-ajustes de kerning que la hacen sentir propia

### Guiño pampeano (opciones que el diseñador puede explorar)
- Línea de horizonte abstracted como elemento gráfico
- Gradiente sutil ámbar → azul medianoche (evocación de atardecer pampeano) dentro del símbolo, no en el wordmark
- Símbolo abstracto con eje de simetría o construcción geométrica que evoque amplitud o extensión horizontal

---

## 12. Dirección Creativa: Conceptos Sugeridos

Se proponen tres conceptos creativos como punto de partida para la exploración. El diseñador puede desarrollar uno, combinarlos, o proponer una dirección alternativa siempre que respete los atributos y restricciones de este brief.

---

### Concepto A — "Horizonte"

**Idea central:** El símbolo está construido alrededor de una línea horizontal que divide el espacio en dos zonas: cielo y tierra. La zona inferior es densa (azul medianoche), la superior es más abierta o vacía. El símbolo no representa un auto ni un mapa: representa el paisaje como metáfora del viaje.

**Descripción:** Una forma geométrica simple (cuadrado, círculo o hexágono) contiene dentro de sí una línea horizontal que actúa como horizonte. La zona inferior puede ser sólida en `#1B2A4E`; la superior puede ser vacía, o contener un acento mínimo en `#D97706` (una línea delgada, una coma visual, el primer trazo del amanecer). El wordmark en Inter Tight, tracking levemente ampliado, en el mismo nivel que el símbolo.

**Por qué funciona:** La línea de horizonte es el elemento más reconocible del paisaje pampeano sin ser folklórica. Es abstracta, universal y elegante. Tiene precedente en identidades de transporte premium (no derivado, sino resonancia cultural). Funciona a 16px porque la geometría es simple.

**Riesgo a considerar:** Que la línea horizontal se confunda con otros logos genéricos que usan el mismo recurso. Requiere que la forma contenedora o el grosor de la línea sea suficientemente específico para diferenciarse.

---

### Concepto B — "Monograma Geométrico con Eje Diagonal"

**Idea central:** El símbolo es un monograma construido con las letras del nombre **[NOMBRE]**, pero resuelto como forma geométrica con un eje de simetría diagonal. La diagonal evoca movimiento, dirección, trayecto — sin mostrar un vehículo.

**Descripción:** Se toma la inicial (o las dos iniciales) del nombre definitivo y se construye una forma que funciona como símbolo abstracto. Las letras no son legibles a primera vista pero sí reconocibles para quien sabe. La construcción usa trazos de grosor uniforme (monolinear), ángulos de 30° o 45°, sin terminaciones ornamentales. La paleta es `#1B2A4E` dominante con el eje diagonal marcado en `#D97706` como un guiño de calor. El conjunto vive en un cuadrado con padding interno generoso.

**Por qué funciona:** Los monogramas geométricos son atemporales en identidades de servicios profesionales. El eje diagonal agrega tensión visual sin caer en dinamismo genérico. A gran escala se lee como forma abstracta elegante; a pequeña escala se mantiene legible como bloque compacto.

**Riesgo a considerar:** Depende completamente del nombre final. Si el nombre tiene letras con poca tensión geométrica entre sí, el resultado puede ser forzado. Evaluar con el nombre definido antes de comprometer.

---

### Concepto C — "Punto de Encuentro"

**Idea central:** El símbolo representa el punto de contacto entre pasajero y conductor: dos trazos que convergen. No es un mapa pin, no es una flecha: es una forma resultante de la convergencia, abstracta y estable.

**Descripción:** Dos elementos formales (líneas, planos o masas de peso similar) se encuentran en un punto central. El resultado es una forma que tiene equilibrio visual pero también tensión narrativa: algo va hacia algo. El eje de convergencia puede ser vertical u oblicuo. El color puede dividirse: un trazo en `#1B2A4E`, el otro con un acento muy controlado de `#D97706`. La forma resultante debe ser geométrica, cerrada o semi-cerrada, y funcionar como ícono cuadrado para app. El wordmark en Inter Tight con tracking natural, sin exageraciones.

**Por qué funciona:** La convergencia es la esencia del servicio de remís: alguien llama, alguien llega. Conceptualmente preciso sin ser ilustrativo. La forma cerrada o semi-cerrada facilita la construcción del app icon con padding interno. La paleta bicolor es visualmente interesante sin ser compleja.

**Riesgo a considerar:** La convergencia puede leerse como fusión, flecha o señalética si no está bien resuelta. El diseñador debe alejarse conscientemente de cualquier referencia a mapas o GPS.

---

## 13. Proceso de Revisión

- **Entrega esperada:** 2 a 3 propuestas iniciales en boceto digital o sketch vectorial, sin refinar, para validar dirección antes del desarrollo completo
- **Primera revisión:** sobre símbolo y wordmark en versión color light únicamente
- **Segunda revisión:** sistema completo con variantes
- **Entrega final:** todos los formatos según sección 10

### Criterios de aprobación
1. El símbolo es legible y distinguible a 24px
2. El logotipo horizontal funciona a 80px
3. La versión monocromática negra se lee nítida a 16px
4. La paleta es fiel a los tokens definidos (se aceptan tolerancias de ±2 en valores RGB para compensación de pantalla, debe especificarse si aplica)
5. Los archivos de entrega están completos según la estructura de la sección 10
6. El diseño no viola ninguno de los don'ts de la sección 4

---

## 14. Información Técnica Adicional

- **Plataforma de destino principal:** iOS y Android (Flutter)
- **Plataforma secundaria:** Web (posible panel de administración en Next.js)
- **Idioma de la interfaz:** Español argentino
- **Zona geográfica:** La Pampa, Argentina
- **Competencia directa de referencia visual:** No existe competencia directa en la misma escala local. Referencias de mercado: remises tradicionales sin identidad visual definida.
- **Tono de la competencia a evitar:** Logos de taxi o remís hechos con clipart de auto, degradados azul/amarillo genéricos, tipografías de impacto o Bold condensed sin criterio

---

*Este brief fue preparado por el equipo del producto. Cualquier consulta, enviar a: manunv97@gmail.com*

*[NOMBRE] es un placeholder hasta que el nombre definitivo de la app sea aprobado por el cliente. El diseñador debe trabajar con este placeholder y adaptar la propuesta de wordmark una vez confirmado el nombre.*
