# Flujos de Consentimiento — remis_app

**Version: 0.1.0 — 2026-04-26**

> **Aviso legal:** Este documento es un borrador tecnico-operativo. Debe ser revisado por un abogado matriculado en La Pampa antes de su publicacion.

---

## Tabla de contenidos

1. [Principios generales de diseno](#1-principios-generales-de-diseno)
2. [Flujo 1 — Registro del pasajero](#2-flujo-1--registro-del-pasajero)
3. [Flujo 2 — Permiso de ubicacion (pasajero)](#3-flujo-2--permiso-de-ubicacion-pasajero)
4. [Flujo 3 — Onboarding del conductor](#4-flujo-3--onboarding-del-conductor)
5. [Flujo 4 — Trip share (compartir viaje)](#5-flujo-4--trip-share-compartir-viaje)
6. [Flujo 5 — Cookies (sitio web)](#6-flujo-5--cookies-sitio-web)
7. [Almacenamiento y auditoria de consentimientos](#7-almacenamiento-y-auditoria-de-consentimientos)

---

## 1. Principios generales de diseno

- **Sin oscuridad:** los checkboxes de consentimiento no pueden estar pre-tildados, salvo los que corresponden a condiciones esenciales sin las cuales el servicio no puede prestarse.
- **Separacion:** cada finalidad de consentimiento tiene su propio checkbox. No se agrupan el consentimiento de TyC con el de marketing.
- **Lenguaje llano:** los copys estan escritos en voseo rioplatense, frases cortas, sin terminologia legal opaca.
- **Revocable:** cada consentimiento que puede ser revocado debe indicarlo claramente y el mecanismo de revocacion debe ser tan sencillo como el de otorgamiento.
- **Registrado:** todo consentimiento otorgado o revocado queda registrado en la base de datos con timestamp y version del copy mostrado.

---

## 2. Flujo 1 — Registro del pasajero

### Pantalla: "Crear cuenta"

**Campos del formulario:**
- Nombre y apellido
- Numero de telefono (con codigo de area)
- [Verificacion OTP por SMS]

**Seccion de consentimientos (debajo del formulario, antes del boton "Crear cuenta"):**

---

**Copy del checkbox 1 — Terminos y privacidad (OBLIGATORIO):**

> [ ] Lei y acepto los [Terminos y Condiciones](link) y la [Politica de Privacidad](link). Entiendo que para usar el servicio es necesario que la agencia procese mis datos de contacto, ubicacion y viajes.

- Estado por defecto: **desmarcado**
- Es obligatorio para continuar: **si**
- Texto del link TyC: debe abrir el documento completo antes de que el usuario pueda tildar
- Texto del link Privacidad: debe abrir el documento completo antes de que el usuario pueda tildar

---

**Copy del checkbox 2 — Marketing (OPCIONAL):**

> [ ] Quiero recibir novedades y promociones del servicio por SMS o notificaciones. Puedo darlo de baja en cualquier momento desde "Mi perfil".

- Estado por defecto: **desmarcado**
- Es obligatorio para continuar: **no**
- Revocacion: desde "Mi perfil > Notificaciones"

---

**Boton de accion:**

> **Crear cuenta**

El boton permanece deshabilitado hasta que el checkbox 1 este marcado.

---

**Copy debajo del boton (texto informativo, no checkbox):**

> Al crear tu cuenta confirmas que tenes 18 anos o mas.

---

### Requisito tecnico

Al registrarse, guardar en la base de datos:

```
consent_record {
  user_id,
  consent_type: "terms_and_privacy" | "marketing",
  granted: boolean,
  version: "1.0",  -- version del copy mostrado
  timestamp: timestampz,
  ip_address: string,  -- para auditoria
  platform: "ios" | "android"
}
```

---

## 3. Flujo 2 — Permiso de ubicacion (pasajero)

### Pantalla: "Permitir ubicacion" (prominent disclosure — se muestra ANTES del prompt nativo del sistema operativo)

Esta pantalla debe mostrarse antes de que la app lance el dialogo nativo de permisos de iOS/Android. Es el "prominent disclosure" requerido por las guias de Google Play y App Store.

---

**Icono sugerido:** mapa con pin de ubicacion (sin emoji en produccion, usar asset grafico)

**Titulo:**

> Para pedirte un remis necesitamos saber donde estas

**Cuerpo:**

> Usamos tu ubicacion solo mientras tenes la app abierta y estas pidiendo o en un viaje activo.
>
> No la guardamos cuando no la necesitamos, y nunca la compartimos con nadie que no sea tu conductor.

**Boton primario:**

> Permitir ubicacion

**Boton secundario:**

> Ahora no

---

**Comportamiento si el usuario elige "Ahora no":**

- La app debe poder funcionar con ingreso manual de origen (campo de texto).
- No mostrar este dialogo mas de dos veces. Si el usuario lo rechaza dos veces, no volver a pedirlo a menos que intente hacer un pedido sin ubicacion ingresada.

---

**Nota tecnica:**

- En iOS: solicitar permiso "While Using the App" (WhenInUse). No solicitar permiso "Always" para el pasajero.
- En Android: solicitar `ACCESS_FINE_LOCATION`. No solicitar `ACCESS_BACKGROUND_LOCATION` para el pasajero.

---

## 4. Flujo 3 — Onboarding del conductor

El conductor firma un conjunto de consentimientos mas amplio. Cada uno es una pantalla separada con scroll hasta el final antes de poder avanzar.

### 4.1 Consentimiento KYC biometrico

**Titulo:**

> Verificacion de identidad (unica vez)

**Cuerpo:**

> Para habilitarte como conductor necesitamos verificar que sos quien decis ser. Este proceso se hace una sola vez.
>
> **Que vamos a hacer:**
> - Te vamos a pedir una foto de tu DNI (frente y dorso).
> - Te vamos a pedir una selfie en el momento.
> - Un servicio de Amazon Web Services (en Estados Unidos) va a comparar tu selfie con la foto del DNI.
>
> **Que guardamos:**
> - El resultado de la verificacion (si coincide o no).
> - Las fotos, por 5 anos desde tu baja como conductor (por obligacion legal de habilitacion).
>
> **Que no hacemos:**
> - No usamos tus datos biometricos para ninguna otra cosa.
> - No los vendemos ni los compartimos salvo lo indicado en nuestra Politica de Privacidad.
>
> Podes pedir que eliminemos estos datos enviando un email a [EMAIL DE PRIVACIDAD], pero tene en cuenta que eso implica darte de baja como conductor.

**Checkbox:**

> [ ] Entiendo y acepto que se procesen mis datos biometricos para la verificacion de identidad como conductor.

- Estado por defecto: **desmarcado**
- Es obligatorio para continuar el onboarding: **si**

---

### 4.2 Consentimiento de ubicacion en background

**Titulo:**

> Tu ubicacion cuando estas en turno

**Cuerpo:**

> Para que el despachante pueda asignarte viajes, necesitamos ver tu ubicacion mientras la app esta activa en tu turno.
>
> **Cuando registramos tu ubicacion:**
> - Solo cuando tenes la app abierta o activa en segundo plano con el turno habilitado.
> - Cuando finalizas el turno, dejamos de registrarla.
>
> **Cuanto tiempo la guardamos:**
> - 90 dias si no esta vinculada a un viaje.
> - 5 anos si forma parte del registro de un viaje (por obligaciones legales).

**Checkbox:**

> [ ] Acepto que la app registre mi ubicacion GPS mientras tengo el turno activo, incluso cuando la app esta en segundo plano.

- Estado por defecto: **desmarcado**
- Es obligatorio para operar: **si**

---

### 4.3 Consentimiento de foto de perfil publica

**Titulo:**

> Tu foto sera visible para los pasajeros

**Cuerpo:**

> Cuando un pasajero te sea asignado, va a poder ver tu nombre y foto de perfil en la app. Esto es para que pueda identificarte cuando llegues.
>
> Podes cambiar tu foto de perfil desde "Mi perfil" en cualquier momento.

**Checkbox:**

> [ ] Entiendo que mi foto y nombre seran visibles para los pasajeros de los viajes que me asignen.

- Estado por defecto: **desmarcado**
- Es obligatorio para operar: **si**

---

### 4.4 Consentimiento de llamadas grabadas (si aplica)

Incluir este flujo solo si la agencia decide grabar las comunicaciones entre conductor y despachante.

**Titulo:**

> Las comunicaciones pueden ser grabadas

**Cuerpo:**

> Para mejorar la calidad del servicio y resolver posibles reclamos, las llamadas y comunicaciones a traves de la app entre vos y el despachante pueden ser grabadas y almacenadas por hasta [PLAZO].
>
> Las grabaciones solo son accesibles para el personal autorizado de la agencia y no se comparten con terceros salvo requerimiento judicial.

**Checkbox:**

> [ ] Acepto que las comunicaciones con el despachante a traves de la app puedan ser grabadas.

- Estado por defecto: **desmarcado**
- Es obligatorio para operar: depende de la decision de la agencia (consultar con abogado)

---

### 4.5 Consentimiento de disciplina y sanciones

**Titulo:**

> Reglas del servicio y sanciones

**Cuerpo:**

> Antes de activar tu cuenta, te pedimos que leas las reglas del servicio. Incluyen las obligaciones como conductor y el regimen de sanciones en caso de incumplimiento.

**Accion:**

> [Ver Terminos y Condiciones del Conductor] (link a terms.md Seccion B — debe poder leerse completa)

**Checkbox:**

> [ ] Lei y acepto los Terminos y Condiciones del Conductor, incluyendo las obligaciones operativas y el sistema de sanciones.

- Estado por defecto: **desmarcado**
- Es obligatorio para continuar: **si**

---

## 5. Flujo 4 — Trip share (compartir viaje)

### Pantalla: "Compartir viaje" (disponible durante un viaje activo)

**Titulo:**

> Compartir tu viaje

**Cuerpo:**

> Podes enviarle a alguien de confianza un link para que vea en tiempo real donde estas durante este viaje. El link expira cuando el viaje termina.
>
> La persona que recibe el link puede ver tu ubicacion y los datos del conductor (nombre y patente), pero no puede ver tu historial ni tus datos de cuenta.

**Boton primario:**

> Compartir link

**Boton secundario:**

> Cancelar

---

**Texto informativo (no checkbox):**

> Podes dejar de compartir el link en cualquier momento tocando "Dejar de compartir" en esta pantalla.

---

**Comportamiento tecnico:**

- El link de trip share es un token de un solo uso, de acceso publico pero sin autenticacion, que expira cuando el `ride.status` cambia a "completado" o "cancelado".
- El link no permite acceder a ningun otro dato del usuario ni del historial.

---

## 6. Flujo 5 — Cookies (sitio web)

### Banner de cookies (aparece al primer acceso al sitio web)

El banner debe aparecer en la parte inferior de la pantalla sin bloquear el contenido principal ("soft banner"). No debe ser un modal de pantalla completa.

---

**Titulo:**

> Este sitio usa cookies

**Cuerpo:**

> Usamos cookies tecnicas para que el sitio funcione. Si aceptas, tambien usaremos cookies de analisis (PostHog) para entender como se usa el sitio. No usamos cookies de publicidad.

**Boton primario:**

> Aceptar todo

**Boton secundario:**

> Solo necesarias

**Link:**

> Configurar preferencias | Politica de privacidad

---

**Comportamiento:**

| Cookie | Tipo | Si el usuario elige "Aceptar todo" | Si el usuario elige "Solo necesarias" |
|--------|------|------------------------------------|--------------------------------------|
| Sesion y preferencias | Tecnica | Activa | Activa |
| PostHog (analitica) | Analitica | Activa | Inactiva |

---

**Pantalla de configuracion de cookies (accesible desde el link del banner o desde el pie de pagina):**

> **Cookies tecnicas (siempre activas)**
> Necesarias para que el sitio funcione. No se pueden desactivar.
>
> **Cookies de analisis — PostHog**
> Nos ayudan a entender cuantas personas visitan el sitio y como lo usan. Los datos son anonimizados. [toggle ON/OFF]
>
> **Cookies de marketing**
> No usamos cookies de marketing.

---

## 7. Almacenamiento y auditoria de consentimientos

Todos los consentimientos deben almacenarse en una tabla `consent_records` con la siguiente informacion minima:

| Campo | Descripcion |
|-------|-------------|
| `user_id` | ID del usuario en la plataforma |
| `consent_type` | Tipo de consentimiento (ej: "kyc_biometric", "background_location", "marketing") |
| `granted` | Boolean: true = otorgado, false = revocado |
| `version` | Version del copy exacto mostrado al usuario (ej: "1.0") |
| `timestamp` | Fecha y hora exacta con timezone |
| `platform` | Canal donde se otorgo (ios, android, web) |
| `ip_address` | Para auditoria (solo en registro web; en mobile no aplica) |

Cuando un usuario revoca un consentimiento, se inserta una nueva fila con `granted = false`. No se modifica el registro anterior.

Esta tabla es parte del `audit_log` y esta sujeta a los plazos de retencion del [data_retention.md](./data_retention.md) para registros de auditoria (5 anos minimo).

---

*Referencias: Ley 25.326; ver tambien [privacy_policy.md](./privacy_policy.md) seccion 4 y [data_retention.md](./data_retention.md).*
