# Prompt 06 — Dashboard: filtros de período reales y elementos clickeables

## Objetivo

El dashboard es la primera vista post-login. Hoy:
- Solo "Hoy" funciona en el filter de período (resto se quitaron en prompt 00).
- Top drivers tienen hover effect pero no son clickeables.
- Activity feed muestra eventos (ride creado, SOS activado) inertes.

Este prompt cierra eso para que el dashboard se sienta vivo.

**Tiempo estimado:** 1.5 horas.

## Contexto del proyecto

Mismo que prompts anteriores. Path: `apps/dispatcher/src/components/admin/dashboard/`.

## Tareas concretas

### 1. Reactivar filtros de período del dashboard

`apps/dispatcher/src/components/admin/dashboard/dashboard-client.tsx`:

Reagregar las opciones que ocultamos en prompt 00:
- "Hoy" (default)
- "Últimos 7 días"
- "Últimos 30 días"
- "Mes en curso"

Estado: `const [period, setPeriod] = useState<'today'|'7d'|'30d'|'month'>('today');`

Pasar `period` a todos los hooks de KPIs / sparklines / heatmap / top drivers / activity feed.

### 2. Modificar `useDashboardKpis` para aceptar período

`apps/dispatcher/src/components/admin/dashboard/use-dashboard-kpis.ts`:

Agregar parámetro `period` al hook. Calcular `from` / `to` en función de `period`:

```ts
function periodRange(p: 'today'|'7d'|'30d'|'month'): { from: Date; to: Date } {
  const now = new Date();
  const to = now;
  let from: Date;
  switch (p) {
    case 'today': {
      from = new Date(now); from.setHours(0,0,0,0); break;
    }
    case '7d': from = new Date(now.getTime() - 7*24*3600*1000); break;
    case '30d': from = new Date(now.getTime() - 30*24*3600*1000); break;
    case 'month': {
      from = new Date(now.getFullYear(), now.getMonth(), 1); break;
    }
  }
  return { from, to };
}
```

Las queries de KPIs usan `from/to` en `.gte('requested_at', from.toISOString()).lt('requested_at', to.toISOString())`.

KPIs a recalcular según período:
- Total rides
- Completed rides
- Cancelled rides
- Revenue (suma de `final_fare_ars` de completed)
- Avg fare
- Avg time-to-assignment (asignado - requested)
- Avg ride duration (ended - started)
- New passengers (created_at en el período)
- Active drivers (al menos 1 ride en el período)

### 3. Comparativa contra período anterior (delta)

Ya hay sparklines pero no hay deltas tipo "+12% vs período anterior".

Para cada KPI calcular el equivalente en el período inmediatamente anterior (ej: si "today", comparar con ayer; si "7d", comparar con los 7 días previos).

UI del Stat:
- Valor principal grande
- Debajo: arrow `▲`/`▼` color verde/rojo + porcentaje de cambio + texto "vs período anterior"
- Si delta es 0% mostrar "sin cambios" con icono neutro.

Component `<Stat>` ya existe (`components/ui/stat.tsx`). Si no soporta delta, agregalo como prop opcional `delta?: { value: number; label: string }`.

### 4. Sparklines reactivas al período

Las sparklines actuales son por hora del día (today). Cambiar el bucket según período:

- today → buckets por hora (24)
- 7d → buckets por día (7)
- 30d → buckets por día (30)
- month → buckets por día (calculado dinámicamente)

Hook: `apps/dispatcher/src/components/admin/dashboard/rides-sparkline.tsx` — agregar prop `period`. Adaptar la query de bucketing en SQL (usá `date_trunc('hour'|'day', requested_at)`).

### 5. Top drivers clickeables

`apps/dispatcher/src/components/admin/dashboard/top-drivers.tsx:142-178`

Las filas tienen `hover:bg-[var(--neutral-50)]` pero no son clickeables. Hacerlas links a `/admin/drivers/[id]`:

Opción 1 (semántica): wrapear cada fila con `<Link href={`/admin/drivers/${driver.id}`}>`.

Opción 2 (con eventos): `onClick={() => router.push(...)}` y `cursor-pointer`. Asegurar `role="button"` y soporte de teclado (Enter / Space).

Recomendado: Opción 1 (mejor semántica, mejor SEO interno).

Agregar `aria-label="Ver perfil de {full_name}"`.

### 6. Activity feed clickeable

`apps/dispatcher/src/components/admin/dashboard/activity-feed.tsx:206-233`

Cada `<li>` representa un evento de tipo:
- Nuevo ride solicitado → linkear a `/admin/rides/{ride_id}`
- SOS activado → linkear a `/admin/sos/{sos_id}`
- Conductor se conectó → linkear a `/admin/drivers/{driver_id}`
- Pago completado → linkear a `/admin/payments?ride={ride_id}`
- KYC aprobado → linkear a `/admin/kyc?driver={driver_id}`

Mismo patrón que top drivers: wrappear con `<Link>`. `aria-label` descriptivo.

### 7. Refresh real (consolidar prompt 00)

En prompt 00 cambiamos el `setTimeout` artificial. Acá nos aseguramos que el botón refresh refresca **todo** el dashboard:

```ts
async function handleRefresh() {
  setIsRefreshing(true);
  try {
    await Promise.all([
      kpisRefetch(),
      sparklineRefetch(),
      topDriversRefetch(),
      activityRefetch(),
      heatmapRefetch(),
    ]);
    toast.success('Datos actualizados');
  } catch (err) {
    toast.error('No pudimos refrescar todo. Reintentá.');
  } finally {
    setIsRefreshing(false);
  }
}
```

### 8. Action button primario en page header

El dashboard hoy no tiene una acción principal. Agregar en el `PageHeader` un botón primario "Crear viaje manual" que navegue a `/admin/rides/new` o abra un drawer de creación rápida.

**Decisión simple para este prompt**: si la ruta `/admin/rides/new` no existe todavía, dejar el botón `disabled` con tooltip "Próximamente — usá el panel de despacho live". Si querés implementar el drawer real, hacelo en este prompt agregando un drawer con form mínimo (passenger, pickup, dest, payment_method, vehicle_type, notes) que llame a `supabase.from('rides').insert(...)` con status `requested`.

## Verificación

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint
pnpm dev
```

Manual:
1. Logueate como admin.
2. `/admin` → cambiar período entre Hoy / 7d / 30d / Mes en curso → KPIs, sparklines y heatmap se actualizan.
3. KPIs muestran delta `▲ 12%` o similar contra período anterior.
4. Click en un top driver → navega a `/admin/drivers/{id}`.
5. Click en un evento del activity feed → navega a la ruta correspondiente.
6. Botón refresh → spinner real, datos se refrescan, toast "Datos actualizados".
7. Acción primaria en header funciona o muestra tooltip "Próximamente".

## Commit

```
feat(dashboard): filtros de período reales + elementos clickeables

- Period filter: Hoy / 7d / 30d / Mes en curso, todos funcionales
- KPIs con delta vs período anterior (% y arrow color)
- Sparklines con bucket dinámico (hora vs día) según período
- Top drivers: filas linkeadas a /admin/drivers/[id]
- Activity feed: eventos linkeados a su ruta correspondiente
- Refresh: Promise.all de todos los hooks + toast
- Action button "Crear viaje manual" en page header (drawer o disabled)
```
