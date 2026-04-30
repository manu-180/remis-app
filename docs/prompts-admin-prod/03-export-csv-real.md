# Prompt 03 — Export CSV real para listas

## Objetivo

Hoy los botones "Exportar CSV" en `/admin/rides`, `/admin/drivers`, `/admin/passengers`, `/admin/payments` están **ocultos** (los ocultamos en el prompt 00 porque mentían). Acá los volvemos a poner pero generando un CSV real, descargable client-side, con los datos filtrados que ve el usuario en pantalla.

**Tiempo estimado:** 1.5 horas.

## Contexto del proyecto

Mismo que prompts anteriores. Las tablas usan **TanStack Table v8**. Las queries Supabase usan paginación.

**Reglas:** trabajar en `main`, no branches, no worktrees, push tras commitear.

## Tareas concretas

### 1. Crear util de export CSV client-side

`apps/dispatcher/src/lib/export-csv.ts`:

```ts
type CsvCell = string | number | boolean | null | undefined | Date;

function escape(cell: CsvCell): string {
  if (cell == null) return '';
  if (cell instanceof Date) return cell.toISOString();
  const s = String(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCsv<T>(rows: T[], columns: { header: string; accessor: (row: T) => CsvCell }[]): string {
  const header = columns.map((c) => escape(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => escape(c.accessor(r))).join(',')).join('\n');
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM para Excel español, encoding UTF-8
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function isoTimestampForFilename(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
```

### 2. Hook genérico `useExportCsv`

Cuando el dataset puede ser grande (rides, payments) no querés exportar **solo lo paginado** — querés todos los registros que matchean los filtros actuales. Pero también no querés traer 50k filas a memoria.

Solución: el hook fetch a Supabase con los **mismos filtros** que la página, en `range` chunks de 1000, hasta tener el total (o un cap de 10000).

`apps/dispatcher/src/hooks/use-export-csv.ts`:

```ts
'use client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { buildCsv, downloadCsv, isoTimestampForFilename } from '@/lib/export-csv';

const CHUNK = 1000;
const MAX_ROWS = 10_000;

export function useExportCsv<T>(opts: {
  filename: string;        // sin extensión, sin timestamp
  columns: { header: string; accessor: (row: T) => any }[];
  fetchPage: (offset: number, limit: number) => Promise<T[]>;
}) {
  const [exporting, setExporting] = useState(false);
  const exportNow = useCallback(async () => {
    setExporting(true);
    const t = toast.loading('Generando CSV…');
    try {
      const all: T[] = [];
      for (let off = 0; off < MAX_ROWS; off += CHUNK) {
        const page = await opts.fetchPage(off, CHUNK);
        all.push(...page);
        if (page.length < CHUNK) break;
      }
      const csv = buildCsv(all, opts.columns);
      const filename = `${opts.filename}-${isoTimestampForFilename()}.csv`;
      downloadCsv(filename, csv);
      toast.success(`Exportadas ${all.length.toLocaleString('es-AR')} filas`, { id: t });
    } catch (err) {
      toast.error('No pudimos exportar el CSV. Reintentá.', { id: t });
      throw err;
    } finally {
      setExporting(false);
    }
  }, [opts]);
  return { exportNow, exporting };
}
```

### 3. Botón compartido `<ExportCsvButton />`

`apps/dispatcher/src/components/admin/data-table/export-csv-button.tsx`:

Wrapper de Button que muestra spinner cuando `exporting`, ícono `Download` (lucide), texto "Exportar CSV". Disabled mientras exporta. Tooltip si la lista filtrada está vacía: "No hay filas para exportar".

### 4. Conectar en /admin/rides

`apps/dispatcher/src/components/admin/rides/rides-list-client.tsx`:

- Reactivar el botón Export que ocultamos en prompt 00.
- Definir las columnas:

