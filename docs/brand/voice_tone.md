> **Borrador para revisión con cliente. Versión 0.1.0**

# Voz y Tono de Marca — [NOMBRE]

Guía de referencia interna para el equipo de producto. Define cómo habla [NOMBRE] en las tres apps (pasajero, conductor, despachante) y en cualquier comunicación relacionada.

---

## 1. Personalidad de marca

Las cinco dimensiones que definen el carácter constante de [NOMBRE]. No cambian según contexto; lo que cambia es el tono (ver sección 3).

| Dimensión | Escala 1–5 | Valor | Qué significa en la práctica |
|---|---|---|---|
| Formal ↔ Informal | `1 ← [ ] [ ] [ ] [4] [ ] → 5` | **4 — Informal, no chabacano** | Voseo siempre. Contracciones naturales. Sin jerga generacional ni slang de redes. |
| Serio ↔ Divertido | `1 ← [2] [ ] [ ] [ ] [ ] → 5` | **2 — Mayormente serio** | Es transporte. Hay seguridad de por medio. El humor no tiene lugar en la UI productiva. |
| Distante ↔ Cercano | `1 ← [ ] [ ] [ ] [4] [ ] → 5` | **4 — Cercano** | Primera persona activa. "Estamos buscando tu remís", no "Se está procesando la solicitud". |
| Conservador ↔ Innovador | `1 ← [ ] [ ] [3] [ ] [ ] → 5` | **3 — Sobrio** | No suena a startup techie ni a empresa de los 90. Moderno sin ser cool forzado. |
| Cooperativo ↔ Asertivo | `1 ← [ ] [ ] [ ] [4] [ ] → 5` | **4 — Asertivo amable** | Indicaciones claras y directas. No sugerencias suaves. "Confirmá tu dirección", no "¿Podrías verificar tu dirección?". |

---

## 2. Voz (constante)

La voz no cambia. Son las reglas estructurales que aplican en toda la interfaz y en toda comunicación de producto.

### Reglas obligatorias

| Regla | Correcto | Incorrecto |
|---|---|---|
| **Voseo rioplatense siempre** | "Confirmá tu pedido" | "Confirme su pedido" / "Confirma tu pedido" |
| **Frases cortas — máx. 18 palabras** | "No encontramos conductor disponible. Intentá de nuevo en unos minutos." | "Lamentamos informarte que en este momento no hemos podido encontrar un conductor disponible para tu zona." |
| **Verbos activos en presente** | "Buscando conductor" | "Se está buscando un conductor" |
| **Sin diminutivos infantilizantes** | "Tu remís" / "Tu pedido" | "Tu remisito" / "Tu pedidito" |
| **Sin signos de exclamación** | "Bienvenido a [NOMBRE]" | "¡Bienvenido a [NOMBRE]!" |
| **Sin emoji en UI productiva** | — | Cualquier emoji en pantallas de pedido, estado, error |
| **Emoji permitido** | Solo en chat libre entre pasajero y conductor | — |
| **Sin tecnicismos en passenger-facing** | "Asignando conductor" | "Dispatch en curso" / "Procesando request" |
| **Sin anglicismos innecesarios** | "Conductor" | "Driver" |

### Sobre el largo de frases

Si una frase supera las 18 palabras, partila en dos. Sin excepciones. La pantalla de un celular es chica y el usuario está mirando la calle.

---

## 3. Tono (contextual)

El tono sí varía. Cada contexto tiene su registro. La voz (sección 2) siempre aplica; el tono ajusta la temperatura emocional.

| Contexto | Tono | Guía de escritura | Ejemplo |
|---|---|---|---|
| **Bienvenida / onboarding** | Cálido, simple | Corto, sin abrumar. Nada técnico. Transmitir que es fácil. | "Bienvenido a [NOMBRE]. Pedí tu remís en segundos." |
| **Operación normal** | Neutro, informativo | Solo los datos que el usuario necesita. Sin relleno. | "Tu remís llega en 4 minutos." |
| **Espera / loading** | Tranquilizador | Mostrar que algo está pasando. Nada de silencios vacíos. | "Estamos buscando un conductor cerca." |
| **Error recuperable** | Directo, accionable | Decir qué falló + qué puede hacer el usuario ahora. | "No pudimos procesar el pago. Probá con otra tarjeta o pagá en efectivo." |
| **Error grave** | Serio, con salida | Sin dramatismo. Dar una salida concreta (número de teléfono). | "Algo salió mal. Llamanos al 02954-XXX." |
| **Confirmación** | Afirmativo, breve | Una o dos palabras cuando alcanza. | "Listo." / "Pedido cargado." |
| **SOS / emergencia** | Calma operativa | Tono firme y contenido. No alarmar, pero tampoco suavizar. Indicar acción. | "Mantené la calma. Estamos avisando a la agencia." |
| **Conductor (driver app)** | Utilitario | El conductor necesita datos, no texto. Dirección, nombre, acción. | "Aceptaste — vas a María, calle Centenario 123." |
| **Despachante (web app)** | Mínimo, operativo | La UI del despachante es casi toda datos y estados. El copy es residual. | Etiquetas cortas: "Pendiente", "Asignado", "En camino", "Finalizado". |

