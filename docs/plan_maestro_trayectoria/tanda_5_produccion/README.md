# Tanda 5 — Producción

**Modo:** 4 prompts en paralelo.
**Duración estimada:** 8-12 horas cada sesión.
**Prerequisitos:** Tanda 4 completa (todo funciona y se siente premium).
**Salida:** la app está lista para **operación real con clientes pagantes**: observabilidad robusta, CI/CD que no te deja romper prod, suite de tests cubriendo los flujos críticos, KYC + seguridad operativa.

## Filosofía

> "Si no podés ver lo que pasa, no podés operar." Producción no es "deploy y rezar" — es saber exactamente qué está roto, antes que el cliente. Esta tanda es la diferencia entre "demo bonito" y "negocio que factura".

## Prompts paralelos

| ID | Archivo | Output |
|----|---------|--------|
| 5A | `prompt_5A_observability.md` | Sentry + PostHog + dashboards de heartbeat + alertas operativas |
| 5B | `prompt_5B_cicd.md` | GHA workflows completos: lint, tests, deploys (Vercel + Supabase + Fastlane stores) |
| 5C | `prompt_5C_testing.md` | Suite de tests: unit (lógica), widget (Flutter), E2E Playwright, pgTAP DB |
| 5D | `prompt_5D_security_kyc.md` | KYC (Didit + Rekognition), masked calling Twilio Proxy, security hardening |

## File ownership

Ver `00_file_ownership_matrix.md`. Los 4 son completamente disjuntos — cada uno toca capas distintas.

## Cierre

- Tag `tanda-5-done`.
- Antes del lanzamiento: checklist `docs/operations/launch_checklist.md` (parte de Tanda 5A).
- Reunión presencial municipio (de `docs/legal/municipal_compliance.md`).
- Inscripción AAIP confirmada.
- Soft-launch con 2-3 conductores y 5-10 pasajeros conocidos por 2 semanas.
- Ramp-up.

## Hand-off al cliente

Producir `docs/operations/`:
- `runbook.md` — qué hacer cuando X.
- `launch_checklist.md` — pre-launch + post-launch monitoring.
- `support_playbook.md` — flujos típicos de soporte.
- `admin_guide.md` — tutorial para el dueño.
- `dispatcher_guide.md` — tutorial para el despachante.
- `driver_guide.md` — tutorial para conductor (vídeo + PDF).
