# Remis App

App single-tenant para una **remisería** del área 2954 (Santa Rosa, La Pampa). Cubre las tres puntas del servicio: pasajero, conductor y despachante. Está regulada por ordenanza municipal — **no es un Uber-clone**: la asignación es manual, la tarifa es fija por zona, y todo viaje arranca por la agencia.

> Plan maestro y decisiones técnicas: [`docs/plan_maestro_trayectoria/`](./docs/plan_maestro_trayectoria/).

---

## Stack

| Capa                             | Tecnología                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| Apps mobile (driver + passenger) | **Flutter** + Riverpod 2 (code-gen) + go_router                                     |
| Panel despachante                | **Next.js 15** (App Router) + TailwindCSS v4 + shadcn/ui                            |
| Landing + admin del dueño        | **Next.js 15** (App Router)                                                         |
| Backend                          | **Supabase** (Postgres + PostGIS + Auth + Realtime + Storage + Edge Functions Deno) |
| Mapas                            | Google Maps (mobile) · MapLibre GL (web)                                            |
| Pagos                            | MercadoPago Checkout Pro                                                            |
| Push                             | FCM                                                                                 |
| Observabilidad                   | Sentry · PostHog                                                                    |

---

## Estructura

```
remis_app/
├── apps/
│   ├── driver/           # Flutter — app del conductor
│   ├── passenger/        # Flutter — app del pasajero
│   ├── dispatcher/       # Next.js — panel del despachante
│   └── web/              # Next.js — landing + admin del dueño
├── packages/
│   ├── design-system/    # tokens.json + outputs (css/ts/dart)
│   ├── shared-types/     # tipos TS compartidos (DB schema, contratos)
│   ├── flutter-core/     # Dart package compartido entre driver+passenger
│   └── eslint-config/    # config ESLint compartida
├── supabase/
│   ├── migrations/       # SQL versionadas (forward-only)
│   ├── functions/        # Edge Functions (Deno)
│   └── seed.sql
├── docs/
│   └── plan_maestro_trayectoria/   # plan de obra + decisiones cerradas
├── .github/
│   └── workflows/
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

`apps/driver` y `apps/passenger` (Flutter) **no están en el workspace pnpm** — usan su propio `pubspec.yaml`. Solo los proyectos JS/TS están bajo `pnpm` + `turbo`.

---

## Setup

### Requisitos

- **Node** ≥ 20.11 (`nvm use` lee el `.nvmrc`)
- **pnpm** 9.15.0 (`corepack enable` ya lo deja listo)
- **Flutter** ≥ 3.27 (estable)
- **Deno** ≥ 1.45 (para Edge Functions)
- **Supabase CLI** ≥ 1.200

### Instalación

```bash
# desde la raíz del repo
corepack enable
pnpm install
```

### Comandos raíz

```bash
pnpm dev           # turbo run dev  — todos los apps en dev (los Flutter quedan afuera)
pnpm build         # turbo run build
pnpm lint          # turbo run lint
pnpm typecheck     # turbo run typecheck
pnpm test          # turbo run test
pnpm format        # prettier --write
pnpm format:check  # CI usa esto
```

---

## Convenciones

- **Idioma del código:** inglés (variables, funciones, tipos, comentarios técnicos).
- **Idioma de UI:** español rioplatense con voseo (`querés`, `tu viaje`).
- **Idioma de docs/comentarios de negocio:** español.
- **Commits:** [Conventional Commits](./.github/COMMIT_CONVENTION.md) en inglés.
- **Branches:** `tanda-N/<scope>-<short-desc>` (ej. `tanda-2/driver-skeleton`).
- **TypeScript:** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- **Dart:** `dart format` con line length 100.
- **Migraciones:** forward-only, nunca `DROP TABLE` en producción — soft deletes.

---

## Plan de obra

El proyecto se construye en **6 tandas** secuenciales, con prompts paralelos dentro de cada una. Detalle completo en [`docs/plan_maestro_trayectoria/README.md`](./docs/plan_maestro_trayectoria/README.md).

| Tanda | Salida principal                                                          |
| ----- | ------------------------------------------------------------------------- |
| 0     | Fundación del monorepo (este commit)                                      |
| 1     | Schema DB + design tokens + brand kit + compliance                        |
| 2     | Skeletons de las 4 apps booteables                                        |
| 3     | Core features (GPS background, request ride, asignación manual, edge fns) |
| 4     | Premium polish (animaciones, shortcuts, MP end-to-end)                    |
| 5     | Producción (observability, CI/CD, tests, KYC)                             |

---

## Documentación clave

- [`00_arquitectura.md`](./docs/plan_maestro_trayectoria/00_arquitectura.md) — decisiones técnicas cerradas.
- [`00_design_language.md`](./docs/plan_maestro_trayectoria/00_design_language.md) — biblia visual ("Premium Pampeano").
- [`00_file_ownership_matrix.md`](./docs/plan_maestro_trayectoria/00_file_ownership_matrix.md) — qué archivos toca cada prompt.

---

## Licencia

Privado — propiedad de la agencia contratante. No redistribuir.