### Nota sobre el contexto SOS

En pantallas de emergencia, el tono de calma operativa no significa ser frío. Significa ser claro. El usuario está asustado; necesita saber exactamente qué va a pasar, no leer un párrafo.

---

## 4. Glosario interno

### Términos preferidos

| Término | Usar | No usar | Notas |
|---|---|---|---|
| El vehículo | **Remís** | "Auto", "vehículo" | "Vehículo" solo en contextos formales o legales |
| La acción del usuario | **Pedido** | "Request", "solicitud", "viaje" | "Viaje" puede usarse una vez iniciado el trayecto |
| Quien maneja | **Conductor** | "Chofer" (passenger-facing), "Driver" | "Chofer" es aceptable en el dispatcher en tono informal |
| Quien usa el servicio | **Pasajero** (default) | — | "Cliente" es válido en contexto de agencia o facturación |
| Identificación interna del vehículo | **Móvil** (ej: "Móvil 12") | "Vehículo 12", "Auto 12", "Unit 12" | Solo para uso interno / dispatcher |

### Términos prohibidos

| Término prohibido | Por qué |
|---|---|
| "Plataforma" | Sonido tech frío; no describe lo que es [NOMBRE] |
| "Ride-hailing" | Anglicismo de industria; el usuario no lo entiende ni lo necesita |
| "Viaje compartido" | [NOMBRE] no hace carpooling; genera confusión |
| "Driver" | Anglicismo innecesario cuando existe "conductor" |
| "Premium" | Si lo somos, no lo decimos; lo demuestra el servicio |
| "Tu remisito" | Infantilizante; no respeta al usuario |
| "Esperá un toquecito" | Diminutivos que quitan seriedad al servicio |
| "¡Bienvenido!" | Sin signo de exclamación, siempre |
| "Dispatch en curso" | Tecnicismo que no corresponde al app de pasajero |

---

## 5. Plantillas de copy canónicas

Los 10 mensajes clave de la app. Cada uno tiene 2–3 variantes; la marcada `[APROBADO]` es la versión vigente. Las alternativas quedan documentadas para revisión futura.

---

### 1. Bienvenida — onboarding pasajero
_Límite: 60 caracteres_

| Variante | Texto | Chars | Estado |
|---|---|---|---|
| A | "Bienvenido a [NOMBRE]. Pedí tu remís en segundos." | 50 | `[APROBADO]` |
| B | "Hola. Con [NOMBRE] pedís tu remís desde acá." | 46 | Alternativa |
| C | "Tu remís, cuando lo necesitás. Bienvenido." | 44 | Alternativa |

---

### 2. CTA — pedir remís
_Límite: 20 caracteres_

| Variante | Texto | Chars | Estado |
|---|---|---|---|
| A | "Pedir remís" | 11 | `[APROBADO]` |
| B | "Llamar un remís" | 15 | Alternativa |
| C | "Nuevo pedido" | 12 | Alternativa (contexto repeat user) |

---

### 3. Estado — búsqueda de conductor
_Límite: 40 caracteres_

| Variante | Texto | Chars | Estado |
|---|---|---|---|
| A | "Buscando conductor cerca de vos." | 33 | `[APROBADO]` |
| B | "Estamos buscando un conductor." | 31 | Alternativa |
| C | "Buscando el conductor más cercano." | 35 | Alternativa |

---

### 4. Estado — conductor asignado
_Límite: 80 caracteres_

| Variante | Texto | Chars | Estado |
|---|---|---|---|
| A | "Conductor asignado. [Nombre] viene en camino — Móvil [N]." | 57 + vars | `[APROBADO]` |
| B | "[Nombre] aceptó tu pedido. Sale ahora." | 39 + var | Alternativa |
| C | "Listo. [Nombre] es tu conductor. Móvil [N]." | 44 + vars | Alternativa |

_Nota: [Nombre] y [N] se reemplazan dinámicamente con datos reales._

---

### 5. Estado — conductor en camino
_Límite: 60 caracteres_

