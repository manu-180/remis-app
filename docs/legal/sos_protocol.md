# Protocolo Operativo del Boton SOS — remis_app

**Version: 0.1.0 — 2026-04-26**

> **Aviso legal:** Este documento es un borrador tecnico-operativo. Debe ser revisado por un abogado matriculado en La Pampa antes de su publicacion.

---

## Tabla de contenidos

1. [Proposito](#1-proposito)
2. [Diseno del trigger — UX del boton SOS](#2-diseno-del-trigger--ux-del-boton-sos)
3. [Datos persistidos al activar el SOS](#3-datos-persistidos-al-activar-el-sos)
4. [Notificacion al dispatcher](#4-notificacion-al-dispatcher)
5. [Notificacion a contactos de emergencia](#5-notificacion-a-contactos-de-emergencia)
6. [Llamada al 911](#6-llamada-al-911)
7. [Politica de NO resolucion automatica](#7-politica-de-no-resolucion-automatica)
8. [Retencion de datos del SOS](#8-retencion-de-datos-del-sos)
9. [Falsos positivos](#9-falsos-positivos)
10. [Capacitacion del dispatcher](#10-capacitacion-del-dispatcher)
11. [Revision del protocolo](#11-revision-del-protocolo)

---

## 1. Proposito

El boton SOS es una funcionalidad de seguridad critica disponible para el pasajero y para el conductor durante un viaje activo. Su proposito es alertar al dispatcher y a los contactos de emergencia ante una situacion de peligro real o percibida.

El diseno de esta funcionalidad debe priorizar **la vida y la seguridad de las personas** por sobre cualquier otra consideracion tecnica u operativa.

---

## 2. Diseno del trigger — UX del boton SOS

### 2.1 Mecanismo de activacion

El SOS se activa mediante **hold-press de 2 a 3 segundos** sobre el boton.

**Por que hold-press y no tap unico:**

- Un tap unico produce demasiados falsos positivos (el usuario puede tapearlo accidentalmente).
- El hold-press de 2-3 segundos es intencional y deliberado, pero suficientemente rapido para situaciones de emergencia real.
- El mismo mecanismo es el estandar de la industria en apps de seguridad (similar al SOS de emergencia de iOS y Android).

### 2.2 Feedback visual durante el hold-press

- Durante el hold-press, mostrar un indicador circular de progreso alrededor del boton.
- El boton cambia de color (rojo progresivo) a medida que avanza el conteo.
- Al llegar al tiempo de activacion, el boton produce una vibracion haptica y un sonido de confirmacion audible.

### 2.3 Pantalla de confirmacion post-activacion

Inmediatamente despues de la activacion:

```
[Icono de advertencia]

SOS ACTIVADO

Tu ubicacion fue enviada al dispatcher y a tus contactos de emergencia.

Si podes, llama al 911.

[Boton: LLAMAR AL 911]

[Boton secundario: Fue un error — Cancelar en los proximos 10 segundos]
```

- El boton de cancelacion solo esta disponible durante **10 segundos** desde la activacion.
- Si el usuario no cancela en 10 segundos, el SOS queda activo y no se puede resolver automaticamente (ver seccion 7).
- La ventana de cancelacion existe para reducir el impacto de activaciones accidentales sin comprometer la seguridad.

### 2.4 Estado del SOS en la app

Mientras el SOS este activo:

- La interfaz de la app muestra un banner rojo en la parte superior: "SOS activo — el dispatcher fue notificado".
- El boton de viaje sigue visible y funcional (el usuario no pierde acceso a la informacion del viaje).

---

## 3. Datos persistidos al activar el SOS

Al activarse el SOS, se crea un registro en la tabla `sos_events` con los siguientes campos:

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| `id` | UUID del evento SOS | uuid |
| `ride_id` | ID del viaje activo al momento del SOS | uuid |
| `triggered_by` | Rol de quien activo el SOS | "passenger" o "driver" |
| `user_id` | ID del usuario que activo el SOS | uuid |
| `timestamp` | Timestamp exacto de la activacion | 2026-04-26T14:32:00-03:00 |
| `latitude` | Latitud en el momento de la activacion | -36.5678 |
| `longitude` | Longitud en el momento de la activacion | -64.1234 |
| `accuracy_meters` | Precision del GPS en metros | 10 |
| `device_battery` | Nivel de bateria del dispositivo (%) | 45 |
| `status` | Estado del evento | "active" / "resolved" / "false_positive" |
| `resolved_at` | Timestamp de resolucion (null si activo) | — |
| `resolved_by` | ID del administrador que resolvio | uuid |
| `notes` | Notas del dispatcher | texto libre |
| `retention_hold` | Flag para suspension de purga | true |

Ademas del evento SOS, se captura un snapshot del estado del viaje en ese momento: posicion del conductor, velocidad estimada, trayecto recorrido hasta ese instante.

---

## 4. Notificacion al dispatcher

### 4.1 Canales de notificacion

La notificacion al dispatcher es **inmediata** (latencia objetivo: menos de 2 segundos desde la activacion).

- **Canal primario:** Supabase Realtime — el panel del dispatcher recibe el evento SOS instantaneamente a traves de la conexion websocket activa.
- **Canal de respaldo:** push notification al dispositivo del dispatcher (por si el panel esta en background o la conexion Realtime se interrumpio).

### 4.2 Alerta en el panel del dispatcher

Al recibir un SOS:

- El panel emite un **sonido distintivo** diferente al sonido de un pedido nuevo (mas urgente, no silenciable).
- Aparece un **modal de alta prioridad** que ocupa el centro de la pantalla con:
  - Nombre y foto del usuario que activo el SOS.
  - Tipo: pasajero o conductor.
  - Nombre y datos del conductor asignado al viaje.
  - Ubicacion en el mapa en tiempo real.
  - Boton directo: "LLAMAR AL [TELEFONO DEL USUARIO]".
  - Boton directo: "LLAMAR AL [TELEFONO DEL CONDUCTOR]".
  - Boton: "Ver historial del viaje".
  - Campo de notas.
  - Boton: "Marcar como resuelto" (requiere ingresar nota obligatoria).

- El modal no se puede cerrar sin tomar una accion (marcarlo como resuelto o como falso positivo con nota).

### 4.3 Que debe hacer el dispatcher

Ver el flujo completo en [incident_response.md](./incident_response.md) Categoria A.

Resumen:

1. Intentar contacto telefonico con el usuario (pasajero o conductor segun quien activo el SOS).
2. Intentar contacto telefonico con la otra parte del viaje.
3. Si no hay respuesta o hay senales de emergencia: llamar al 911.
4. Documentar todas las acciones en el campo de notas del evento SOS.
5. No cerrar el evento sin confirmacion de que la persona esta segura.

---

## 5. Notificacion a contactos de emergencia

Si el usuario tiene configurados contactos de emergencia en su perfil, el sistema envia automaticamente un SMS via Twilio al momento de la activacion del SOS.

### 5.1 Copy del SMS

```
[NOMBRE APP]: [NOMBRE USUARIO] activo una alerta de emergencia.
Su ultima ubicacion conocida:
https://[DOMINIO]/track/[TOKEN]
Este link es valido por 24 horas o hasta que la alerta sea resuelta.
Si necesitas ayuda, llama al 911.
```

### 5.2 Pagina de tracking publica

El link del SMS abre una pagina web publica (sin autenticacion) que muestra:

- Nombre del usuario (solo el nombre, no apellido ni telefono).
- Ubicacion en tiempo real en un mapa.
- Nombre y patente del conductor del viaje.
- Estado del SOS.

La pagina expira a las 24 horas o cuando el evento SOS es resuelto por el administrador.

### 5.3 Si el usuario no tiene contactos configurados

El sistema envia el SMS al **numero de telefono de la agencia** como destinatario de respaldo.

---

## 6. Llamada al 911

**Argentina no dispone de una API publica para conectarse automaticamente al 911.** La integracion directa con emergencias no es tecnicamente posible con los servicios disponibles actualmente.

Por lo tanto:

- La app muestra un boton **"Llamar al 911"** que ejecuta `tel:911` desde el dispositivo del usuario. Esto lanza la app de telefono del sistema operativo con el numero 911 pre-cargado. El usuario debe confirmar la llamada.
- El dispatcher tambien puede llamar al 911 desde su telefono si no logra comunicarse con el usuario.
- No existe ninguna funcionalidad automatica que llame al 911 sin intervencion humana.

---

## 7. Politica de NO resolucion automatica

**El evento SOS nunca se cierra de forma automatica.**

Solo puede cerrarse:

- Por un administrador o supervisor desde el panel, ingresando una nota obligatoria que explique la resolucion.
- Con al menos una de las siguientes confirmaciones:
  - Contacto telefonico exitoso con el usuario que activo el SOS.
  - Confirmacion por parte del conductor del viaje.
  - Confirmacion de las autoridades (si intervinieron).
  - El propio usuario cancela dentro de la ventana de 10 segundos post-activacion.

No se acepta como resolucion: "sin respuesta" o "timeout". Si no se puede confirmar que la persona esta segura, el evento permanece abierto hasta que se pueda confirmar.

---

## 8. Retencion de datos del SOS

Los registros de eventos SOS se conservan por **10 anos** desde la fecha del evento, conforme a lo establecido en [data_retention.md](./data_retention.md).

Si hay una denuncia activa o investigacion judicial vinculada al evento, la retencion es **indefinida** hasta que el caso se cierre.

El flag `retention_hold = TRUE` se activa automaticamente al crear un `sos_event` y solo puede desactivarse manualmente por un administrador.

Los datos del SOS **nunca son objeto de purga automatica**.

---

## 9. Falsos positivos

Los falsos positivos (activaciones accidentales del SOS) son esperables y deben gestionarse sin penalizar al usuario.

### 9.1 Definicion de falso positivo

Una activacion del SOS es un falso positivo cuando:

- El usuario la cancela dentro de los 10 segundos de la ventana post-activacion, o
- El dispatcher confirma por contacto telefonico directo que la persona esta bien y que fue un accidente.

### 9.2 Registro

Todo falso positivo se documenta con:

- El campo `status = "false_positive"` en el `sos_event`.
- Una nota del dispatcher indicando como se confirmo que fue accidental.

### 9.3 Politica de no penalizacion

- Un falso positivo aislado **no genera ninguna sancion ni restriccion** para el usuario.
- La acumulacion de **3 o mas falsos positivos en un periodo de 30 dias** por el mismo usuario puede dar lugar a una notificacion informativa (no una sancion) sugiriendo cuidado al usar el boton.
- Nunca se desactiva el boton SOS de un usuario como medida disciplinaria.

### 9.4 Mejora continua

Los falsos positivos se registran para analizar si el diseno del trigger necesita ajustes. Si la tasa de falsos positivos supera el 20% de las activaciones en un mes, el equipo tecnico debe revisar el mecanismo de activacion.

---

## 10. Capacitacion del dispatcher

Antes del lanzamiento, cada dispatcher debe:

- [ ] Leer este protocolo en su totalidad.
- [ ] Realizar una simulacion de activacion de SOS en el entorno de staging (tanto como despachante que recibe la alerta como usuario que la activa).
- [ ] Conocer el numero de telefono de la policia local y de emergencias de [LOCALIDAD].
- [ ] Saber donde encontrar el historial completo del viaje desde el panel.
- [ ] Conocer el procedimiento para activar el flag `retention_hold` si corresponde.

---

## 11. Revision del protocolo

Este protocolo debe revisarse:

- Antes del lanzamiento, despues de la simulacion.
- Despues de cualquier evento SOS real.
- Cada 12 meses en forma programada.
- Ante cambios en la legislacion de emergencias o en la disponibilidad tecnica de integracion con servicios de emergencia en Argentina.

---

*Referencias: ver [incident_response.md](./incident_response.md) Categoria A y [data_retention.md](./data_retention.md) para los plazos de retencion de sos_events.*
