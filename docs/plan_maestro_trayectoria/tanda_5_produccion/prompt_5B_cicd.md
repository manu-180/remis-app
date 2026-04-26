# Prompt 5B — CI/CD: GitHub Actions, deploys, Fastlane, releases

> **LEÉ:** `00_arquitectura.md` (sec 7), `00_file_ownership_matrix.md` (Tanda 5B).

## Objetivo

Pipeline robusto que: (1) corre lint + typecheck + tests en cada PR, (2) deploya web y dispatcher a Vercel automáticamente, (3) deploya migraciones y Edge Functions a Supabase, (4) sube apps a Play Store y App Store via Fastlane, (5) crea releases tagueadas, (6) bloquea merges si rompe checks. **Nadie puede romper prod a mano.**

## File ownership

✍️ `.github/workflows/**`, `.github/actions/**`, `fastlane/**`, `apps/driver/fastlane/**`, `apps/passenger/fastlane/**`, `scripts/**` (helpers de deploy), `docs/operations/release_process.md`.

## Steps

### 1. Estrategia de branches

- `main` → producción.
- `staging` → entorno staging (Vercel preview project + Supabase staging branch).
- Feature branches → PR a `staging` → merge a `staging` → testing → PR a `main` → merge a `main` → prod.

**Branch protection rules**:
- `main`: requiere status checks (lint, typecheck, test, build), review obligatoria, branches up to date, signed commits opcionales.
- `staging`: requiere checks pero review opcional.

### 2. Workflow `lint.yml` (extender el de Tanda 0)

```yaml
name: Lint
on: { pull_request: {}, push: { branches: [main, staging] } }
jobs:
  lint-js:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.15.0 }
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm -r lint
  
  lint-flutter:
    runs-on: ubuntu-latest
    strategy:
      matrix: { app: [driver, passenger] }
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { channel: stable }
      - run: cd apps/${{ matrix.app }} && flutter pub get && flutter analyze
  
  lint-deno:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v2
      - run: cd supabase/functions && deno lint && deno fmt --check
```

### 3. Workflow `typecheck.yml`

```yaml
name: Typecheck
on: { pull_request: {}, push: { branches: [main, staging] } }
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.15.0 }
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r typecheck
```

### 4. Workflow `test.yml`

```yaml
name: Test
on: { pull_request: {}, push: { branches: [main, staging] } }
jobs:
  test-js:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_PASSWORD: postgres }
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r test
  
  test-flutter:
    runs-on: ubuntu-latest
    strategy: { matrix: { app: [driver, passenger] } }
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - run: cd apps/${{ matrix.app }} && flutter pub get && flutter test
  
  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: cd apps/dispatcher && pnpm playwright install --with-deps chromium
      - run: cd apps/dispatcher && pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: apps/dispatcher/playwright-report/ }
  
  test-pgtap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase db test
```

### 5. Workflow `deploy-supabase.yml`

```yaml
name: Deploy Supabase
on:
  push:
    branches: [main, staging]
    paths: ['supabase/**']
jobs:
  deploy-migrations:
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref ${{ vars.SUPABASE_PROJECT_REF }}
        env: { SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }} }
      - run: supabase db push --linked
      - name: Deploy edge functions
        run: |
          for fn in supabase/functions/*/; do
            name=$(basename "$fn")
            [ "$name" = "_shared" ] && continue
            no_jwt=""
            [ "$name" = "mp-webhook" ] && no_jwt="--no-verify-jwt"
            [ "$name" = "health" ] && no_jwt="--no-verify-jwt"
            supabase functions deploy "$name" $no_jwt
          done
```

Environments separados con `vars.SUPABASE_PROJECT_REF` distinto en `staging` y `production`.

### 6. Workflow `deploy-web.yml` (dispatcher + web)

