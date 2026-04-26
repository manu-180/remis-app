# Checklist de Cumplimiento Municipal — remis_app

**Version: 0.1.0 — 2026-04-26**

> **Aviso legal:** Este documento es un borrador tecnico-operativo. Debe ser revisado por un abogado matriculado en La Pampa antes de su publicacion.

---

## Tabla de contenidos

1. [Advertencia sobre normativa local](#1-advertencia-sobre-normativa-local)
2. [Ordenanzas de referencia (Santa Rosa)](#2-ordenanzas-de-referencia-santa-rosa)
3. [Antes de lanzar — gestion institucional](#3-antes-de-lanzar--gestion-institucional)
4. [Por conductor — antes de habilitar](#4-por-conductor--antes-de-habilitar)
5. [Por vehiculo — antes de habilitar](#5-por-vehiculo--antes-de-habilitar)
6. [Mantenimiento anual](#6-mantenimiento-anual)
7. [Notas adicionales](#7-notas-adicionales)

---

## 1. Advertencia sobre normativa local

Este checklist toma como referencia las ordenanzas del municipio de Santa Rosa (La Pampa) listadas en la seccion 2. Sin embargo, **el servicio opera en [LOCALIDAD]**, cuyo municipio puede tener ordenanzas propias con requisitos distintos.

**Antes de usar este checklist, se debe:**

1. Solicitar al municipio de [LOCALIDAD] copia certificada de la ordenanza vigente que regula el servicio de remis.
2. Comparar cada item de este checklist contra esa ordenanza.
3. Actualizar este documento con los requisitos especificos del municipio.

No asumir que los requisitos de Santa Rosa aplican identicamente a [LOCALIDAD].

---

## 2. Ordenanzas de referencia (Santa Rosa)

Las siguientes ordenanzas del municipio de Santa Rosa, La Pampa, se usan como base de referencia. Verificar vigencia y versiones actualizadas directamente en el municipio.

| Ordenanza | Ano | Tema principal |
|-----------|-----|----------------|
| Ord. 2209/98 | 1998 | Regimen general de remises |
| Ord. 2993/03 | 2003 | Modificacion de requisitos del conductor |
| Ord. 4226/10 | 2010 | Actualizacion de requisitos vehiculares |
| Ord. 5868/18 | 2018 | Incorporacion de plataformas digitales / apps |
| Ord. 6975/23 | 2023 | Actualizacion tarifaria y habilitacion |
| Ord. 6977/23 | 2023 | Modificacion de requisitos de conductores |

> Estas ordenanzas son de **Santa Rosa**. Si la agencia opera en otro municipio de La Pampa, solicitar al municipio correspondiente la normativa vigente.

---

## 3. Antes de lanzar — gestion institucional

### 3.1 Reunion con la autoridad municipal

- [ ] Concertar reunion con la **Direccion de Transito** o la secretaria/direccion competente en servicios de transporte de pasajeros del municipio.
- [ ] Presentar el proyecto de la aplicacion y obtener opinion previa sobre la necesidad de aprobacion del software.
- [ ] Consultar si la ordenanza vigente contempla o restringe el uso de plataformas digitales para la asignacion de viajes.

### 3.2 Normativa

- [ ] Obtener copia firmada o con sello oficial de la ordenanza vigente que regula remises en [LOCALIDAD].
- [ ] Verificar la tarifa actualizada (valor del ficha/banderazo y valor por km o minuto).
- [ ] Verificar la antiguedad maxima permitida de los vehiculos habilitados.
- [ ] Verificar si existe requisito de "paradero" fisico o domicilio operativo.

### 3.3 Habilitacion de la agencia

- [ ] Verificar que la habilitacion municipal de la agencia como remiseria este vigente o iniciar el tramite correspondiente.
- [ ] Verificar el regimen tributario aplicable (ingresos brutos La Pampa, tasa municipal de habilitacion).
- [ ] Consultar si el municipio exige una instancia de aprobacion previa del software o la app antes de ponerla en produccion.

### 3.4 Gestiones institucionales

- [ ] Redactar **carta de presentacion** dirigida al intendente o al secretario de gobierno/transporte informando el lanzamiento del servicio.
- [ ] Ofrecer una demostracion del sistema al area municipal competente si se requiere.

### 3.5 Seguros

- [ ] Confirmar que la agencia cuenta con poliza de **responsabilidad civil** vigente.
- [ ] Confirmar que cada vehiculo habilitado cuenta con poliza de **responsabilidad civil hacia pasajeros** vigente segun lo exige la ordenanza.

### 3.6 Tipo de licencia del conductor

- [ ] Confirmar si el municipio exige licencia **D1 nacional** (expedida por ANSV/Renaper) o acepta licencia **D1 municipal** propia.
- [ ] Confirmar si existe un curso obligatorio de capacitacion para conductores de remis en el municipio.

---

## 4. Por conductor — antes de habilitar

Completar este checklist por cada conductor antes de activar su cuenta en la plataforma.

**Conductor:** __________________ **Fecha de revision:** __________________

- [ ] Licencia de conducir categoria D1 vigente (municipal o nacional segun lo exija la ordenanza).
- [ ] Libreta sanitaria municipal vigente.
- [ ] Certificado de Reincidencia Federal con fecha de emision no mayor a **60 dias** al momento del alta.
- [ ] Acreditacion de domicilio/residencia en la localidad con una antiguedad minima de **2 anos** (o la que exija la ordenanza local).
- [ ] Edad dentro del rango permitido por la ordenanza (verificar minimo y maximo si aplica).
- [ ] Acreditacion de dominio del idioma nacional (exigido por la ordenanza de referencia).
- [ ] Contrato/acuerdo firmado con la agencia (incluye [terms.md](./terms.md) Seccion B y [dpa_template.md](./dpa_template.md)).
- [ ] Consentimiento informado para KYC biometrico firmado (ver [consent_flows.md](./consent_flows.md)).
- [ ] Foto de perfil cargada en la plataforma.
- [ ] Verificacion KYC completada (AWS Rekognition).

---

## 5. Por vehiculo — antes de habilitar

Completar este checklist por cada vehiculo antes de vincularlo a un conductor activo.

**Vehiculo (dominio):** __________________ **Fecha de revision:** __________________

- [ ] Titulo del vehiculo y cedula verde o azul a nombre del permisionario (conductor o agencia segun corresponda).
- [ ] VTV (Verificacion Tecnica Vehicular) vigente.
- [ ] Poliza de **seguro de responsabilidad civil** vigente.
- [ ] Poliza de **seguro de responsabilidad civil hacia pasajeros** vigente.
- [ ] Habilitacion municipal del vehiculo para el servicio de remis vigente.
- [ ] Antiguedad del vehiculo dentro del limite permitido por la ordenanza.
- [ ] Numero de identificacion interno (numero de remis asignado por el municipio, si aplica).
- [ ] Licencia de habilitacion del vehiculo exhibida en lugar visible dentro del vehiculo (segun exija la ordenanza).

---

## 6. Mantenimiento anual

Verificar en forma periodica (o segun el periodo que establezca la ordenanza local):

### Fiscal y tributario

- [ ] Cumplimiento de **Rentas La Pampa** (ingresos brutos o convenio multilateral, segun corresponda).
- [ ] **12 comprobantes AFIP** del ano anterior (facturas o tickets emitidos por cada mes de actividad).
- [ ] Renovacion de la tasa municipal de habilitacion de la agencia.

### Seguros

- [ ] Renovacion de polizas de **responsabilidad civil** y **responsabilidad civil hacia pasajeros** de cada vehiculo.
- [ ] Verificar que los montos asegurados cumplen con los minimos exigidos por la ordenanza vigente.

### Conductores

- [ ] Revision de licencias de conducir de todos los conductores activos.
- [ ] Revision de libretas sanitarias de todos los conductores activos.
- [ ] Nuevo Certificado de Reincidencia Federal para conductores que cumplan 12 meses desde el ultimo (verificar si la ordenanza exige periodicidad).

### Vehiculos

- [ ] Renovacion de VTV de cada vehiculo.
- [ ] Renovacion de habilitacion municipal de cada vehiculo.

---

## 7. Notas adicionales

- La **tarifa** debe actualizarse en la app cada vez que el municipio actualice la ordenanza tarifaria. No se puede cobrar por encima del tope municipal.
- Conservar copias digitales de toda la documentacion habilitante en la plataforma (Supabase Storage) para facilitar la auditoria.
- En caso de reclamo de un pasajero ante el municipio o ante organismos de defensa del consumidor, tener disponible el historial del viaje exportado desde la plataforma.
- Consultar con el area de **Rentas de La Pampa** el regimen de ingresos brutos aplicable al modelo de negocio (agencia + conductores independientes).

---

*Referencia: Ordenanzas municipales de Santa Rosa, La Pampa (Ord. 2209/98, 2993/03, 4226/10, 5868/18, 6975/23, 6977/23). Verificar normativa vigente y aplicable al municipio donde opere la agencia.*
