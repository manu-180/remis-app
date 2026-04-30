'use client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { useState, useEffect, useMemo } from 'react';
import { Copy, Eye, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ColumnDef } from '@tanstack/react-table';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useExportCsv } from '@/hooks/use-export-csv';
import type { CsvColumn } from '@/lib/export-csv';
import {
  DataTable,
  FilterBar,
  ExportCsvButton,
  createActionsColumn,
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
import { formatARS } from '@/lib/format';

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

type WebhookRow = {
  id: string;
  x_request_id: string | null;
  data_id: string;
  action: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw_body: any;
  signature_valid: boolean;
  processed_status: string;
  error_message: string | null;
  received_at: string;
};

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

// ---------------------------------------------------------------------------
// KPI computations
// ---------------------------------------------------------------------------
function computeKpis(payments: PaymentRow[]) {
  const today = todayIso();
  const { from: monthFrom, to: monthTo } = currentMonthRange();

  let cobradoHoy = 0;
  let pendiente = 0;
  let reembolsadoMes = 0;
  let approvedTotal = 0;
  let approvedMP = 0;

  for (const p of payments) {
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
// Main client
// ---------------------------------------------------------------------------
export function PaymentsClient() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhooksLoading, setWebhooksLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Detail drawer
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);

  // Webhook raw dialog
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookRow | null>(null);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);

  // Payments filters
  const [filters, setFilters] = useState<Record<string, unknown>>({
    q: '',
    status: [] as string[],
    method: [] as string[],
    fecha: {} as { from?: string; to?: string },
  });

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const sb = getSupabaseBrowserClient();

    (async () => {
      setLoading(true);
      const { data, error: err } = await sb
        .from('payments')
        .select('*')
        .order('paid_at', { ascending: false, nullsFirst: false });

      if (err) {
        setError(new Error(err.message));
      } else {
        setPayments((data ?? []) as PaymentRow[]);
      }
      setLoading(false);
    })();

    (async () => {
      setWebhooksLoading(true);
      try {
        const { data } = await sb
          .from('mp_webhook_events')
          .select('*')
          .order('received_at', { ascending: false });
        setWebhooks((data ?? []) as WebhookRow[]);
      } catch {
        // Table may not exist — show empty state
        setWebhooks([]);
      }
      setWebhooksLoading(false);
    })();
  }, []);

  // ---------------------------------------------------------------------------
  // Refund
  // ---------------------------------------------------------------------------
  async function handleRefund(paymentId: string) {
    setRefunding(true);
    // NOTE: This is a simulated refund - does NOT call MP API
    // TODO: Implement real MP refund via API
    const sb = getSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any).from('payments').update({ status: 'refunded' }).eq('id', paymentId);
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: 'refunded' as const } : p)),
    );
    if (selectedPayment?.id === paymentId) {
      setSelectedPayment((p) => (p ? { ...p, status: 'refunded' as const } : p));
    }
    setRefunding(false);
    setDrawerOpen(false);
  }

  // ---------------------------------------------------------------------------
  // Client-side filtering
  // ---------------------------------------------------------------------------
  const filteredPayments = useMemo(() => {
    const q = typeof filters.q === 'string' ? filters.q.toLowerCase() : '';
    const statusFilter = Array.isArray(filters.status) ? (filters.status as string[]) : [];
    const methodFilter = Array.isArray(filters.method) ? (filters.method as string[]) : [];
    const dateFilter =
      typeof filters.fecha === 'object' && filters.fecha !== null
        ? (filters.fecha as { from?: string; to?: string })
        : {};

    return payments.filter((p) => {
      if (q) {
        const mpId = (p.mp_payment_id ?? '').toLowerCase();
        const rideId = p.ride_id.toLowerCase();
        if (!mpId.includes(q) && !rideId.includes(q)) return false;
      }
      if (statusFilter.length > 0 && !statusFilter.includes(p.status)) return false;
      if (methodFilter.length > 0 && !methodFilter.includes(p.method)) return false;
      if (dateFilter.from && p.paid_at) {
        if (p.paid_at < dateFilter.from + 'T00:00:00') return false;
      }
      if (dateFilter.to && p.paid_at) {
        if (p.paid_at > dateFilter.to + 'T23:59:59') return false;
      }
      return true;
    });
  }, [payments, filters]);

  // ---------------------------------------------------------------------------
  // KPIs
  // ---------------------------------------------------------------------------
  const kpis = useMemo(() => computeKpis(payments), [payments]);

  // ---------------------------------------------------------------------------
  // CSV exports — payments respect filters; webhooks export all rows in tab
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
      // Data is loaded entirely in memory; honor current filters by paginating
      // over filteredPayments rather than re-querying.
      fetchPage: async (offset, limit) => {
        return filteredPayments.slice(offset, offset + limit);
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
        return webhooks.slice(offset, offset + limit);
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
    // Actions column intentionally empty — view and refund are inline columns below
    // We add refund separately via dynamic column
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

  // "Ver" action injected directly so we avoid stale closure issues
  const paymentColumnsWithView: ColumnDef<PaymentRow, unknown>[] = [
    ...paymentColumns.slice(0, -1), // everything except __refund__
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
    paymentColumns[paymentColumns.length - 1]!, // __refund__
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
      cell: ({ row }) => (
        <span className="text-sm">{row.original.action}</span>
      ),
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
            loading={loading}
          />
        </Card>
        <Card>
          <Stat
            label="Pendiente"
            value={fmtCurrency(kpis.pendiente)}
            loading={loading}
          />
        </Card>
        <Card>
          <Stat
            label="Reembolsado (mes)"
            value={fmtCurrency(kpis.reembolsadoMes)}
            loading={loading}
          />
        </Card>
        <Card>
          <Stat
            label="% MercadoPago"
            value={`${kpis.pctMP}%`}
            loading={loading}
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
                onChange={setFilters}
              />
            </div>
            <ExportCsvButton
              size="sm"
              onClick={exportPayments}
              exporting={exportingPayments}
              emptyHint={filteredPayments.length === 0 && !loading}
            />
          </div>

          <DataTable
            columns={paymentColumnsWithView}
            data={filteredPayments}
            loading={loading}
            error={error}
            emptyState={
              <div className="py-16 text-center text-[var(--neutral-500)] text-sm">
                No hay pagos que coincidan con los filtros.
              </div>
            }
          />
        </TabsContent>

        {/* ---- Tab Webhooks ---- */}
        <TabsContent value="webhooks" className="space-y-4 mt-4">
          {webhooks.length === 0 && !webhooksLoading ? (
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
                  emptyHint={webhooks.length === 0 && !webhooksLoading}
                />
              </div>
              <DataTable
                columns={webhookColumns}
                data={webhooks}
                loading={webhooksLoading}
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
