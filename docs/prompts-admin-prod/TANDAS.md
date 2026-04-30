# Tandas de ejecución — Cuáles podés tirar en paralelo

Análisis de dependencias entre los 12 prompts, agrupados en **5 tandas**. Dentro de cada tanda los prompts NO comparten archivos (o si comparten son edits independientes) — los podés tirar en sesiones distintas al mismo tiempo.

Entre tandas hay dependencias reales: si saltás el orden, dos sesiones van a chocar editando los mismos archivos.

---

## 🔢 Resumen

| Tanda | Prompts | Paralelismo | Tiempo wall-clock |
|-------|---------|-------------|-------------------|
| **1** | `00` | Solo (no paralelizable) | 1.5h |
| **2** | `01` + `02` + `04` + `08` | 4 sesiones paralelas | ~2h |
| **3** | `03` + `06` + `11` | 3 sesiones paralelas | ~2h |
| **4** | `05` + `07` + `09` + `10` | 4 sesiones paralelas | ~2h |
| **5** | `12` | Solo (no paralelizable) | 2h |

**Total wall-clock con paralelismo:** ~9.5h
**Total secuencial:** ~20h

Ahorro real si los podés tirar en paralelo: **~50%**.

---

## Tanda 1 — Foundation cleanup

### `00-purgar-placeholders.md` (solo)

**Por qué solo:** toca muchos archivos a la vez (login, settings, team, dashboard, sidebar, kyc tab, drivers-list, rides-list, etc). Es un barrido de cleanup que prepara el terreno para todo lo demás. Cualquier otro prompt que se cruce con esto va a chocar.

**Hasta no terminar este, no arranques con nada más.**

---

## Tanda 2 — Independientes "low-conflict" (4 paralelos)

Después de `00`, podés tirar estos 4 al mismo tiempo en sesiones separadas:

### `01-error-loading-not-found.md`
- Mayormente **archivos nuevos**: `error.tsx`, `loading.tsx`, `not-found.tsx`, `instrumentation.ts`.
- Toca `use-supabase-query.ts` y `use-dashboard-kpis.ts` solo para agregar `Sentry.captureException` (líneas nuevas, no choca).

### `02-robustez-validacion.md`
- Crea utils nuevos: `lib/validation.ts`, `lib/postgrest-safe.ts`.
- Toca `[id]/page.tsx` server components, `env.ts`, `/api/health/route.ts`, filtros `.or()` de drivers-list y rides-list.
- No comparte archivo con 01, 04 ni 08.

### `04-team-invite-real.md`
- **Edge function nueva** `admin-invite-staff/`.
- Página nueva `/auth/accept-invite`.
- Toca `team-client.tsx` (que `00` ya dejó pulido).
- No comparte archivo con 01, 02 ni 08.

### `08-sos-mapa-acciones.md`
- Migración SQL nueva (columnas `dispatched_at`, `dispatched_by`).
- Edge function nueva `notify-sos-contacts/`.
- Toca solo páginas SOS (`sos-list-client`, `sos-detail-client`).
- No comparte archivo con 01, 02 ni 04.

---

## Tanda 3 — Restauración + paralelos limpios (3 paralelos)

Después de tanda 2, tirar estos 3 al mismo tiempo:

### `03-export-csv-real.md`
- Reactiva el botón export que `00` ocultó.
- Crea utils nuevos (`lib/export-csv.ts`, hook).
- Toca `rides-list`, `drivers-list`, `passengers-client`, `payments-client` (solo el botón export).
- **Necesita** que `02` haya pasado: usa `escapeOrFilter` de `lib/postgrest-safe.ts`.

### `06-dashboard-period-clickable.md`
- Toca `dashboard-client.tsx`, `use-dashboard-kpis.ts`, `top-drivers.tsx`, `activity-feed.tsx`, `rides-sparkline.tsx`.
- **Necesita** que `01` haya pasado en `use-dashboard-kpis.ts` (los `.catch` con captura a Sentry). El edit de `06` se monta encima sin pisarlo.
- No comparte archivo con 03 ni 11.

### `11-shared-trip-mapa.md`
- Migración del RPC `get_shared_trip` (extiende return).
- Reescribe `shared/[token]/page.tsx` y crea `shared-trip-client.tsx`.
- Página nueva `/shared/[token]/expired`.
- No comparte archivo con 03 ni 06.

