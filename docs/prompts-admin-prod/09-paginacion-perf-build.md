# Prompt 09 — Paginación, performance y build sticky

## Objetivo

Hoy `payments-client.tsx` y otros traen `select('*')` sin paginación. Con 5000 pagos se cuelga. Y el build necesita `NODE_OPTIONS=--max-old-space-size=4096` que hay que setear manualmente cada vez.

Este prompt cierra la deuda de performance que el cliente puede percibir si el demo se demora unos segundos en cargar.

**Tiempo estimado:** 1.5 horas.

## Contexto del proyecto

Mismo que prompts anteriores. **Hay datos seeded ahora**: 159 viajes, 125 payments, 24+ audit entries. Suficientes para ver lentitud en ciertas páginas si traen todo sin paginar.

## Tareas concretas

### 1. Paginar payments

`apps/dispatcher/src/components/admin/payments/payments-client.tsx:316-318`

Hoy: `sb.from('payments').select('*').order('paid_at')` sin range/limit.

Convertir a server-side pagination con:

```ts
const PAGE_SIZE = 50;
const [page, setPage] = useState(0);

const { data, count } = await sb
  .from('payments')
  .select('*', { count: 'exact' })
  .order('paid_at', { ascending: false, nullsLast: true })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

UI: usar `<Pagination>` del design system (`components/ui/pagination.tsx`). Si no soporta server-side, agregalo. Mostrar "Mostrando 1-50 de 1.247".

Aplicar el mismo filtro de búsqueda / status / método server-side:

```ts
let query = sb.from('payments').select('*', { count: 'exact' });
if (q) query = query.ilike('mp_payment_id', `%${escapeOrFilter(q)}%`);
if (status) query = query.eq('status', status);
if (method) query = query.eq('method', method);
```

### 2. Paginar mp_webhook_events

Misma página, tab Webhooks. Idem patrón.

### 3. Paginar audit_log

`apps/dispatcher/src/components/admin/audit/audit-client.tsx:124`

Hoy `.limit(500)` hardcodeado. Cambiar a `.range()` paginado con `count: 'exact'`. Page size 100 (el audit log es denso textualmente).

Si un usuario quiere "ver todo el log", el export CSV (prompt 03) lo cubre.

### 4. Verificar otras listas que traen sin range

Buscar:

```bash
rg "\.select\\(" src/ | grep -v "limit\\|range\\|maybeSingle\\|single"
```

Para cada hit que sea una lista de tabla con potencial volumen (>1000 filas en 1 año), agregar paginación o limit.

Tablas relevantes:
- `rides` (ya paginado en list-client, verificar)
- `drivers` (lista, probablemente OK porque son ~50 max)
- `passengers`
- `notifications` (si se renderiza alguna)

### 5. Build sticky con max-old-space-size

`apps/dispatcher/package.json`:

Cambiar el script `build` de:
```json
"build": "next build"
```
a:
```json
"build": "cross-env NODE_OPTIONS=--max-old-space-size=4096 next build"
```

`cross-env` ya está instalado (lo usa `dev` para `NODE_OPTIONS=--max-http-header-size=32768`).

Si hay otro script que también necesite el max-old-space (ej: `start`, `analyze`), aplicarlo también.

### 6. Script de regeneración de tipos Supabase

Agregar al `package.json` raíz del monorepo:

```json
"scripts": {
  ...
  "supabase:types": "supabase gen types typescript --project-id kmdnsxbpzidpkinlablf > packages/shared-types/database.ts && echo Types regenerated."
}
```

Si no querés depender del CLI de supabase localmente, alternativa: comentar en el README cómo regenerar via MCP.

Documentar en `docs/env-setup.md` (o `docs/seeds/README.md` que crearemos): "Cuando agregues una migration, regenerá tipos con `pnpm supabase:types`".

### 7. Optimizar imports pesados

`apps/dispatcher/next.config.ts:7` ya tiene `optimizePackageImports: ['lucide-react']`.

Agregar:
- `date-fns` (probablemente usado en muchos lugares)
- `@tanstack/react-table`
- `recharts` (si se usa en sparklines / heatmap)

Verificar bundle size con:

```bash
pnpm build
# después
du -sh .next/
```

### 8. Chequear dynamic imports de MapLibre

MapLibre es pesado (~600KB gzipped). Verificar:

```bash
rg "from 'maplibre-gl'" src/ | grep -v "dynamic"
```

Si hay imports estáticos en archivos que no son rutas de mapa, refactorizar a `dynamic()`.

### 9. Lighthouse benchmark

Antes de cerrar, correr Lighthouse en mobile + desktop sobre las páginas pesadas:

- `/admin` (dashboard)
- `/admin/rides`
- `/admin/sos`
- `/admin/zones`

Apuntar a:
- Performance >70 (mobile)
- Performance >90 (desktop)
- Accessibility >90 (consolidamos en prompt 12)

Documentar resultado en commit body.

## Verificación

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint
pnpm build   # debería pasar sin necesidad de exportar NODE_OPTIONS manualmente
pnpm dev
```

Manual:
1. `/admin/payments` con 125 payments seeded → no se freeza, paginación visible.
2. Navegar entre páginas: previo / siguiente → carga rápida.
3. `/admin/payments` tab Webhooks → idem.
4. `/admin/audit` → paginación visible, scroll fluido.
5. Lighthouse en `/admin` → score >70 mobile.
6. `pnpm build` en limpio (sin envs custom) → pasa.
7. Cuando agregues una migration nueva, `pnpm supabase:types` regenera el archivo.

## Commit

```
perf(admin): paginación server-side + build sticky + dynamic imports

- payments / mp_webhook_events / audit_log paginados (range + count exact)
- package.json: build con NODE_OPTIONS=--max-old-space-size=4096 sticky
- pnpm supabase:types script para regenerar tipos
- next.config: optimizePackageImports extendido (date-fns,
  @tanstack/react-table, recharts)
- Verificación: dynamic imports de MapLibre OK
- Lighthouse mobile: 78 (desktop: 94) en /admin
```
