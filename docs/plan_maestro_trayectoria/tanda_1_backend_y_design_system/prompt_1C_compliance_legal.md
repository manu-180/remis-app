# Prompt 1C — Compliance, Legal y Privacy

> **LEÉ PRIMERO:** `00_arquitectura.md` (sección 2.6), `00_file_ownership_matrix.md` (Tanda 1C).

## Objetivo

Producir los documentos legales y operativos que **deben existir antes de lanzar producción**: privacy policy, términos de uso, plan de inscripción AAIP, checklist municipal, política de retención de datos, plan de respuesta a incidentes. Esto NO es código — son docs en español pensados para mostrar a un abogado y al cliente.

**Disclaimer obligatorio en TODOS los docs:** "Este documento es un borrador técnico-operativo. Debe ser revisado por un abogado matriculado en La Pampa antes de su publicación."

## File ownership

✍️ `docs/legal/**`. NADA fuera.

## Steps

### 1. `docs/legal/README.md`

Índice de los docs producidos + estado (borrador / revisión legal / aprobado / publicado). Incluir matriz de "qué doc se muestra dónde" (app pasajero, panel dispatcher, web pública, contrato con la agencia, contrato con conductor).

### 2. `docs/legal/privacy_policy.md` (Política de Privacidad)

Estructura mínima alineada a Ley 25.326 + adecuación UE preventiva:
1. Responsable del tratamiento (placeholder "[NOMBRE AGENCIA, CUIT, DOMICILIO]").
2. Datos personales recolectados — listar con granularidad: nombre, DNI (sólo onboarding KYC), teléfono, ubicación GPS, foto de perfil, historial de viajes, métodos de pago (tokens, NUNCA PAN), comunicaciones con conductor.
3. Finalidad del tratamiento — listar 7-8 finalidades concretas y NO mezclar (servicio, seguridad, fraude, fiscal, marketing CON OPT-IN explícito separado, etc.).
4. Base legal del tratamiento — consentimiento + ejecución contractual.
5. Destinatarios y transferencias internacionales — Supabase (Frankfurt EU), MercadoPago (AR), AWS Rekognition (US, transferencia con consentimiento informado), Google Maps (US), Twilio (US). Tabla con cada uno + finalidad + base.
6. Conservación — política completa (ver `data_retention.md`).
7. Derechos ARCO + acceso/rectificación/oposición/supresión. Email/canal para ejercerlos.
8. Inscripción RNBD — número (placeholder).
9. Menores: no se atiende a <18; padres/tutores responsables si solicitan viaje para menor.
10. Cookies (web) — separadas: técnicas, analíticas (PostHog con consentimiento), marketing (NINGUNA por defecto).
11. Modificaciones — versionado con fecha.
12. Datos de contacto del DPO (placeholder).

Estilo: claro, NO legalese opaco. Frases cortas. Subtítulos cada 2-3 párrafos. Versión "resumen" arriba ("En 30 segundos: qué guardamos, por cuánto, para qué") + versión completa abajo.

### 3. `docs/legal/terms.md` (Términos y Condiciones)

Foco doble:
- **TyC del pasajero** (uso de la app, responsabilidades, política de cancelación, política de no-show, reembolsos).
- **TyC del conductor** (relación con la agencia — independiente, no laboral; obligaciones operativas; documentación; sanciones).

Cláusulas explícitas:
- **El servicio es REMÍS, no taxi**. Solo se toma por agencia. Sin paseo callejero.
- **La agencia tiene responsabilidad objetiva** por daños al pasajero (jurisprudencia Toay, La Pampa).
- **Tarifas** según ordenanza municipal vigente; el precio máximo lo fija el municipio.
- **Cancelación**: por pasajero gratis hasta 2 min post-asignación; después, fee X.
- **No-show**: 5 min de espera del conductor → cobra mínimo + reportable.
- **Conducta**: prohibición de fumar, mascotas con consentimiento previo, equipaje X.
- **Limitación de responsabilidad** dentro de lo permitido por LDC (no se puede excluir lo no excluible).
- **Jurisdicción**: tribunales ordinarios de Santa Rosa, La Pampa.
- **Adhesión a CABA + LDC + ordenanzas**.

### 4. `docs/legal/aaip_registration.md`

