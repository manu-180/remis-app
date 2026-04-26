# Prompt 0A — Bootstrap del monorepo

> **LEÉ PRIMERO:** `docs/plan_maestro_trayectoria/README.md`, `00_arquitectura.md` (sección 1), `00_file_ownership_matrix.md`.

## Objetivo

Dejar el repositorio listo para que 4 sesiones paralelas (Tanda 1) puedan correr sin chocarse. Esto significa: estructura de carpetas creada, tooling raíz configurado, `.gitignore` cubre los artefactos de las 3 tecnologías (Node, Flutter, Supabase), CI mínimo de smoke check.

## File ownership

✍️ Todo lo definido en `00_file_ownership_matrix.md` para Tanda 0A. **NO** crear contenido dentro de `apps/`, `packages/`, `supabase/migrations/`, `supabase/functions/` — solo `.gitkeep`.

## Steps

### 1. `package.json` raíz

```json
{
  "name": "remis-app",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=20.11" },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md,yml}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md,yml}\""
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "prettier": "^3.4.0",
    "typescript": "^5.7.0"
  }
}
```

### 2. `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/dispatcher"
  - "apps/web"
  - "packages/*"
```

(`apps/driver` y `apps/passenger` son Flutter, no entran al workspace pnpm.)

### 3. `turbo.json`

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**", "build/**"] },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

### 4. `.gitignore` (raíz)

Cubrir Node, Next.js, Flutter, Supabase, IDE, OS:

```gitignore
# deps
node_modules/
.pnpm-store/

# Next / Vercel
.next/
out/
.vercel/

# build outputs
dist/
build/
.turbo/

# Flutter
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
.pub/
**/*.g.dart  # comentar después si se prefiere commitear gen code
**/*.freezed.dart
**/ios/Pods/
**/ios/Flutter/Flutter.framework/
**/ios/Flutter/Flutter.podspec
**/android/.gradle/
**/android/app/build/

# Supabase
supabase/.branches/
supabase/.temp/
supabase/.env
supabase/.env.local

# secrets
.env
.env.local
.env.*.local
*.pem
*.key

# IDE
.idea/
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
```

### 5. `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.dart]
indent_size = 2
max_line_length = 100

[*.{md,yml,yaml}]
trim_trailing_whitespace = false
```

### 6. `.nvmrc`

```
20.11.1
```

### 7. `.prettierrc.json`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

(El plugin de tailwind se instalará cuando los apps Next.js existan; agregarlo a devDeps raíz como peer-friendly.)

### 8. `.prettierignore`

```
**/.next/**
**/dist/**
**/build/**
**/node_modules/**
**/.dart_tool/**
**/ios/Pods/**
**/android/.gradle/**
pnpm-lock.yaml
```

### 9. Scaffolding de carpetas (con `.gitkeep`)

Crear:
- `apps/.gitkeep`
- `packages/.gitkeep`
- `supabase/.gitkeep`
- `supabase/migrations/.gitkeep`
- `supabase/functions/.gitkeep`
- `.github/workflows/.gitkeep`

### 10. CI smoke check — `.github/workflows/lint.yml`

```yaml
name: Lint
on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.15.0 }
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
```

### 11. `README.md` raíz

Versión corta — la doc completa vive en `docs/plan_maestro_trayectoria/`. Debe incluir:
- 1 párrafo de qué es el proyecto.
- Stack en bullets.
- Cómo instalar (`pnpm install`).
- Link al plan maestro.
- Estructura de carpetas en árbol.
- Convenciones (commit, branch, idioma).

### 12. VS Code recomendado — `.vscode/extensions.json`

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "Dart-Code.dart-code",
    "Dart-Code.flutter",
    "denoland.vscode-deno",
    "Supabase.vscode-supabase-extension"
  ]
}
```

### 13. `.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "deno.enablePaths": ["supabase/functions"],
  "[dart]": { "editor.defaultFormatter": "Dart-Code.dart-code" },
  "files.eol": "\n"
}
```

### 14. Conventional Commits — `.github/COMMIT_CONVENTION.md`

Breve guía (5-10 líneas) con ejemplos. Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`, `build`. Scopes preferidos: `driver`, `passenger`, `dispatcher`, `web`, `db`, `edge-fns`, `ds` (design system), `legal`, `tanda-N`.

## Acceptance criteria

- [ ] `pnpm install` corre sin error.
- [ ] `pnpm format:check` pasa.
- [ ] El árbol de archivos coincide con la sección 1 de `00_arquitectura.md`.
- [ ] `git status` no muestra basura (todos los `.gitignore` funcionan).
- [ ] Commit final con `chore(tanda-0): bootstrap monorepo structure`.

## Out of scope

- Crear apps. Las apps son responsabilidad de Tanda 2.
- Crear el design system. Tanda 1B.
- Configurar Supabase CLI. Tanda 1A.
- Configurar Husky/lint-staged. Tanda 5B.

## Notas

- **Windows:** el usuario está en Windows con bash disponible. Usar paths con `/` en scripts; el `.editorconfig` ya fuerza LF.
- **Docs:** todo el plan vive en `docs/plan_maestro_trayectoria/`, NO crear docs adicionales en root.
