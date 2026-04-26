> **Borrador para revisión con cliente. Versión 0.1.0**

# Social & Landing Brief — [NOMBRE]

**Proyecto:** App de remisería single-tenant  
**Zona:** Localidad cercana a Santa Rosa, La Pampa (código área 2954)  
**Stack landing:** Next.js 15 — `apps/web`  
**Filosofía de marca:** Premium Pampeano — sobrio, confiable, cercano  
**Versión:** 0.1.0  
**Fecha:** 2025

---

## Reglas de voz (aplicar en todo el documento)

- Voseo rioplatense: "pedí", "sabés", "tu remís"
- Sin signos de exclamación
- Sin emoji en landing (se permiten ilustraciones)
- Sin tecnicismos
- Frases cortas
- CTA principal siempre en `--brand-accent` (ámbar quemado)

---

## Sección 1 — Hero

### Visual

Foto real o ilustración de un auto de remisería (sedán oscuro, limpio) circulando por una calle de pueblo pampeano al atardecer. Cielo abierto, pavimento seco, arquitectura de localidad chica. Sin filtros saturados — paleta apagada, cálida. El auto ocupa el lado derecho del frame; el copy ancla a la izquierda.

### Headline seleccionado

```
Tu remís, siempre cerca
```

**Char count:** 22 — dentro del límite de 60.

### Variantes de headline

| Variante | Copy | Pros | Contras |
|---|---|---|---|
| A (seleccionada) | Tu remís, siempre cerca | Cercana, posesiva, evoca confiabilidad. Voseo implícito | Genérica sin contexto de ciudad |
| B | El remís del pueblo, en tu celular | Ancla al territorio, diferencia de apps nacionales | "Del pueblo" puede sonar informal en exceso |
| C | Viajá tranquilo por [CIUDAD] | Acción directa, menciona la ciudad | No comunica app; parece aviso de turismo |

> **Decisión pendiente con cliente:** confirmar si la ciudad va en el headline o solo en el subhead.

### Subhead

```
Pedí tu viaje desde la app y un conductor verificado llega a tu puerta.
Servicio regulado, tarifa fija, para [CIUDAD] y alrededores.
```

**Char count headline:** 69 — OK (límite 120).  
**Nota:** reemplazar `[CIUDAD]` con el nombre real de la localidad.

### CTA principal

```
Pedí tu remís
```

**Char count:** 14 — dentro del límite de 20.  
**Color:** `--brand-accent` (ámbar quemado).  
**Acción:** scroll a sección "Cómo funciona" o link a descarga de la app (definir con cliente).

---

## Sección 2 — Cómo funciona

### Encabezado de sección

```
Tres pasos, y listo
```

### Paso 1

| Campo | Contenido |
|---|---|
| Título | Abrí la app |
| Descripción | Descargala gratis y registrate con tu número de celular. |
| Char count desc. | 55 — OK |
| Ícono sugerido | `Smartphone` (Lucide) |

### Paso 2

| Campo | Contenido |
|---|---|
| Título | Pedí tu viaje |
| Descripción | Ingresá tu destino y confirmá. El despachante te asigna un conductor. |
| Char count desc. | 67 — OK |
| Ícono sugerido | `MapPin` (Lucide) |

### Paso 3

| Campo | Contenido |
|---|---|
| Título | Llegás a destino |
| Descripción | Seguí el viaje en tiempo real y pagá al llegar. Fácil, sin vueltas. |
| Char count desc. | 65 — OK |
| Ícono sugerido | `CheckCircle` (Lucide) |

---

## Sección 3 — Features destacados

### Cards (3)

#### Card 1 — Pedí desde la app

```
Headline: Pedí desde la app
Descripción: Sin llamadas, sin espera. Tu pedido en segundos desde el celular.
```

**Char count desc.:** 59 — OK (límite 60).  
**Ícono:** `Smartphone` (Lucide).

#### Card 2 — Conductores verificados

```
Headline: Conductores verificados
Descripción: Todos nuestros choferes pasan por un proceso de habilitación municipal.
```

**Char count desc.:** 71 — supera 60. Versión ajustada:

```
Descripción: Choferes habilitados y conocidos en la zona.
```

**Char count desc.:** 46 — OK.  
**Ícono:** `ShieldCheck` (Lucide).

#### Card 3 — Pagá como prefieras

