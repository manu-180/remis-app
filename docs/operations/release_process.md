# Release Process

## Branch Strategy

- `main` → production
- `staging` → staging environment
- Feature branches → PR to `staging` → merge → test → PR to `main` → production

## Release Flow

1. Merge to `staging` — auto-deploys Supabase + Vercel staging
2. Smoke test on staging
3. PR `staging` → `main`
4. Merge to `main` — auto-deploys Supabase + Vercel production, triggers release-please
5. release-please opens a Release PR with updated CHANGELOG + version bump
6. Merge Release PR → creates git tag
7. For mobile: manually trigger `Deploy Mobile` workflow from GitHub Actions

## Mobile Deploy

Go to **Actions → Deploy Mobile → Run workflow**, choose `app` (driver/passenger) and `track` (internal/beta/production).

Tracks:
- `internal` — Play Store internal / TestFlight internal
- `beta` — Play Store beta / TestFlight beta
- `production` — Play Store 10% canary rollout / App Store (requires manual App Store review submit)

## Rollback

### Web (Vercel)

```bash
vercel rollback <deploy-url> --prod --token=$VERCEL_TOKEN
```

Or from Vercel dashboard: Deployments → select a previous deploy → Promote to Production.

### Supabase Migrations

**Migrations are forward-only.** Never run `migrate down`.

If a migration breaks something, write a new migration that fixes it. Steps:

1. Identify the breaking change
2. Write a corrective migration in `supabase/migrations/`
3. Merge to staging, verify, merge to main

### Edge Functions

To redeploy a previous version:

```bash
git checkout <commit-sha> -- supabase/functions/<function-name>
supabase functions deploy <function-name>
git checkout HEAD -- supabase/functions/<function-name>
```

### Mobile

- **Android**: Halt rollout in Play Console (Production → Managed publishing → Halt rollout)
- **iOS**: Pause in App Store Connect (App Store → Pause Availability)
- You cannot uninstall from existing users — rollback means releasing a new fixed version

## Versioning

Version is managed by release-please in `package.json`. Mobile apps follow the same version via `scripts/bump-mobile-version.sh`. Build number = total git commit count.

## Two-step destructive migrations

Never `DROP TABLE` or `DROP COLUMN` in one migration. Use two separate releases:

1. **Release N**: App stops writing/reading the column (code change only)
2. **Release N+1**: Drop the column in a new migration
