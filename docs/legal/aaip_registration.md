# Plan de Inscripcion RNBD/AAIP — remis_app

**Version: 0.1.0 — 2026-04-26**

> **Aviso legal:** Este documento es un borrador tecnico-operativo. Debe ser revisado por un abogado matriculado en La Pampa antes de su publicacion.

---

## Tabla de contenidos

1. [Contexto y obligacion legal](#1-contexto-y-obligacion-legal)
2. [Tipo de declaracion](#2-tipo-de-declaracion)
3. [Categorias de datos a declarar](#3-categorias-de-datos-a-declarar)
4. [Finalidades del tratamiento](#4-finalidades-del-tratamiento)
5. [Cesiones a terceros](#5-cesiones-a-terceros)
6. [Medidas de seguridad](#6-medidas-de-seguridad)
7. [Mecanismo para el ejercicio de derechos ARCO](#7-mecanismo-para-el-ejercicio-de-derechos-arco)
8. [Procedimiento de inscripcion](#8-procedimiento-de-inscripcion)
9. [Estimacion de tiempos y costos](#9-estimacion-de-tiempos-y-costos)
10. [Proximos pasos](#10-proximos-pasos)

---

## 1. Contexto y obligacion legal

La **Ley 25.326 de Proteccion de Datos Personales** (art. 21) y el Decreto 1558/2001 (art. 26) obligan a toda persona fisica o juridica que cree o administre archivos, registros o bases de datos con datos personales a inscribirse en el **Registro Nacional de Bases de Datos (RNBD)** ante la **Agencia de Acceso a la Informacion Publica (AAIP)**.

La omision de esta inscripcion constituye una infraccion pasible de sancion administrativa.

**Responsable:** [NOMBRE AGENCIA] — CUIT: [CUIT]

---

## 2. Tipo de declaracion

- **Tipo:** Declaracion de base de datos **privada** (titular privado, no organismo del Estado).
- **Actividad:** Servicio de transporte de pasajeros (remis).
- **Alcance:** Datos de pasajeros, conductores y personal administrativo relacionado con la operacion del servicio.

---

## 3. Categorias de datos a declarar

A continuacion se listan las categorias de datos personales que se informaran en la declaracion:

### 3.1 Pasajeros

| Categoria | Dato especifico | Sensible (art. 2 Ley 25.326) |
|-----------|----------------|:----------------------------:|
| Identificacion | Nombre, apellido, numero de telefono | No |
| Ubicacion | Coordenadas GPS durante el viaje | No |
| Perfil | Foto de perfil (opcional) | No |
| Transacciones | Historial de viajes, metodo de pago (token) | No |
| Comunicaciones | Mensajes en el chat del viaje | No |

### 3.2 Conductores

| Categoria | Dato especifico | Sensible (art. 2 Ley 25.326) |
|-----------|----------------|:----------------------------:|
| Identificacion | Nombre, apellido, DNI, fecha de nacimiento | No |
| Biometrico | Foto del DNI, selfie biometrica (KYC) | **Si** |
| Contacto | Telefono celular, domicilio | No |
| Ubicacion | Coordenadas GPS en background durante el turno | No |
| Documentacion | Datos de licencia, seguro, VTV | No |
| Desempeno | Calificaciones, historial de viajes, sanciones | No |

> Los datos biometricos del conductor son datos sensibles segun el art. 2 de la Ley 25.326 y requieren declaracion expresa y medidas de seguridad reforzadas.

---

## 4. Finalidades del tratamiento

Las finalidades que se declararan ante la AAIP son:

1. Prestacion del servicio de transporte de pasajeros.
2. Gestion de pagos y facturacion.
3. Verificacion de identidad de conductores (KYC).
4. Seguridad de los usuarios (protocolo SOS).
5. Cumplimiento de obligaciones legales, fiscales y regulatorias.
6. Mejora del servicio mediante analisis estadistico anonimizado.
7. Comunicacion con usuarios relacionada con el servicio.

---

## 5. Cesiones a terceros

Se informaran las siguientes cesiones de datos:

| Destinatario | Pais | Datos cedidos | Finalidad |
|---|---|---|---|
| Supabase Inc. | Alemania (UE) | Todos los datos de la base de datos | Almacenamiento e infraestructura |
| MercadoPago S.A. | Argentina | Datos de pago (token) | Procesamiento de cobros |
| Amazon Web Services (Rekognition) | EE.UU. | Fotos DNI y selfie biometrica | KYC de conductores |
| Google LLC (Maps Platform) | EE.UU. | Coordenadas GPS | Calculo de rutas |
| Twilio Inc. | EE.UU. | Numero de telefono | Envio de SMS |

Todas las cesiones se realizan bajo contratos que imponen al destinatario obligaciones de confidencialidad y seguridad equivalentes a las exigidas por la Ley 25.326.

---

## 6. Medidas de seguridad

Las medidas de seguridad que se declararan son las siguientes:

### 6.1 Seguridad tecnica

- **Cifrado en reposo:** todos los datos almacenados en Supabase (PostgreSQL) estan cifrados en reposo mediante AES-256.
- **Cifrado en transito:** todas las comunicaciones entre la app, el panel y los servicios de backend utilizan TLS 1.2 o superior.
- **Row Level Security (RLS):** la base de datos tiene politicas de seguridad a nivel de fila que impiden que un usuario acceda a datos de otro usuario.
- **Audit log con hash chain SHA-256:** cada operacion critica queda registrada en un log de auditoria cuya integridad se verifica mediante cadena de hashes SHA-256, lo que impide la modificacion retroactiva de registros sin deteccion.
- **Backups:** copias de seguridad diarias automaticas con retencion de 30 dias, almacenadas en region separada.
- **Control de acceso:** acceso al panel administrativo con autenticacion de dos factores (2FA) para el despachante y el administrador.

### 6.2 Seguridad organizacional

- Acceso a datos de produccion restringido al personal estrictamente necesario.
- Contrato de confidencialidad firmado por el personal con acceso a datos.
- Procedimiento documentado de respuesta a incidentes (ver [incident_response.md](./incident_response.md)).
- Politica de retencion y purga de datos (ver [data_retention.md](./data_retention.md)).

---

## 7. Mecanismo para el ejercicio de derechos ARCO

El ejercicio de los derechos de acceso, rectificacion, cancelacion y oposicion (ARCO) se instrumenta de la siguiente manera:

- **Canal:** Email a [EMAIL DE PRIVACIDAD] con asunto "Ejercicio de derechos ARCO".
- **Identificacion:** el titular debe acreditar su identidad adjuntando copia del DNI.
- **Plazo de respuesta:** 10 dias habiles para acusar recibo; 30 dias habiles para resolver la solicitud.
- **Responsable:** [NOMBRE Y CARGO DEL RESPONSABLE ARCO].
- **Alternativa tecnica:** el panel administrativo cuenta con un endpoint de administracion que permite ejecutar operaciones de anonimizacion, exportacion o supresion de datos de forma auditada.

---

## 8. Procedimiento de inscripcion

1. Acceder al sitio oficial de la AAIP (ver sitio oficial **aaip.gob.ar**, seccion "Registro Nacional de Bases de Datos").
2. Crear usuario institucional con CUIT de la agencia.
3. Completar el formulario de declaracion con la informacion de las secciones 3 a 7 de este documento.
4. Adjuntar la documentacion de medidas de seguridad que se requiera.
5. Presentar la declaracion y conservar el comprobante de envio.
6. Una vez otorgado el numero de RNBD, actualizar el placeholder en [privacy_policy.md](./privacy_policy.md) (seccion 8).
7. Incorporar el numero de RNBD en el footer de la app y del sitio web.

> **Importante:** No inventar ni usar un numero de RNBD placeholder en produccion. El numero debe provenir de la AAIP.

---

## 9. Estimacion de tiempos y costos

| Concepto | Detalle |
|----------|---------|
| Costo de inscripcion | **Gratuito** |
| Plazo estimado de procesamiento | Aproximadamente **30 dias corridos** desde la presentacion completa |
| Validez de la inscripcion | Permanente; se actualiza ante cambios sustanciales en las bases de datos declaradas |
| Obligacion de actualizacion | Informar a la AAIP cualquier modificacion significativa (nuevas categorias de datos, nuevos destinatarios, cambio de responsable) |

---

## 10. Proximos pasos

- [ ] Designar un responsable de privacidad (puede ser el titular de la agencia o un apoderado).
- [ ] Revisar este plan con el abogado matriculado en La Pampa.
- [ ] Completar todos los placeholders ([NOMBRE AGENCIA], [CUIT], etc.).
- [ ] Iniciar el tramite en aaip.gob.ar.
- [ ] Una vez obtenido el numero de RNBD, actualizarlo en [privacy_policy.md](./privacy_policy.md).
- [ ] Programar revision anual de la declaracion ante la AAIP.

---

*Referencia normativa: Ley 25.326, art. 21; Decreto 1558/2001, art. 26; Disposicion DNPDP 2/2014.*
*Para informacion actualizada sobre el tramite, consultar el sitio oficial aaip.gob.ar.*
