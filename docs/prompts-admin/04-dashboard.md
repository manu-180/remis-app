# Sesión 04 — Dashboard ejecutivo del admin

> **Sesiones previas**: 00 → 03. Antes de empezar leé `apps/dispatcher/CLAUDE.md` y verificá que `pnpm typecheck` corre limpio en `apps/dispatcher`.

---

## Objetivo

Construir la **landing del admin** (`/admin`) como un dashboard ejecutivo premium que muestre el estado de la operación de un vistazo: KPIs del día, sparklines, mapa de calor de demanda, actividad reciente, top conductores. Esta es la pantalla que el dueño/admin abre primero todos los días — tiene que **impactar visualmente y ser información-densa pero legible**.

---

## Contexto Supabase

Project: `kmdnsxbpzidpkinlablf`. Tablas relevantes:

- `rides` (status, requested_at, ended_at, final_fare_ars, driver_id, passenger_id, pickup_location, dest_location, payment_status)
- `drivers` (id, current_status, is_online, rating, total_rides)
- `driver_current_location` (live GPS para heatmap actual)
- `sos_events` (resolved_at IS NULL → activos)
- `payments` (amount_ars, status, paid_at)
- `profiles` (full_name, avatar_url)

RPCs relevantes:
- Si querés performance, podés crear una view materializada `daily_stats_view` o RPC `dispatcher_dashboard_kpis()` con MCP `apply_migration`. **Recomendado** crear esa función (ver Parte D).

---

## Entregables

### Parte A — Layout del dashboard

`apps/dispatcher/src/app/(admin)/admin/page.tsx` — reescribir completo.

Estructura sugerida (grid responsive):