```yaml
name: Deploy Web (Vercel)
on:
  push:
    branches: [main, staging]
    paths: ['apps/dispatcher/**', 'apps/web/**', 'packages/**']
jobs:
  deploy-dispatcher:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - name: Deploy to Vercel (dispatcher)
        run: |
          npx vercel deploy --prebuilt --prod=${{ github.ref == 'refs/heads/main' }} \
            --token=${{ secrets.VERCEL_TOKEN }} \
            --scope=${{ secrets.VERCEL_ORG_ID }}
        working-directory: apps/dispatcher
  
  deploy-web:
    # análogo
```

Vercel projects ya creados (uno por app) con su `VERCEL_PROJECT_ID` correspondiente.

Variables de entorno: configuradas en Vercel UI por entorno (production / preview / development).

### 7. Fastlane para apps mobile

#### Driver

`apps/driver/android/fastlane/Fastfile`:
```ruby
default_platform(:android)

platform :android do
  desc "Build and deploy to Play Store internal track"
  lane :internal do
    gradle(task: "clean")
    gradle(
      task: "bundleRelease",
      properties: { "android.injected.signing.store.file" => ENV["ANDROID_KEYSTORE_PATH"], ... }
    )
    upload_to_play_store(track: 'internal', skip_upload_apk: true)
  end
  
  lane :production do
    gradle(task: "clean bundleRelease")
    upload_to_play_store(track: 'production', rollout: '0.1') # canary 10%
  end
end
```

`apps/driver/ios/fastlane/Fastfile`:
```ruby
platform :ios do
  lane :testflight_internal do
    setup_ci
    match(type: 'appstore', readonly: true)
    build_app(workspace: "Runner.xcworkspace", scheme: "Runner")
    upload_to_testflight(skip_waiting_for_build_processing: true)
  end
  
  lane :production do
    # análogo + upload_to_app_store
  end
end
```

Match para certificados (recomendado over manual). Repo privado de certs separado.

Mismo patrón para `passenger`.

#### Workflow `deploy-mobile.yml`

```yaml
name: Deploy Mobile
on:
  workflow_dispatch:
    inputs:
      app: { description: 'app', required: true, type: choice, options: [driver, passenger] }
      track: { description: 'track', required: true, type: choice, options: [internal, beta, production] }

jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: 3.2, bundler-cache: true }
      - run: cd apps/${{ inputs.app }} && flutter pub get
      - name: Build & upload
        env:
          PLAY_STORE_CONFIG_JSON: ${{ secrets.PLAY_STORE_CONFIG_JSON }}
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
        run: |
          cd apps/${{ inputs.app }}/android
          bundle exec fastlane ${{ inputs.track }}
  
  ios:
    runs-on: macos-14
    steps:
      # análogo con setup-xcode + match
```

Lanzamiento manual (`workflow_dispatch`) para no auto-publicar; deciden cuándo subir.

### 8. Releases automatizadas

`release.yml`:
```yaml
name: Release
on: { push: { branches: [main] } }
jobs:
  release:
    runs-on: ubuntu-latest
    permissions: { contents: write, pull-requests: write }
    steps:
      - uses: actions/checkout@v4
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node
          package-name: remis-app
          changelog-types: |
            [
              {"type":"feat","section":"Features"},
              {"type":"fix","section":"Bug Fixes"},
              {"type":"chore","section":"Chores","hidden":false}
            ]
```

Genera PRs automáticos de release con CHANGELOG.md actualizado y bumping de versión. Al mergear, taguea.

### 9. Versionado de apps mobile

Script `scripts/bump-mobile-version.sh`:
- Lee `package.json` versión raíz (manejada por release-please).
- Actualiza `apps/driver/pubspec.yaml` + `apps/passenger/pubspec.yaml`.
- Build number = git commit count (auto-incremental).

Hook en release-please para correrlo.

### 10. Rollback procedure