| Variante | Texto | Chars | Estado |
|---|---|---|---|
| A | "Tu remís llega en [X] minutos." | 31 + var | `[APROBADO]` |
| B | "[Nombre] está a [X] minutos." | 29 + vars | Alternativa |
| C | "En camino. Llegada estimada: [X] min." | 38 + var | Alternativa |

---

### 6. Estado — conductor llegó
_Límite: 40 caracteres_

| Variante | Texto | Chars | Estado |
|---|---|---|---|
| A | "Tu remís llegó. Salí cuando puedas." | 36 | `[APROBADO]` |
| B | "El conductor está esperando afuera." | 36 | Alternativa |
| C | "Llegó. Podés salir." | 20 | Alternativa (versión mínima) |

---

### 7. Estado — viaje finalizado
_Límite: 60 caracteres_

| Variante | Texto | Chars | Estado |
|---|---|---|---|
| A | "Viaje terminado. Gracias por usar [NOMBRE]." | 44 + var | `[APROBADO]` |
| B | "Llegaste. Que te vaya bien." | 28 | Alternativa |
| C | "Listo. Hasta la próxima." | 25 | Alternativa |

---

### 8. Cancelación — modal de confirmación por pasajero
_Sin límite estricto; texto completo del modal_

**Variante A** `[APROBADO]`
> **¿Cancelás el pedido?**
> Si el conductor ya está en camino, puede aplicar un cargo por cancelación según la ordenanza municipal.
> [Cancelar pedido] [Volver]

**Variante B**
> **Confirmar cancelación**
> ¿Seguro que querés cancelar? Si el conductor ya salió, la agencia puede cobrarte una tarifa mínima.
> [Sí, cancelar] [No, seguir]

**Variante C**
> **¿Cancelás?**
> El conductor ya fue asignado. Cancelar ahora puede generar un cargo.
> [Cancelar de todas formas] [Mantener pedido]

---

### 9. Error genérico — fallback
_Límite: 80 caracteres_

| Variante | Texto | Chars | Estado |
|---|---|---|---|
| A | "Algo salió mal. Intentá de nuevo o llamanos al 02954-XXX." | 57 + var | `[APROBADO]` |
| B | "No pudimos completar la acción. Intentá de nuevo." | 50 | Alternativa |
| C | "Error inesperado. Si el problema sigue, contactá a la agencia." | 62 | Alternativa |

---

### 10. Push notification — asignación de conductor
_Límite: 40 caracteres título / 80 caracteres body_

**Variante A** `[APROBADO]`
- **Título:** "Tu remís está confirmado" _(25 chars)_
- **Body:** "[Nombre] viene en camino — Móvil [N]. Llega en aproximadamente [X] minutos." _(75 chars + vars)_

**Variante B**
- **Título:** "Conductor asignado" _(18 chars)_
- **Body:** "[Nombre] aceptó tu pedido y ya está en camino. Móvil [N]." _(57 chars + vars)_

**Variante C**
- **Título:** "Pedido confirmado" _(17 chars)_
- **Body:** "Tu remís está en camino. [Nombre], Móvil [N], llega en [X] min." _(63 chars + vars)_

---

## 6. Aplicación por app

Resumen rápido de cómo aplican estas reglas en cada superficie.

| Superficie | Voz | Emoji | Notas particulares |
|---|---|---|---|
| **App pasajero (Flutter)** | Voseo, cercano, sin tecnicismos | Solo en chat | Prioridad: claridad del estado del pedido |
| **App conductor (Flutter)** | Voseo, utilitario, datos primero | No | Copy mínimo; la info crítica es dirección y nombre del pasajero |
| **Web despachante (Next.js)** | Mínimo operativo | No | Casi sin copy narrativo; etiquetas de estado y acciones cortas |
| **Push notifications** | Voseo, directo | No | Título ≤40 chars, body ≤80 chars siempre |
| **Chat libre pasajero–conductor** | Voseo natural | Sí | Es conversación humana; las reglas de copy no aplican al contenido |

---

## 7. Qué no es [NOMBRE]

Lista de identidades que [NOMBRE] explícitamente no es, para orientar decisiones de copy futuras.

- No es Uber ni InDrive. No hay tarifas dinámicas ni "surge pricing". No usamos ese lenguaje.
- No es un chatbot. La interfaz habla, no conversa. Mensajes cortos y funcionales.
- No es una startup de Silicon Valley. Sin "disrupting transport" ni "seamless experience".
- No es una empresa estatal de los 90. Sin formulismos ni tercera persona impersonal.

---

_Última actualización: Abril 2026 — Versión 0.1.0_
_Próxima revisión: pendiente de aprobación con cliente_
