# Secrets Management

## Storage

- **GitHub Actions secrets**: configured per environment (`staging`, `production`) in repo Settings → Environments
- **Supabase secrets**: configured via `supabase secrets set` or Supabase dashboard (used by Edge Functions at runtime)

## Required Secrets

### GitHub Actions

| Secret | Environment | Used by | Rotation |
|--------|-------------|---------|----------|
| `SUPABASE_ACCESS_TOKEN` | staging, production | deploy-supabase.yml | 12 months |
| `SUPABASE_DB_PASSWORD` | staging, production | deploy-supabase.yml | 12 months |
| `VERCEL_TOKEN` | staging, production | deploy-web.yml | 12 months |
| `VERCEL_ORG_ID` | staging, production | deploy-web.yml | static |
| `VERCEL_PROJECT_ID_DISPATCHER` | staging, production | deploy-web.yml | static |
| `VERCEL_PROJECT_ID_WEB` | staging, production | deploy-web.yml | static |
| `ANDROID_KEYSTORE_BASE64` | production | deploy-mobile.yml | never |
| `ANDROID_KEYSTORE_PASSWORD` | production | deploy-mobile.yml | never |
| `ANDROID_KEY_ALIAS` | production | deploy-mobile.yml | never |
| `ANDROID_KEY_PASSWORD` | production | deploy-mobile.yml | never |
| `PLAY_STORE_CONFIG_JSON` | production | deploy-mobile.yml | 12 months |
| `APP_STORE_CONNECT_API_KEY_ID` | production | deploy-mobile.yml | 12 months |
| `APP_STORE_CONNECT_API_ISSUER_ID` | production | deploy-mobile.yml | static |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | production | deploy-mobile.yml | 12 months |
| `MATCH_GIT_BASIC_AUTHORIZATION` | production | deploy-mobile.yml | 12 months |
| `MATCH_PASSWORD` | production | deploy-mobile.yml | 12 months |
| `SENTRY_AUTH_TOKEN` | staging, production | build steps | 12 months |

### GitHub Actions — per environment variables (vars, not secrets)

| Variable | staging value | production value |
|----------|---------------|-----------------|
| `SUPABASE_PROJECT_REF` | staging project ref | production project ref |

### Supabase secrets (Edge Functions runtime)

| Secret | Rotation |
|--------|----------|
| `MP_ACCESS_TOKEN` | 6 months |
| `MP_WEBHOOK_SECRET` | 12 months |
| `FCM_SERVICE_ACCOUNT_JSON` | 24 months |
| `TWILIO_AUTH_TOKEN` | 6 months |
| `TELEGRAM_BOT_TOKEN` | 12 months |

## Access

Only repo admins can view/edit secrets in GitHub Settings.
Supabase secrets: project owner + service role only.

## Rotation Procedure

1. Generate new credential in the provider
2. Update in GitHub Settings → Environments (both `staging` and `production` if applicable)
3. Update in Supabase dashboard for Edge Function secrets
4. Revoke old credential in the provider
5. Update this document with new rotation date

## Android Keystore

The keystore file is stored **only** as `ANDROID_KEYSTORE_BASE64` (base64-encoded) in GitHub secrets.
Never commit the `.jks` file to the repo.
The passwords and alias are separate secrets.

## iOS Certificates (Fastlane Match)

Certificates are stored in a **private git repo** (separate from this repo).
Access requires `MATCH_GIT_BASIC_AUTHORIZATION` (base64 of `username:PAT`).
The encryption password is `MATCH_PASSWORD`.

Coordinate with the client to determine who hosts the certs repo.
