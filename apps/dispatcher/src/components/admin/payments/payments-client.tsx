'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useMemo } from 'react';
import { Copy, Eye, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ColumnDef } from '@tanstack/react-table';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { useExportCsv } from '@/hooks/use-export-csv';
import type { CsvColumn } from '@/lib/export-csv';
import { escapeOrFilter } from '@/lib/postgrest-safe';
import { useConfirm } from '@/components/admin/confirm-dialog';
import { toast } from '@/components/ui/use-toast';
import {
  DataTable,
  FilterBar,
  ExportCsvButton,
  createDateColumn,
} from '@/components/admin/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import type { PillVariant } from '@/components/ui/status-pill';
import { Drawer } from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PaymentRow = {
  id: string;
  ride_id: string;
  method: 'cash' | 'mercadopago';
  amount_ars: number;
  status: 'pending' | 'approved' | 'refunded' | 'failed';
  mp_payment_id: string | null;
  mp_preference_id: string | null;
  paid_at: string | null;
};

type PaymentStatsRow = {
  amount_ars: number;
  status: PaymentRow['status'];
  method: PaymentRow['method'];
  paid_at: string | null;
};

type WebhookRow = {
  id: string;
  x_request_id: string | null;
  data_id: string;
  action: string;
  raw_body: any;
  signature_valid: boolean;
  processed_status: string;
  error_message: string | null;
  received_at: string;
};

const PAGE_SIZE = 50;
const STATS_LIMIT = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function fmtCurrency(n: number) {
  return arsFormatter.format(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  try {
    return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: es });
  } catch {
    return iso;
  }
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]!;
}

function currentMonthRange(): { from: Date; to: Date } {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  };
}

function mapPaymentStatus(status: string): { variant: PillVariant; label: string } {
  const map: Record<string, { variant: PillVariant; label: string }> = {
    approved: { variant: 'online', label: 'Aprobado' },
    pending: { variant: 'busy', label: 'Pendiente' },
    refunded: { variant: 'offline', label: 'Reembolsado' },
    failed: { variant: 'danger', label: 'Fallido' },
  };
  return map[status] ?? { variant: 'offline' as PillVariant, label: status };
}

function mapWebhookStatus(status: string): { variant: PillVariant; label: string } {
  const map: Record<string, { variant: PillVariant; label: string }> = {
    processed: { variant: 'online', label: 'Procesado' },
    failed: { variant: 'danger', label: 'Fallido' },
    pending: { variant: 'busy', label: 'Pendiente' },
  };
  return map[status] ?? { variant: 'offline' as PillVariant, label: status };
}

function computeKpis(rows: PaymentStatsRow[]) {
  const today = todayIso();
  const { from: monthFrom, to: monthTo } = currentMonthRange();

  let cobradoHoy = 0;
  let pendiente = 0;
  let reembolsadoMes = 0;
  let approvedTotal = 0;
  let approvedMP = 0;

  for (const p of rows) {
    if (p.status === 'approved') {
      approvedTotal++;
      if (p.method === 'mercadopago') approvedMP++;
      if (p.paid_at && p.paid_at.startsWith(today)) {
        cobradoHoy += p.amount_ars;
      }
    }
    if (p.status === 'pending') {
      pendiente += p.amount_ars;
    }
    if (p.status === 'refunded' && p.paid_at) {
      const d = new Date(p.paid_at);
      if (d >= monthFrom && d <= monthTo) {
        reembolsadoMes += p.amount_ars;
      }
    }
  }

  const pctMP =
    approvedTotal > 0 ? Math.round((approvedMP / approvedTotal) * 100) : 0;

  return { cobradoHoy, pendiente, reembolsadoMes, pctMP };
}

// ---------------------------------------------------------------------------
// Payment Detail Drawer
// ---------------------------------------------------------------------------
interface PaymentDetailDrawerProps {
  payment: PaymentRow | null;
  open: boolean;
  onClose: () => void;
  onRefund: (id: string) => Promise<void>;
  refunding: boolean;
}