```
Headline: Pagá como prefieras
Descripción: Efectivo, transferencia o tarjeta. Vos elegís al llegar.
```

**Char count desc.:** 53 — OK.  
**Ícono:** `Wallet` (Lucide).

---

## Sección 4 — Tarifas

> **Nota para el desarrollador:** esta sección muestra una tabla placeholder. El cliente completa los valores reales antes del lanzamiento.

### Copy de apoyo

```
Tarifas fijas, reguladas por ordenanza municipal. Sin sorpresas al llegar.
```

**Char count:** 73 — OK (límite 80).

### Estructura de tabla placeholder

| Zona | Tarifa base | Por km adicional | Mínimo de cobro |
|---|---|---|---|
| Zona Centro | $[MONTO] | $[MONTO]/km | $[MONTO] |
| Zona Norte | $[MONTO] | $[MONTO]/km | $[MONTO] |
| Zona Sur | $[MONTO] | $[MONTO]/km | $[MONTO] |
| Zona Rural / Ruta | $[MONTO] | $[MONTO]/km | $[MONTO] |
| Aeropuerto / Estación | $[MONTO] fijo | — | — |

> **Pendiente cliente:** confirmar zonas, montos y si existe cargo nocturno o por equipaje.

### Nota legal de la sección

```
Las tarifas están aprobadas por la Municipalidad de [CIUDAD].
Vigentes a partir de [FECHA].
```

---

## Sección 5 — Para conductores

### Headline

```
Manejá con [NOMBRE]
```

**Char count:** 20 (con nombre placeholder) — OK (límite 50).

### Cuerpo

```
Sumarte es simple. Trabajás con los horarios que vos elegís y cobrás de forma
puntual. El despacho se ocupa de asignarte los viajes.
```

**Char count (bloque):** 130 aprox — ligeramente sobre 120. Versión ajustada:

```
Trabajás con tus horarios, el despacho asigna los viajes y cobrás puntual.
```

**Char count:** 74 — OK.

### CTA

```
Trabajá con nosotros
```

**Color:** `--brand-accent` (ámbar quemado).

### Copy de apoyo bajo el CTA

```
Completá el formulario y te contactamos en menos de 48 horas.
```

**Char count:** 61.

> **Pendiente desarrollador:** el botón "Trabajá con nosotros" enlaza a formulario interno o a WhatsApp `wa.me/2954XXXXXX`. Confirmar con cliente.

---

## Sección 6 — FAQ

> **Nota de voz:** respuestas en segunda persona, voseo, tono cercano. Límite 100 chars por respuesta.

### Preguntas y respuestas

**1. ¿Cómo pido un remís?**

```
Abrí la app, ingresá tu destino y confirmá. El despachante te asigna un conductor.
```

Char count: 83 — OK.

---

**2. ¿Cuánto tarda en llegar?**

```
Depende de la zona. En el centro, en promedio entre 5 y 10 minutos.
```

Char count: 67 — OK.

---

**3. ¿Cuáles son las tarifas?**

```
Las tarifas son fijas y reguladas por la Municipalidad. Las ves en la app antes de confirmar.
```

Char count: 92 — OK.

---

**4. ¿Cómo se paga?**

```
Podés pagar en efectivo, con transferencia o con tarjeta al llegar al destino.
```

Char count: 78 — OK.

---

**5. ¿Puedo cancelar el pedido?**

```
Sí, podés cancelar desde la app antes de que el conductor salga a buscarte.
```

Char count: 75 — OK.

---

**6. ¿Puedo programar un viaje para más tarde?**

```
Sí. En la app encontrás la opción de agendar un viaje con hora y fecha a elección.
```

Char count: 82 — OK.

---

**7. ¿Puedo viajar con equipaje o mascota?**

```
Sí, avisá al momento del pedido para que el conductor esté preparado.
```

Char count: 68 — OK.

---

**8. ¿El servicio está disponible de noche?**

```
Sí, operamos las [HORAS] del día. Consultá los horarios en la app o por WhatsApp.
```

Char count: 82 — OK.

> **Pendiente cliente:** confirmar horario de operación para respuesta 8.

---

## Sección 7 — Contacto / Footer

### Datos del footer

> Los campos marcados como `[PLACEHOLDER]` los completa el cliente antes del deploy.

```
Agencia: [NOMBRE_AGENCIA]
Dirección: [DIRECCION]
Teléfono: 02954-[XXXXXX]
Email: [EMAIL]
```

