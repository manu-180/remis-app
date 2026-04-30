# Prompt 01 — Error boundaries, loading states y not-found

## Objetivo

Hoy el admin no tiene **un solo** `error.tsx` ni `loading.tsx` por segmento. Cualquier excepción no-atrapada (Supabase tira error raro, una RPC falla, una columna desaparece) muestra el `<NextError statusCode={0} />` default de Next: pantalla blanca con texto técnico. Y entre navegaciones, el usuario ve un freeze sin feedback.

Este prompt cierra eso: error boundaries por segmento, skeletons, 404 con marca, captura a Sentry.

**Tiempo estimado:** 1.5 horas.

## Contexto del proyecto

Mismo que prompt 00. Path del admin: `apps/dispatcher/src/app/(admin)/admin/`. Sentry está integrado (`sentry.client.config.ts`, `sentry.server.config.ts`). PostHog también.

**Reglas:** trabajar en `main`, no branches, no worktrees, push después de cada commit.

## Estado actual a confirmar

```bash
cd apps/dispatcher
find src/app -name "error.tsx" -o -name "loading.tsx" -o -name "not-found.tsx"
```

Esperado: solo `src/app/global-error.tsx` y `src/app/shared/[token]/not-found.tsx`. Si hay más, no rompas lo existente — agregá.

## Tareas concretas

### 1. `app/(admin)/error.tsx` — error boundary del segmento admin

Crear `apps/dispatcher/src/app/(admin)/error.tsx`. Debe ser `'use client'`.

Comportamiento:
- Recibe `error: Error & { digest?: string }` y `reset: () => void`.
- En `useEffect`, llama `Sentry.captureException(error, { tags: { segment: 'admin' } })`.
- Renderiza una UI premium dentro del shell admin (no debe romper la sidebar):
  - Heading: "Algo salió mal"
  - Texto: "Ocurrió un error inesperado en esta página. Ya nos avisamos."
  - Si está disponible `error.digest`, mostrar en mono-tipografía pequeña: `Error ID: {digest}`
  - Botón primario: "Reintentar" → llama `reset()`
  - Botón secundario: "Volver al inicio" → `router.push('/admin')`
  - Imagen / ilustración del componente `IllustrationError` si existe en el design system, sino el `AlertCircle` de lucide-react grande con muted color.

Diseño: card glass-style con `bg-[var(--surface-1)]`, padding generoso, centrado. Match de los empty states existentes.

### 2. `app/(dashboard)/error.tsx` — error boundary del dispatch live

Igual que el anterior pero `tags: { segment: 'dispatch' }` y el botón secundario va a `/` (que redirige según rol).

### 3. `app/shared/[token]/error.tsx` — error boundary del shared trip

Igual concepto pero **sin** asumir layout (esta ruta es pública). Mensaje: "El link del viaje compartido no se pudo cargar. Probablemente expiró o fue revocado." Sin link a /admin.

### 4. `app/(admin)/loading.tsx` — skeleton del shell

Crear `apps/dispatcher/src/app/(admin)/loading.tsx`. NO usar `'use client'` (loading.tsx puede ser server component).

Renderiza un layout que **mantenga la sidebar y top bar** del admin (vacíos pero presentes) más un skeleton del contenido principal:

```
[Sidebar (visible, mismo width)]   [TopBar skeleton]
                                   [PageHeader skeleton]
                                   [Card grid skeleton 3-4 columnas]
                                   [Table skeleton 8-10 filas]
```

Para los skeletons usá el componente `<Skeleton />` del design system (`components/ui/skeleton.tsx`). Si no respeta `prefers-reduced-motion`, agregalo. Animación shimmer ya está en globals.css.

### 5. `app/(admin)/admin/[*]/loading.tsx` — skeletons específicos por página

Para las 4 páginas con datos densos crear loading.tsx específico que represente mejor lo que viene:

- `admin/page.tsx` (dashboard) — skeleton: KPI strip (4 stat cards), 2 charts skeleton, 1 lista lateral.
- `admin/drivers/loading.tsx` — page header + filter bar + table skeleton (8 filas, 6 cols).
- `admin/rides/loading.tsx` — idem rides.
- `admin/payments/loading.tsx` — idem payments.

