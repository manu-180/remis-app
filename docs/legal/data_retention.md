# Politica de Retencion y Purga de Datos — remis_app

**Version: 0.1.0 — 2026-04-26**

> **Aviso legal:** Este documento es un borrador tecnico-operativo. Debe ser revisado por un abogado matriculado en La Pampa antes de su publicacion.

---

## Tabla de contenidos

1. [Proposito](#1-proposito)
2. [Marco normativo](#2-marco-normativo)
3. [Tabla de retencion por categoria de dato](#3-tabla-de-retencion-por-categoria-de-dato)
4. [Proceso de purga automatica](#4-proceso-de-purga-automatica)
5. [Anonimizacion vs supresion](#5-anonimizacion-vs-supresion)
6. [Solicitudes ARCO de cancelacion](#6-solicitudes-arco-de-cancelacion)
7. [Excepciones y suspensiones de purga](#7-excepciones-y-suspensiones-de-purga)
8. [Auditoria del proceso](#8-auditoria-del-proceso)
9. [Revision de esta politica](#9-revision-de-esta-politica)

---

## 1. Proposito

Esta politica establece durante cuanto tiempo se conservan los distintos tipos de datos personales en la plataforma y como se realiza su purga o anonimizacion al vencer el plazo de retencion.

El objetivo es cumplir con el **principio de minimizacion** de datos de la Ley 25.326: no conservar datos mas tiempo del necesario para la finalidad que justifica su tratamiento.

---

## 2. Marco normativo

Los plazos de retencion se basan en:

| Norma | Plazo relevante | Aplicacion |
|-------|----------------|------------|
| Ley 25.326, art. 4 | Principio de calidad: datos no deben conservarse mas tiempo del necesario | General |
| Codigo Civil y Comercial (Ley 26.994), art. 2560 | Prescripcion general: 5 anos | Viajes, eventos, contratos |
| Ley 11.683 (Procedimiento Tributario) y RG AFIP | 10 anos para documentacion fiscal | Pagos, facturas, comprobantes |
| Ley 25.246 (Prevencion del Lavado de Activos) | 10 anos para registros de operaciones | Pagos electronicos |

---

## 3. Tabla de retencion por categoria de dato

| Dato / Tabla | Retencion minima | Retencion maxima | Trigger de purga | Metodo al vencer |
|---|---|---|---|---|
| `rides` activos (en curso) | Indefinido mientras este activo | — | Cierre del viaje | — |
| `rides` cerrados | 5 anos desde el cierre (art. 2560 CCyC) | 5 anos | Cron mensual | Anonimizacion de PII; se preserva la fila sin identificadores |
| `ride_events` | 5 anos (mismo plazo que el viaje al que pertenecen) | 5 anos | Cron mensual junto con el ride | Eliminacion si el ride fue anonimizado y no hay litigio |
| `payments` | 10 anos (normativa fiscal AR) | 10 anos | Cron anual | Anonimizacion de datos del titular; se preservan montos e identificadores fiscales |
| `mp_webhook_events` | 1 ano | 1 ano | Cron mensual | Eliminacion |
| `audit_log` (general) | 5 anos | — | Nunca automatica | Revision manual por el administrador |
| `audit_log` (eventos SOS o reclamo activo) | 10 anos | Indefinido si hay denuncia activa | Manual + aprobacion del administrador | No se purga mientras el caso este abierto |
| `sos_events` | 10 anos | Indefinido si hay denuncia activa | Manual + aprobacion del administrador | Nunca automatica |
| `driver_location_history` no vinculada a viaje | 90 dias | 90 dias | Cron diario / drop de particiones | Eliminacion |
| `driver_location_history` vinculada a viaje | 5 anos (igual que el viaje) | 5 anos | Cron diario sobre particiones vencidas | Eliminacion |
| `kyc_verifications` | 5 anos desde la baja del conductor | 5 anos | Manual tras confirmar baja definitiva | Eliminacion de imagenes; se preserva resultado de la verificacion |
| `messages` (chat del viaje) | 90 dias desde el cierre del viaje | 90 dias | Cron diario | Eliminacion |
| PII del pasajero (nombre, telefono) | 2 anos desde el ultimo viaje | 2 anos | Cron mensual | Anonimizacion: nombre se reemplaza por "Pasajero [ID]", telefono se hashea |
| Cuentas inactivas (sin viajes) | 3 anos desde el ultimo acceso | — | Cron mensual | Aviso por SMS/email 30 dias antes; luego soft delete; hard delete a los 90 dias adicionales |

> **Nota sobre particiones:** la tabla `driver_location_history` debe estar particionada por fecha en PostgreSQL para permitir el drop eficiente de particiones sin escanear toda la tabla.

---

## 4. Proceso de purga automatica

La purga automatica se implementa mediante dos mecanismos combinados:

### 4.1 pg_cron (PostgreSQL)

Jobs programados directamente en la base de datos Supabase:

```
-- Ejemplo conceptual (no ejecutar sin revision tecnica)
-- Purga mensual de messages vencidos
SELECT cron.schedule(
  'purge-messages-monthly',
  '0 3 1 * *',  -- 1ro de cada mes a las 3am
  $$ DELETE FROM messages WHERE created_at < NOW() - INTERVAL '90 days' $$
);
```

Cada job de purga registra su ejecucion en el `audit_log` con el numero de filas procesadas.

### 4.2 Edge Function de purga (Supabase)

Para operaciones mas complejas (anonimizacion, notificaciones previas, validacion de excepciones) se utiliza una Edge Function que:

1. **Identifica** las filas candidatas a purga segun los plazos de esta politica.
2. **Verifica excepciones:** comprueba que no exista un flag de "retencion extendida" por litigio, SOS activo o reclamo regulatorio.
3. **Anonimiza** los campos PII en las filas que deben conservarse por razones fiscales o de auditoria (en lugar de eliminar la fila completa).
4. **Elimina** las filas que no necesitan conservarse.
5. **Registra** cada operacion en el `audit_log` con: timestamp, tabla afectada, cantidad de filas, tipo de operacion (anonimizacion/eliminacion), hash SHA-256 del lote procesado.
6. **No lanza excepciones silenciosas:** cualquier error en el proceso genera una alerta al administrador.

### 4.3 Frecuencia de los jobs

| Job | Frecuencia | Tablas que procesa |
|-----|------------|-------------------|
| Purga diaria | Cada dia a las 2am | `messages`, `driver_location_history` (particiones) |
| Purga mensual | 1ro de cada mes a las 3am | `rides`, `ride_events`, `mp_webhook_events`, PII pasajeros, cuentas inactivas |
| Purga anual | 1ro de enero a las 4am | `payments` |

---

## 5. Anonimizacion vs supresion

No siempre es posible eliminar completamente una fila. Cuando la fila debe conservarse por razones fiscales o de auditoria pero el dato personal ya no es necesario, se aplica **anonimizacion**:

| Campo | Tecnica de anonimizacion |
|-------|------------------------|
| Nombre del pasajero | Reemplazar por "Pasajero [ID interno]" |
| Telefono del pasajero | Reemplazar por hash SHA-256 irreversible |
| Nombre del conductor | Reemplazar por "Conductor [ID interno]" |
| Coordenadas GPS de la historia de ubicacion | Truncar a 2 decimales (precision de ~1 km) |
| Foto de perfil | Eliminar archivo de Supabase Storage; reemplazar URL por null |

Los montos de pago, fechas, duracion del viaje y distancia se conservan sin anonimizar (no son datos personales en contexto fiscal).

---

## 6. Solicitudes ARCO de cancelacion

Cuando un usuario ejerce su derecho de cancelacion (supresion) conforme al art. 16 de la Ley 25.326:

1. El administrador recibe la solicitud y verifica la identidad del titular.
2. Se consulta si existen **impedimentos legales** para la supresion inmediata (por ejemplo: viajes con pagos pendientes, litigios activos, obligaciones fiscales).
3. Si no hay impedimentos: se anonimiza o elimina el dato en el plazo maximo de **30 dias habiles** desde la solicitud.
4. Si hay impedimentos: se notifica al titular indicando el fundamento legal de la imposibilidad temporal y el plazo estimado de supresion.
5. Toda solicitud ARCO y su resolucion se registran en el `audit_log`.

El proceso se ejecuta a traves del **endpoint de administracion ARCO** del panel de despachante, que garantiza la trazabilidad de cada operacion.

---

## 7. Excepciones y suspensiones de purga

Los siguientes eventos **suspenden** la purga automatica de las filas afectadas:

- **Evento SOS activo o bajo investigacion:** el `sos_event` y todos los registros vinculados (viaje, ubicaciones, mensajes) no se purgan mientras el evento este marcado como activo o bajo investigacion.
- **Reclamo judicial o administrativo activo:** cualquier litigio, denuncia ante el municipio o ante la AAIP que involucre datos especificos congela la purga de esos datos hasta que el caso se cierre.
- **Solicitud de autoridad competente:** orden judicial o requerimiento de organismo publico (policia, AFIP, etc.) para preservar datos.

La suspension se aplica mediante un flag `retention_hold = TRUE` en la tabla afectada o en una tabla separada de excepciones. Solo el administrador puede activar o desactivar este flag, y la operacion queda registrada en el `audit_log`.

---

## 8. Auditoria del proceso

Mensualmente, el administrador debe revisar:

- El log de los jobs de purga del mes anterior (cantidad de filas procesadas, errores).
- Las solicitudes ARCO pendientes de resolucion.
- Las retenciones extendidas activas (flags `retention_hold`).

Anualmente:

- Revisar esta politica para verificar que los plazos siguen siendo adecuados segun la normativa vigente.
- Verificar que los jobs de purga funcionan correctamente en produccion.

---

## 9. Revision de esta politica

Esta politica debe revisarse:

- Cada 12 meses en forma programada.
- Ante cambios en la Ley 25.326 o en la normativa fiscal argentina.
- Ante cambios en la arquitectura de la base de datos que afecten tablas mencionadas aqui.

---

*Referencias: Ley 25.326; CCyC art. 2560; Ley 11.683; ver tambien [privacy_policy.md](./privacy_policy.md) seccion 6 y [aaip_registration.md](./aaip_registration.md).*
