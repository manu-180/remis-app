'use client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { useState, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  DataTable,
  createDateColumn,
  createStatusColumn,
} from '@/components/admin/data-table';
import type { PillVariant } from '@/components/ui/status-pill';
import { toast } from '@/components/ui/use-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type KycStatus = 'pending' | 'approved' | 'rejected' | 'expired';

type KycRow = {
  id: string;
  driver_id: string;
  provider: 'didit' | 'aws_rekognition' | string | null;
  status: KycStatus | string | null;
  score: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any | null;
  verified_at: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function providerLabel(provider: string | null): string {
  if (provider === 'didit') return 'Didit';
  if (provider === 'aws_rekognition') return 'AWS Rekognition';
  return provider ?? 'Desconocido';
}

function initials(name: string | null): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function scorePercent(score: number | null): number {
  if (score == null) return 0;
  // score may already be 0-1 or 0-100; normalise to 0-100
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

function statusPillVariant(status: string | null): PillVariant {
  switch (status) {
    case 'approved': return 'online';
    case 'rejected': return 'danger';
    case 'expired':  return 'offline';
    default:         return 'pending';
  }
}

function statusLabel(status: string | null): string {
  switch (status) {
    case 'approved': return 'Aprobado';
    case 'rejected': return 'Rechazado';
    case 'expired':  return 'Vencido';
    default:         return 'Pendiente';
  }
}

// ---------------------------------------------------------------------------
// PendingCard
// ---------------------------------------------------------------------------
interface PendingCardProps {
  row: KycRow;
  onResolved: () => void;
}

function PendingCard({ row, onResolved }: PendingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingReject, setLoadingReject] = useState(false);

  const name = row.profiles?.full_name ?? 'Sin nombre';
  const avatarUrl = row.profiles?.avatar_url;
  const pct = scorePercent(row.score);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metaFields: Record<string, any> | null =
    row.metadata && typeof row.metadata === 'object' && 'fields' in row.metadata
      ? (row.metadata as { fields: Record<string, unknown> }).fields
      : null;

  const handleApprove = useCallback(async () => {
    setLoadingApprove(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.rpc('admin_resolve_kyc', {
        p_verification_id: row.id,
        p_decision: 'approved',
        p_notes: null,
      });
      if (error) throw error;
      toast.success('Verificación aprobada.');
      onResolved();
    } catch (err) {
      toast.error(`Error al aprobar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingApprove(false);
    }
  }, [row.id, onResolved]);

  const handleConfirmReject = useCallback(async () => {
    if (!reason.trim()) {
      setReasonError('El motivo de rechazo es requerido.');
      return;
    }
    setReasonError('');
    setLoadingReject(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.rpc('admin_resolve_kyc', {
        p_verification_id: row.id,
        p_decision: 'rejected',
        p_notes: reason.trim(),
      });
      if (error) throw error;
      toast.success('Verificación rechazada.');
      onResolved();
    } catch (err) {
      toast.error(`Error al rechazar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingReject(false);
    }
  }, [row.id, reason, onResolved]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-5 pb-5 space-y-4">
        {/* Header row: avatar + name + provider badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="h-12 w-12 rounded-full object-cover shrink-0"
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary,#0066ff)] text-white text-sm font-semibold">
                {initials(name)}
              </span>
            )}
            <div>
              <p className="font-semibold text-[var(--neutral-900)]">{name}</p>
              <p className="text-xs text-[var(--neutral-500)] font-mono">{row.driver_id.slice(0, 8)}</p>
            </div>
          </div>
          <Badge className="bg-[var(--neutral-100)] text-[var(--neutral-700)] text-xs">
            {providerLabel(row.provider)}
          </Badge>
        </div>

        {/* Score bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--neutral-600)]">
            <span>Score</span>
            <span className="font-semibold tabular-nums">{row.score != null ? `${pct}%` : '—'}</span>
          </div>
          <div className="w-full bg-[var(--neutral-200)] rounded-full h-2">
            <div
              className="h-2 rounded-full bg-[var(--success)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Metadata fields */}
        {metaFields && Object.keys(metaFields).length > 0 && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {Object.entries(metaFields).map(([k, v]) => (
              <div key={k} className="flex gap-1.5">
                <span className="text-[var(--neutral-500)] capitalize shrink-0">{k.replace(/_/g, ' ')}:</span>
                <span className="text-[var(--neutral-900)] font-medium truncate">{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Photo placeholders */}
        <div className="flex gap-3">
          <div>
            <p className="text-xs text-[var(--neutral-500)] mb-1">Foto documento</p>
            <div className="group relative w-[120px] h-[80px] bg-[var(--neutral-100)] rounded overflow-hidden cursor-zoom-in">
              <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--neutral-400)]">
                Foto documento
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--neutral-500)] mb-1">Foto selfie</p>
            <div className="group relative w-[120px] h-[80px] bg-[var(--neutral-100)] rounded overflow-hidden cursor-zoom-in">
              <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--neutral-400)]">
                Foto selfie
              </div>
            </div>
          </div>
        </div>

        {/* Ver más toggle */}
        <div>
          <button
            className="flex items-center gap-1 text-xs text-[var(--neutral-500)] hover:text-[var(--neutral-900)] transition-colors"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Ver menos' : 'Ver más'}
          </button>
          {expanded && (
            <pre className="text-xs bg-[var(--neutral-50)] p-3 rounded overflow-auto max-h-48 mt-2">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          )}
        </div>

        {/* Reject inline form */}
        {rejecting && (
          <div className="space-y-2 border-t border-[var(--neutral-100)] pt-3">
            <Textarea
              placeholder="Motivo del rechazo (requerido)..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setReasonError('');
              }}
              rows={3}
            />
            {reasonError && (
              <p className="text-xs text-[var(--danger)]">{reasonError}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmReject}
                disabled={loadingReject}
              >
                {loadingReject ? 'Rechazando...' : 'Confirmar rechazo'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRejecting(false);
                  setReason('');
                  setReasonError('');
                }}
                disabled={loadingReject}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!rejecting && (
          <div className="flex gap-2 border-t border-[var(--neutral-100)] pt-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              disabled={loadingApprove || loadingReject}
            >
              <Check size={14} />
              {loadingApprove ? 'Aprobando...' : 'Aprobar'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setRejecting(true)}
              disabled={loadingApprove}
            >
              <X size={14} />
              Rechazar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------
export function KycClient() {
  const [version, setVersion] = useState(0);

  const { data: verifications, isLoading, error } = useSupabaseQuery<KycRow[]>(
    ['kyc-list', version],
    async (sb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (sb as any)
        .from('kyc_verifications')
        .select('*, profiles(full_name, avatar_url)')
        .order('created_at', { ascending: false });
      return {
        data: (result.data ?? []) as KycRow[],
        error: result.error,
      };
    },
  );

  const onResolved = useCallback(() => setVersion((v) => v + 1), []);

  const all = verifications ?? [];
  const pending  = all.filter((r) => r.status === 'pending');
  const approved = all.filter((r) => r.status === 'approved');
  const rejected = all.filter((r) => r.status === 'rejected');
  const expired  = all.filter((r) => r.status === 'expired');

  // ---------------------------------------------------------------------------
  // Columns for non-pending DataTable tabs
  // ---------------------------------------------------------------------------
  const historyColumns: ColumnDef<KycRow, unknown>[] = [
    {
      id: 'driver',
      header: 'Conductor',
      enableSorting: false,
      cell: ({ row }: { row: { original: KycRow } }) => {
        const r = row.original;
        const name = r.profiles?.full_name ?? 'Sin nombre';
        const src = r.profiles?.avatar_url;
        const ini = initials(name);
        return (
          <div className="flex items-center gap-2.5">
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={name} className="h-7 w-7 rounded-full object-cover shrink-0" />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary,#0066ff)] text-white text-[10px] font-semibold">
                {ini}
              </span>
            )}
            <span className="truncate font-medium">{name}</span>
          </div>
        );
      },
    },
    {
      id: 'provider',
      header: 'Proveedor',
      enableSorting: false,
      cell: ({ row }: { row: { original: KycRow } }) => (
        <Badge className="bg-[var(--neutral-100)] text-[var(--neutral-700)] text-xs">
          {providerLabel(row.original.provider)}
        </Badge>
      ),
    },
    createStatusColumn<KycRow>(
      (r) => ({ variant: statusPillVariant(r.status), label: statusLabel(r.status) }),
      'driver',
    ) as ColumnDef<KycRow, unknown>,
    {
      id: 'score',
      header: 'Score',
      enableSorting: false,
      cell: ({ row }: { row: { original: KycRow } }) => {
        const r = row.original;
        if (r.score == null) return <span className="text-[var(--neutral-400)]">—</span>;
        return <span className="tabular-nums text-sm">{scorePercent(r.score)}%</span>;
      },
    },
    createDateColumn<KycRow>('verified_at', 'Fecha verificación') as ColumnDef<KycRow, unknown>,
  ];

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-[var(--danger)]">
          Error al cargar verificaciones: {error.message}
        </CardContent>
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab label with count
  // ---------------------------------------------------------------------------
  function TabLabel({ label, count }: { label: string; count: number }) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {label}
        <span className="inline-flex items-center justify-center rounded-full bg-[var(--neutral-200)] text-[var(--neutral-700)] text-[10px] font-bold px-1.5 py-0 min-w-[18px] h-[18px] leading-none">
          {count}
        </span>
      </span>
    );
  }

  return (
    <Tabs defaultValue="pending" className="space-y-4">
      <TabsList className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] p-1 rounded-[var(--radius-md)] h-auto">
        <TabsTrigger value="pending" className="rounded-[var(--radius-md)] data-[state=active]:bg-[var(--neutral-0)] data-[state=active]:shadow-sm text-sm px-4 py-1.5">
          <TabLabel label="Pendientes" count={pending.length} />
        </TabsTrigger>
        <TabsTrigger value="approved" className="rounded-[var(--radius-md)] data-[state=active]:bg-[var(--neutral-0)] data-[state=active]:shadow-sm text-sm px-4 py-1.5">
          <TabLabel label="Aprobados" count={approved.length} />
        </TabsTrigger>
        <TabsTrigger value="rejected" className="rounded-[var(--radius-md)] data-[state=active]:bg-[var(--neutral-0)] data-[state=active]:shadow-sm text-sm px-4 py-1.5">
          <TabLabel label="Rechazados" count={rejected.length} />
        </TabsTrigger>
        <TabsTrigger value="expired" className="rounded-[var(--radius-md)] data-[state=active]:bg-[var(--neutral-0)] data-[state=active]:shadow-sm text-sm px-4 py-1.5">
          <TabLabel label="Vencidos" count={expired.length} />
        </TabsTrigger>
      </TabsList>

      {/* ── PENDIENTES ── */}
      <TabsContent value="pending">
        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-[var(--neutral-500)]">
              No hay verificaciones pendientes.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pending.map((row) => (
              <PendingCard key={row.id} row={row} onResolved={onResolved} />
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── APROBADOS ── */}
      <TabsContent value="approved">
        {approved.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-[var(--neutral-500)]">
              No hay verificaciones aprobadas.
            </CardContent>
          </Card>
        ) : (
          <DataTable
            columns={historyColumns}
            data={approved}
            emptyState={
              <div className="py-10 text-center text-sm text-[var(--neutral-500)]">
                Sin registros.
              </div>
            }
          />
        )}
      </TabsContent>

      {/* ── RECHAZADOS ── */}
      <TabsContent value="rejected">
        {rejected.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-[var(--neutral-500)]">
              No hay verificaciones rechazadas.
            </CardContent>
          </Card>
        ) : (
          <DataTable
            columns={historyColumns}
            data={rejected}
            emptyState={
              <div className="py-10 text-center text-sm text-[var(--neutral-500)]">
                Sin registros.
              </div>
            }
          />
        )}
      </TabsContent>

      {/* ── VENCIDOS ── */}
      <TabsContent value="expired">
        {expired.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-[var(--neutral-500)]">
              No hay verificaciones vencidas.
            </CardContent>
          </Card>
        ) : (
          <DataTable
            columns={historyColumns}
            data={expired}
            emptyState={
              <div className="py-10 text-center text-sm text-[var(--neutral-500)]">
                Sin registros.
              </div>
            }
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
