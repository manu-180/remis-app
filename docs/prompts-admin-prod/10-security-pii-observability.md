# Prompt 10 — Seguridad PII y observabilidad real

## Objetivo

Hoy hay puntos donde el demo "se ve bien" pero técnicamente filtra datos:
- **Sentry replay con `maskAllText: false`** → captura nombres, teléfonos, direcciones.
- **PostHog session_recording activo** → DOM textual con datos personales queda grabado.
- **Middleware no valida auth** → solo refresca cookies.
- **Hooks de query no reportan a Sentry**.
- **Posibles `NEXT_PUBLIC_*` con datos sensibles**.

El cliente puede preguntar "¿adónde van mis datos?" y queremos poder responder "están enmascarados, no salen del país, etc". Este prompt prepara esa respuesta.

**Tiempo estimado:** 2 horas.

## Contexto del proyecto

Mismo que prompts anteriores. Sentry + PostHog instrumentados. Middleware en `apps/dispatcher/src/middleware.ts`.

## Tareas concretas

### 1. Sentry replay con masking total

`apps/dispatcher/sentry.client.config.ts`

Cambiar:

```ts
new Sentry.Replay({
  maskAllText: true,        // antes false
  maskAllInputs: true,
  blockAllMedia: true,
  // selectivamente desenmascarar lo que sí es safe:
  unmask: ['[data-sentry-unmask]'],
})
```

Para los casos puntuales donde querés que aparezca el texto en el replay (ej: status badges, números de página, headers de tabla), agregar el atributo `data-sentry-unmask` al elemento.

Otra opción defensiva: deshabilitar `Replay` enteramente para el admin y dejarlo solo para `(auth)/login` y errores críticos:

```ts
const replays = process.env.NODE_ENV === 'production'
  ? new Sentry.Replay({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })
  : undefined;
```

Decisión recomendada: **maskAllText: true** y unmask solo cuando sea necesario.

### 2. PostHog: deshabilitar session_recording en admin

`apps/dispatcher/src/lib/observability/posthog.ts`

Hoy session_recording está activo con `maskAllInputs: true`, pero el DOM textual con nombres/direcciones de pasajeros se graba.

Decisión: **deshabilitar session_recording para usuarios autenticados con role admin/dispatcher**. Pageviews y custom events sí siguen.

```ts
posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
  capture_pageview: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: '*',  // mask todo el texto por default
  },
  // O directamente:
  disable_session_recording: true,
});
```

Si querés mantenerlo para passenger app o landing pero desactivar solo en admin: setear `disable_session_recording` condicionalmente al cargar el admin layout.

### 3. Middleware: validar auth para rutas (admin)/*

`apps/dispatcher/src/middleware.ts`

Hoy solo refresca cookies. La protección de rutas admin depende 100% de `requireRole` en `app/(admin)/admin/layout.tsx`.

Agregar belt-and-suspenders en el middleware: si el path empieza con `/admin` y no hay sesión, redirigir a `/login`.

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // ... refresh de cookies como hoy ...
  
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
  if (isAdminRoute) {
    const sb = createServerClient(...);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=' + req.nextUrl.pathname, req.url));
    }
  }
  // ... return response
}
```

Igual para `/dispatch` si querés. NO para `/shared/[token]` (es público).

### 4. Auditar `NEXT_PUBLIC_*`

```bash
rg "NEXT_PUBLIC_" apps/dispatcher/src/ | grep -v "process.env"
```

Y ver `apps/dispatcher/src/lib/env.ts` para los whitelisteados.

Confirmar que solo son:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MAPTILER_KEY` (o equivalente)
- `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_APP_URL` (opcional)

Si hay otra cosa, evaluá si debe ser solo server-side.

### 5. Captura de errores en `useSupabaseQuery` (consolidar prompt 01)

`apps/dispatcher/src/hooks/use-supabase-query.ts`

