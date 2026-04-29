# Sesión 00 — Cimientos: tipos, env, segmento (admin), guards

> **Antes de empezar**: leé `docs/prompts-admin/README.md` para contexto del proyecto.
> **Project Supabase**: `kmdnsxbpzidpkinlablf` (usar MCP `mcp__70d9e470-49b9-42e9-8795-0e7b7617562a__*`).
> **Trabajar en `main` directo**, sin branches ni worktrees.

---

## Objetivo

Dejar el repositorio listo para construir el admin: tipos generados, validación de env, nuevo segmento de rutas `(admin)` con guard server-side por rol, redirección inteligente desde `/login`, y el ruteo final del proyecto **funcionando end-to-end con la cuenta real de Supabase**.

Al terminar, abrir `http://localhost:3001/login` y autenticar con un usuario `admin` debe redirigir a `/admin` (dashboard placeholder), un `dispatcher` debe ir a `/`, y cualquier otro rol debe ser rechazado.

---

## Contexto que ya existe

- App Next.js 15 en `apps/dispatcher` con segmento `(dashboard)` que aloja la pantalla de despacho live (3 columnas + mapa).
- Login en `apps/dispatcher/src/app/(auth)/login/page.tsx` que valida `role IN ('dispatcher', 'admin')` y redirige a `/`.
- Middleware en `apps/dispatcher/src/middleware.ts` (ya tiene fix anti-431 con cookies bloated).
- Tokens CSS premium en `apps/dispatcher/src/app/globals.css` (light/dark + density).
- Stores Zustand: `rides-store.ts`, `drivers-store.ts`, `ui-store.ts`.
- Package `@remis/shared-types` que exporta `Database`.

---

## Entregables concretos

### 1. Regenerar tipos de Supabase

Usá el MCP `mcp__70d9e470-49b9-42e9-8795-0e7b7617562a__generate_typescript_types` con `project_id: 'kmdnsxbpzidpkinlablf'` y guardá el resultado sobreescribiendo `packages/shared-types/src/database.ts` (verificá la ruta real del archivo). Asegurate de que se exporte `Database` y los enums (`ride_status`, `driver_status`, `payment_method`, `payment_status`, `vehicle_type`, `user_role`, `kyc_status`, `document_type`).

Después corré `pnpm -w build` (workspace root) y verificá que no haya errores de tipos en `apps/dispatcher`.

### 2. Helper de auth + rol

Crear `apps/dispatcher/src/lib/auth/require-role.ts`:

```ts
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@remis/shared-types/database';

type Role = Database['public']['Enums']['user_role'];

export async function requireRole(
  allowed: ReadonlyArray<Role>,
  redirectTo = '/login',
) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(redirectTo);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, avatar_url, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !allowed.includes(profile.role)) redirect(redirectTo);

  return { user, profile };
}
```

Refactorizar `apps/dispatcher/src/app/(dashboard)/layout.tsx` para usar `requireRole(['dispatcher', 'admin'])`. Eliminar el código duplicado.

### 3. Nuevo segmento `(admin)`

Crear:

- `apps/dispatcher/src/app/(admin)/layout.tsx` — usa `requireRole(['admin'])`. Por ahora renderiza solo `<>{children}</>` (en sesión 02 se reemplaza por el shell completo).
- `apps/dispatcher/src/app/(admin)/admin/page.tsx` — placeholder con `<h1>Admin dashboard</h1>` y un párrafo "En construcción".

> Nota: Next.js permite usar `(admin)` como segmento de routing y `/admin` como URL real. La carpeta `(admin)/admin/` produce la ruta `/admin`.

Crear también las URLs:
- `(admin)/admin/drivers/page.tsx` — placeholder
- `(admin)/admin/rides/page.tsx` — placeholder
- `(admin)/admin/sos/page.tsx` — placeholder
- `(admin)/admin/zones/page.tsx` — placeholder
- `(admin)/admin/fares/page.tsx` — placeholder
- `(admin)/admin/passengers/page.tsx` — placeholder
- `(admin)/admin/payments/page.tsx` — placeholder
- `(admin)/admin/kyc/page.tsx` — placeholder
- `(admin)/admin/feature-flags/page.tsx` — placeholder
- `(admin)/admin/audit/page.tsx` — placeholder
- `(admin)/admin/team/page.tsx` — placeholder
- `(admin)/admin/settings/page.tsx` — placeholder

Cada placeholder debe tener un `<h1>` con el nombre legible y `<p>` "En construcción". No se construye nada visual aún.

