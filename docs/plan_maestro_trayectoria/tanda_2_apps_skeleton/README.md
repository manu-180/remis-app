# Tanda 2 — Skeletons de las 4 apps

**Modo:** 4 prompts en paralelo.
**Duración estimada:** 3-6 horas cada sesión.
**Prerequisitos:** Tanda 1 completa (DS package + types disponibles).
**Salida:** las 4 apps booteables, navegando entre 3-5 pantallas placeholder, con auth Supabase funcional, tema aplicado, sin lógica de negocio.

## Prompts paralelos

| ID | Archivo | Output |
|----|---------|--------|
| 2A | `prompt_2A_driver_skeleton.md` | `apps/driver/` Flutter booteable, login, home stub |
| 2B | `prompt_2B_passenger_skeleton.md` | `apps/passenger/` Flutter booteable, login, home stub |
| 2C | `prompt_2C_dispatcher_skeleton.md` | `apps/dispatcher/` Next.js 15 booteable, login, layout 3 cols vacío |
| 2D | `prompt_2D_web_skeleton.md` | `apps/web/` Next.js 15 booteable, landing + admin stub |

## Coordinación crítica — `packages/flutter-core`

2A y 2B comparten `packages/flutter-core`. Reparto **estricto**:
- **2A escribe**: `auth/`, `supabase_client/`, `result/`, `errors/`, `logger/`, `env/`.
- **2B escribe**: `location_utils/`, `time_utils/`, `phone_utils/`, `currency_format/`.
- Si 2B necesita algo de `auth/` o `supabase_client/`, lo importa read-only — si no existe aún, espera y mientras avanza con sus pantallas usando un mock.

## Acceptance común

- Cada app: `pnpm dev` (web) / `flutter run` (mobile) levanta sin errores.
- Login con Supabase pasa.
- Tema light + dark aplicado correctamente desde el design system.
- Routing entre 3-5 pantallas mock funciona.
- `pnpm typecheck` (web) / `flutter analyze` (mobile) sin warnings.

## Cierre

Tag `tanda-2-done` después de los 4 merges.
