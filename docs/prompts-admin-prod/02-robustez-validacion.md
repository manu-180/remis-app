# Prompt 02 — Robustez de validación e inputs

## Objetivo

Hoy varias páginas crashean si las pinchás con un input raro: UUIDs malformados, búsquedas con caracteres especiales, env vars faltantes en client. Nada de esto cabe en una demo donde el cliente experimenta solo.

**Tiempo estimado:** 1 hora.

## Contexto del proyecto

Mismo que prompts anteriores. Path del admin: `apps/dispatcher/src/app/(admin)/admin/`.

**Reglas:** trabajar en `main`, no branches, no worktrees, push tras commitear. Tipos Supabase en `packages/shared-types/database.ts`.

## Tareas concretas

### 1. Validar UUID en server components `[id]`

Hoy si un usuario tipea `/admin/drivers/abc` o `/admin/rides/123`, los server components pegan a Postgres con un UUID inválido y reciben `invalid input syntax for type uuid`. La página queda en estado de error infinito (depende de cómo lo cachee el cliente).

Crear util `apps/dispatcher/src/lib/validation.ts`:

```ts
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(s: string): boolean { return UUID_RX.test(s); }
```

Aplicar en estos server components (al inicio del componente, después de `await params`):

- `apps/dispatcher/src/app/(admin)/admin/drivers/[id]/page.tsx`
- `apps/dispatcher/src/app/(admin)/admin/rides/[id]/page.tsx`
- `apps/dispatcher/src/app/(admin)/admin/sos/[id]/page.tsx`

Patrón:

```ts
const { id } = await params;
if (!isUuid(id)) notFound();
```

(Importar `notFound` de `next/navigation`.)

### 2. Reemplazar `.single()` por `.maybeSingle()` + `notFound()`

Hoy `.single()` tira excepción si no hay fila. `.maybeSingle()` devuelve `null` y permite manejarlo limpio.

`apps/dispatcher/src/app/(admin)/admin/drivers/[id]/page.tsx:16` usa `.single()` para el driver. Cambiar por `.maybeSingle()` y agregar:

```ts
const { data: driver, error } = await sb.from('drivers').select('...').eq('id', id).maybeSingle();
if (error) throw error;       // que lo agarre error.tsx
if (!driver) notFound();
```

Buscar otros usos: `rg ".single\(\)" src/app/(admin)`. En cada caso evaluar:
- Si la fila **debe** existir y la ausencia es un bug → mantener `.single()` (lanza, lo agarra error.tsx)
- Si la fila **puede** no existir (UUID válido pero borrado, etc) → cambiar a `.maybeSingle()` + `notFound()`

### 3. Sanear input de búsqueda en filtros `.or(...)` (CRÍTICO)

Hoy hay PostgREST injection en:
- `apps/dispatcher/src/components/admin/drivers/drivers-list-client.tsx:144-145` con `query.or(\`profiles.full_name.ilike.%${q}%,profiles.phone.ilike.%${q}%\`)`
- `apps/dispatcher/src/components/admin/rides/rides-list-client.tsx:205` con `pickup_address.ilike.%${q}%,dest_address.ilike.%${q}%`
- Posiblemente otros archivos con `.or(`. Buscar con `rg "\.or\\(\`" src/`.

Si el usuario escribe `,foo,bar` o `)` en el buscador, rompe la query. Es injection clásica de PostgREST.

Crear util en `apps/dispatcher/src/lib/postgrest-safe.ts`:

```ts
/**
 * Escapa un valor para usarlo dentro de una expresión PostgREST .or(...).
 * Reemplaza los chars que rompen el parser PostgREST: , ( ) \ y wildcards de like.
 */
export function escapeOrFilter(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
```

Aplicar en cada `.or(...)`:

```ts
const safe = escapeOrFilter(q);
query.or(`profiles.full_name.ilike.%${safe}%,profiles.phone.ilike.%${safe}%`);
```

### 4. `env.ts` — no throw en client