function PaymentDetailDrawer({
  payment,
  open,
  onClose,
  onRefund,
  refunding,
}: PaymentDetailDrawerProps) {
  if (!payment) return null;

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'ID', value: <span className="font-mono text-xs">{payment.id}</span> },
    { label: 'Ride ID', value: <span className="font-mono text-xs">{payment.ride_id}</span> },
    {
      label: 'Método',
      value: payment.method === 'mercadopago' ? 'MercadoPago' : 'Efectivo',
    },
    { label: 'Monto', value: fmtCurrency(payment.amount_ars) },
    {
      label: 'Estado',
      value: (
        <StatusPill
          variant={mapPaymentStatus(payment.status).variant}
          label={mapPaymentStatus(payment.status).label}
        />
      ),
    },
    { label: 'Fecha de pago', value: fmtDate(payment.paid_at) },
    {
      label: 'MP Payment ID',
      value: payment.mp_payment_id ?? <span className="text-[var(--neutral-400)]">—</span>,
    },
    {
      label: 'MP Preference ID',
      value: payment.mp_preference_id ?? <span className="text-[var(--neutral-400)]">—</span>,
    },
  ];

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Detalle de pago"
      width="md"
      footer={
        payment.status === 'approved' ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onRefund(payment.id)}
            disabled={refunding}
          >
            <RotateCcw size={14} className="mr-1.5" />
            {refunding ? 'Reembolsando...' : 'Reembolsar'}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Fields */}
        <div className="space-y-3">
          {fields.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4 text-sm">
              <span className="text-[var(--neutral-500)] shrink-0">{label}</span>
              <span className="text-[var(--neutral-900)] text-right">{value}</span>
            </div>
          ))}
        </div>

        {/* Status timeline */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--neutral-500)] mb-3">
            Timeline
          </p>
          <ol className="relative border-l border-[var(--neutral-200)] space-y-4 pl-4">
            <li className="relative">
              <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-[var(--neutral-200)] border-2 border-[var(--neutral-0)]" />
              <p className="text-sm font-medium text-[var(--neutral-900)]">Pendiente</p>
              <p className="text-xs text-[var(--neutral-500)]">Creado</p>
            </li>
            {(payment.status === 'approved' ||
              payment.status === 'refunded') && (
              <li className="relative">
                <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-[var(--success)] border-2 border-[var(--neutral-0)]" />
                <p className="text-sm font-medium text-[var(--neutral-900)]">Aprobado</p>
                <p className="text-xs text-[var(--neutral-500)]">
                  {fmtDate(payment.paid_at)}
                </p>
              </li>
            )}
            {payment.status === 'refunded' && (
              <li className="relative">
                <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-[var(--neutral-400)] border-2 border-[var(--neutral-0)]" />
                <p className="text-sm font-medium text-[var(--neutral-900)]">Reembolsado</p>
              </li>
            )}
            {payment.status === 'failed' && (
              <li className="relative">
                <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-[var(--danger)] border-2 border-[var(--neutral-0)]" />
                <p className="text-sm font-medium text-[var(--neutral-900)]">Fallido</p>
              </li>
            )}
          </ol>
        </div>

        {/* Raw MP payload — only if mp_payment_id exists */}
        {payment.mp_payment_id && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--neutral-500)] mb-2">
              MP Payment ID raw
            </p>
            <pre className="overflow-auto max-h-48 text-xs bg-[var(--neutral-50)] rounded p-3">
              {payment.mp_payment_id}
            </pre>
          </div>
        )}
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Helper to apply payments filters to a Supabase query
// ---------------------------------------------------------------------------
function applyPaymentsFilters(
  query: any,
  filters: {
    q: string;
    statusFilter: string[];
    methodFilter: string[];
    dateFilter: { from?: string; to?: string };
  },
) {
  const { q, statusFilter, methodFilter, dateFilter } = filters;
  if (statusFilter.length > 0) query = query.in('status', statusFilter);
  if (methodFilter.length > 0) query = query.in('method', methodFilter);
  if (q) {
    const safe = escapeOrFilter(q);
    query = query.or(`mp_payment_id.ilike.%${safe}%,ride_id.ilike.%${safe}%`);
  }
  if (dateFilter.from) query = query.gte('paid_at', dateFilter.from + 'T00:00:00');
  if (dateFilter.to) query = query.lte('paid_at', dateFilter.to + 'T23:59:59');
  return query;
}