Plan de **inscripción de la base de datos en el RNBD/AAIP** (Agencia de Acceso a la Información Pública):
- Tipo de declaración (privada).
- Categorías de datos.
- Finalidades.
- Cesiones (los providers listados).
- Medidas de seguridad: cifrado en reposo (Supabase), TLS en tránsito, RLS, audit log, backups.
- Mecanismo para ejercicio de derechos.
- Estimación de tiempo: 30 días desde solicitud.
- Costo: gratis.
- Link al formulario actual (poner referencia, NO fetchear).

### 5. `docs/legal/municipal_compliance.md`

Checklist operativa **antes del lanzamiento** y **mantenimiento periódico**:

**Antes de lanzar:**
- [ ] Reunión presencial con Dirección de Tránsito o Servicios Públicos del municipio.
- [ ] Obtener copia firmada de la **ordenanza vigente** que regula remises (no servir online sin contrastar contra la copia oficial).
- [ ] Verificar:
  - tarifa actualizada (importe máximo)
  - antigüedad máxima del vehículo
  - requisitos de paradero físico
  - aprobación previa del software
  - clausulado del seguro RC + RC pasajeros
- [ ] Carta de presentación al intendente / secretario.
- [ ] Verificar régimen de **habilitación de la agencia** (permisionario único o múltiple).
- [ ] Confirmar **tipo de licencia D del conductor** (D1 nacional vs D1 municipal).

**Por conductor antes de habilitar:**
- [ ] LUC D1 vigente.
- [ ] Libreta sanitaria municipal vigente.
- [ ] Certificado de Reincidencia Federal (recomendado <60 días).
- [ ] Domicilio en la localidad / mínima residencia 2 años.
- [ ] Edad permitida.
- [ ] Idioma nacional.

**Por vehículo:**
- [ ] Título y cédula a nombre del permisionario.
- [ ] VTV vigente.
- [ ] Seguro RC + Seguro RC pasajeros (pólizas separadas en algunos casos).
- [ ] Habilitación municipal del vehículo.

**Mantenimiento anual (1 marzo - 30 abril, según Santa Rosa, validar local):**
- [ ] Cumplimiento Rentas La Pampa.
- [ ] 12 comprobantes AFIP del año.
- [ ] Aportes de contratados.
- [ ] Renovación de pólizas.

Listar referencias de ordenanzas (Ord. 2209/98, 2993/03, 4226/10, 5868/18, 6975/23, 6977/23 — Santa Rosa) **como referencia comparativa**, advirtiendo que la ordenanza local del pueblo del 2954 puede diferir.

### 6. `docs/legal/data_retention.md`

Política de retención y purga:

| Dato | Retención mínima | Retención máxima | Trigger de purga |
|------|------------------|-------------------|------------------|
| `rides` activos | indefinido | — | — |
| `rides` cerrados | 5 años (prescripción civil art. 2560 CCyC) | 5 años | cron mensual |
| `ride_events` | 5 años | 5 años | cron mensual junto con ride |
| `payments` | 10 años (fiscal AR) | 10 años | cron anual |
| `mp_webhook_events` | 1 año | 1 año | cron mensual |
| `audit_log` | 5 años (general), 10 (vinculado a SOS o reclamo formal) | — | nunca purga automática |
| `sos_events` | 10 años | indefinido si hay denuncia activa | manual + admin |
| `driver_location_history` | 90 días default; durante un viaje vinculado: 5 años | 5 años | cron diario / particiones drop |
| `kyc_verifications` | 5 años post-baja del conductor | 5 años | manual |
| `messages` | 90 días | 90 días | cron diario |
| PII pasajeros (nombre, tel) | 2 años desde último viaje | 2 años | cron mensual; ride histórico se anonimiza |
| Cuentas inactivas | 3 años | aviso + soft delete | cron + email |

Documentar el **proceso de purga**: cron en pg_cron + Edge Function de purge que:
1. Marca filas a purgar.
2. Anonimiza (no borra) si están vinculadas a `audit_log` o registro fiscal vivo.
3. Emite log al `audit_log` de "purga ejecutada N filas tabla X".
4. Soporta solicitudes ARCO (eliminación bajo pedido) → admin endpoint.

### 7. `docs/legal/incident_response.md`

Plan de respuesta a incidentes — 4 categorías:

