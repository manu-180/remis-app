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
  RefreshCw,
} from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { DataTable, FilterBar, createActionsColumn } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Drawer } from '@/components/ui/drawer';
import { toast } from '@/components/ui/use-toast';
import { escapeOrFilter } from '@/lib/postgrest-safe';

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

type AuditStatsRow = {
  entity: string;
  action: string;
  actor_role: string | null;
  created_at: string;
};

const chainEntrySchema = z
  .object({
    mismatch: z.boolean().optional(),
  })
  .passthrough();
const chainDataSchema = z.array(chainEntrySchema);
type ChainEntry = z.infer<typeof chainEntrySchema>;

type AuditPageData = {
  logs: AuditLog[];
  totalCount: number;
};

type AuditMetaData = {
  stats: AuditStatsRow[];
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
const STATS_LIMIT = 2000;

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
  // Stats + chain (lightweight, fetched once)
  // ---------------------------------------------------------------------------
  const [verifying, setVerifying] = useState(false);
  const { data: meta, isLoading: metaLoading, refetch: refetchMeta } = useSupabaseQuery<AuditMetaData>(
    ['audit-meta'],
    async (sb) => {
      const [statsResult, chainResult] = await Promise.all([
        sb
          .from('audit_log')
          .select('entity, action, actor_role, created_at')
          .order('created_at', { ascending: false })
          .limit(STATS_LIMIT),
        (sb as any)
          .rpc('audit_log_hash_chain')
          .then((r: { data: unknown; error: unknown }) => r)
          .catch(() => ({ data: null, error: new Error('rpc error') })),
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
          stats: (statsResult.data ?? []) as AuditStatsRow[],
          chainData,
          chainError: !!chainResult.error || chainShapeError,
        },
        error: statsResult.error,
      };
    },
  );

  const stats = useMemo(() => meta?.stats ?? [], [meta]);
  const chainData = meta?.chainData ?? null;
  const chainError = meta?.chainError ?? false;

  // ---------------------------------------------------------------------------
  // Server-side paginated logs
  // ---------------------------------------------------------------------------
  const q = typeof filters.q === 'string' ? filters.q : '';
  const entityFilter = Array.isArray(filters.entity) ? (filters.entity as string[]) : [];
  const actionFilter = Array.isArray(filters.action) ? (filters.action as string[]) : [];
  const roleFilter = Array.isArray(filters.actor_role) ? (filters.actor_role as string[]) : [];
  const dateFilter =
    typeof filters.fecha === 'object' && filters.fecha !== null
      ? (filters.fecha as { from?: string; to?: string })
      : {};

  const {
    data: pageData,
    isLoading: pageLoading,
    error,
  } = useSupabaseQuery<AuditPageData>(
    ['audit-log-page', filters, page],
    async (sb) => {
      let query = (sb as any)
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (entityFilter.length > 0) {
        query = query.in('entity', entityFilter);
      }
      if (actionFilter.length > 0) {
        query = query.in('action', actionFilter);
      }
      if (roleFilter.length > 0) {
        query = query.in('actor_role', roleFilter);
      }
      if (q) {
        const safe = escapeOrFilter(q);
        query = query.ilike('entity_id', `%${safe}%`);
      }
      if (dateFilter.from) {
        query = query.gte('created_at', dateFilter.from + 'T00:00:00');
      }
      if (dateFilter.to) {
        query = query.lte('created_at', dateFilter.to + 'T23:59:59');
      }

      const result = await query;
      return {
        data: {
          logs: (result.data ?? []) as AuditLog[],
          totalCount: result.count ?? 0,
        },
        error: result.error,
      };
    },
  );

  const pagedLogs = pageData?.logs ?? [];
  const totalCount = pageData?.totalCount ?? 0;
  const isLoading = pageLoading || metaLoading;

  // ---------------------------------------------------------------------------
  // Hash chain banner — re-verifies via the same RPC the page loads with
  // ---------------------------------------------------------------------------
  async function handleVerifyChain() {
    setVerifying(true);
    try {
      await refetchMeta();
      toast.success('Cadena de auditoría re-verificada.');
    } catch {
      toast.error('No pudimos verificar la cadena. Reintentá en unos segundos.');
    } finally {
      setVerifying(false);
    }
  }

  const verifyButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleVerifyChain}
      disabled={verifying || metaLoading}
      className="ml-auto shrink-0"
      aria-label="Verificar cadena ahora"
    >
      <RefreshCw size={13} className={verifying ? 'animate-spin' : ''} />
      <span className="ml-1.5">Verificar ahora</span>
    </Button>
  );

  const chainBanner = useMemo(() => {
    if (metaLoading) return null;
    if (chainError || chainData === null) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-[var(--warning)]">
          <AlertTriangle size={18} />
          <span className="font-medium">
            No se pudo verificar la cadena de auditoría.
          </span>
          {verifyButton}
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
          {verifyButton}
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
          {verifyButton}
        </div>
      );
    }

    const total = chainData.length;
    return (
      <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] text-sm">
        <ShieldCheck size={16} />
        <span>Cadena de auditoría íntegra ({total} eventos verificados)</span>
        {verifyButton}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaLoading, chainError, chainData, verifying]);

  // ---------------------------------------------------------------------------
  // KPI strip — computed from lightweight stats query
  // ---------------------------------------------------------------------------
  const today = todayIso();
  const eventsToday = useMemo(
    () => stats.filter((l) => l.created_at.startsWith(today)).length,
    [stats, today],
  );

  const topAction = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of stats) {
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
  }, [stats]);

  const distinctEntities = useMemo(
    () => new Set(stats.map((l) => l.entity)).size,
    [stats],
  );

  // ---------------------------------------------------------------------------
  // Filter options (dynamic from stats sample)
  // ---------------------------------------------------------------------------
  const entityOptions = useMemo(
    () =>
      Array.from(new Set(stats.map((l) => l.entity)))
        .sort()
        .map((e) => ({ value: e, label: e })),
    [stats],
  );

  const actionOptions = useMemo(
    () =>
      Array.from(new Set(stats.map((l) => l.action)))
        .sort()
        .map((a) => ({ value: a, label: a })),
    [stats],
  );

  const actorRoleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'dispatcher', label: 'Dispatcher' },
    { value: 'system', label: 'System' },
  ];

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
            loading={metaLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Acción más frecuente"
            value={topAction}
            icon={<Activity size={16} />}
            loading={metaLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Entidades"
            value={distinctEntities}
            icon={<Layers size={16} />}
            loading={metaLoading}
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
        {...(totalCount > PAGE_SIZE
          ? {
              pagination: {
                pageIndex: page - 1,
                pageSize: PAGE_SIZE,
                total: totalCount,
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