```
┌──────────────────────────────────────────────────────────┐
│ PageHeader: "Hola, {nombre} 👋"  [Periodo: Hoy ▾]        │
├──────────────────────────────────────────────────────────┤
│ [Stat] [Stat] [Stat] [Stat] [Stat]   ← 5 KPIs            │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐ ┌─────────────────────────┐ │
│ │ Viajes por hora (24h)    │ │ Top conductores hoy     │ │
│ │   sparkline + barras     │ │  podio + métricas       │ │
│ └──────────────────────────┘ └─────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐ ┌─────────────────────────┐ │
│ │ Mapa de demanda (heat)   │ │ Actividad reciente      │ │
│ │   minimapa                │ │  feed live              │ │
│ └──────────────────────────┘ └─────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Parte B — KPIs (5 Stat cards en fila)

1. **Viajes hoy** → count de `rides where requested_at >= today_start`
2. **Viajes en curso** → count where `status IN ('assigned','en_route_to_pickup','waiting_passenger','on_trip')`
3. **Conductores online** → count `drivers where is_online = true`
4. **Ingresos estimados** → sum `final_fare_ars` where `status='completed' and ended_at >= today_start` → format ARS
5. **Cancelados** → count where `status LIKE 'cancelled%'` o `'no_show'` y `created_at >= today_start`

Cada `Stat` tiene:
- Label en uppercase tracking-wide
- Value grande en `tabular`
- Delta vs ayer (calcular query del día anterior). Si delta positivo → flecha verde + porcentaje. Si negativo → rojo. Si exactamente igual → gris.
- Icon grande sutil arriba a la derecha (`TrendingUp`, `Activity`, `Users`, `DollarSign`, `XCircle`)

### Parte C — "Viajes por hora últimas 24h"

Card con título + subtítulo "últimas 24 horas".

Query:
```sql
SELECT date_trunc('hour', requested_at) AS hour, count(*)
FROM rides
WHERE requested_at >= now() - interval '24 hours'
GROUP BY hour ORDER BY hour;
```

Visualización: **sparkline barras** custom (no instalar libs nuevas si no están). Si hay `recharts` ya instalado → usarlo. Si no → SVG custom de 24 barras con altura proporcional, hover muestra tooltip glass con hora + count.

> No instalar `recharts` ni `chart.js` si no están. Implementación SVG es suficiente y se ve más premium. Cada barra: width `calc(100% / 24)`, gap 2px, fill `var(--brand-primary)` con opacity gradient (más oscuro arriba).

### Parte D — Top conductores hoy

Query (crear como RPC en Supabase via MCP `apply_migration`):

```sql
CREATE OR REPLACE FUNCTION public.top_drivers_today(p_limit int DEFAULT 5)
RETURNS TABLE (
  driver_id uuid, full_name text, avatar_url text,
  trips_today int, revenue_today numeric, rating numeric, current_status driver_status
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    d.id, p.full_name, p.avatar_url,
    count(r.id)::int AS trips_today,
    coalesce(sum(r.final_fare_ars), 0) AS revenue_today,
    d.rating, d.current_status
  FROM drivers d
  JOIN profiles p ON p.id = d.id
  LEFT JOIN rides r ON r.driver_id = d.id
    AND r.status = 'completed'
    AND r.ended_at >= date_trunc('day', now() AT TIME ZONE 'America/Argentina/Buenos_Aires')
  WHERE p.deleted_at IS NULL
  GROUP BY d.id, p.full_name, p.avatar_url, d.rating, d.current_status
  ORDER BY trips_today DESC, revenue_today DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.top_drivers_today(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.top_drivers_today(int) TO authenticated;
```

Aplicar con `mcp__70d9e470-49b9-42e9-8795-0e7b7617562a__apply_migration`. Después regenerar tipos.

UI:
- Lista con podio: 1° con avatar más grande + corona dorada (icono `Crown`), 2° y 3° iguales, resto en lista plana.
- Cada item: avatar, nombre, "X viajes · $Y", rating con estrellas.
- Status pill mini.
- Click → drawer con detalle (placeholder por ahora; en sesión 05 se conecta).

### Parte E — Mapa de demanda (heat)

Componente `apps/dispatcher/src/components/admin/dashboard/demand-heatmap.tsx`:

- MapLibre con bounding box de la zona de operación (calcular desde `tariff_zones` o hardcodear bbox de la ciudad — preguntar a Manuel cuál ciudad si no está claro).
- Capa de heat: usar `mapbox-gl-heatmap` style spec (MapLibre lo soporta nativo). Datos: pickup_location de `rides` últimas 24h.
- Style del mapa: usar el `map-style-dark.json` que ya existe en `public/`.
- Tamaño card: alto fijo 320px.
- Overlay glass con leyenda mini abajo a la derecha (cold blue → hot orange).

Si MapLibre se vuelve complicado de cargar lazy, dejá un Skeleton + dynamic import:

```tsx
const DemandHeatmap = dynamic(() => import('@/components/admin/dashboard/demand-heatmap'), {
  ssr: false, loading: () => <Skeleton className="h-80" />,
});
```

### Parte F — Actividad reciente (feed live)

Card con altura fija 400px y scroll interno. Mostrar últimos 20 eventos combinados:

- Suscribirse a `rides` (insert) → "Nuevo viaje pedido por Juan"
- Suscribirse a `ride_events` (insert) → "Viaje #abc asignado a Pedro"
- Suscribirse a `sos_events` (insert) → "🚨 SOS activado por María" (rojo, pulsante)

Cada item:
- Time relativa ("hace 2 min", actualizar cada 30s)
- Icon según tipo
- Texto descriptivo
- Click → navega al detalle correspondiente

Animación: nuevos items entran con `fade-up` y un highlight dorado de 800ms que decae.

Implementar con `useRealtimeTable` (de sesión 03) y un store local por tipo.

### Parte G — Selector de período

En el header del dashboard, un `Select` con: Hoy, Ayer, Últimos 7 días, Mes en curso. Al cambiar, recalcula todos los KPIs y queries. Mantener "Hoy" como default. Persistir selección en URL (`?period=today`).

> Para no complicar esta sesión, implementar solo "Hoy" y "Ayer" funcionales; los otros muestran un toast "Pronto disponible". El select queda funcional para extender después.

---

## Detalles premium imprescindibles

- **Stat cards**: count-up animation al cargar (already del primitive), shimmer mientras `loading`.
- **Delta indicators**: pequeños pero **legibles**. Color sólido + icono micro.
- **Top conductores**: avatar con gradiente sutil de fondo, ring 2px dorado en el #1.
- **Heatmap**: degradado naranja→rojo (no azul→rojo; mantenemos paleta de la marca).
- **Feed**: cuando entra un SOS, además del fade-up dorado, hacer **shake horizontal sutil** del card por 400ms y reproducir un sonido si la pestaña está en background (reusar `playNewRideSound` de `@/lib/sounds`).
- **Loading**: jamás mostrar la card vacía, siempre Skeleton imitando estructura final.
- **Refresh manual**: botón discreto arriba a la derecha del dashboard con `RefreshCw` icon que rota mientras refetcha.
- **Date / time format**: usar `formatDateShort` y `relativeTime` de la sesión 03.

---

## Validación

1. `pnpm typecheck`, `pnpm lint` limpios.
2. Visitar `/admin` como admin:
   - 5 KPIs con valores reales (verificar contra Supabase)
   - Sparkline 24h funcional, con tooltip
   - Top 5 conductores con datos reales
   - Heatmap muestra puntos
   - Feed live muestra histórico inicial + entran nuevos en realtime
3. Crear un ride manualmente con SQL (`mcp__execute_sql`) → verificar que aparece en el feed sin recargar.
4. Cambiar selector de período → KPIs se recalculan.
5. Lighthouse perf > 80 (es OK que mapa baje).

### SQL para verificar / seedear

Si la DB está casi vacía y querés simular actividad para la demo, ejecutá vía MCP (documentar los seeds en `docs/seeds/dashboard-seed.sql`):

```sql
-- 30 viajes de las últimas 24h con distintos estados
INSERT INTO rides (...) VALUES (...) RETURNING id;
```

(Generá un script que use `generate_series` para crear data realista — coordenadas dentro de la bbox de la ciudad, distintos estados, fares variables.)

---

## No hacer

- ❌ Construir las páginas de detalle (drivers, rides, etc.) — esta sesión es solo el dashboard
- ❌ Instalar libs de charting si no están
- ❌ Tocar el dispatcher live (`(dashboard)`)
- ❌ Hacer el mapa fullscreen — el heatmap es preview embebido

---

## Commit final

```bash
git add .
git commit -m "feat(admin): premium dashboard with KPIs, sparklines, heatmap and live activity"
git push
```
