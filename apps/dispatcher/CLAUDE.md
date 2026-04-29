# Notas para Claude — apps/dispatcher

- Stack: Next.js 15 + React 19 + Tailwind v4 + Supabase SSR + Zustand
- Tokens en `src/app/globals.css` (light/dark + density). NO crear tailwind.config.ts.
- Auth & rol: usar `requireRole(...)` de `@/lib/auth/require-role`.
- Segmentos: `(auth)` para login, `(dashboard)` para dispatch live, `(admin)` para admin.
- Tipos Supabase: `import type { Database } from '@remis/shared-types/database'`.
- Cliente Supabase browser: `getSupabaseBrowserClient()` de `@/lib/supabase/client`.
- Cliente Supabase server: `await getSupabaseServerClient()` de `@/lib/supabase/server`.
- Project ID Supabase: `kmdnsxbpzidpkinlablf`.
- Port: 3001.
- Login redirige: admin → `/admin`, dispatcher → `/`.
- NO tocar el segmento `(dashboard)` salvo indicación explícita.
