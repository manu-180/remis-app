# Plan de Respuesta a Incidentes — remis_app

**Version: 0.1.0 — 2026-04-26**

> **Aviso legal:** Este documento es un borrador tecnico-operativo. Debe ser revisado por un abogado matriculado en La Pampa antes de su publicacion.

---

## Tabla de contenidos

1. [Estructura del plan](#1-estructura-del-plan)
2. [Roles y responsabilidades](#2-roles-y-responsabilidades)
3. [Categoria A — Seguridad personal (SOS)](#3-categoria-a--seguridad-personal-sos)
4. [Categoria B — Brecha de datos personales](#4-categoria-b--brecha-de-datos-personales)
5. [Categoria C — Caida del servicio](#5-categoria-c--caida-del-servicio)
6. [Categoria D — Denuncia regulatoria](#6-categoria-d--denuncia-regulatoria)
7. [Registro de incidentes](#7-registro-de-incidentes)
8. [Simulacros y revision](#8-simulacros-y-revision)

---

## 1. Estructura del plan

Este plan cubre cuatro categorias de incidentes. Cada categoria tiene su propio flujo de deteccion, respuesta y cierre. Los tiempos indicados son maximos; siempre se debe actuar lo antes posible.

| Categoria | Tipo de incidente | Tiempo maximo de cierre |
|-----------|------------------|------------------------|
| A | Seguridad personal (SOS activado) | 72 horas |
| B | Brecha de datos personales | 72 horas (notificacion AAIP) |
| C | Caida del servicio | Segun SLA del componente |
| D | Denuncia regulatoria | Segun plazo del organismo |

---

## 2. Roles y responsabilidades

| Rol | Persona | Contacto |
|-----|---------|----------|
| Coordinador del incidente | [NOMBRE — RESPONSABLE AGENCIA] | [TELEFONO / EMAIL] |
| Responsable tecnico | [NOMBRE — DEV PRINCIPAL] | [TELEFONO / EMAIL] |
| Responsable legal | [NOMBRE — ABOGADO] | [TELEFONO / EMAIL] |
| Despachante de turno | [SEGUN TURNO] | [TELEFONO OPERACION] |

En caso de que el coordinador principal no este disponible, la responsabilidad recae en el siguiente en la lista.

---

## 3. Categoria A — Seguridad personal (SOS)

### Que es

Activacion del boton SOS por un pasajero o conductor. Ver protocolo completo en [sos_protocol.md](./sos_protocol.md).

### Flujo de respuesta

```
DETECCION
  |
  v
Alerta en tiempo real al despachante (Supabase Realtime + sonido distintivo)
  |
  v
NOTIFICACION INMEDIATA (0 a 5 minutos)
  - Despachante intenta contacto con el pasajero/conductor por telefono
  - Despachante intenta contacto con el conductor/pasajero (la otra parte)
  - SMS automatico a contactos de emergencia del usuario (via Twilio)
  |
  v
EVALUACION (0 a 15 minutos)
  - El despachante determina si es falsa alarma o emergencia real
  - Si hay señales de emergencia real: llamar al 911 desde el dispositivo
  - No cerrar el evento SOS sin confirmacion de que la persona esta segura
  |
  v
RESPUESTA
  - Mantener el registro del viaje abierto y activo
  - Documentar todas las acciones tomadas en el campo "notas" del sos_event
  - Si hay lesionados o delito: preservar todos los registros del viaje
  |
  v
POST-INCIDENTE (dentro de las 72 horas)
  - Informe escrito por el despachante de turno
  - Revision del incidente con el responsable de la agencia
  - Si hay lesionados o denuncia: activar flag retention_hold en todos los registros
  - Si fue falso positivo: documentar, no penalizar al usuario (ver sos_protocol.md)
  |
  v
CIERRE
  - El evento SOS solo puede cerrarse por un administrador
  - Documentar resolucion en el sos_event
  - Plazo maximo de cierre: 72 horas desde la activacion
```

### Comunicacion

- **Al usuario:** contacto directo por telefono, no por mensajes de app durante una emergencia activa.
- **A las autoridades:** 911 (Argentina no tiene API publica del 911; la llamada la hace el despachante o el usuario).
- **A los contactos de emergencia:** SMS automatico via Twilio al activar el SOS.

---

## 4. Categoria B — Brecha de datos personales

### Que es

Acceso no autorizado, destruccion, alteracion, divulgacion o perdida de datos personales de usuarios o conductores.

### Flujo de respuesta

```
DETECCION
  |
  v
TRIAGE (objetivo: menos de 4 horas desde la deteccion)
  - Identificar el vector de acceso (credenciales comprometidas, vulnerabilidad, error humano)
  - Estimar el alcance: cuantos registros, que categorias de datos, que usuarios afectados
  - Contener el incidente: revocar accesos comprometidos, aislar componentes afectados
  - Escalar al coordinador del incidente y al responsable legal
  |
  v
CONTENCION Y FORENSE (horas 4 a 24)
  - Preservar logs y evidencia sin alterar
  - Revocar todas las sesiones activas si hay riesgo de acceso continuo
  - Cambiar credenciales de acceso a Supabase, servicios cloud afectados
  - Realizar analisis forense preliminar: que datos fueron expuestos, desde cuando
  |
  v
NOTIFICACION A LA AAIP (obligatoria si hay riesgo para los titulares)
  - Plazo maximo: 72 horas desde que se toma conocimiento de la brecha (art. 38 y ss. del Decreto 1558/2001 y normativa AAIP vigente)
  - Canal: sitio oficial aaip.gob.ar
  - Contenido minimo: descripcion de la brecha, datos afectados, medidas tomadas, contacto del responsable
  |
  v
NOTIFICACION A LOS AFECTADOS (si hay riesgo significativo)
  - Notificar a los usuarios cuyos datos fueron expuestos si existe riesgo real para sus derechos
  - Canal: push notification + email/SMS segun los datos disponibles
  - Mensaje: claro, sin minimizar el riesgo, con instrucciones concretas (cambiar contrasena, etc.)
  |
  v
REMEDIACION
  - Parchear la vulnerabilidad explotada
  - Auditar permisos y accesos
  - Reforzar medidas de seguridad segun la naturaleza del incidente
  |
  v
POST-INCIDENTE
  - Informe completo de la brecha: cronologia, alcance, impacto, medidas tomadas
  - Revision del plan de respuesta para incorporar aprendizajes
  - Actualizacion de la evaluacion de riesgos de seguridad
```

### Criterios para notificar a la AAIP

Se notifica si la brecha implica riesgo de dano a los titulares, especialmente si:

- Se expusieron datos sensibles (datos biometricos del conductor).
- Se expusieron metodos de pago o informacion financiera.
- La brecha permite identificacion de personas y puede causar dano reputacional, discriminacion o fraude.
- El volumen de datos expuestos es significativo (mas de 50 registros, como referencia).

Ante la duda, consultar al abogado y notificar. El costo de una notificacion innecesaria es menor que el de una omision.

---

## 5. Categoria C — Caida del servicio

### Que es

Indisponibilidad total o parcial de la app o del panel de despachante que impide la prestacion del servicio.

### Runbook por componente

#### Supabase (base de datos, autenticacion, tiempo real)

1. Verificar el status en **status.supabase.com**.
2. Si es un incidente de Supabase: esperar la resolucion y comunicar a los usuarios via status page.
3. Si es un problema de configuracion propio: revisar logs en el panel de Supabase, verificar RLS, verificar Edge Functions.
4. En caso de corrupcion de datos: no restaurar el backup sin revision del responsable tecnico.
5. Escalada: abrir ticket de soporte en Supabase si el problema persiste mas de 30 minutos.

#### Vercel (panel web del despachante, web publica)

1. Verificar el status en **vercel-status.com**.
2. Si es un incidente de Vercel: esperar la resolucion.
3. Si es un problema del deployment propio: revisar los build logs en el panel de Vercel, hacer rollback al deployment anterior si el build actual esta roto.
4. Escalada: el despachante puede operar por telefono como canal alternativo mientras se restaura el panel.

#### FCM — Firebase Cloud Messaging (notificaciones push)

1. Verificar el status en **status.firebase.google.com**.
2. Si FCM esta caido: los usuarios no reciben notificaciones. El despachante debe comunicarse por SMS (via Twilio) para informar la asignacion del conductor.
3. No hay accion de rollback posible para FCM; es un servicio externo.

#### MercadoPago (pagos)

1. Verificar el status en el panel de MercadoPago.
2. Si MP esta caido: deshabilitar temporalmente el pago con tarjeta en la app. Los usuarios deben pagar en efectivo.
3. Notificar a los usuarios activos que el pago electronico esta temporalmente no disponible.
4. Registrar los viajes afectados para conciliacion posterior cuando se restaure el servicio.

### Comunicacion durante caidas

- Actualizar la **status page** del servicio (si existe) o comunicar por los canales disponibles (Twilio SMS a conductores activos).
- Si la caida dura mas de 1 hora durante el horario pico, notificar a la agencia para que active el canal telefonico como alternativa.

---

## 6. Categoria D — Denuncia regulatoria

### Tipos de denuncias

| Organismo | Tipo de denuncia | Plazo tipico de respuesta |
|-----------|-----------------|--------------------------|
| Municipio de [LOCALIDAD] | Queja de pasajero, incumplimiento de ordenanza | Variable; tipicamente 10-30 dias habiles |
| AAIP | Incumplimiento Ley 25.326, ejercicio de derechos ARCO no atendido | 30-60 dias habiles |
| Defensa del Consumidor (Sec. Comercio / municipio) | Reclamo por servicio deficiente, cobro indebido | 15-30 dias habiles |

### Flujo de respuesta

1. **Recepcion:** el responsable de la agencia recibe la notificacion formal de la denuncia.
2. **Escalada inmediata** al abogado matriculado en La Pampa.
3. **Preservacion de documentacion:** activar flag `retention_hold` en todos los registros relacionados con el caso (viaje, pagos, comunicaciones, audit log).
4. **No borrar nada** relacionado con el caso bajo ninguna circunstancia.
5. **Recopilar evidencia:** exportar desde el panel el historial del viaje, los mensajes, los eventos de ubicacion y cualquier registro relevante.
6. **Redactar respuesta** con el abogado dentro del plazo otorgado por el organismo.
7. **Seguimiento:** mantener registro del estado de la denuncia hasta su resolucion.
8. **Cierre:** una vez resuelta la denuncia, liberar el flag `retention_hold` si corresponde, con aprobacion del abogado.

---

## 7. Registro de incidentes

Cada incidente de cualquier categoria debe registrarse en una tabla de seguimiento con al menos:

- Numero de caso interno.
- Categoria (A, B, C o D).
- Fecha y hora de deteccion.
- Descripcion del incidente.
- Personas involucradas (usuarios, conductores, terceros).
- Acciones tomadas con timestamps.
- Resolucion.
- Aprendizajes y mejoras implementadas.

Este registro se conserva por el plazo establecido en [data_retention.md](./data_retention.md) para el `audit_log`.

---

## 8. Simulacros y revision

- **Simulacro de SOS:** realizar al menos una vez antes del lanzamiento y una vez por ano.
- **Simulacro de brecha de datos:** realizar al menos una vez por ano (ejercicio de tabla; no en produccion).
- **Revision de este plan:** cada 12 meses o despues de cualquier incidente real.

---

*Referencias: Ley 25.326; Decreto 1558/2001; ver tambien [sos_protocol.md](./sos_protocol.md) y [data_retention.md](./data_retention.md).*
