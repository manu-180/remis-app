# Tanda 1 — Backend + Design System

**Modo:** 4 prompts en paralelo.
**Duración estimada:** 4-8 horas cada sesión.
**Prerequisitos:** Tanda 0 completa.
**Salida:** schema Supabase listo, design tokens listos, docs legales/brand redactados.

## Prompts paralelos

| ID | Archivo | Owner | Output principal |
|----|---------|-------|------------------|
| 1A | `prompt_1A_supabase_schema.md` | Sesión 1 | `supabase/migrations/`, RLS, RPCs, types generados |
| 1B | `prompt_1B_design_system.md` | Sesión 2 | `packages/design-system/` (tokens.json + outputs CSS/TS/Dart) |
| 1C | `prompt_1C_compliance_legal.md` | Sesión 3 | `docs/legal/` (privacidad, términos, AAIP, ordenanza, retención) |
| 1D | `prompt_1D_brand_assets.md` | Sesión 4 | `docs/brand/` (voz, naming, brief de logo, paleta narrativa) |

## File ownership

Ver `00_file_ownership_matrix.md`. Resumen:
- 1A: `supabase/**`, `packages/shared-types/**`
- 1B: `packages/design-system/**`
- 1C: `docs/legal/**`
- 1D: `docs/brand/**`

**Cero solapamiento.** Si una sesión ve que necesita tocar fuera de su zona, anota en `BLOCKERS.md` y sigue.

## Cierre de tanda

- Cada sesión hace su PR aparte.
- Mergear en orden 1B → 1A → 1D → 1C (1B desbloquea Tandas 2+; 1A bloquea por las migraciones; 1D y 1C son docs).
- Tag `tanda-1-done` después de los 4 merges.
