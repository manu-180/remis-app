# Sesión 09 — Zonas tarifarias y matriz de tarifas

> **Sesiones previas**: 00 → 08.

---

## Objetivo

Construir la **configuración de pricing**: editor visual de zonas tarifarias (polígonos en mapa) y la matriz origen→destino con recargo nocturno + simulador. Es la página técnicamente más rica del admin: dibujar polígonos en MapLibre y persistir en PostGIS, editar una matriz inline, y un simulador en vivo que llama al RPC `estimate_fare`.

---

## Contexto Supabase

Tablas:
- `tariff_zones`: id, name, polygon (geography Polygon), priority, is_active, created_at, updated_at
- `fares`: id, origin_zone_id, dest_zone_id, base_amount_ars, per_km_ars, flat_amount_ars (override de cálculo), night_surcharge_pct, effective_from, effective_to

RPC `estimate_fare(pickup_lat, pickup_lng, dest_lat, dest_lng, at_time)` ya existe.

RLS: `is_admin()` para write, lectura abierta.

---

## Entregables

### Parte A — `/admin/zones`

Reescribir `apps/dispatcher/src/app/(admin)/admin/zones/page.tsx`.

Layout:
```
┌──────────────────────────────────────────────────────────┐
│ PageHeader: "Zonas tarifarias" + "+ Nueva zona"          │
├────────────────────┬─────────────────────────────────────┤
│ Lista de zonas     │ Mapa fullscreen con polígonos       │
│  - card por zona   │  - cada zona color distinto         │
│  - drag a reorder  │  - hover zona → highlight           │
│  - click selecciona│  - click vacío → modo dibujar       │
│                    │                                     │
└────────────────────┴─────────────────────────────────────┘
```

#### Lista (sidebar 320px)

Cada zona-card:
- Color dot (asignado por priority — 4 colores: brand, accent, success, warning)
- Nombre (editable inline al doble-click)
- Switch is_active (instantáneo)
- Priority number con +/- buttons
- Botón eliminar (icon trash, confirm)
- Click selecciona en el mapa (zoom-to-bounds)

Botón "+ Nueva zona" arriba de la lista.

#### Mapa

MapLibre style dark, con todas las zonas dibujadas como polígonos:
- Fill color con opacity 0.15 según color del dot
- Outline 2px sólido
- Label en el centroide con el nombre

Modo edición (cuando se hace click "Nueva" o "Editar polígono" en una zona):
- Cursor crosshair
- Click coloca un punto, line preview al cursor
- Doble-click cierra el polígono
- Esc cancela
- Mostrar tooltip "Click para agregar punto · Doble click para cerrar"
- Cuando se cierra, abre Drawer "Confirmar zona" con:
  - Nombre (input)
  - Priority (number, default = max + 1)
  - is_active (switch, default true)
  - Botón "Crear" → INSERT en `tariff_zones` con polygon como `ST_GeogFromText('SRID=4326;POLYGON(...)')`
  - Para construir el WKT: `POLYGON((lng1 lat1, lng2 lat2, ..., lng1 lat1))` (cerrado, primer = último).

Modo edición de polígono existente:
- Vértices visibles como dots draggeables
- Drag actualiza el polígono en vivo
- Botón "+" en cada edge para insertar vértice
- Botón "Guardar cambios" / "Descartar"

