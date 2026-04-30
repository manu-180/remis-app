'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle,
  ShieldCheck,
  Link2,
  Link2Off,
  Eye,
  Activity,
  Calendar,
  Layers,
} from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { DataTable, FilterBar, createActionsColumn } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Drawer } from '@/components/ui/drawer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type AuditLog = {
  entity: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  diff: Record<string, unknown> | null;
  prev_hash: string | null;
  row_hash: string | null;
  created_at: string;
};

const chainEntrySchema = z
  .object({
    mismatch: z.boolean().optional(),
  })
  .passthrough();
const chainDataSchema = z.array(chainEntrySchema);
type ChainEntry = z.infer<typeof chainEntrySchema>;

type AuditData = {
  logs: AuditLog[];
  chainData: ChainEntry[] | null;
  chainError: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function todayIso(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

function actionBadge(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes('create') || lower === 'insert') {
    return (
      <Badge className="bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/20">
        {action}
      </Badge>
    );
  }
  if (lower.includes('update')) {
    return (
      <Badge className="bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/20">
        {action}
      </Badge>
    );
  }
  if (lower.includes('delete')) {
    return (
      <Badge className="bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/20">
        {action}
      </Badge>
    );
  }
  if (lower.includes('resolve')) {
    return (
      <Badge className="bg-[var(--neutral-200)] text-[var(--neutral-700)] border border-[var(--neutral-300)]">
        {action}
      </Badge>
    );
  }
  // Default — brand-ish
  return (
    <Badge className="bg-[var(--neutral-100)] text-[var(--neutral-600)] border border-[var(--neutral-200)]">
      {action}
    </Badge>
  );
}

const PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function AuditClient() {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, unknown>>({
    q: '',
    entity: [] as string[],
    action: [] as string[],
    actor_role: [] as string[],
    fecha: {},
  });

  // ---------------------------------------------------------------------------
  // Data fetch
  // ---------------------------------------------------------------------------
  const { data, isLoading, error } = useSupabaseQuery<AuditData>(
    ['audit-log'],
    async (sb) => {
      const [logsResult, chainResult] = await Promise.all([
        sb
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        (sb as any).rpc('audit_log_hash_chain').then(
          (r: { data: unknown; error: unknown }) => r,
        ).catch(() => ({ data: null, error: new Error('rpc error') })),
      ]);

      let chainData: ChainEntry[] | null = null;
      let chainShapeError = false;
      if (chainResult.data != null) {
        const parsed = chainDataSchema.safeParse(chainResult.data);
        if (parsed.success) {
          chainData = parsed.data;
        } else {
          chainShapeError = true;
          console.error('[audit] chain shape inesperado:', parsed.error.flatten());
        }
      }

      return {
        data: {
          logs: (logsResult.data ?? []) as AuditLog[],
          chainData,
          chainError: !!chainResult.error || chainShapeError,
        },
        error: logsResult.error,
      };
    },
  );

  const logs = data?.logs ?? [];
  const chainData = data?.chainData ?? null;
  const chainError = data?.chainError ?? false;

  // ---------------------------------------------------------------------------
  // Hash chain banner
  // ---------------------------------------------------------------------------
  const chainBanner = useMemo(() => {
    if (isLoading) return null;
    if (chainError || chainData === null) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-[var(--warning)]">
          <AlertTriangle size={18} />
          <span className="font-medium">
            No se pudo verificar la cadena de auditoría.
          </span>
        </div>
      );
    }

    let mismatches = 0;
    try {
      mismatches = chainData.filter((entry) => entry.mismatch === true).length;
    } catch {
      // If chainData format is unexpected, treat as unverifiable
      return (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-[var(--warning)]">
          <AlertTriangle size={18} />
          <span className="font-medium">
            No se pudo verificar la cadena de auditoría.
          </span>
        </div>
      );
    }

    if (mismatches > 0) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)]">
          <AlertTriangle size={18} />
          <span className="font-medium">
            Cadena de auditoría comprometida ({mismatches} inconsistencias) — contactar al desarrollador.
          </span>
        </div>
      );
    }

    const total = chainData.length;
    return (
      <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] text-sm">
        <ShieldCheck size={16} />
        <span>Cadena de auditoría íntegra ({total} eventos verificados)</span>
      </div>
    );
  }, [isLoading, chainError, chainData]);

  // ---------------------------------------------------------------------------
  // KPI strip
  // ---------------------------------------------------------------------------
  const today = todayIso();
  const eventsToday = useMemo(
    () => logs.filter((l) => l.created_at.startsWith(today)).length,
    [logs, today],
  );

  const topAction = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of logs) {
      counts[l.action] = (counts[l.action] ?? 0) + 1;
    }
    let best = '—';
    let bestCount = 0;
    for (const [action, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        best = action;
      }
    }
    return best;
  }, [logs]);

  const distinctEntities = useMemo(
    () => new Set(logs.map((l) => l.entity)).size,
    [logs],
  );

  // ---------------------------------------------------------------------------
  // Filter options (dynamic from data)
  // ---------------------------------------------------------------------------
  const entityOptions = useMemo(
    () =>
      Array.from(new Set(logs.map((l) => l.entity))).map((e) => ({
        value: e,
        label: e,
      })),
    [logs],
  );

  const actionOptions = useMemo(
    () =>
      Array.from(new Set(logs.map((l) => l.action))).map((a) => ({
        value: a,
        label: a,
      })),
    [logs],
  );

  const actorRoleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'dispatcher', label: 'Dispatcher' },
    { value: 'system', label: 'System' },
  ];

  // ---------------------------------------------------------------------------
  // Client-side filtering
  // ---------------------------------------------------------------------------
  const filteredLogs = useMemo(() => {
    const q = typeof filters.q === 'string' ? filters.q.toLowerCase() : '';
    const entityFilter = Array.isArray(filters.entity) ? (filters.entity as string[]) : [];
    const actionFilter = Array.isArray(filters.action) ? (filters.action as string[]) : [];
    const roleFilter = Array.isArray(filters.actor_role) ? (filters.actor_role as string[]) : [];
    const dateFilter =
      typeof filters.fecha === 'object' && filters.fecha !== null
        ? (filters.fecha as { from?: string; to?: string })
        : {};

    return logs.filter((l) => {
      if (q && !l.entity_id.toLowerCase().includes(q)) return false;
      if (entityFilter.length > 0 && !entityFilter.includes(l.entity)) return false;
      if (actionFilter.length > 0 && !actionFilter.includes(l.action)) return false;
      if (roleFilter.length > 0 && !roleFilter.includes(l.actor_role ?? '')) return false;
      if (dateFilter.from && l.created_at < dateFilter.from) return false;
      if (dateFilter.to && l.created_at > dateFilter.to + 'T23:59:59') return false;
      return true;
    });
  }, [logs, filters]);

  // ---------------------------------------------------------------------------
  // Pagination (client-side)
  // ---------------------------------------------------------------------------
  const totalFiltered = filteredLogs.length;
  const pagedLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, page]);

  // ---------------------------------------------------------------------------
  // Columns
  // ---------------------------------------------------------------------------
  const columns: ColumnDef<AuditLog, unknown>[] = [
    {
      id: 'created_at',
      header: 'Timestamp',
      size: 180,
      cell: ({ row }: { row: { original: AuditLog } }) => {
        const v = row.original.created_at;
        if (!v) return <span className="text-[var(--neutral-400)]">—</span>;
        try {
          return (
            <span className="tabular-nums whitespace-nowrap text-xs text-[var(--neutral-700)]">
              {format(new Date(v), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
            </span>
          );
        } catch {
          return <span>{v}</span>;
        }
      },
    },
    {
      id: 'entity',
      header: 'Entidad',
      cell: ({ row }: { row: { original: AuditLog } }) => (
        <span className="text-sm text-[var(--neutral-800)]">
          {row.original.entity}{' '}
          <span className="font-mono text-xs text-[var(--neutral-400)]">
            #{row.original.entity_id.slice(0, 8)}
          </span>
        </span>
      ),
    },
    {
      id: 'action',
      header: 'Acción',
      size: 140,
      cell: ({ row }: { row: { original: AuditLog } }) => actionBadge(row.original.action),
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: ({ row }: { row: { original: AuditLog } }) => {
        const role = row.original.actor_role;
        const id = row.original.actor_id;
        if (!role && !id) {
          return <span className="text-[var(--neutral-400)] text-xs">—</span>;
        }
        return (
          <div className="flex flex-col gap-0.5">
            {role && (
              <Badge className="bg-[var(--neutral-100)] text-[var(--neutral-600)] border border-[var(--neutral-200)] w-fit text-[10px]">
                {role}
              </Badge>
            )}
            {id && (
              <span className="font-mono text-[10px] text-[var(--neutral-400)]">
                {id.slice(0, 12)}…
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'hash_integrity',
      header: 'Hash',
      size: 60,
      enableSorting: false,
      cell: ({ row }: { row: { original: AuditLog } }) => {
        if (row.original.row_hash !== null) {
          return (
            <span
              className="text-[var(--success)] font-medium"
              title={row.original.row_hash}
            >
              ✓
            </span>
          );
        }
        return (
          <span className="text-[var(--neutral-400)]" title="Sin hash">
            –
          </span>
        );
      },
    },
    createActionsColumn<AuditLog>([
      {
        icon: <Eye size={14} />,
        label: 'Ver diff',
        onClick: (row) => setSelectedLog(row),
      },
    ]) as ColumnDef<AuditLog, unknown>,
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Hash chain banner */}
      {chainBanner}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <Stat
            label="Eventos hoy"
            value={eventsToday}
            icon={<Calendar size={16} />}
            loading={isLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Acción más frecuente"
            value={topAction}
            icon={<Activity size={16} />}
            loading={isLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Entidades"
            value={distinctEntities}
            icon={<Layers size={16} />}
            loading={isLoading}
          />
        </Card>
      </div>

      {/* FilterBar */}
      <FilterBar
        filters={[
          {
            id: 'q',
            type: 'search',
            placeholder: 'Buscar por entity_id...',
          },
          {
            id: 'entity',
            type: 'multiselect',
            label: 'Entidad',
            options: entityOptions,
          },
          {
            id: 'action',
            type: 'multiselect',
            label: 'Acción',
            options: actionOptions,
          },
          {
            id: 'actor_role',
            type: 'multiselect',
            label: 'Rol actor',
            options: actorRoleOptions,
          },
          { id: 'fecha', type: 'daterange', label: 'Fecha' },
        ]}
        value={filters}
        onChange={(v) => {
          setFilters(v);
          setPage(1);
        }}
      />

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={pagedLogs}
        loading={isLoading}
        error={error}
        onRowClick={(row) => setSelectedLog(row)}
        {...(totalFiltered > PAGE_SIZE
          ? {
              pagination: {
                pageIndex: page - 1,
                pageSize: PAGE_SIZE,
                total: totalFiltered,
                onChange: ({ pageIndex }: { pageIndex: number; pageSize: number }) =>
                  setPage(pageIndex + 1),
              },
            }
          : {})}
        emptyState={
          <div className="py-16 text-center text-[var(--neutral-500)] text-sm">
            No hay eventos que coincidan con los filtros.
          </div>
        }
      />

      {/* Detail Drawer */}
      <Drawer
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
        title="Detalle de evento"
        width="md"
      >
        {selectedLog && <AuditDetailDrawerContent log={selectedLog} />}
      </Drawer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail drawer content
// ---------------------------------------------------------------------------
function AuditDetailDrawerContent({ log }: { log: AuditLog }) {
  const isChainOk = log.row_hash !== null && log.prev_hash !== null;

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Entidad', value: log.entity },
    {
      label: 'Entity ID',
      value: (
        <span className="font-mono text-xs break-all">{log.entity_id}</span>
      ),
    },
    { label: 'Acción', value: actionBadge(log.action) },
    {
      label: 'Rol actor',
      value: log.actor_role ? (
        <Badge className="bg-[var(--neutral-100)] text-[var(--neutral-600)] border border-[var(--neutral-200)]">
          {log.actor_role}
        </Badge>
      ) : (
        <span className="text-[var(--neutral-400)]">—</span>
      ),
    },
    {
      label: 'Actor ID',
      value: log.actor_id ? (
        <span className="font-mono text-xs break-all">{log.actor_id}</span>
      ) : (
        <span className="text-[var(--neutral-400)]">—</span>
      ),
    },
    {
      label: 'Timestamp',
      value: (
        <span className="tabular-nums text-sm">
          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Fields */}
      <div className="space-y-3">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--neutral-500)] uppercase tracking-wider">
              {label}
            </span>
            <div className="text-sm text-[var(--neutral-900)]">{value}</div>
          </div>
        ))}
      </div>

      {/* Diff */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--neutral-700)]">Cambios</p>
        <pre className="text-xs bg-[var(--neutral-50)] rounded p-3 overflow-auto max-h-64">
          {log.diff != null ? JSON.stringify(log.diff, null, 2) : '—'}
        </pre>
      </div>

      {/* Hash chain visualization */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--neutral-700)]">Cadena de hash</p>
        <div className="flex items-center gap-2 text-xs font-mono bg-[var(--neutral-50)] rounded p-3">
          <span className="truncate max-w-[120px] text-[var(--neutral-400)]">
            {log.prev_hash ? `${log.prev_hash.slice(0, 12)}…` : <span className="italic">sin prev_hash</span>}
          </span>
          {isChainOk ? (
            <Link2 size={14} className="shrink-0 text-[var(--success)]" />
          ) : (
            <Link2Off size={14} className="shrink-0 text-[var(--danger)]" />
          )}
          <span className="truncate max-w-[120px] text-[var(--neutral-400)]">
            {log.row_hash ? `${log.row_hash.slice(0, 12)}…` : <span className="italic">sin row_hash</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
