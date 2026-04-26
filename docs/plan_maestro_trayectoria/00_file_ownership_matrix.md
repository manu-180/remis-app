# File Ownership Matrix

> Esta matriz define **qué archivos puede tocar cada prompt** dentro de cada tanda. Si un prompt necesita leer algo de fuera de su zona, lo hace **read-only**. La regla previene merge conflicts cuando varias sesiones de Sonnet corren en paralelo.

**Convención de columnas:**
- ✍️ = puede crear/editar
- 👁️ = solo lectura (referencia)
- 🚫 = no toca

---

## Tanda 0 — Fundación (1 sesión secuencial)

| Path | 0A |
|------|----|
| `/` (root configs) | ✍️ |
| `pnpm-workspace.yaml`, `turbo.json`, `package.json`, `.gitignore`, `.editorconfig`, `.nvmrc` | ✍️ |
| `apps/`, `packages/`, `supabase/` (carpetas vacías + `.gitkeep`) | ✍️ |
| `README.md` raíz | ✍️ |
| `.github/workflows/lint.yml` (smoke check) | ✍️ |
| `docs/plan_maestro_trayectoria/` | 🚫 (ya existe) |

---

## Tanda 1 — Backend + Design System (4 paralelos)

| Path | 1A Schema | 1B DS | 1C Compliance | 1D Brand |
|------|-----------|-------|---------------|----------|
| `supabase/migrations/**` | ✍️ | 🚫 | 🚫 | 🚫 |
| `supabase/seed.sql` | ✍️ | 🚫 | 🚫 | 🚫 |
| `supabase/functions/_shared/types.ts` | ✍️ (stub) | 🚫 | 🚫 | 🚫 |
| `supabase/config.toml` | ✍️ | 🚫 | 🚫 | 🚫 |
| `packages/shared-types/` | ✍️ (gen output) | 🚫 | 🚫 | 🚫 |
| `packages/design-system/tokens.json` | 🚫 | ✍️ | 🚫 | 👁️ |
| `packages/design-system/build/**` | 🚫 | ✍️ | 🚫 | 🚫 |
| `packages/design-system/src/**` | 🚫 | ✍️ | 🚫 | 🚫 |
| `packages/design-system/package.json` | 🚫 | ✍️ | 🚫 | 🚫 |
| `docs/legal/` | 🚫 | 🚫 | ✍️ | 🚫 |
| `docs/legal/privacy_policy.md` | 🚫 | 🚫 | ✍️ | 🚫 |
| `docs/legal/terms.md` | 🚫 | 🚫 | ✍️ | 🚫 |
| `docs/legal/aaip_registration.md` | 🚫 | 🚫 | ✍️ | 🚫 |
| `docs/legal/municipal_compliance.md` | 🚫 | 🚫 | ✍️ | 🚫 |
| `docs/legal/data_retention.md` | 🚫 | 🚫 | ✍️ | 🚫 |
| `docs/brand/` | 🚫 | 👁️ | 🚫 | ✍️ |
| `docs/brand/voice_tone.md`, `naming.md`, `logo_brief.md`, `assets/` | 🚫 | 🚫 | 🚫 | ✍️ |
| `docs/plan_maestro_trayectoria/00_*.md` | 👁️ | 👁️ | 👁️ | 👁️ |

**Regla crítica:** 1A no toca tokens, 1B no toca migrations. 1C escribe solo en `docs/legal/`. 1D escribe solo en `docs/brand/`.

---

## Tanda 2 — Skeletons (4 paralelos)

| Path | 2A Driver | 2B Passenger | 2C Dispatcher | 2D Web/Admin |
|------|-----------|--------------|---------------|--------------|
| `apps/driver/**` | ✍️ | 🚫 | 🚫 | 🚫 |
| `apps/passenger/**` | 🚫 | ✍️ | 🚫 | 🚫 |
| `apps/dispatcher/**` | 🚫 | 🚫 | ✍️ | 🚫 |
| `apps/web/**` | 🚫 | 🚫 | 🚫 | ✍️ |
| `packages/flutter-core/**` | ✍️ (con coordinación)¹ | ✍️ (con coordinación)¹ | 🚫 | 🚫 |
| `packages/design-system/**` | 👁️ | 👁️ | 👁️ | 👁️ |
| `packages/shared-types/**` | 👁️ | 👁️ | 👁️ | 👁️ |
| `supabase/**` | 👁️ | 👁️ | 👁️ | 👁️ |

¹ **Solución para `flutter-core`:** 2A escribe `packages/flutter-core/lib/{auth,supabase_client,result,errors}/**`; 2B escribe `packages/flutter-core/lib/{location_utils,time_utils}/**`. NO superpuestos. Si surge conflicto, prevalece 2A (driver es el más crítico) y 2B abre PR siguiendo lo de 2A.