`apps/dispatcher/src/lib/env.ts:17` lanza `Error` en module-load si faltan vars. Si una build de Vercel arranca sin `NEXT_PUBLIC_SUPABASE_URL`, todo el dispatcher cae con un stack antes del primer render.

Reescribir para que:
- En **server-side** (`typeof window === 'undefined'`): valida y lanza si falta (build/runtime server debe fallar fuerte)
- En **client-side**: si falta, log a console.error + render una página de "Configuration error" en lugar de blanco

Patrón sugerido:

```ts
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    const msg = `Missing env var: ${key}`;
    if (typeof window === 'undefined') throw new Error(msg);
    console.error(msg);
    return '';
  }
  return value;
}
```

Y en algún lugar del root layout o providers, un check explícito que muestre una página de error si falta `NEXT_PUBLIC_SUPABASE_URL`.

### 5. Sanitizar el endpoint /api/health

`apps/dispatcher/src/app/api/health/route.ts:20` retorna `error: String(e)` en JSON. Esto filtra mensajes completos de Postgres a quien sea que pegue al endpoint público.

Cambiar por:

```ts
catch (e) {
  console.error('[health]', e);
  return NextResponse.json({ status: 'error' }, { status: 503 });
}
```

(El error real va a logs de servidor / Sentry, no al cliente.)

### 6. Fix Bearer undefined en edge function calls

`apps/dispatcher/src/components/admin/drivers/driver-form-drawer.tsx:540-548` (o donde sea) construye `Authorization: \`Bearer ${session.access_token}\`` sin validar que `session` no sea null.

Patrón seguro:

```ts
const { data: { session } } = await sb.auth.getSession();
if (!session?.access_token) {
  toast.error('Tu sesión expiró. Refrescá la página.');
  return;
}
const headers = { Authorization: `Bearer ${session.access_token}` };
```

Hacer un grep `rg "Bearer \\\$\{" src/` y aplicar el patrón en cada lugar.

### 7. Validar Zod en respuestas RPC sensibles

Para los RPCs que renderizan en páginas de cara al cliente, agregar parsing Zod para evitar runtime errors si el shape cambia.

Targets prioritarios:
- `apps/dispatcher/src/components/admin/audit/audit-client.tsx:39` — `chainData: ChainEntry[] | null` viene del RPC `audit_log_hash_chain`. Crear schema Zod y parsear.
- `apps/dispatcher/src/app/shared/[token]/page.tsx:17` — `trip = data as SharedTrip` (RPC público). Parsear Zod, si falla `notFound()`.

Usar `z.object({...})` y `z.array(...)` siguiendo patrón existente del proyecto. Schemas en archivo aparte si crecen.

## Verificación

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint
pnpm dev
```

Manual:
1. `/admin/drivers/abc` → debe ir a 404 (no a página de error con stack).
2. `/admin/rides/00000000-0000-0000-0000-000000000000` → debe ir a 404 (UUID válido pero no existe).
3. `/admin/drivers` con búsqueda `(`, `,foo,bar`, `)`, `%aa` → no debe romper la lista, devuelve 0 resultados o resultados literales.
4. `/api/health` → si DB está OK retorna 200; si simulás un error (apaga la DB url temporalmente) retorna `{status:'error'}` sin filtrar el stack.
5. Tirar el script de Auth: `await supabase.auth.signOut()` y luego intentar invitar/crear conductor → toast "Tu sesión expiró", no Bearer undefined.
6. `/shared/<token-roto>` → 404, no crash.

## Commit

```
fix(admin): robustez en validación de inputs y queries

- isUuid() validator + notFound() en [id] server components
  (drivers, rides, sos)
- .single() → .maybeSingle() donde la ausencia es esperable
- escapeOrFilter() para sanear inputs de búsqueda en .or() de PostgREST
  (rides, drivers, otras listas)
- env.ts: graceful fallback en client (no throw en module load)
- /api/health: deja de filtrar el stack al cliente
- Validación de session.access_token antes de Bearer
- Zod parse en RPCs públicos (audit_log_hash_chain, get_shared_trip)
```
