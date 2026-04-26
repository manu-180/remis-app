# Acuerdo de Procesamiento de Datos (DPA) — remis_app

**Version: 0.1.0 — 2026-04-26**

> **Aviso legal:** Este documento es un borrador tecnico-operativo. Debe ser revisado por un abogado matriculado en La Pampa antes de su publicacion.

---

## Instrucciones de uso

Este documento es una plantilla del Acuerdo de Procesamiento de Datos (DPA) entre la agencia remisera (Responsable del tratamiento) y la empresa de desarrollo del software (Encargado del tratamiento).

Antes de firmar, completar todos los campos marcados como `[PLACEHOLDER]`. El documento debe ser firmado por representantes legales de ambas partes.

---

## Tabla de contenidos

1. [Partes](#1-partes)
2. [Objeto del acuerdo](#2-objeto-del-acuerdo)
3. [Naturaleza y duracion del tratamiento](#3-naturaleza-y-duracion-del-tratamiento)
4. [Categorias de datos y finalidades](#4-categorias-de-datos-y-finalidades)
5. [Obligaciones del encargado del tratamiento](#5-obligaciones-del-encargado-del-tratamiento)
6. [Subencargados del tratamiento](#6-subencargados-del-tratamiento)
7. [Derecho de auditoria del responsable](#7-derecho-de-auditoria-del-responsable)
8. [Notificacion de brechas de seguridad](#8-notificacion-de-brechas-de-seguridad)
9. [Devolucion y destruccion de datos al finalizar](#9-devolucion-y-destruccion-de-datos-al-finalizar)
10. [Disposiciones generales](#10-disposiciones-generales)
11. [Firmas](#11-firmas)

---

## 1. Partes

**El Responsable del tratamiento:**

- Denominacion: **[NOMBRE AGENCIA]**
- CUIT: **[CUIT AGENCIA]**
- Domicilio: **[DOMICILIO AGENCIA]**
- Representante legal: **[NOMBRE Y DNI DEL REPRESENTANTE]**
- En adelante: "la Agencia" o "el Responsable"

**El Encargado del tratamiento:**

- Denominacion: **[NOMBRE EMPRESA MANUEL]**
- CUIT: **[CUIT MANUEL]**
- Domicilio: **[DOMICILIO EMPRESA MANUEL]**
- Representante legal: **[NOMBRE Y DNI DEL REPRESENTANTE]**
- En adelante: "el Proveedor" o "el Encargado"

Las partes, conjuntamente denominadas "las Partes", celebran el presente Acuerdo de Procesamiento de Datos (en adelante "el Acuerdo" o "DPA") en la ciudad de [CIUDAD], a los **[FECHA]** dias del mes de **[MES]** del ano **[ANO]**.

---

## 2. Objeto del acuerdo

El presente Acuerdo regula el tratamiento de datos personales que el Encargado realiza en nombre y por cuenta del Responsable en el marco del contrato de desarrollo y mantenimiento del software "remis_app" (en adelante "el Servicio") suscripto entre las Partes con fecha **[FECHA DEL CONTRATO PRINCIPAL]**.

El tratamiento de datos se realiza en cumplimiento de la **Ley 25.326 de Proteccion de Datos Personales** de la Republica Argentina, su Decreto Reglamentario 1558/2001 y las disposiciones de la Agencia de Acceso a la Informacion Publica (AAIP).

El Encargado actuara exclusivamente segun las instrucciones documentadas del Responsable y no tratara los datos para finalidades propias distintas a las establecidas en este Acuerdo.

---

## 3. Naturaleza y duracion del tratamiento

**Naturaleza del tratamiento:**

- Almacenamiento, organizacion y estructuracion de datos en la base de datos del sistema.
- Transmision de datos entre la aplicacion movil, el panel web y los servicios de infraestructura.
- Acceso tecnico para mantenimiento, correccion de errores y mejoras del sistema.
- Implementacion y mantenimiento de medidas de seguridad tecnicas.

**Duracion:**

El presente Acuerdo tiene vigencia desde la fecha de su firma hasta la terminacion del contrato de desarrollo y mantenimiento del Servicio, independientemente de la causa de la terminacion.

La terminacion del Acuerdo no exime al Encargado de las obligaciones de confidencialidad y seguridad respecto de los datos tratados durante su vigencia.

---

## 4. Categorias de datos y finalidades

### 4.1 Categorias de datos tratados

| Categoria | Ejemplos | Categoria sensible (Ley 25.326) |
|-----------|---------|:-------------------------------:|
| Datos de identificacion del pasajero | Nombre, telefono | No |
| Datos de identificacion del conductor | Nombre, DNI, telefono | No |
| Datos biometricos del conductor | Foto DNI, selfie KYC | **Si** |
| Datos de ubicacion | Coordenadas GPS | No |
| Datos de viajes y transacciones | Historial de viajes, pagos | No |
| Datos de comunicacion | Mensajes en el chat del viaje | No |
| Datos de auditoria | Logs de acceso y operaciones | No |

### 4.2 Finalidades del tratamiento

El Encargado trata los datos exclusivamente para:

1. Prestar los servicios tecnicos del Servicio segun el contrato principal.
2. Mantener y mejorar el Servicio segun las instrucciones del Responsable.
3. Garantizar la seguridad e integridad de los datos almacenados.
4. Asistir al Responsable en el cumplimiento de las solicitudes ARCO de los titulares.
5. Asistir al Responsable en el cumplimiento de sus obligaciones legales y regulatorias.

---

## 5. Obligaciones del encargado del tratamiento

El Encargado se obliga a:

### 5.1 Confidencialidad

- Tratar los datos personales con estricta confidencialidad.
- Imponer a su personal que tenga acceso a datos personales una obligacion contractual de confidencialidad equivalente a la de este Acuerdo.
- No divulgar, ceder ni transferir datos personales a terceros distintos de los subencargados autorizados en la seccion 6.

### 5.2 Seguridad tecnica

- Implementar y mantener las medidas de seguridad tecnicas y organizativas descritas en [aaip_registration.md](./aaip_registration.md) seccion 6.
- Notificar al Responsable cualquier vulnerabilidad de seguridad detectada en el sistema dentro de las **24 horas** de su deteccion.

### 5.3 Instrucciones del responsable

- Tratar los datos unicamente segun las instrucciones documentadas del Responsable.
- Si el Encargado considera que una instruccion del Responsable infringe la Ley 25.326, lo informara por escrito al Responsable antes de ejecutarla.

### 5.4 Asistencia en el ejercicio de derechos ARCO

- Implementar en el sistema los mecanismos tecnicos necesarios para que el Responsable pueda atender las solicitudes ARCO de los titulares.
- Asistir al Responsable en la ejecucion tecnica de las solicitudes ARCO (exportacion, anonimizacion, supresion de datos) dentro de los plazos acordados.

### 5.5 Cumplimiento de la politica de retencion

- Implementar los mecanismos tecnicos de purga y anonimizacion descritos en [data_retention.md](./data_retention.md).
- Ejecutar las operaciones de purga segun los plazos establecidos en esa politica, salvo instruccion escrita en contrario del Responsable.

---

## 6. Subencargados del tratamiento

El Responsable autoriza al Encargado a contratar los siguientes subencargados para la prestacion del Servicio:

| Subencargado | Pais | Datos que trata | Finalidad |
|---|---|---|---|
| Supabase Inc. | Alemania (UE) | Todos los datos de la base de datos | Almacenamiento, autenticacion, tiempo real |
| MercadoPago S.A. | Argentina | Datos de pago (token) | Procesamiento de cobros |
| Amazon Web Services Inc. (Rekognition) | EE.UU. | Fotos DNI y selfie biometrica | Verificacion de identidad KYC |
| Google LLC (Maps Platform) | EE.UU. | Coordenadas GPS | Calculo de rutas y mapas |
| Twilio Inc. | EE.UU. | Numero de telefono | Envio de SMS |

**Condiciones para el uso de subencargados:**

- El Encargado debe celebrar contratos con cada subencargado que impongan obligaciones de proteccion de datos equivalentes a las de este Acuerdo.
- El Encargado notificara al Responsable con al menos **30 dias de anticipacion** ante cualquier cambio en la lista de subencargados (altas o bajas).
- El Responsable puede oponerse por escrito al uso de un nuevo subencargado dentro de los 15 dias de la notificacion.

---

## 7. Derecho de auditoria del responsable

El Responsable tiene derecho a auditar el cumplimiento de este Acuerdo por parte del Encargado. Para ejercer este derecho:

- El Responsable notificara al Encargado por escrito con al menos **15 dias habiles** de anticipacion.
- La auditoria puede realizarse mediante revision de documentacion, cuestionarios o, excepcionalmente, visita in situ.
- El costo de la auditoria corre por cuenta del Responsable, salvo que la auditoria revele incumplimientos del Encargado.
- La auditoria no puede interferir de manera desproporcionada con la operacion del Encargado.
- El Encargado cooperara de buena fe en la auditoria y proporcionara la informacion razonablemente solicitada.

---

## 8. Notificacion de brechas de seguridad

Ante una brecha de seguridad que afecte datos personales tratados por el Encargado:

1. El Encargado notificara al Responsable dentro de las **4 horas** de tomar conocimiento de la brecha.
2. La notificacion incluira: descripcion de la brecha, datos afectados, impacto estimado, medidas tomadas o en curso.
3. El Encargado asistira al Responsable en la notificacion a la AAIP dentro del plazo de **72 horas** exigido por la normativa.
4. El Encargado cooperara con el Responsable en la investigacion forense y en la implementacion de medidas de remediacion.

El procedimiento detallado se encuentra en [incident_response.md](./incident_response.md) Categoria B.

---

## 9. Devolucion y destruccion de datos al finalizar

A la terminacion del contrato de desarrollo y mantenimiento del Servicio, el Encargado:

1. **Devolvera** al Responsable todos los datos personales en formato estandar (exportacion de la base de datos en formato SQL o CSV) dentro de los **30 dias corridos** desde la terminacion.
2. Una vez confirmada la recepcion de los datos por el Responsable, **destruira** o anonimizara de manera irreversible todas las copias de los datos personales en poder del Encargado o de los subencargados, dentro de los **30 dias corridos** siguientes.
3. El Encargado entregara al Responsable un **certificado de destruccion** que acredite el cumplimiento de este punto.
4. Esta obligacion alcanza tanto a los datos en produccion como a las copias de seguridad (backups).

**Excepcion:** el Encargado puede conservar los datos durante el tiempo adicional que exija una obligacion legal propia (por ejemplo, para defensa ante reclamos judiciales vinculados al Servicio), pero solo los datos estrictamente necesarios y con las medidas de seguridad de este Acuerdo.

---

## 10. Disposiciones generales

### 10.1 Modificaciones

Cualquier modificacion al presente Acuerdo debe constar por escrito y ser firmada por representantes legales de ambas Partes.

### 10.2 Prevalencia

En caso de conflicto entre este Acuerdo y el contrato de desarrollo y mantenimiento del Servicio, prevalece este Acuerdo en todo lo relacionado con el tratamiento de datos personales.

### 10.3 Ley aplicable y jurisdiccion

El presente Acuerdo se rige por la **Ley 25.326** y la normativa argentina vigente. Para cualquier controversia, las Partes se someten a los tribunales ordinarios de la ciudad de **Santa Rosa, La Pampa**, con renuncia a cualquier otro fuero.

### 10.4 Responsabilidad

El Encargado responde por los danos y perjuicios que cause al Responsable o a los titulares de los datos como consecuencia del incumplimiento de las obligaciones establecidas en este Acuerdo.

---

## 11. Firmas

Las Partes firman el presente Acuerdo en dos ejemplares de un mismo tenor y a un solo efecto, en la ciudad de **[CIUDAD]**, a los **[DIA]** dias del mes de **[MES]** de **[ANO]**.

---

**Por el Responsable del tratamiento:**

```
[NOMBRE AGENCIA]
CUIT: [CUIT AGENCIA]

Firma: ________________________________

Nombre: _______________________________

Cargo: ________________________________

Fecha: ________________________________
```

---

**Por el Encargado del tratamiento:**

```
[NOMBRE EMPRESA MANUEL]
CUIT: [CUIT MANUEL]

Firma: ________________________________

Nombre: _______________________________

Cargo: ________________________________

Fecha: ________________________________
```

---

*Referencias: Ley 25.326; Decreto 1558/2001; ver tambien [privacy_policy.md](./privacy_policy.md), [aaip_registration.md](./aaip_registration.md), [data_retention.md](./data_retention.md) e [incident_response.md](./incident_response.md).*