// ---------------------------------------------------------------------------
// Main client
// ---------------------------------------------------------------------------
export function PaymentsClient() {
  const confirm = useConfirm();

  // Detail drawer
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);

  // Webhook raw dialog
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookRow | null>(null);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);

  // Payments filters + page
  const [filters, setFilters] = useState<Record<string, unknown>>({
    q: '',
    status: [] as string[],
    method: [] as string[],
    fecha: {} as { from?: string; to?: string },
  });
  const [page, setPage] = useState(1);

  // Webhooks page
  const [webhooksPage, setWebhooksPage] = useState(1);

  // Normalized filter values, derived from `filters` (stable references for hook deps)
  const filterArgs = useMemo(
    () => ({
      q: typeof filters.q === 'string' ? filters.q : '',
      statusFilter: Array.isArray(filters.status) ? (filters.status as string[]) : [],
      methodFilter: Array.isArray(filters.method) ? (filters.method as string[]) : [],
      dateFilter:
        typeof filters.fecha === 'object' && filters.fecha !== null
          ? (filters.fecha as { from?: string; to?: string })
          : {},
    }),
    [filters],
  );

  // ---------------------------------------------------------------------------
  // KPI stats (lightweight — last 1000 rows globally)
  // ---------------------------------------------------------------------------
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useSupabaseQuery<PaymentStatsRow[]>(
    ['payments-stats'],
    async (sb) => {
      const { data, error } = await sb
        .from('payments')
        .select('amount_ars, status, method, paid_at')
        .order('paid_at', { ascending: false, nullsFirst: false })
        .limit(STATS_LIMIT);
      return {
        data: (data ?? []) as PaymentStatsRow[],
        error,
      };
    },
  );

  const kpis = useMemo(() => computeKpis(stats ?? []), [stats]);

  // ---------------------------------------------------------------------------
  // Paginated payments
  // ---------------------------------------------------------------------------
  const {
    data: pageData,
    isLoading: pageLoading,
    error,
    refetch: refetchPage,
  } = useSupabaseQuery<{ rows: PaymentRow[]; total: number }>(
    ['payments-page', filters, page],
    async (sb) => {
      let query: any = (sb as any)
        .from('payments')
        .select('*', { count: 'exact' })
        .order('paid_at', { ascending: false, nullsFirst: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      query = applyPaymentsFilters(query, filterArgs);

      const result = await query;
      return {
        data: {
          rows: (result.data ?? []) as PaymentRow[],
          total: result.count ?? 0,
        },
        error: result.error,
      };
    },
  );

  const payments = pageData?.rows ?? [];
  const totalPayments = pageData?.total ?? 0;
  const loading = pageLoading || statsLoading;

  // ---------------------------------------------------------------------------
  // Paginated webhooks
  // ---------------------------------------------------------------------------
  const { data: webhooksData, isLoading: webhooksLoading } =
    useSupabaseQuery<{ rows: WebhookRow[]; total: number }>(
      ['mp-webhooks-page', webhooksPage],
      async (sb) => {
        try {
          const result = await (sb as any)
            .from('mp_webhook_events')
            .select('*', { count: 'exact' })
            .order('received_at', { ascending: false })
            .range(
              (webhooksPage - 1) * PAGE_SIZE,
              webhooksPage * PAGE_SIZE - 1,
            );
          return {
            data: {
              rows: (result.data ?? []) as WebhookRow[],
              total: result.count ?? 0,
            },
            error: result.error,
          };
        } catch {
          // Table may not exist
          return { data: { rows: [], total: 0 }, error: null };
        }
      },
    );

  const webhooks = webhooksData?.rows ?? [];
  const totalWebhooks = webhooksData?.total ?? 0;

  // ---------------------------------------------------------------------------
  // Refund (simulated — only flips status, does NOT call MercadoPago)
  // ---------------------------------------------------------------------------
  async function handleRefund(paymentId: string) {
    const ok = await confirm({
      title: '¿Marcar este pago como reembolsado?',
      description:
        'Solo cambia el estado del pago en la base de datos. NO ejecuta una devolución real en MercadoPago. Para reembolsar de verdad, hacelo manualmente desde tu panel de MP.',
      confirmLabel: 'Sí, marcar como reembolsado',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!ok) return;

    setRefunding(true);
    const sb = getSupabaseBrowserClient();
    const { error } = await (sb as any)
      .from('payments')
      .update({ status: 'refunded' })
      .eq('id', paymentId);

    setRefunding(false);

    if (error) {
      toast.error('No pudimos marcar el pago como reembolsado. Reintentá en unos segundos.');
      return;
    }

    if (selectedPayment?.id === paymentId) {
      setSelectedPayment((p) => (p ? { ...p, status: 'refunded' as const } : p));
    }
    setDrawerOpen(false);
    toast.success('Pago marcado como reembolsado en el sistema.');
    refetchPage();
    refetchStats();
  }

  // ---------------------------------------------------------------------------
  // CSV exports — pull all filtered rows from server in chunks
  // ---------------------------------------------------------------------------
  const paymentCsvColumns: CsvColumn<PaymentRow>[] = [
    { header: 'ID', accessor: (p) => p.id },
    { header: 'Ride ID', accessor: (p) => p.ride_id },
    {
      header: 'Método',
      accessor: (p) => (p.method === 'mercadopago' ? 'MercadoPago' : 'Efectivo'),
    },
    { header: 'Monto (ARS)', accessor: (p) => p.amount_ars },
    { header: 'Estado', accessor: (p) => p.status },
    { header: 'MP Payment ID', accessor: (p) => p.mp_payment_id ?? '' },
    { header: 'MP Preference ID', accessor: (p) => p.mp_preference_id ?? '' },
    { header: 'Pagado (UTC)', accessor: (p) => p.paid_at ?? '' },
  ];

  const { exportNow: exportPayments, exporting: exportingPayments } =
    useExportCsv<PaymentRow>({
      filename: 'payments',
      columns: paymentCsvColumns,
      fetchPage: async (offset, limit) => {
        const sb = getSupabaseBrowserClient();
        let query: any = (sb as any)
          .from('payments')
          .select('*')
          .order('paid_at', { ascending: false, nullsFirst: false })
          .range(offset, offset + limit - 1);
        query = applyPaymentsFilters(query, filterArgs);
        const { data } = await query;
        return (data ?? []) as PaymentRow[];
      },
    });

  const webhookCsvColumns: CsvColumn<WebhookRow>[] = [
    { header: 'ID', accessor: (w) => w.id },
    { header: 'X-Request-ID', accessor: (w) => w.x_request_id ?? '' },
    { header: 'MP Payment ID', accessor: (w) => w.data_id },
    { header: 'Acción', accessor: (w) => w.action },
    {
      header: 'Firma válida',
      accessor: (w) => (w.signature_valid ? 'sí' : 'no'),
    },
    { header: 'Estado proceso', accessor: (w) => w.processed_status },
    { header: 'Mensaje error', accessor: (w) => w.error_message ?? '' },
    { header: 'Recibido (UTC)', accessor: (w) => w.received_at },
  ];

  const { exportNow: exportWebhooks, exporting: exportingWebhooks } =
    useExportCsv<WebhookRow>({
      filename: 'mp-webhooks',
      columns: webhookCsvColumns,
      fetchPage: async (offset, limit) => {
        const sb = getSupabaseBrowserClient();
        try {
          const { data } = await (sb as any)
            .from('mp_webhook_events')
            .select('*')
            .order('received_at', { ascending: false })
            .range(offset, offset + limit - 1);
          return (data ?? []) as WebhookRow[];
        } catch {
          return [];
        }
      },
    });

  // ---------------------------------------------------------------------------
  // Payments columns
  // ---------------------------------------------------------------------------
  const paymentColumns: ColumnDef<PaymentRow, unknown>[] = [
    {
      id: 'paid_at',
      header: 'Fecha',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="tabular-nums whitespace-nowrap text-sm">
          {fmtDate(row.original.paid_at)}
        </span>
      ),
    },
    {
      id: 'ride_id',
      header: 'Ride',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-[var(--neutral-600)]" title={row.original.ride_id}>
          {row.original.ride_id.slice(0, 8)}...
        </span>
      ),
    },
    {
      id: 'method',
      header: 'Método',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.method === 'mercadopago' ? 'MercadoPago' : 'Efectivo'}
        </span>
      ),
    },
    {
      id: 'amount_ars',
      header: 'Monto',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-medium">
          {fmtCurrency(row.original.amount_ars)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      enableSorting: false,
      cell: ({ row }) => {
        const { variant, label } = mapPaymentStatus(row.original.status);
        return <StatusPill variant={variant} label={label} />;
      },
    },
    {
      id: 'mp_payment_id',
      header: 'MP ID',
      enableSorting: false,
      cell: ({ row }) => {
        const mpId = row.original.mp_payment_id;
        if (!mpId) return <span className="text-[var(--neutral-400)]">—</span>;
        const truncated = mpId.length > 12 ? mpId.slice(0, 12) + '…' : mpId;
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs" title={mpId}>
              {truncated}
            </span>
            <button
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--neutral-400)] hover:text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(mpId);
              }}
              title="Copiar MP ID"
              aria-label="Copiar MP ID"
            >
              <Copy size={11} />
            </button>
          </div>
        );
      },
    },
    {
      id: '__view__',
      header: '',
      size: 52,
      enableSorting: false,
      cell: ({ row }) => (
        <button
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPayment(row.original);
            setDrawerOpen(true);
          }}
          title="Ver detalle"
        >
          <Eye size={11} />
          Ver
        </button>
      ),
    },
    {
      id: '__refund__',
      header: '',
      size: 52,
      enableSorting: false,
      cell: ({ row }) => {
        if (row.original.status !== 'approved') return null;
        return (
          <button
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleRefund(row.original.id);
            }}
            title="Reembolsar"
          >
            <RotateCcw size={11} />
            Reembolsar
          </button>
        );
      },
    },
  ];

  // ---------------------------------------------------------------------------
  // Webhooks columns
  // ---------------------------------------------------------------------------
  const webhookColumns: ColumnDef<WebhookRow, unknown>[] = [
    createDateColumn<WebhookRow>('received_at', 'Recibido') as ColumnDef<WebhookRow, unknown>,
    {
      id: 'data_id',
      header: 'MP Payment ID',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs" title={row.original.data_id}>
          {row.original.data_id.length > 14
            ? row.original.data_id.slice(0, 14) + '…'
            : row.original.data_id}
        </span>
      ),
    },
    {
      id: 'action',
      header: 'Acción',
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm">{row.original.action}</span>,
    },
    {
      id: 'signature_valid',
      header: 'Firma',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.signature_valid ? (
          <span className="text-[var(--success)] font-bold">✓</span>
        ) : (
          <span className="text-[var(--danger)] font-bold">✗</span>
        ),
    },
    {
      id: 'processed_status',
      header: 'Estado',
      enableSorting: false,
      cell: ({ row }) => {
        const { variant, label } = mapWebhookStatus(row.original.processed_status);
        return <StatusPill variant={variant} label={label} />;
      },
    },
    {
      id: '__webhook_view__',
      header: '',
      size: 80,
      enableSorting: false,
      cell: ({ row }) => (
        <button
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedWebhook(row.original);
            setWebhookDialogOpen(true);
          }}
          title="Ver raw"
        >
          <Eye size={11} />
          Ver raw
        </button>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Range label helpers
  // ---------------------------------------------------------------------------
  const paymentsRangeLabel = useMemo(() => {
    if (totalPayments === 0) return null;
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, totalPayments);
    return `Mostrando ${start.toLocaleString('es-AR')}–${end.toLocaleString('es-AR')} de ${totalPayments.toLocaleString('es-AR')}`;
  }, [page, totalPayments]);

  const webhooksRangeLabel = useMemo(() => {
    if (totalWebhooks === 0) return null;
    const start = (webhooksPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(webhooksPage * PAGE_SIZE, totalWebhooks);
    return `Mostrando ${start.toLocaleString('es-AR')}–${end.toLocaleString('es-AR')} de ${totalWebhooks.toLocaleString('es-AR')}`;
  }, [webhooksPage, totalWebhooks]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <Stat
            label="Cobrado hoy"
            value={fmtCurrency(kpis.cobradoHoy)}
            loading={statsLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Pendiente"
            value={fmtCurrency(kpis.pendiente)}
            loading={statsLoading}
          />
        </Card>
        <Card>
          <Stat
            label="Reembolsado (mes)"
            value={fmtCurrency(kpis.reembolsadoMes)}
            loading={statsLoading}
          />
        </Card>
        <Card>
          <Stat
            label="% MercadoPago"
            value={`${kpis.pctMP}%`}
            loading={statsLoading}
          />
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pagos">
        <TabsList>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks MP</TabsTrigger>
        </TabsList>

        {/* ---- Tab Pagos ---- */}
        <TabsContent value="pagos" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <FilterBar
                filters={[
                  {
                    id: 'q',
                    type: 'search',
                    placeholder: 'Buscar por MP ID o Ride ID...',
                  },
                  {
                    id: 'status',
                    type: 'multiselect',
                    label: 'Estado',
                    options: [
                      { value: 'pending', label: 'Pendiente' },
                      { value: 'approved', label: 'Aprobado' },
                      { value: 'refunded', label: 'Reembolsado' },
                      { value: 'failed', label: 'Fallido' },
                    ],
                  },
                  {
                    id: 'method',
                    type: 'multiselect',
                    label: 'Método',
                    options: [
                      { value: 'cash', label: 'Efectivo' },
                      { value: 'mercadopago', label: 'MercadoPago' },
                    ],
                  },
                  { id: 'fecha', type: 'daterange', label: 'Fecha' },
                ]}
                value={filters}
                onChange={(v) => {
                  setFilters(v);
                  setPage(1);
                }}
              />
            </div>
            <ExportCsvButton
              size="sm"
              onClick={exportPayments}
              exporting={exportingPayments}
              emptyHint={totalPayments === 0 && !loading}
            />
          </div>

          {paymentsRangeLabel && (
            <p className="text-xs text-[var(--neutral-500)] tabular-nums">
              {paymentsRangeLabel}
            </p>
          )}

          <DataTable
            columns={paymentColumns}
            data={payments}
            loading={loading}
            error={error}
            {...(totalPayments > PAGE_SIZE
              ? {
                  pagination: {
                    pageIndex: page - 1,
                    pageSize: PAGE_SIZE,
                    total: totalPayments,
                    onChange: ({ pageIndex }: { pageIndex: number; pageSize: number }) =>
                      setPage(pageIndex + 1),
                  },
                }
              : {})}
            emptyState={
              <div className="py-16 text-center text-[var(--neutral-500)] text-sm">
                No hay pagos que coincidan con los filtros.
              </div>
            }
          />
        </TabsContent>

        {/* ---- Tab Webhooks ---- */}
        <TabsContent value="webhooks" className="space-y-4 mt-4">
          {totalWebhooks === 0 && !webhooksLoading ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-[var(--neutral-500)]">
                No hay eventos de webhook registrados.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-end">
                <ExportCsvButton
                  size="sm"
                  onClick={exportWebhooks}
                  exporting={exportingWebhooks}
                  emptyHint={totalWebhooks === 0 && !webhooksLoading}
                />
              </div>
              {webhooksRangeLabel && (
                <p className="text-xs text-[var(--neutral-500)] tabular-nums">
                  {webhooksRangeLabel}
                </p>
              )}
              <DataTable
                columns={webhookColumns}
                data={webhooks}
                loading={webhooksLoading}
                {...(totalWebhooks > PAGE_SIZE
                  ? {
                      pagination: {
                        pageIndex: webhooksPage - 1,
                        pageSize: PAGE_SIZE,
                        total: totalWebhooks,
                        onChange: ({ pageIndex }: { pageIndex: number; pageSize: number }) =>
                          setWebhooksPage(pageIndex + 1),
                      },
                    }
                  : {})}
                emptyState={
                  <div className="py-16 text-center text-[var(--neutral-500)] text-sm">
                    No hay webhooks registrados.
                  </div>
                }
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment detail drawer */}
      <PaymentDetailDrawer
        payment={selectedPayment}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefund={handleRefund}
        refunding={refunding}
      />

      {/* Webhook raw dialog */}
      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Webhook raw — {selectedWebhook?.action}</DialogTitle>
          </DialogHeader>
          <pre className="text-xs overflow-auto max-h-96 bg-[var(--neutral-50)] p-4 rounded">
            {selectedWebhook
              ? JSON.stringify(selectedWebhook.raw_body, null, 2)
              : ''}
          </pre>
        </DialogContent>
      </Dialog>

    </>
  );
}
