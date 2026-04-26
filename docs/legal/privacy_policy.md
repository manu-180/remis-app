# Politica de Privacidad — remis_app

**Version: 0.1.0 — 2026-04-26**

> **Aviso legal:** Este documento es un borrador tecnico-operativo. Debe ser revisado por un abogado matriculado en La Pampa antes de su publicacion.

---

## Resumen en 30 segundos

- Receptamos tu nombre, telefono, ubicacion GPS y datos del viaje para poder prestarte el servicio de remis.
- No vendemos tus datos a nadie.
- Los pagos los procesa MercadoPago; nosotros nunca vemos el numero de tu tarjeta.
- Tenes derecho a pedir, corregir o borrar tu informacion en cualquier momento.
- Usamos servicios en la nube en Argentina, Europa y Estados Unidos, todos bajo contratos de privacidad.
- Esta politica aplica tanto a la app como a la web.

---

## Tabla de contenidos

1. [Responsable del tratamiento](#1-responsable-del-tratamiento)
2. [Datos personales que recolectamos](#2-datos-personales-que-recolectamos)
3. [Finalidades del tratamiento](#3-finalidades-del-tratamiento)
4. [Base legal](#4-base-legal)
5. [Destinatarios y transferencias internacionales](#5-destinatarios-y-transferencias-internacionales)
6. [Conservacion de los datos](#6-conservacion-de-los-datos)
7. [Tus derechos ARCO](#7-tus-derechos-arco)
8. [Inscripcion en el RNBD](#8-inscripcion-en-el-rnbd)
9. [Menores de edad](#9-menores-de-edad)
10. [Cookies y tecnologias similares](#10-cookies-y-tecnologias-similares)
11. [Modificaciones a esta politica](#11-modificaciones-a-esta-politica)
12. [Contacto con el responsable de privacidad](#12-contacto-con-el-responsable-de-privacidad)

---

## 1. Responsable del tratamiento

El responsable del tratamiento de tus datos personales es:

- **Razon social:** [NOMBRE AGENCIA]
- **CUIT:** [CUIT]
- **Domicilio:** [DOMICILIO — calle, numero, localidad, provincia, CP]
- **Telefono de contacto:** [TELEFONO]
- **Email de contacto:** [EMAIL]

Esta politica de privacidad aplica a todos los usuarios de la aplicacion movil **remis_app** y del sitio web asociado, en cumplimiento de la **Ley 25.326 de Proteccion de Datos Personales** de la Republica Argentina y su decreto reglamentario 1558/2001.

---

## 2. Datos personales que recolectamos

Recolectamos unicamente los datos necesarios para prestar el servicio. No pedimos informacion que no necesitemos.

### 2.1 Datos del pasajero

| Dato | Cuando se recolecta | Es obligatorio |
|------|--------------------:|:--------------:|
| Nombre y apellido | Registro | Si |
| Numero de telefono celular | Registro | Si |
| Foto de perfil | Opcional, al configurar perfil | No |
| Ubicacion GPS (en tiempo real) | Durante el uso activo de la app | Si (para el viaje) |
| Historial de viajes | Automatico al completar cada viaje | Si |
| Metodo de pago (token, nunca PAN) | Al agregar medio de pago | No (efectivo disponible) |
| Comunicaciones con el conductor | Mensajes en el chat del viaje | Si (durante el viaje) |

> **Aclaracion sobre pagos:** Nunca almacenamos el numero completo de tarjeta (PAN). MercadoPago nos provee un token que representa el metodo de pago. El procesamiento del pago ocurre en los servidores de MercadoPago bajo sus propias politicas de seguridad.

### 2.2 Datos del conductor

| Dato | Cuando se recolecta | Es obligatorio |
|------|--------------------:|:--------------:|
| Nombre, apellido, DNI | Onboarding | Si |
| Foto del DNI (KYC) | Onboarding (verificacion unica) | Si |
| Selfie biometrica (KYC) | Onboarding (verificacion unica) | Si |
| Telefono celular | Onboarding | Si |
| Ubicacion GPS en background | Mientras la app esta activa | Si (para el despacho) |
| Foto de perfil | Onboarding | Si |
| Documentacion vehicular | Onboarding | Si |

> **Sobre los datos biometricos del conductor:** La verificacion de identidad (KYC) utiliza AWS Rekognition para comparar la foto del DNI con la selfie. El resultado de esa comparacion se almacena; las imagenes en si se conservan durante el tiempo indicado en [data_retention.md](./data_retention.md). Este tratamiento requiere consentimiento explicito y separado.

---

## 3. Finalidades del tratamiento

Usamos tus datos unicamente para las siguientes finalidades:

1. **Prestacion del servicio de transporte:** asignar conductores, calcular rutas y coordinar viajes en tiempo real.
2. **Comunicacion durante el viaje:** enviar notificaciones push, SMS y mensajes en el chat de la app para informarte sobre el estado de tu viaje.
3. **Procesamiento de pagos:** gestionar el cobro del viaje a traves de MercadoPago y emitir los comprobantes correspondientes.
4. **Seguridad personal:** activar y gestionar el protocolo SOS, compartir ubicacion con contactos de emergencia y colaborar con autoridades cuando corresponda por ley.
5. **Verificacion de identidad de conductores (KYC):** confirmar que la persona que maneja el vehiculo es quien dice ser, en cumplimiento de las obligaciones de habilitacion municipal.
6. **Mejora del servicio:** analizar patrones de uso agregados y anonimizados para optimizar la operacion de la remiseria (tiempos de espera, zonas de alta demanda).
7. **Cumplimiento legal y regulatorio:** conservar registros de viajes y pagos en cumplimiento de la normativa fiscal argentina y las ordenanzas municipales vigentes.
8. **Prevencion de fraude y abuso:** detectar actividad sospechosa, proteger la seguridad de los usuarios y de la plataforma.

**No usamos tus datos para publicidad de terceros.**

---

## 4. Base legal

El tratamiento de datos se sustenta en las siguientes bases legales conforme al art. 5 de la Ley 25.326:

- **Consentimiento informado:** para el tratamiento de datos biometricos del conductor (KYC), para el uso de cookies analiticas y para el envio de comunicaciones de marketing (si el usuario opta por recibirlas).
- **Ejecucion contractual:** para todos los datos necesarios para prestar el servicio de transporte solicitado por el usuario.
- **Obligacion legal:** para la conservacion de comprobantes fiscales y el cumplimiento de requerimientos de autoridades competentes.

---

## 5. Destinatarios y transferencias internacionales

Para prestar el servicio, compartimos datos con los siguientes proveedores de tecnologia. Todos tienen contratos que obligan a proteger tu informacion.

| Proveedor | Finalidad | Base legal de la transferencia | Pais / Region |
|-----------|-----------|-------------------------------|---------------|
| Supabase Inc. | Base de datos, autenticacion, almacenamiento de archivos, mensajeria en tiempo real | Ejecucion contractual; clausulas contractuales tipo | Frankfurt, Alemania (Union Europea) |
| MercadoPago S.A. | Procesamiento de pagos y gestion de tokens de tarjeta | Ejecucion contractual | Argentina |
| Amazon Web Services (AWS Rekognition) | Verificacion biometrica de identidad de conductores (KYC) | Consentimiento explicito del conductor | Estados Unidos |
| Google (Maps Platform) | Visualizacion de mapas y calculo de rutas | Ejecucion contractual | Estados Unidos |
| Twilio Inc. | Envio de SMS (notificaciones y contactos SOS) | Ejecucion contractual | Estados Unidos |

> **Sobre las transferencias a EE.UU.:** Argentina reconoce que Estados Unidos no cuenta con nivel adecuado de proteccion equivalente al local. Las transferencias a AWS, Google y Twilio se realizan bajo clausulas contractuales estandar y, en el caso de AWS Rekognition, con el consentimiento previo e informado del conductor. No se realizan transferencias a otros paises.

---

## 6. Conservacion de los datos

Los plazos de conservacion estan detallados en el documento [data_retention.md](./data_retention.md).

Como referencia rapida:

- Datos de viajes: 5 anos desde el cierre del viaje (art. 2560 del Codigo Civil y Comercial).
- Datos de pagos: 10 anos (normativa fiscal argentina).
- Ubicacion GPS no vinculada a viaje: 90 dias.
- PII del pasajero sin actividad: 2 anos desde el ultimo viaje, luego anonimizacion.
- Datos KYC del conductor: 5 anos desde la baja del conductor.

---

## 7. Tus derechos ARCO

Conforme al art. 14 y siguientes de la Ley 25.326, tenes derecho a:

- **Acceso:** conocer que datos tuyos tenemos almacenados.
- **Rectificacion:** corregir datos inexactos o incompletos.
- **Cancelacion:** solicitar la supresion de tus datos cuando ya no sean necesarios o cuando retires tu consentimiento.
- **Oposicion:** oponerte al tratamiento de tus datos para una finalidad especifica.

### Como ejercer tus derechos

Envia un email a **[EMAIL DE PRIVACIDAD]** con:

- Asunto: "Ejercicio de derechos ARCO"
- Tu nombre completo y telefono registrado en la app
- Una descripcion clara de lo que estas solicitando
- Copia de tu DNI (frente y dorso) para verificar tu identidad

Respondemos en un plazo maximo de **10 dias habiles** para acusar recibo y de **30 dias habiles** para resolver tu solicitud, conforme a la ley.

Si considerás que tu solicitud no fue atendida correctamente, podes presentar una denuncia ante la **Agencia de Acceso a la Informacion Publica (AAIP)** en www.aaip.gob.ar.

---

## 8. Inscripcion en el RNBD

La base de datos de **[NOMBRE AGENCIA]** se encuentra inscripta en el **Registro Nacional de Bases de Datos (RNBD)** de la AAIP con el numero **[NUMERO DE INSCRIPCION — PENDIENTE]**.

Para mas informacion sobre el proceso de inscripcion, consulta [aaip_registration.md](./aaip_registration.md).

---

## 9. Menores de edad

El servicio esta dirigido exclusivamente a personas mayores de 18 anos. No recolectamos ni procesamos datos personales de menores de edad de forma intencional. Si detectamos que un usuario es menor de 18 anos, cancelaremos su cuenta y eliminaremos sus datos.

Si sos padre, madre o tutor y crees que tu hijo menor de 18 anos se ha registrado en la app, por favor contactanos en **[EMAIL DE PRIVACIDAD]**.

---

## 10. Cookies y tecnologias similares

Esta seccion aplica al sitio web publico del servicio, no a la aplicacion movil.

### Tipos de cookies que usamos

| Tipo | Nombre / Herramienta | Proposito | Estado por defecto |
|------|---------------------|-----------|-------------------|
| Tecnicas / esenciales | Propias (sesion, preferencias) | Funcionamiento basico del sitio. No se pueden desactivar. | Siempre activas |
| Analiticas | PostHog | Entender como se usa el sitio (paginas vistas, flujos). Los datos son anonimizados. | OFF (requiere tu aceptacion) |
| Marketing | Ninguna | No usamos cookies de publicidad ni de seguimiento entre sitios. | No aplicable |

### Como gestionar tus preferencias

Al ingresar al sitio por primera vez, aparecera un banner donde podras aceptar o rechazar las cookies analiticas. Podes cambiar tu decision en cualquier momento desde el enlace "Preferencias de cookies" en el pie de pagina del sitio.

---

## 11. Modificaciones a esta politica

Podemos actualizar esta politica de privacidad cuando sea necesario (por cambios en la ley, en los servicios o en los proveedores). Cuando lo hagamos:

- Actualizaremos la fecha y el numero de version en el encabezado.
- Notificaremos los cambios significativos a traves de la app o por email.
- La version anterior quedara disponible en el historial de versiones del repositorio.

El uso continuado del servicio despues de la notificacion de cambios implica la aceptacion de la nueva version.

---

## 12. Contacto con el responsable de privacidad

Para cualquier consulta sobre el tratamiento de tus datos personales:

- **Email:** [EMAIL DE PRIVACIDAD — DPO O RESPONSABLE]
- **Domicilio postal:** [DOMICILIO DE LA AGENCIA]
- **Horario de atencion:** [HORARIO]

---

*Ley 25.326 — Proteccion de los Datos Personales — Republica Argentina.*
*La AAIP, en su caracter de organo de control, tiene la atribucion de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en la materia.*