Implementación de dibujo: usar [`maplibre-gl-draw`](https://github.com/maplibre/maplibre-gl-draw) si compatible, sino implementar custom con event handlers (`map.on('click')`, etc.). Custom es perfectamente factible y se ve mejor; poner el primary effort acá.

> Si no querés instalar `maplibre-gl-draw`, hacé custom. Crear `apps/dispatcher/src/components/admin/zones/zone-editor.tsx` con un mini state machine para los modos.

### Parte B — `/admin/fares`

Reescribir `apps/dispatcher/src/app/(admin)/admin/fares/page.tsx`.

Layout:
```
┌──────────────────────────────────────────────────────────┐
│ PageHeader: "Tarifas" + selector vigencia                │
├──────────────────────────────────────────────────────────┤
│ Matriz Origen × Destino (zonas como filas y columnas)    │
│                                                          │
│ ┌──────────┬──────┬──────┬──────┐                        │
│ │ Origen \ │ Z1   │ Z2   │ Z3   │                        │
│ │ Destino  │      │      │      │                        │
│ ├──────────┼──────┼──────┼──────┤                        │
│ │ Z1       │ $800 │ $1200│ $1500│ ← cells editables      │
│ │ Z2       │ $1200│ $700 │ $1100│                        │
│ │ Z3       │ $1500│ $1100│ $900 │                        │
│ └──────────┴──────┴──────┴──────┘                        │
├──────────────────────────────────────────────────────────┤
│ Simulador: pickup [map pin] · destino [map pin]          │
│ Tarifa estimada: $1.234 (de Z2 a Z3, +25% nocturno)      │
└──────────────────────────────────────────────────────────┘
```

#### Selector vigencia

`Select`:
- "Vigentes" (default — `effective_to IS NULL OR effective_to > now()`)
- "Histórico" (todas)
- "Programadas" (`effective_from > now()`)

Si "vigentes": muestra la matriz editable con la última versión activa.

#### Matriz

- Grid CSS o Table, con zonas como header columna y header fila (sticky).
- Cell click → modo edición inline: Input numérico con focus auto, Enter guarda, Esc cancela.
- Cada cell muestra `flat_amount_ars` si tiene override, sino `base_amount_ars + per_km_ars × dist`.
- Para simplicidad esta sesión: editamos solo `flat_amount_ars` y `per_km_ars` (el `base_amount_ars` queda fijo). Mostrar fórmula al hover.
- Save patrón: al cambiar un cell, INSERT nuevo `fares` row con:
  - `origin_zone_id`, `dest_zone_id`
  - `effective_from = now()`
  - `effective_to = null`
  - Y close el row anterior con `effective_to = now() - interval '1 second'` para historial.

Tab adicional "Recargo nocturno" — input global por zona o flat. Por simplicidad, un único `night_surcharge_pct` editable (lee del row más reciente, save crea nuevo row).

#### Simulador

Sub-card debajo:
- Dos inputs MapLibre mini (320px height): "Origen" y "Destino"
  - Click en el mapa coloca pin
  - O autocomplete address input (placeholder; sin geocoding real — solo lat/lng manual o "Usar zona Z1" select shortcut)
- Date/time picker para "at_time" (default ahora)
- Botón "Calcular"
- Resultado: tarifa formateada, breakdown:
  - Zona origen → Zona destino
  - Tarifa base
  - + por km × distancia
  - + recargo nocturno (si aplica)
  - = Total
- Llama RPC `estimate_fare(pickup_lat, pickup_lng, dest_lat, dest_lng, at_time)`

### Parte C — Tipos y queries

Crear hooks `apps/dispatcher/src/hooks/use-zones.ts` y `use-fares.ts`:

```ts
export function useZones() // return { zones, refetch, create, update, remove }
export function useFares(filter?) // return { fares, latestEffective, ... }
```

Cada uno con realtime subscription para reflejar cambios en otra pestaña abierta del admin.

### Parte D — Validaciones

- Polígonos no se pueden auto-intersectar → calcular client-side antes de submit (algoritmo simple de chequeo de aristas) o aceptar y dejar que Postgres falle (cleaner: validar antes para mejor UX).
- Tarifa no puede ser negativa.
- Vigencia: `effective_to >= effective_from`.
- Eliminar zona usada en un fare → confirmar y eliminar fares dependientes en cascada (mostrar advertencia: "X tarifas asociadas serán eliminadas").

---

## Detalles premium imprescindibles

- **Polígonos**: animación de aparición (stroke-dashoffset desde 100% al draw initial).
- **Vértices draggeables**: ring brand-accent al hover, scale 1.4 al drag.
- **Matriz**: cell editado con flash sutil verde cuando guarda, rojo si falla.
- **Diagonal de la matriz** (origin = dest): background diferente y no editable, indicar "tarifa intra-zona".
- **Simulador**: el resultado entra con count-up del número final.
- **Tooltip de fórmula**: glass card pequeña al hover sobre cell, mostrando `base + perKm × Xkm = total`.
- **Nightshift indicator**: chip dorado con icon `Moon` si la tarifa simulada tiene recargo nocturno.

---

## Validación

1. `pnpm typecheck`, `pnpm lint`.
2. Crear una zona dibujándola en el mapa. Aparece en lista, persiste en DB.
3. Editar polígono → drag vertices → save → DB actualizada.
4. Eliminar zona con fares asociados → confirma cascada → todo borrado.
5. Editar matriz inline → DB tiene nuevos rows con `effective_from = now()`, los anteriores con `effective_to`.
6. Simulador con dos puntos → muestra tarifa coherente con la matriz.
7. Cambio de zona en cuyo polígono cae el pickup → simulador re-calcula.

---

## No hacer

- ❌ Implementar geocoding real (placeholder con coords manuales)
- ❌ Soporte multi-currency (solo ARS)
- ❌ UI de versionamiento histórico complejo (solo "vigentes" funcional, las otras opciones del select pueden mostrar lista plana sin edición)

---

## Commit final

```bash
git add .
git commit -m "feat(admin): tariff zones polygon editor + fares matrix + estimate simulator"
git push
```