**Por qué `07` no va acá:** `07` toca `rides-list-client.tsx` (KPI fix) que `03` también toca (botón export). Para evitar choque, `07` va en tanda 4.

---

## Tanda 4 — Cross-cutting (4 paralelos)

Después de tanda 3, tirar estos 4 al mismo tiempo:

### `05-password-2fa.md`
- Toca `settings-client.tsx` (que `00` cleó) + `login/page.tsx` (que `00` también modificó).
- Por estar después de `00` no hay choque.
- No comparte archivo con 07, 09 ni 10.

### `07-rides-detalle-completo.md`
- Toca `ride-detail-client.tsx` y `rides-list-client.tsx` (solo el KPI "T. prom. asignación").
- `rides-list` ya pasó por `00`, `02` y `03` — los edits se apilan sin chocar.
- No comparte archivo con 05, 09 ni 10.

### `09-paginacion-perf-build.md`
- `package.json` (raíz + dispatcher), `next.config.ts`.
- `payments-client.tsx` (paginate) y `audit-client.tsx` (paginate).
- `payments-client` ya pasó por `03` — el edit de paginación es independiente del botón export.
- No comparte archivo con 05, 07 ni 10.

### `10-security-pii-observability.md`
- Configs Sentry / PostHog (`sentry.client.config.ts`, `posthog.ts`).
- `middleware.ts` (auth check).
- `env.ts` (audit NEXT_PUBLIC) — ya pasó por `02`, los edits se apilan.
- `use-supabase-query.ts` (enriquece capture) — ya pasó por `01`, edits se apilan.
- `shared/[token]/page.tsx` (capture errors RPC) — ya pasó por `11`, edits se apilan.
- No comparte archivo con 05, 07 ni 09.

---

## Tanda 5 — Polish final

### `12-polish-final-a11y.md` (solo)

**Por qué solo:** toca muchos archivos para a11y, microcopy, confirms, focus rings. Si esto corre en paralelo con cualquier otro, es lío seguro.

Tiene que correr **al final**, después de que todos los demás archivos estén en su forma definitiva.

---

## Cómo ejecutar una tanda paralela

Si tenés 4 sesiones de Claude Code abiertas:
1. Pegá el prompt 01 en sesión A.
2. Pegá el prompt 02 en sesión B.
3. Pegá el prompt 04 en sesión C.
4. Pegá el prompt 08 en sesión D.

Cada sesión hace `git add` + `git commit` + `git push` cuando termina. Si dos sesiones intentan pushear al mismo tiempo, una va a fallar con "non-fast-forward". Solución: la que falla hace `git pull --rebase origin main && git push`. Como editan archivos diferentes, no hay merge conflict real.

**Si no querés correr el riesgo de races con git**, hacelos secuenciales dentro de la tanda pero saltando entre ellos:
1. Sesión A arranca prompt 01, queda trabajando.
2. Vos abrís sesión B con prompt 02, queda trabajando.
3. Etc.
4. Cada uno commitea cuando termina, sin coordinarse.

Como los archivos NO se cruzan dentro de la tanda, los commits se aplican uno tras otro sin conflictos.

---

## Cosas a tener en cuenta

1. **Verificá entre tandas** que `pnpm typecheck` y `pnpm lint` están limpios antes de arrancar la siguiente. Si una tanda dejó algo roto, el chequeo te ahorra debugging crónico.

2. **Pull antes de cada sesión nueva.** `git pull origin main` para empezar con la última versión.

3. **Si una sesión falla**, no bloquea las otras de la misma tanda — los archivos son distintos. Reintentá esa sesión cuando puedas.

4. **No te apures con la tanda 5.** El prompt 12 (polish) tiene que ver con detalles finales y se beneficia de que todo lo demás esté **completo y commiteado**. Resistí la tentación de meterlo en paralelo con el resto.

5. **Dentro de cada prompt, igualmente seguí las reglas del proyecto:**
   - `main` directo, sin branches ni worktrees.
   - `git push` después de cada commit.
   - `pnpm typecheck && pnpm lint` antes de commitear.