En el prompt 01 ya agregamos `Sentry.captureException`. Confirmar que está y agregar enriching context:

```ts
Sentry.captureException(err, {
  tags: { hook: 'useSupabaseQuery' },
  extra: { cacheKey, table, operation },
  // si hay user disponible:
  user: { id: userId, role: userRole },
});
```

Idem para `useSupabaseMutation` si existe.

### 6. Captura en RPCs públicas

`apps/dispatcher/src/app/shared/[token]/page.tsx`

Si el RPC `get_shared_trip` tira error, capturar a Sentry con tag `endpoint: shared_trip` para tener visibilidad de tokens raros / abuse:

```ts
const { data, error } = await (supabase.rpc as any)('get_shared_trip', { p_token: token });
if (error) {
  Sentry.captureException(error, { tags: { endpoint: 'shared_trip' }, extra: { token: token.slice(0, 8) } });
  notFound();
}
```

(No mandes el token completo a Sentry — solo prefijo para debug.)

### 7. Rate limiting en endpoints públicos

`/shared/[token]` es público. Para evitar enumeración:

Agregar a la función SQL `get_shared_trip` (vía MCP `apply_migration`):

```sql
-- Antes de devolver el trip, contar requests recientes a este token
-- Si pasaron > N requests en M minutos, devolver NULL (404)
```

Implementación simple: tabla `shared_trip_access_log` con `(token, accessed_at)`. La RPC chequea count en últimos 5 min y rate-limita.

Alternativa pragmática: usar Cloudflare Rate Limiting o Vercel Edge Middleware. Para el demo, dejá nota: "Rate limit tracking pendiente; el RPC ya valida revoked_at y expires_at".

### 8. Headers de seguridad

`apps/dispatcher/next.config.ts:9-39` ya tiene HSTS, X-Frame-Options DENY, CSP, Permissions-Policy. Confirmar que están bien.

Revisar específicamente CSP:
- ¿Permite `'unsafe-eval'`? Sí (necesario para Next dev). En prod podría endurecerse pero no es crítico.
- ¿Permite los hosts de Sentry, PostHog, Supabase? Verificar.
- ¿`connect-src` incluye `https://*.supabase.co`?

Si hay reportes en `next.config.ts` para Sentry / PostHog (`Content-Security-Policy-Report-Only`), considerar en producción usarlo en modo enforcement.

### 9. Sanear UUIDs en logs

Si en algún `console.log` o `logger.error` se imprime un UUID de pasajero / driver, mejor truncarlo:

```ts
function shortId(id: string): string { return id.slice(0, 8); }
```

(Es defensivo: los UUIDs por sí solos no son PII, pero si después se cruzan con otros logs sí.)

## Verificación

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint
pnpm dev
```

Manual:
1. Provocar un error en una página del admin y revisar el Sentry replay → debe verse texto enmascarado (●●●●● en vez de nombres).
2. PostHog dashboard → no debe haber session recordings nuevos del admin.
3. Sin sesión, navegar a `/admin` → redirige a `/login?redirect=/admin`. Después del login, vuelve a /admin.
4. Manual logout y revisitar `/admin/drivers` → idem redirige.
5. `rg "NEXT_PUBLIC" src/lib/env.ts` → solo whitelist de la documentación.
6. `/shared/<token-falso>` → 404 limpio. Sentry recibe captureException con tag.
7. `next.config.ts` → headers CSP verificados.

## Commit

```
chore(admin): security PII y observabilidad real

- Sentry replay: maskAllText: true, blockAllMedia, unmask selectivo
- PostHog: session_recording deshabilitado en admin layout
- middleware.ts: redirect /admin → /login si no hay sesión
- useSupabaseQuery: captureException con tags + extra + user context
- /shared/[token]: captureException con tag y prefix-only del token
- NEXT_PUBLIC_* auditados (solo Supabase/PostHog/Sentry/MapTiler)
- shortId() helper para no loggear UUIDs completos
```