`docs/operations/release_process.md`:
- **Web (Vercel):** `vercel rollback <deploy-url> --prod` o promoción de deploy anterior desde UI.
- **Supabase migrations:** **forward-only** — si rompe, hacer migración nueva que arregle. NO `migrate down`.
- **Edge Functions:** redeploy de versión anterior desde commit anterior (`supabase functions deploy <fn> --commit-sha <hash>` no existe nativamente; truco: checkout commit + redeploy).
- **Mobile:** rollout staged + halt rollout en Play Console / pause en App Store. NO se puede "uninstall" del usuario.

### 11. Hooks de protección

`scripts/pre-push.sh` (instalable con husky o lefthook — agregar a Tanda 0 si no se hizo):
- Bloquear push directo a `main`.
- Run `pnpm lint && pnpm typecheck` localmente antes de push.

### 12. Secrets management

`docs/operations/secrets_management.md`:
- Lista de TODOS los secrets requeridos.
- Quien tiene acceso a cada uno.
- Rotación cada 6 meses para credenciales sensibles (MP, Twilio).
- Setup en GitHub Settings → Environments (separados staging vs production).

Lista de secrets:

| Secret | Where | Rotation |
|--------|-------|----------|
| `SUPABASE_ACCESS_TOKEN` | GHA | 12m |
| `SUPABASE_DB_PASSWORD` | GHA | 12m |
| `VERCEL_TOKEN` | GHA | 12m |
| `MP_ACCESS_TOKEN` | Supabase secrets | 6m |
| `MP_WEBHOOK_SECRET` | Supabase secrets | 12m |
| `FCM_SERVICE_ACCOUNT_JSON` | Supabase secrets | 24m |
| `TWILIO_AUTH_TOKEN` | Supabase secrets | 6m |
| `ANDROID_KEYSTORE_*` | GHA | nunca |
| `APP_STORE_CONNECT_API_KEY` | GHA | 12m |
| `SENTRY_AUTH_TOKEN` | GHA | 12m |
| `TELEGRAM_BOT_TOKEN` | Supabase secrets | 12m |

### 13. Preview deployments

Cada PR a `staging` o `main` dispara preview en Vercel automáticamente. URL en comentario del PR.

Para Supabase: opcional crear branches por PR con `supabase branches create` — más complejo, dejar como roadmap.

### 14. Estado del CI

Badge en README:
```md
![Lint](https://github.com/.../actions/workflows/lint.yml/badge.svg)
![Test](https://github.com/.../actions/workflows/test.yml/badge.svg)
![Deploy](https://github.com/.../actions/workflows/deploy-web.yml/badge.svg)
```

Vercel Discord/Slack notification (si el cliente lo quiere).

## Acceptance criteria

- [ ] PR a `staging` corre lint + typecheck + test + e2e + pgTAP.
- [ ] Merge a `staging` deploya a Supabase + Vercel staging.
- [ ] Merge a `main` deploya a producción tras checks.
- [ ] `workflow_dispatch` de mobile builda y sube a TestFlight/Play internal.
- [ ] `release.yml` genera CHANGELOG y taggea.
- [ ] Branch protection bloquea merges con checks rojos.
- [ ] `scripts/bump-mobile-version.sh` corre con cada release.
- [ ] `docs/operations/release_process.md` y `secrets_management.md` completos.
- [ ] Probar rollback de un deploy (revertir un commit en Vercel).
- [ ] Commit `chore(ci): full pipelines + fastlane + release-please`.

## Out of scope

- Multi-cloud / failover infra (overkill para esta escala).
- Auto-merge bots (peligroso para infra crítica).
- Canary deployments avanzados (Vercel ya tiene rollout staged en stores).

## Notas

- **Fastlane match** requiere repo privado para certs — coordinar con cliente quién lo aloja.
- **App Store Connect API key** es JSON; almacenar en GHA secret base64.
- **Supabase migrations en main:** auto-deploy peligroso si la migration es destructiva. Convención: nunca `DROP TABLE` o `DROP COLUMN` en una sola migración — siempre dos pasos (1: app ignora la columna, 2: drop).