### 4. Redirección inteligente post-login

Modificar `apps/dispatcher/src/app/(auth)/login/page.tsx`:

- Después del `signInWithPassword` exitoso, en vez de hardcodear `router.push('/')`, leer el `profile.role`:
  - `admin` → `router.push('/admin')`
  - `dispatcher` → `router.push('/')`
  - cualquier otro → mensaje "No tenés permisos para acceder al panel."

### 5. Redirección de `/` para admins

`apps/dispatcher/src/app/(dashboard)/page.tsx` actualmente redirige a `/rides`. Modificarlo para que, si el usuario es admin, vaya a `/admin`. Si es dispatcher, mantener redirect a `/rides`.

> Implementar leyendo el perfil server-side en la page (es Server Component). No hacer fetch en cliente.

### 6. Ajustes de middleware

Verificar que `apps/dispatcher/src/middleware.ts` ya tiene el fix de cookies bloated (ya está commiteado). Agregar al `matcher` la exclusión de `/api/health`. (Si ya está, no tocar.)

### 7. Eliminar `next.config.ts` warning

`next.config.ts` tiene `experimental.instrumentationHook: true` que ya no es necesario en Next 15. Borrar esa key.

### 8. CLAUDE.md del dispatcher

Crear `apps/dispatcher/CLAUDE.md` con notas para futuras sesiones:

```md
# Notas para Claude — apps/dispatcher

- Stack: Next.js 15 + React 19 + Tailwind v4 + Supabase SSR + Zustand
- Tokens en `src/app/globals.css` (light/dark + density). NO crear tailwind.config.ts.
- Auth & rol: usar `requireRole(...)` de `@/lib/auth/require-role`.
- Segmentos: `(auth)` para login, `(dashboard)` para dispatch live, `(admin)` para admin.
- Tipos Supabase: `import type { Database } from '@remis/shared-types/database'`.
- Cliente Supabase browser: `getSupabaseBrowserClient()` de `@/lib/supabase/client`.
- Cliente Supabase server: `await getSupabaseServerClient()` de `@/lib/supabase/server`.
- Project ID Supabase: `kmdnsxbpzidpkinlablf`.
```

---

## Detalles premium en esta sesión

Aunque esta sesión es estructural, **el placeholder del admin debe verse digno**:

- Cada `page.tsx` placeholder tiene un fondo `bg-[var(--neutral-50)]`, padding `p-12`, un título `text-3xl font-bold` con tracking ajustado, y un párrafo de cortesía con `text-[var(--neutral-500)]`.
- Centrar verticalmente (`min-h-screen flex flex-col items-center justify-center`).
- Mostrar un dot pulsante dorado (`var(--brand-accent)`) al lado del texto "En construcción" como microdetalle.

```tsx
<span className="inline-flex items-center gap-2 text-sm text-[var(--neutral-500)]">
  <span className="relative flex h-2 w-2">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-accent)] opacity-60" />
    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-accent)]" />
  </span>
  En construcción
</span>
```

---

## Validación

1. `cd apps/dispatcher && pnpm typecheck` → 0 errores
2. `pnpm lint` → 0 errores
3. `pnpm dev` → abrir `http://localhost:3001/login`
4. Login con un usuario admin (crearlo si no existe — ver más abajo) → debe ir a `/admin`
5. Visitar `/admin/drivers`, `/admin/rides`, etc. → todos muestran placeholder pulsante
6. Visitar `/admin` con un dispatcher → debe redirigir a `/login`

### Si no hay un admin en la DB

Usar `mcp__70d9e470-49b9-42e9-8795-0e7b7617562a__execute_sql` con:

```sql
SELECT id, email, role, full_name FROM profiles ORDER BY created_at DESC LIMIT 5;
```

Si ningún registro tiene `role = 'admin'`, promovería al primer profile:

```sql
UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1);
```

Documentá el cambio en `docs/seeds/admin-promotion.sql` para futura referencia.

---

## No hacer en esta sesión

- ❌ Construir el sidebar (es la sesión 02)
- ❌ Crear primitives nuevos (es la sesión 01)
- ❌ Implementar lógica de páginas (sesiones 04+)
- ❌ Refactorizar el dispatcher live (no se toca hasta sesión 07)
- ❌ Agregar packages nuevos a package.json salvo que un tipo lo demande

---

## Commit final

```bash
git add .
git commit -m "feat(dispatcher): scaffold admin segment with role guards and typed routes"
git push
```