---

## Tanda 3 — Core features (4 paralelos)

| Path | 3A Driver | 3B Passenger | 3C Dispatcher | 3D Edge Fns |
|------|-----------|--------------|---------------|-------------|
| `apps/driver/lib/features/**` | ✍️ | 🚫 | 🚫 | 🚫 |
| `apps/passenger/lib/features/**` | 🚫 | ✍️ | 🚫 | 🚫 |
| `apps/dispatcher/src/features/**` | 🚫 | 🚫 | ✍️ | 🚫 |
| `apps/dispatcher/src/app/(dashboard)/**` | 🚫 | 🚫 | ✍️ | 🚫 |
| `supabase/functions/**` (todos los handlers) | 🚫 | 🚫 | 🚫 | ✍️ |
| `supabase/migrations/**` | 🚫 | 🚫 | 🚫 | ✍️ (solo si necesita policies/RPC nuevas para Edge Fns) |
| `packages/flutter-core/**` | 👁️ | 👁️ | 🚫 | 🚫 |

---

## Tanda 4 — Premium polish (4 paralelos)

| Path | 4A Driver UX | 4B Passenger UX | 4C Dispatcher UX | 4D MP E2E |
|------|--------------|-----------------|------------------|-----------|
| `apps/driver/lib/features/**` (animations, micro-int) | ✍️ | 🚫 | 🚫 | 🚫 |
| `apps/driver/lib/shared/widgets/**` | ✍️ | 🚫 | 🚫 | 🚫 |
| `apps/passenger/lib/features/**` | 🚫 | ✍️ | 🚫 | 🚫 |
| `apps/passenger/lib/shared/widgets/**` | 🚫 | ✍️ | 🚫 | 🚫 |
| `apps/dispatcher/src/features/**` (shortcuts, caller-id, multi-monitor) | 🚫 | 🚫 | ✍️ | 🚫 |
| `apps/dispatcher/src/components/**` | 🚫 | 🚫 | ✍️ | 🚫 |
| `apps/passenger/lib/features/payment/**` | 🚫 | 🚫 (puede tocar 4D si lo coordinan)² | 🚫 | ✍️ |
| `supabase/functions/mp-webhook/**` | 🚫 | 🚫 | 🚫 | ✍️ |
| `supabase/functions/mp-create-preference/**` | 🚫 | 🚫 | 🚫 | ✍️ |

² 4D es el dueño del feature `payment` end-to-end. 4B en pasajero NO toca payment durante esta tanda.

---

## Tanda 5 — Producción (4 paralelos)

| Path | 5A Obs | 5B CI/CD | 5C Tests | 5D Sec/KYC |
|------|--------|----------|----------|------------|
| `apps/*/lib/core/observability/**` (Flutter) | ✍️ | 🚫 | 🚫 | 🚫 |
| `apps/*/src/lib/observability/**` (Next.js) | ✍️ | 🚫 | 🚫 | 🚫 |
| `apps/dispatcher/sentry.*.config.ts`, `instrumentation.ts` | ✍️ | 🚫 | 🚫 | 🚫 |
| `supabase/functions/_shared/observability.ts` | ✍️ | 🚫 | 🚫 | 🚫 |
| `.github/workflows/**` | 🚫 | ✍️ | 🚫 | 🚫 |
| `fastlane/**` | 🚫 | ✍️ | 🚫 | 🚫 |
| `apps/dispatcher/playwright.config.ts`, `apps/dispatcher/tests/e2e/**` | 🚫 | 🚫 | ✍️ | 🚫 |
| `apps/*/test/**` (Flutter unit/widget) | 🚫 | 🚫 | ✍️ | 🚫 |
| `supabase/tests/**` | 🚫 | 🚫 | ✍️ | 🚫 |
| `apps/driver/lib/features/kyc/**`, `apps/dispatcher/src/features/kyc/**` | 🚫 | 🚫 | 🚫 | ✍️ |
| `supabase/functions/kyc-*/**` | 🚫 | 🚫 | 🚫 | ✍️ |
| `docs/security/**` | 🚫 | 🚫 | 🚫 | ✍️ |

---

## Reglas si dos prompts se chocan

1. **Comunicar antes de empezar:** cada agente al iniciar lee este doc y este `README.md` de su tanda.
2. **Si una tarea genuinamente requiere tocar un archivo de otro:** stop. Documentar en `BLOCKERS.md` raíz, comitear el resto, y abrir issue/PR para que el otro agente lo resuelva.
3. **Nunca commitear `node_modules/`, `.dart_tool/`, `build/`, `.next/`** (ver `.gitignore` de Tanda 0).
4. **Si dos agentes editan el mismo archivo accidentalmente** y hay merge conflict: prevalece el de menor letra (1A > 1B; 2A > 2B; etc.). El otro reabre PR rebaseado.