Para el resto, el `loading.tsx` global del segmento admin es suficiente.

### 6. `app/(admin)/admin/not-found.tsx` — 404 dentro del shell admin

Hoy si tipean `/admin/cualquier-cosa-rara` ven la 404 default de Next: full-page sin sidebar.

Crear `apps/dispatcher/src/app/(admin)/admin/not-found.tsx` que mantenga el shell.

Contenido:
- Heading: "Página no encontrada"
- Texto: "La página que buscás no existe o fue movida."
- Botón primario: link a `/admin` ("Volver al panel")
- Si existe ilustración 404 en design-system, usarla.

### 7. `app/global-error.tsx` — premium en vez de NextError

`apps/dispatcher/src/app/global-error.tsx:7-19` actualmente usa `<NextError statusCode={0} />`.

Reemplazar por una página propia (este archivo va con `<html><body>` porque corre fuera del root layout):

```tsx
'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error, { tags: { boundary: 'global' } }); }, [error]);
  return (
    <html lang="es">
      <body className="...">
        {/* UI premium con título "Algo salió mal", texto, error.digest visible, botones reintentar/inicio */}
      </body>
    </html>
  );
}
```

Estilos inline o un CSS file dedicado (no podés depender del root layout). Que coincida estéticamente con el resto del admin.

### 8. Actualizar `instrumentation.ts` con `onRequestError`

`apps/dispatcher/instrumentation.ts` hoy tiene `register()` pero falta `onRequestError`. Sentry tira warning en build sobre esto.

Agregar:

```ts
import * as Sentry from '@sentry/nextjs';

export const onRequestError = Sentry.captureRequestError;
```

### 9. Hacer que `useSupabaseQuery` reporte a Sentry

`apps/dispatcher/src/hooks/use-supabase-query.ts:69-75` setea el error en estado pero no captura a Sentry. Errores de RLS / constraint silenciosos.

Agregar después de setear el error:

```ts
import * as Sentry from '@sentry/nextjs';
// ...
Sentry.captureException(err, { tags: { hook: 'useSupabaseQuery' }, extra: { cacheKey } });
```

(Asumiendo que el hook tiene un `cacheKey` o equivalente; si no, omití el extra.)

### 10. Hacer que `use-dashboard-kpis` reporte y muestre error

`apps/dispatcher/src/components/admin/dashboard/use-dashboard-kpis.ts:154` tiene `.catch(() => { if (!cancelled) setIsLoading(false); })` que swallowea el error.

Cambiar por:

```ts
.catch((err: unknown) => {
  if (cancelled) return;
  setIsLoading(false);
  setError(err instanceof Error ? err : new Error(String(err)));
  Sentry.captureException(err, { tags: { hook: 'useDashboardKpis' } });
});
```

Y en el componente `dashboard-client.tsx`, si `kpisError` está set, mostrar un banner sutil en lugar de los stat-cards: "No pudimos cargar las métricas. Reintentar."

## Verificación

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint && pnpm build
pnpm dev
```

Manual:
1. Logueate como admin.
2. Forzá un error: en alguna page client, agregá temporalmente `throw new Error('test')` dentro del primer useEffect y refrescá. Debe verse el `error.tsx` con sidebar intacta. Quitar el throw.
3. Visitá `/admin/cualquier-cosa-no-existe` → debe verse el `not-found.tsx` con shell.
4. Visitá `/admin` con red lenta (Network throttling Slow 4G) → debe verse el skeleton.
5. Sentry: en `app.useffrontend.io` (o donde tengas Sentry), provocá un error desde una page del admin y confirmá que aparece con tag `segment=admin`.
6. Build: `pnpm build` no debe tirar el warning de `onRequestError`.

## Commit

```
feat(admin): error boundaries, loading skeletons y not-found

- error.tsx por segmento ((admin), (dashboard), shared/[token])
- global-error.tsx premium con captura a Sentry
- loading.tsx con skeletons (general + dashboard, drivers, rides, payments)
- not-found.tsx dentro del shell admin
- instrumentation.ts: onRequestError hook
- useSupabaseQuery y useDashboardKpis reportan errores a Sentry
- Banner de error en dashboard cuando KPIs fallan
```
