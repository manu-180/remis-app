# Variables de entorno

Sistema unificado para todo el monorepo. **Una sola fuente de verdad** (`.env` en la raíz) que alimenta a todas las apps.

## Quick start

```bash
# 1. Copiar template y completar valores reales
cp .env.example .env

# 2. Editar .env con tus valores (Supabase URL/anon key, etc.)

# 3. Generar archivos derivados para todas las apps
pnpm env:sync
```

Listo. Ahora podés:
- Apretar **Play** en Cursor/VSCode (Run and Debug → driver / passenger)
- Correr `pnpm dev` para los Next.js (web + dispatcher)
- Lanzar manualmente: `flutter run --dart-define-from-file=../../packages/flutter-core/env/dev.json`

## Cómo funciona

```
.env  (raíz, gitignored)
   │
   ├──> packages/flutter-core/env/dev.json    ──> driver (Flutter), passenger (Flutter)
   ├──> apps/web/.env.local                   ──> web (Next.js)
   └──> apps/dispatcher/.env.local            ──> dispatcher (Next.js)
```

`scripts/sync-env.mjs` lee `.env` y escribe los formatos que cada app entiende:
- **Flutter** consume JSON via `--dart-define-from-file`
- **Next.js** consume `.env.local` automáticamente

## Múltiples entornos

| Archivo                | Cuándo usarlo                              | Genera                                        |
| ---------------------- | ------------------------------------------ | --------------------------------------------- |
| `.env`                 | Default (dev local con `supabase start`)   | `dev.json` + `apps/*/web/.env.local`          |
| `.env.local`           | Overrides personales sobre `.env`          | (se mergea sobre `.env`)                      |
| `.env.staging`         | Apuntar staging al cloud                   | `stg.json`                                    |
| `.env.production`      | Apuntar prod al cloud                      | `prd.json`                                    |

Todos están en `.gitignore`. Solo se commitean los `.env.example`.

## Comandos

```bash
pnpm env:sync          # genera todo lo posible (dev + stg + prd si existen)
pnpm env:sync -- --env dev    # solo dev
pnpm env:check         # valida sin escribir (útil en CI)
```

## Seguridad

✅ Lo que está protegido:
- `.env`, `.env.local`, `.env.staging`, `.env.production` → **gitignored**
- `packages/flutter-core/env/dev.json` (y stg/prd) → **gitignored** (son generados con valores reales)
- `apps/*/.env.local` → **gitignored**

✅ Lo que sí se commitea:
- `.env.example` (raíz) → plantilla con placeholders
- `packages/flutter-core/env/*.example.json` → plantillas
- `scripts/sync-env.mjs` → el generador
- `.vscode/launch.json` y `.vscode/tasks.json` → config compartida del Play button

## Agregar una variable nueva

1. Agregarla en `.env.example` (con placeholder) y en tu `.env` (con valor real)
2. En `scripts/sync-env.mjs`:
   - Si la usa Flutter → agregarla en `writeJson()`
   - Si la usa Next.js → agregarla en `writeNextEnv()` (con prefijo `NEXT_PUBLIC_` si va al cliente)
3. En Flutter: agregar el getter en `packages/flutter-core/lib/env/env.dart`
4. En Next.js: agregar al schema zod en `apps/web/src/lib/env.ts` (o dispatcher)
5. Correr `pnpm env:sync`

## Troubleshooting

**"SUPABASE_URL is empty"** al apretar Play
→ Falta el `.env` o `pnpm env:sync` no corrió. El `preLaunchTask` de `.vscode/launch.json` debería resolverlo automáticamente. Si no, correlo a mano: `pnpm env:sync`.

**"Faltan variables requeridas"** al correr sync
→ El script valida que `SUPABASE_URL` y `SUPABASE_ANON_KEY` estén presentes. Editar el `.env` y volver a correr.

**Cambié el `.env` y la app no toma los cambios**
→ Flutter solo lee el JSON al arrancar. Reiniciar la app (no hot reload).
