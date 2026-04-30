/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, Ban, AlertTriangle, TrendingDown, Eye, Trash2, MoreVertical } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useExportCsv } from '@/hooks/use-export-csv';
import type { CsvColumn } from '@/lib/export-csv';
import {
  DataTable,
  FilterBar,
  ExportCsvButton,
  createAvatarColumn,
  createDateColumn,
  createTabularColumn,
} from '@/components/admin/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirm } from '@/components/admin/confirm-dialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PassengerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

type PassengerRow = {
  id: string;
  default_payment_method: string | null;
  blacklisted: boolean;
  blacklist_reason: string | null;
  total_rides: number;
  total_no_shows: number;
  notes: string | null;
  profiles: PassengerProfile | null;
};

type RideRow = {
  id: string;
  status: string;
  requested_at: string | null;
  fare_amount: number | null;
  pickup_address: string | null;
};

type FreqAddress = {
  id: string;
  label: string | null;
  address_text: string;
  use_count: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'd MMM yyyy', { locale: es });
  } catch {
    return '—';
  }
}

function rideStatusLabel(status: string): { label: string; variant: 'online' | 'busy' | 'offline' | 'danger' | 'pending' } {
  const map: Record<string, { label: string; variant: 'online' | 'busy' | 'offline' | 'danger' | 'pending' }> = {
    completed: { label: 'Completado', variant: 'online' },
    cancelled: { label: 'Cancelado', variant: 'offline' },
    no_show: { label: 'No show', variant: 'danger' },
    in_progress: { label: 'En curso', variant: 'busy' },
    pending: { label: 'Pendiente', variant: 'pending' },
  };
  return map[status] ?? { label: status, variant: 'offline' };
}

const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// ---------------------------------------------------------------------------
// Detail Drawer
// ---------------------------------------------------------------------------
interface DetailDrawerProps {
  passenger: PassengerRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
}