**Categoría A — Seguridad personal (SOS activado):**
- Detección: SOS event en tabla → push al dispatcher → SMS contactos.
- Respuesta inmediata: dispatcher llama al conductor, evalúa, decide llamar 911.
- Post-incidente: preservar audit_log + GPS + grabaciones de chat. Backup forense.
- Comunicación: cliente, autoridades si corresponde, familia del afectado.
- Plazo de cierre: 72hs.

**Categoría B — Brecha de datos:**
- Detección: anomalías en logs / disclosure responsable / advisor de seguridad.
- Triage en <4hs: ¿qué datos? ¿cuántos afectados? ¿exfiltración confirmada?
- Notificación AAIP: <72hs (alineado a próxima reforma 25.326).
- Notificación a afectados: si hay riesgo significativo.
- Forense + remediation.

**Categoría C — Caída del servicio:**
- Runbook por componente (Supabase, Vercel, FCM, MP).
- Comunicación al cliente vía status page.

**Categoría D — Denuncia regulatoria:**
- Municipio vs AAIP vs LDC.
- Designar responsable de respuesta.
- Preservar documentación.

### 8. `docs/legal/consent_flows.md`

Diseño de los flujos de consentimiento — copys exactos en español, voseo:

- **Consentimiento al registrarse (pasajero):** "Acepto los Términos y la Política de Privacidad. Entiendo que se tratarán mis datos para prestar el servicio de remís." + checkbox separado para marketing (default OFF).
- **Permiso de ubicación (pasajero):** copy del prominent disclosure ANTES del prompt nativo + en flujo: "Para pedir remís necesitamos tu ubicación actual."
- **Consentimiento del conductor (más extenso):** datos biométricos para KYC, ubicación en background, foto de perfil, llamadas grabadas (si aplica), disciplina y sanciones.
- **Trip share:** "Compartir este link permite a quien lo abra ver tu viaje en vivo hasta 30 minutos después de finalizado. Podés revocarlo en cualquier momento."
- **Cookies (web):** banner mínimo. Técnicas siempre on. Analíticas opt-in (default off).

### 9. `docs/legal/dpa_template.md`

Borrador de **Acuerdo de Procesamiento de Datos** entre la agencia (responsable) y la empresa de Manuel (encargado / proveedor del software). Cláusulas:
- Objeto.
- Naturaleza y duración.
- Categorías y finalidades.
- Obligaciones del encargado (confidencialidad, seguridad, asistencia ARCO).
- Subencargados (Supabase, MP, AWS, Twilio) con consentimiento.
- Auditoría (derecho del responsable).
- Notificación de brechas (<72hs).
- Devolución/destrucción al finalizar.

### 10. `docs/legal/sos_protocol.md`

Protocolo operativo del SOS — más detallado que `incident_response.md`:
- UX del trigger (hold-press 2-3s, NO tap único).
- Datos persistidos en `sos_events`.
- Notificación inmediata al dispatcher (Realtime + sonido distintivo).
- Notificación a contactos (SMS via Twilio, link de tracking público).
- `tel:911` desde el dispositivo (Argentina no tiene API pública del 911).
- Política de **no resolver automáticamente** — siempre revisión humana.
- Retención 10 años.
- Falsos positivos: documentar, no penalizar al pasajero a menos que sean recurrentes.

## Acceptance criteria

- [ ] Los 9 documentos existen, en español, con disclaimer de revisión legal.
- [ ] Cada documento tiene estructura clara con TOC, fechas, versionado.
- [ ] No hay claims que no se puedan respaldar (ej. "100% seguro", "encriptación militar"). Tono mesurado.
- [ ] Referencias cruzadas entre docs funcionan (links relativos).
- [ ] Commit `docs(legal): drafts of privacy, terms, AAIP, retention, IR, DPA, SOS`.

## Notas

- **No fingir ser abogado.** Estos son borradores técnicos. La instrucción al lector debe ser clara: revisión legal obligatoria.
- **El cliente es una agencia chica** — el papelerío debe ser comprensible para que ellos lo discutan con su contador/abogado.
- **Idioma:** español neutro-rioplatense, voseo cuando se dirige al usuario; tercera persona en clausulado formal.
- **Versionado:** cada doc arriba: `Versión: 0.1.0 — 2026-04-26`.

## Out of scope

- Implementación técnica de los flujos de consentimiento (Tandas 3-4).
- Implementación de la purga (Tanda 3D Edge Functions + cron).
- KYC técnico (Tanda 5D).
