# Documentacion Legal — remis_app

**Version: 0.1.0 — 2026-04-26**

> **Aviso legal:** Este documento es un borrador tecnico-operativo. Debe ser revisado por un abogado matriculado en La Pampa antes de su publicacion.

---

## Tabla de contenidos

1. [Indice de documentos](#indice-de-documentos)
2. [Estado de cada documento](#estado-de-cada-documento)
3. [Matriz: donde se muestra cada documento](#matriz-donde-se-muestra-cada-documento)
4. [Proximos pasos](#proximos-pasos)

---

## Indice de documentos

| # | Archivo | Descripcion |
|---|---------|-------------|
| 1 | [privacy_policy.md](./privacy_policy.md) | Politica de Privacidad (Ley 25.326) |
| 2 | [terms.md](./terms.md) | Terminos y Condiciones (pasajeros y conductores) |
| 3 | [aaip_registration.md](./aaip_registration.md) | Plan de inscripcion RNBD/AAIP |
| 4 | [municipal_compliance.md](./municipal_compliance.md) | Checklist de cumplimiento municipal |
| 5 | [data_retention.md](./data_retention.md) | Politica de retencion y purga de datos |
| 6 | [incident_response.md](./incident_response.md) | Plan de respuesta a incidentes |
| 7 | [consent_flows.md](./consent_flows.md) | Flujos de consentimiento (copys exactos) |
| 8 | [dpa_template.md](./dpa_template.md) | Acuerdo de Procesamiento de Datos (DPA) |
| 9 | [sos_protocol.md](./sos_protocol.md) | Protocolo operativo del boton SOS |

---

## Estado de cada documento

| Documento | Estado | Fecha revision | Responsable | Observaciones |
|-----------|--------|----------------|-------------|---------------|
| privacy_policy.md | Borrador | — | [ABOGADO] | Pendiente revision legal |
| terms.md | Borrador | — | [ABOGADO] | Pendiente revision legal |
| aaip_registration.md | Borrador | — | [ABOGADO] | Requiere tramite ante AAIP |
| municipal_compliance.md | Borrador | — | [AGENCIA] | Verificar con municipio local |
| data_retention.md | Borrador | — | [DEV + ABOGADO] | Requiere implementacion tecnica |
| incident_response.md | Borrador | — | [DEV + AGENCIA] | Requiere simulacro |
| consent_flows.md | Borrador | — | [DEV + ABOGADO] | Requiere implementacion en app |
| dpa_template.md | Borrador | — | [ABOGADO] | Firmar antes del lanzamiento |
| sos_protocol.md | Borrador | — | [DEV + AGENCIA] | Requiere prueba en staging |

**Estados posibles:** Borrador / En revision legal / Aprobado / Publicado

---

## Matriz: donde se muestra cada documento

La siguiente tabla indica en que punto de contacto debe estar disponible (visible o firmado) cada documento.

| Documento | App pasajero | Panel dispatcher | Web publica | Contrato con la agencia | Contrato con conductor |
|-----------|:------------:|:----------------:|:-----------:|:-----------------------:|:----------------------:|
| privacy_policy.md | Al registrarse (link + aceptar) | Link en pie de pantalla | Link en footer | Adjunto | Adjunto |
| terms.md (Seccion A — Pasajero) | Al registrarse (link + aceptar) | — | Link en footer | Adjunto | — |
| terms.md (Seccion B — Conductor) | — | Al registrarse | — | — | Firma obligatoria |
| aaip_registration.md | — | — | — | Adjunto (numero RNBD) | — |
| municipal_compliance.md | — | — | — | Adjunto | Adjunto (requisitos del conductor) |
| data_retention.md | Link desde privacy_policy | Link desde privacy_policy | Link desde privacy_policy | Adjunto | Adjunto |
| incident_response.md | — | Accesible en panel | — | — | — |
| consent_flows.md | Implementado en pantallas | — | Banner cookies | — | Firma digital en onboarding |
| dpa_template.md | — | — | — | Firma obligatoria | — |
| sos_protocol.md | UX del boton | Visible en panel | — | Adjunto | Firmado en onboarding |

### Notas sobre la matriz

- **App pasajero:** lo que ve el usuario final de la app Flutter.
- **Panel dispatcher:** lo que ve el despachante en el panel web (Next.js).
- **Web publica:** landing page publica del servicio.
- **Contrato con la agencia:** documento firmado entre la empresa de desarrollo y la agencia remisera.
- **Contrato con conductor:** documento firmado entre la agencia y cada conductor habilitado.

---

## Proximos pasos

1. Revisar todos los documentos con el abogado matriculado en La Pampa antes de cualquier lanzamiento.
2. Completar todos los placeholders marcados como `[NOMBRE AGENCIA]`, `[CUIT]`, `[DOMICILIO]`, etc.
3. Tramitar la inscripcion RNBD ante la AAIP (ver [aaip_registration.md](./aaip_registration.md)).
4. Obtener copia firmada de la ordenanza municipal vigente (ver [municipal_compliance.md](./municipal_compliance.md)).
5. Firmar el DPA entre la agencia y la empresa de desarrollo antes del lanzamiento (ver [dpa_template.md](./dpa_template.md)).
6. Implementar en la app los flujos de consentimiento descritos en [consent_flows.md](./consent_flows.md).
7. Realizar un simulacro del plan de incidentes (ver [incident_response.md](./incident_response.md)).
8. Programar revision anual de todos los documentos.

---

*Este indice debe actualizarse cada vez que un documento cambie de estado o se agregue un nuevo documento.*