```ts
const csvColumns = [
  { header: 'ID viaje', accessor: (r) => r.id },
  { header: 'Estado', accessor: (r) => r.status },
  { header: 'Pasajero', accessor: (r) => r.passenger_full_name ?? '' },
  { header: 'Conductor', accessor: (r) => r.driver_full_name ?? '' },
  { header: 'Origen', accessor: (r) => r.pickup_address ?? '' },
  { header: 'Destino', accessor: (r) => r.dest_address ?? '' },
  { header: 'Tarifa estimada (ARS)', accessor: (r) => r.estimated_fare_ars ?? '' },
  { header: 'Tarifa final (ARS)', accessor: (r) => r.final_fare_ars ?? '' },
  { header: 'Método de pago', accessor: (r) => r.payment_method },
  { header: 'Estado de pago', accessor: (r) => r.payment_status },
  { header: 'Pedido (UTC)', accessor: (r) => r.requested_at },
  { header: 'Asignado (UTC)', accessor: (r) => r.assigned_at ?? '' },
  { header: 'Iniciado (UTC)', accessor: (r) => r.started_at ?? '' },
  { header: 'Finalizado (UTC)', accessor: (r) => r.ended_at ?? '' },
];
```

- `fetchPage` reusa la misma query que la lista pero con `.range(off, off + limit - 1)`. Asegurate de mantener los filtros actuales (status, fechas, búsqueda).

### 5. Conectar en /admin/drivers

Mismo patrón. Columnas razonables:

ID, Nombre, Email, Teléfono, Rol, Estado actual (current_status), Activo, Online, Vehículo (patente), Make/Model, Rating, Total viajes, Joined at, KYC status.

Para traer KYC status hacé un join: `.select('*, profiles!inner(full_name, phone, email), vehicles(plate, make, model), kyc_verifications(status)')`. Si llega un array de `kyc_verifications` tomá el más reciente.

### 6. Conectar en /admin/passengers

ID, Nombre, Email, Teléfono, Default payment, Total viajes, Total no-shows, Blacklisted, Razón blacklist, Notas, Created at.

### 7. Conectar en /admin/payments

ID, Ride ID, Método, Monto (ARS), Estado, MP payment ID, MP preference ID, MP external reference, Paid at, Created at.

Dos botones de export: uno para payments, uno para webhooks (en su tab respectiva).

### 8. Microcopy y accesibilidad

- El botón debe tener `aria-label="Exportar lista a CSV"` por screen readers.
- En toast de error explicar acción siguiente: "No pudimos exportar el CSV. Reintentá en unos segundos."
- El export debe respetar los **filtros actuales** (incluyendo búsqueda). Si la lista está filtrada por "Estado = completed", el CSV solo trae completed.
- Mostrar el timestamp y la cantidad exportada en el toast de éxito (ej: "Exportadas 1.247 filas").

## Verificación

```bash
cd apps/dispatcher
pnpm typecheck && pnpm lint
pnpm dev
```

Manual:
1. `/admin/rides` con seed (159 viajes): click Export → archivo `rides-2026-04-29-...csv` descarga, abre en Excel/LibreOffice con columnas correctas, sin caracteres rotos, fechas en ISO 8601.
2. Filtrar por estado=completed → Export → solo trae completed.
3. Buscar por dirección "Av. San Martín" → Export → solo trae los matches.
4. `/admin/drivers` (18) → Export → archivo OK.
5. `/admin/passengers` (41) → Export OK.
6. `/admin/payments` → Export payments + Export webhooks (en tab Webhooks) → ambos OK.
7. Rompé la red mientras descarga → toast de error.

## Commit

```
feat(admin): export CSV real en rides/drivers/passengers/payments

- lib/export-csv.ts: buildCsv + downloadCsv + UTF-8 BOM para Excel
- hooks/use-export-csv.ts: paginado en chunks de 1000, cap 10k filas
- components/admin/data-table/export-csv-button.tsx: botón reusable
  con spinner y aria-label
- Conectado en rides-list-client, drivers-list-client,
  passengers-client, payments-client (payments + webhooks)
- Respeta filtros activos de la lista (estado, búsqueda, fechas)
- Toast con cantidad exportada y filename con timestamp ISO
```