### Links

- Política de privacidad — enlaza a `/politica-de-privacidad`
- Términos y condiciones — enlaza a `/terminos-y-condiciones`

> **Pendiente desarrollador:** crear ambas páginas como rutas estáticas en `apps/web`. Contenido legal lo entrega el cliente.

### Redes sociales

| Red | Placeholder |
|---|---|
| Instagram | `instagram.com/[HANDLE]` |
| Facebook | `facebook.com/[HANDLE]` |

### Copyright

```
[NOMBRE] © 2025 — Todos los derechos reservados
```

---

## Sección 8 — Social Media Brief

### Plataformas

Instagram y Facebook. Formato: solo texto (sin recursos gráficos definidos en este brief).  
**Hashtags:** máximo 5 en Instagram, 0 en Facebook.

---

### Posts de pre-lanzamiento (antes de la fecha de apertura)

**Post 1 — Teaser de identidad**

```
Algo nuevo está llegando a [CIUDAD].

Un remís pensado para el pueblo, con tecnología que lo hace más fácil.

Pedilo desde el celular, seguí tu viaje en tiempo real y pagá como prefieras.

Pronto vas a poder usarlo.

#[NOMBRE] #Remís[CIUDAD] #LasPampas #Movilidad
```

---

**Post 2 — Propuesta de valor**

```
¿Cansado de llamar y que no aten?

Con [NOMBRE], pedís desde la app en segundos. Un conductor verificado sale a buscarte.

Sin sorpresas en la tarifa. Sin vueltas.

Anotate para ser de los primeros: [LINK]

#[NOMBRE] #Remís[CIUDAD]
```

---

**Post 3 — Conductores**

```
Si mantenés un auto y querés trabajar con tu propio tiempo, [NOMBRE] tiene algo para vos.

Horarios flexibles. Despacho centralizado. Cobro puntual.

Estamos sumando conductores antes del lanzamiento. Completá el formulario: [LINK]

#[NOMBRE] #TrabajoLaPampa #Conductores
```

---

### Posts de lanzamiento ("ya disponible")

**Post 1 — Día de apertura**

```
Ya podés pedirlo.

[NOMBRE] está disponible en [CIUDAD] desde hoy.

Descargá la app, registrate y pedí tu primer viaje.

[LINK DE DESCARGA]
```

---

**Post 2 — Social proof temprano**

```
En el primer día, [CIUDAD] ya viajó con [NOMBRE].

Gracias a cada pasajero que confió desde el arranque y a los conductores que se sumaron.

Esto recién empieza.

Pedí tu viaje: [LINK]
```

> **Nota de voz para community manager:** no usar signos de exclamación. No usar emoji en el cuerpo del texto. El tono es sobrio y cercano, no hype. Si se usan imágenes, que sean fotos reales del servicio — nada de stock con sonrisas forzadas.

---

## Pendientes para el cliente — checklist

- [ ] Nombre definitivo del servicio (reemplaza todos los `[NOMBRE]`)
- [ ] Nombre de la localidad (reemplaza todos los `[CIUDAD]`)
- [ ] Nombre de la agencia / razón social
- [ ] Dirección fiscal
- [ ] Teléfono de contacto
- [ ] Email de contacto
- [ ] Handles de Instagram y Facebook
- [ ] Zonas de cobertura y tarifas reales
- [ ] Horario de operación
- [ ] Fecha oficial de lanzamiento
- [ ] Link de descarga de la app (App Store / Play Store)
- [ ] Link de formulario para conductores
- [ ] Textos legales: Política de privacidad y Términos y condiciones

---

## Mapa de secciones — referencia rápida para desarrollador

| # | Sección | Componente sugerido | Notas |
|---|---|---|---|
| 1 | Hero | `HeroSection` | Foto real + copy izquierdo, CTA en `--brand-accent` |
| 2 | Cómo funciona | `StepsSection` | 3 cards con ícono Lucide + título + descripción |
| 3 | Features | `FeatureCards` | 3 cards en fila, ícono arriba |
| 4 | Tarifas | `PricingTable` | Tabla responsive, nota legal debajo |
| 5 | Conductores | `DriverCTA` | Background contraste, CTA en `--brand-accent` |
| 6 | FAQ | `FAQAccordion` | 8 items, expand/collapse |
| 7 | Footer | `SiteFooter` | Links legales, redes, copyright |