function DetailDrawer({ passenger, open, onOpenChange, onUpdated }: DetailDrawerProps) {
  const supabase = getSupabaseBrowserClient();
  const [rides, setRides] = useState<RideRow[] | null>(null);
  const [addrs, setAddrs] = useState<FreqAddress[] | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [blacklisted, setBlacklisted] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [savingBlacklist, setSavingBlacklist] = useState(false);

  // Sync state when passenger changes
  useEffect(() => {
    if (!passenger) return;
    setNotes(passenger.notes ?? '');
    setBlacklisted(passenger.blacklisted);
    setBlacklistReason(passenger.blacklist_reason ?? '');
    setRides(null);
    setAddrs(null);
  }, [passenger]);

  // Fetch rides and addresses when drawer opens
  useEffect(() => {
    if (!open || !passenger) return;

    const pid = passenger.id;

    (supabase as any)
      .from('rides')
      .select('id,status,requested_at,fare_amount,pickup_address')
      .eq('passenger_id', pid)
      .order('requested_at', { ascending: false })
      .limit(10)
      .then(({ data }: { data: RideRow[] | null }) => {
        setRides(data ?? []);
      })
      .catch(() => setRides([]));

    (supabase as any)
      .from('frequent_addresses')
      .select('*')
      .eq('passenger_id', pid)
      .order('use_count', { ascending: false })
      .then(({ data, error }: { data: FreqAddress[] | null; error: any }) => {
        if (error) { setAddrs(null); return; }
        setAddrs(data ?? []);
      })
      .catch(() => setAddrs(null));
  }, [open, passenger, supabase]);

  const handleSaveNotes = async () => {
    if (!passenger) return;
    setSavingNotes(true);
    await (supabase as any).from('passengers').update({ notes }).eq('id', passenger.id);
    setSavingNotes(false);
    onUpdated();
  };

  const handleBlacklistToggle = async (checked: boolean) => {
    if (!passenger) return;
    // If activating and reason is empty, don't allow
    if (checked && !blacklistReason.trim()) return;
    setSavingBlacklist(true);
    await (supabase as any)
      .from('passengers')
      .update({ blacklisted: checked, blacklist_reason: checked ? blacklistReason.trim() : null })
      .eq('id', passenger.id);
    setBlacklisted(checked);
    setSavingBlacklist(false);
    onUpdated();
  };

  if (!passenger) return null;

  const profile = passenger.profiles;
  const name = profile?.full_name ?? 'Sin nombre';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Detalle del pasajero" width="lg">
      {/* Header */}
      <div className="flex items-start gap-4 pb-6 border-b border-[var(--neutral-200)]">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={name}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="flex w-10 h-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[var(--neutral-0)] text-sm font-semibold">
            {initials}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--neutral-900)] truncate">{name}</p>
          {profile?.phone && (
            <p className="text-sm text-[var(--neutral-500)] truncate">{profile.phone}</p>
          )}
          {profile?.email && (
            <p className="text-sm text-[var(--neutral-400)] truncate">{profile.email}</p>
          )}
        </div>
      </div>

      {/* Inline stats */}
      <div className="grid grid-cols-2 gap-3 py-5 border-b border-[var(--neutral-200)]">
        <div>
          <p className="text-xs text-[var(--neutral-500)] font-medium mb-0.5">Total viajes</p>
          <p className="text-xl font-bold tabular-nums text-[var(--neutral-900)]">{passenger.total_rides}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--neutral-500)] font-medium mb-0.5">No-shows</p>
          <p className="text-xl font-bold tabular-nums text-[var(--neutral-900)]">{passenger.total_no_shows}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--neutral-500)] font-medium mb-0.5">Miembro desde</p>
          <p className="text-sm font-semibold text-[var(--neutral-900)]">{formatDate(profile?.created_at)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--neutral-500)] font-medium mb-0.5">Método de pago</p>
          <p className="text-sm font-semibold text-[var(--neutral-900)] truncate">{passenger.default_payment_method ?? '—'}</p>
        </div>
      </div>

      {/* Blacklist toggle */}
      <div className="py-5 border-b border-[var(--neutral-200)] space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="blacklist-toggle" className="text-sm font-medium text-[var(--neutral-700)]">
            Bloqueado
          </Label>
          <Switch
            id="blacklist-toggle"
            checked={blacklisted}
            onCheckedChange={(checked) => {
              setBlacklisted(checked);
              if (!checked) {
                handleBlacklistToggle(false);
              }
            }}
            disabled={savingBlacklist}
          />
        </div>
        {blacklisted && (
          <div className="space-y-2">
            <Label className="text-xs text-[var(--neutral-500)]">Motivo del bloqueo</Label>
            <Textarea
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
              placeholder="Motivo requerido para bloquear..."
              rows={2}
            />
            {passenger.blacklist_reason !== blacklistReason && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBlacklistToggle(true)}
                disabled={savingBlacklist || !blacklistReason.trim()}
              >
                {savingBlacklist ? 'Guardando...' : passenger.blacklisted ? 'Actualizar motivo' : 'Confirmar bloqueo'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="py-5 border-b border-[var(--neutral-200)] space-y-2">
        <Label className="text-sm font-medium text-[var(--neutral-700)]">Notas internas</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Agregar notas..."
          rows={3}
        />
        <Button size="sm" variant="secondary" onClick={handleSaveNotes} disabled={savingNotes}>
          {savingNotes ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      {/* Last 10 rides */}
      <div className="py-5 border-b border-[var(--neutral-200)]">
        <p className="text-sm font-semibold text-[var(--neutral-800)] mb-3">Últimos viajes</p>
        {rides === null ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : rides.length === 0 ? (
          <p className="text-sm text-[var(--neutral-400)]">Sin viajes registrados.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs text-[var(--neutral-500)] uppercase tracking-wider">
                  <th className="pb-2 pr-4 font-semibold">Fecha</th>
                  <th className="pb-2 pr-4 font-semibold">Estado</th>
                  <th className="pb-2 pr-4 font-semibold">Monto</th>
                  <th className="pb-2 font-semibold">Origen</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride) => {
                  const { label, variant } = rideStatusLabel(ride.status);
                  return (
                    <tr key={ride.id} className="border-t border-[var(--neutral-100)]">
                      <td className="py-2 pr-4 whitespace-nowrap tabular-nums text-[var(--neutral-700)]">
                        {formatDate(ride.requested_at)}
                      </td>
                      <td className="py-2 pr-4">
                        <StatusPill variant={variant} label={label} />
                      </td>
                      <td className="py-2 pr-4 tabular-nums text-[var(--neutral-700)]">
                        {ride.fare_amount != null ? arsFormatter.format(ride.fare_amount) : '—'}
                      </td>
                      <td className="py-2 text-[var(--neutral-500)] truncate max-w-[200px]" title={ride.pickup_address ?? undefined}>
                        {ride.pickup_address ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Frequent addresses */}
      {addrs !== null && (
        <div className="py-5">
          <p className="text-sm font-semibold text-[var(--neutral-800)] mb-3">Direcciones frecuentes</p>
          {addrs.length === 0 ? (
            <p className="text-sm text-[var(--neutral-400)]">Sin direcciones guardadas.</p>
          ) : (
            <ul className="space-y-2">
              {addrs.map((addr) => (
                <li
                  key={addr.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--neutral-50)]"
                >
                  <div className="flex-1 min-w-0">
                    {addr.label && (
                      <p className="text-xs font-semibold text-[var(--neutral-700)] mb-0.5 truncate">{addr.label}</p>
                    )}
                    <p className="text-sm text-[var(--neutral-600)] truncate">{addr.address_text}</p>
                  </div>
                  <span
                    className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full tabular-nums"
                    style={{ background: 'var(--neutral-200)', color: 'var(--neutral-700)' }}
                  >
                    {addr.use_count}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Passenger-specific actions menu (label varies per row state)
// ---------------------------------------------------------------------------
interface PassengerActionsMenuProps {
  row: PassengerRow;
  onView: () => void;
  onBlacklist: () => void;
  onDelete: () => void;
}

function PassengerActionsMenu({ row, onView, onBlacklist, onDelete }: PassengerActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative flex justify-center" ref={ref}>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--neutral-500)] hover:bg-[var(--neutral-100)] hover:text-[var(--neutral-900)] transition-colors"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-label="Acciones"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] shadow-[var(--shadow-lg)] py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <ActionBtn icon={<Eye size={14} />} label="Ver detalle" onClick={() => { setOpen(false); onView(); }} />
          <ActionBtn
            icon={<Ban size={14} />}
            label={row.blacklisted ? 'Desbloquear' : 'Bloquear'}
            onClick={() => { setOpen(false); onBlacklist(); }}
            danger
          />
          <ActionBtn icon={<Trash2 size={14} />} label="Eliminar" onClick={() => { setOpen(false); onDelete(); }} danger />
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--neutral-50)] transition-colors ${danger ? 'text-[var(--danger)]' : 'text-[var(--neutral-700)]'}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function PassengersClient() {
  const supabase = getSupabaseBrowserClient();
  const confirm = useConfirm();

  const [passengers, setPassengers] = useState<PassengerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Filters
  const [query, setQuery] = useState('');
  const [showBlacklisted, setShowBlacklisted] = useState(false);

  // Detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState<PassengerRow | null>(null);

  // Blacklist dialog state (for the reason textarea before confirming)
  const [blacklistReasonDialogOpen, setBlacklistReasonDialogOpen] = useState(false);
  const [pendingBlacklistRow, setPendingBlacklistRow] = useState<PassengerRow | null>(null);
  const [blacklistReasonInput, setBlacklistReasonInput] = useState('');

  const fetchPassengers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await (supabase as any)
      .from('passengers')
      .select('*, profiles(id, full_name, phone, email, avatar_url, created_at)')
      .order('total_rides', { ascending: false });

    if (err) {
      setError(new Error(err.message));
    } else {
      setPassengers((data ?? []) as PassengerRow[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPassengers();
  }, [fetchPassengers]);

  // ---------------------------------------------------------------------------
  // KPI calculations (client-side from loaded data)
  // ---------------------------------------------------------------------------
  const total = passengers.length;
  const activos = passengers.filter((p) => p.total_rides > 0).length;
  const blacklistedCount = passengers.filter((p) => p.blacklisted).length;
  const avgNoShows =
    total > 0
      ? Math.round((passengers.reduce((sum, p) => sum + p.total_no_shows, 0) / total) * 10) / 10
      : 0;

  // ---------------------------------------------------------------------------
  // Client-side filtering
  // ---------------------------------------------------------------------------
  const filtered = passengers.filter((p) => {
    const name = (p.profiles?.full_name ?? '').toLowerCase();
    const phone = (p.profiles?.phone ?? '').toLowerCase();
    const q = query.toLowerCase();
    const matchesQ = !q || name.includes(q) || phone.includes(q);
    const matchesBl = !showBlacklisted || p.blacklisted;
    return matchesQ && matchesBl;
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const handleBlacklistToggle = async (row: PassengerRow) => {
    if (row.blacklisted) {
      // Unblacklist
      const ok = await confirm({
        title: '¿Desbloquear pasajero?',
        description: `${row.profiles?.full_name ?? 'Este pasajero'} podrá volver a usar la app.`,
        confirmLabel: 'Desbloquear',
        danger: false,
      });
      if (!ok) return;
      await (supabase as any)
        .from('passengers')
        .update({ blacklisted: false, blacklist_reason: null })
        .eq('id', row.id);
      fetchPassengers();
    } else {
      // Show reason dialog before confirming
      setPendingBlacklistRow(row);
      setBlacklistReasonInput('');
      setBlacklistReasonDialogOpen(true);
    }
  };

  const handleBlacklistConfirm = async () => {
    if (!pendingBlacklistRow) return;
    await (supabase as any)
      .from('passengers')
      .update({ blacklisted: true, blacklist_reason: blacklistReasonInput.trim() || null })
      .eq('id', pendingBlacklistRow.id);
    setBlacklistReasonDialogOpen(false);
    setPendingBlacklistRow(null);
    setBlacklistReasonInput('');
    fetchPassengers();
  };

  // ---------------------------------------------------------------------------
  // CSV export — respects current filters (búsqueda + only-blacklisted toggle)
  // ---------------------------------------------------------------------------
  const passengerCsvColumns: CsvColumn<PassengerRow>[] = [
    { header: 'ID', accessor: (r) => r.id },
    { header: 'Nombre', accessor: (r) => r.profiles?.full_name ?? '' },
    { header: 'Email', accessor: (r) => r.profiles?.email ?? '' },
    { header: 'Teléfono', accessor: (r) => r.profiles?.phone ?? '' },
    {
      header: 'Método de pago',
      accessor: (r) => r.default_payment_method ?? '',
    },
    { header: 'Total viajes', accessor: (r) => r.total_rides ?? 0 },
    { header: 'Total no-shows', accessor: (r) => r.total_no_shows ?? 0 },
    { header: 'Bloqueado', accessor: (r) => (r.blacklisted ? 'sí' : 'no') },
    {
      header: 'Razón bloqueo',
      accessor: (r) => r.blacklist_reason ?? '',
    },
    { header: 'Notas', accessor: (r) => r.notes ?? '' },
    {
      header: 'Creado (UTC)',
      accessor: (r) => r.profiles?.created_at ?? '',
    },
  ];

  // Passengers list is fully loaded in-memory and filtered client-side.
  // Slice the already-filtered array so the CSV matches what the user sees.
  const passengerExportFetchPage = useCallback(
    async (offset: number, limit: number): Promise<PassengerRow[]> => {
      return filtered.slice(offset, offset + limit);
    },
    [filtered],
  );

  const { exportNow: exportPassengers, exporting: exportingPassengers } =
    useExportCsv<PassengerRow>({
      filename: 'passengers',
      columns: passengerCsvColumns,
      fetchPage: passengerExportFetchPage,
    });

  const handleDelete = async (row: PassengerRow) => {
    const ok = await confirm({
      title: '¿Eliminar pasajero?',
      description: `Esta acción es irreversible. Se eliminará a ${row.profiles?.full_name ?? 'este pasajero'} del sistema.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await (supabase as any).from('passengers').delete().eq('id', row.id);
    fetchPassengers();
  };

  // ---------------------------------------------------------------------------
  // Columns
  // ---------------------------------------------------------------------------
  const columns: ColumnDef<PassengerRow, unknown>[] = [
    {
      ...(createAvatarColumn<PassengerRow>(
        (row) => row.profiles?.avatar_url ?? null,
        (row) => row.profiles?.full_name ?? 'Sin nombre',
      ) as ColumnDef<PassengerRow, unknown>),
      // Override cell to show name + phone
      cell: ({ row }: { row: { original: PassengerRow } }) => {
        const p = row.original;
        const src = p.profiles?.avatar_url ?? null;
        const name = p.profiles?.full_name ?? 'Sin nombre';
        const phone = p.profiles?.phone ?? '';
        const initials = name.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('');
        const isBlacklisted = p.blacklisted;
        return (
          <div
            className="flex items-center gap-2.5 transition-all duration-300"
            style={isBlacklisted ? { borderLeft: '4px solid var(--danger)', paddingLeft: '8px' } : { paddingLeft: '0px' }}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={name} className="h-7 w-7 rounded-full object-cover shrink-0" />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[var(--neutral-0)] text-[10px] font-semibold">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-medium truncate text-[var(--neutral-900)]">{name}</p>
              {phone && <p className="text-xs text-[var(--neutral-500)] truncate">{phone}</p>}
            </div>
          </div>
        );
      },
    },
    createTabularColumn<PassengerRow>('total_rides', 'Total viajes') as ColumnDef<PassengerRow, unknown>,
    {
      id: 'no_shows',
      header: 'No-shows',
      enableSorting: false,
      cell: ({ row }: { row: { original: PassengerRow } }) => {
        const n = row.original.total_no_shows;
        if (n === 0) return <span className="tabular-nums text-[var(--neutral-400)]">0</span>;
        return (
          <Badge
            className={
              n > 3
                ? 'bg-[var(--danger-bg)] text-[var(--danger)]'
                : 'bg-[var(--warning-bg)] text-[var(--warning)]'
            }
          >
            {n > 3 && <AlertTriangle size={10} className="shrink-0" />}
            {n}
          </Badge>
        );
      },
    },
    {
      id: 'payment_method',
      header: 'Método pago',
      enableSorting: false,
      cell: ({ row }: { row: { original: PassengerRow } }) => {
        const m = row.original.default_payment_method;
        if (!m) return <span className="text-[var(--neutral-400)]">—</span>;
        return <span className="text-sm truncate">{m}</span>;
      },
    },
    {
      id: 'status',
      header: 'Estado',
      enableSorting: false,
      cell: ({ row }: { row: { original: PassengerRow } }) => {
        if (row.original.blacklisted) {
          return <StatusPill variant="danger" label="Bloqueado" />;
        }
        return <StatusPill variant="online" label="Activo" />;
      },
    },
    createDateColumn<PassengerRow>(
      'profiles' as keyof PassengerRow,
      'Miembro desde',
    ) as ColumnDef<PassengerRow, unknown>,
    {
      id: '__actions__',
      header: '',
      size: 52,
      enableSorting: false,
      cell: ({ row }: { row: { original: PassengerRow } }) => {
        const p = row.original;
        return (
          <PassengerActionsMenu
            row={p}
            onView={() => { setSelectedPassenger(p); setDrawerOpen(true); }}
            onBlacklist={() => handleBlacklistToggle(p)}
            onDelete={() => handleDelete(p)}
          />
        );
      },
    } as ColumnDef<PassengerRow, unknown>,
  ];

  // Fix last activity date column to use profiles.created_at
  const lastActivityCol: ColumnDef<PassengerRow, unknown> = {
    id: 'last_activity',
    header: 'Última actividad',
    enableSorting: false,
    cell: ({ row }: { row: { original: PassengerRow } }) => {
      const v = row.original.profiles?.created_at;
      if (!v) return <span className="text-[var(--neutral-400)]">—</span>;
      try {
        return (
          <span className="tabular-nums whitespace-nowrap text-sm">
            {format(new Date(v), 'd MMM, HH:mm', { locale: es })}
          </span>
        );
      } catch {
        return <span>{v}</span>;
      }
    },
  };

  // Replace the profiles date column (index 5) with lastActivityCol, keep actions (index 6)
  const avatarCol = columns[0]!;
  const ridesCol = columns[1]!;
  const noShowsCol = columns[2]!;
  const paymentCol = columns[3]!;
  const statusCol = columns[4]!;
  const actionsCol = columns[6]!;

  const finalColumns: ColumnDef<PassengerRow, unknown>[] = [
    avatarCol,
    ridesCol,
    noShowsCol,
    paymentCol,
    statusCol,
    lastActivityCol,
    actionsCol,
  ];

  return (
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <Stat
            label="Total pasajeros"
            value={total}
            icon={<Users size={16} />}
            loading={loading}
          />
        </Card>
        <Card>
          <Stat
            label="Activos"
            value={activos}
            icon={<Users size={16} className="text-[var(--success)]" />}
            loading={loading}
          />
        </Card>
        <Card>
          <Stat
            label="Blacklisted"
            value={blacklistedCount}
            icon={<Ban size={16} className="text-[var(--danger)]" />}
            loading={loading}
          />
        </Card>
        <Card>
          <Stat
            label="Prom. no-shows"
            value={avgNoShows}
            icon={<TrendingDown size={16} className="text-[var(--warning)]" />}
            loading={loading}
          />
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterBar
          filters={[
            { id: 'q', type: 'search', placeholder: 'Buscar por nombre, teléfono...' },
          ]}
          value={{ q: query }}
          onChange={(v) => setQuery(typeof v.q === 'string' ? v.q : '')}
        />
        <Button
          variant={showBlacklisted ? 'destructive' : 'secondary'}
          size="sm"
          onClick={() => setShowBlacklisted((v) => !v)}
        >
          <Ban size={14} className="mr-1.5" />
          {showBlacklisted ? 'Todos' : 'Solo bloqueados'}
        </Button>
        <ExportCsvButton
          size="sm"
          onClick={exportPassengers}
          exporting={exportingPassengers}
          emptyHint={filtered.length === 0 && !loading}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={finalColumns}
        data={filtered}
        loading={loading}
        error={error}
        onRowClick={(row) => {
          setSelectedPassenger(row);
          setDrawerOpen(true);
        }}
        emptyState={
          <div className="py-16 text-center text-[var(--neutral-500)] text-sm">
            No hay pasajeros que coincidan con los filtros.
          </div>
        }
      />

      {/* Detail drawer */}
      <DetailDrawer
        passenger={selectedPassenger}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdated={fetchPassengers}
      />

      {/* Blacklist reason dialog */}
      {blacklistReasonDialogOpen && pendingBlacklistRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setBlacklistReasonDialogOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md mx-4 bg-[var(--neutral-0)] rounded-[var(--radius-lg)] border border-[var(--neutral-200)] shadow-[var(--shadow-md)] p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--danger-bg)]">
                <AlertTriangle size={20} className="text-[var(--danger)]" />
              </div>
              <div>
                <p className="font-semibold text-[var(--neutral-900)]">¿Bloquear pasajero?</p>
                <p className="text-sm text-[var(--neutral-600)] mt-0.5">
                  {pendingBlacklistRow.profiles?.full_name ?? 'Este pasajero'} no podrá usar la app.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Motivo del bloqueo (requerido)</Label>
              <Textarea
                value={blacklistReasonInput}
                onChange={(e) => setBlacklistReasonInput(e.target.value)}
                placeholder="Describe el motivo del bloqueo..."
                rows={3}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setBlacklistReasonDialogOpen(false);
                  setPendingBlacklistRow(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleBlacklistConfirm}
                disabled={!blacklistReasonInput.trim()}
              >
                Bloquear
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
