'use client';

import { AlertTriangle, ShieldCheck, ShieldX, Clock, Smartphone } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateShort } from '@/lib/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type KycVerification = {
  id: string;
  driver_id: string;
  provider: string | null;
  status: string | null;
  score: number | null;
  metadata: Record<string, unknown> | null;
  verified_at: string | null;
  created_at: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function kycStatusBadge(status: string | null): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case 'approved':
      return {
        label: 'Aprobado',
        className: 'bg-[var(--success)]/10 text-[var(--success)]',
        icon: <ShieldCheck size={12} />,
      };
    case 'rejected':
      return {
        label: 'Rechazado',
        className: 'bg-[var(--danger)]/10 text-[var(--danger)]',
        icon: <ShieldX size={12} />,
      };
    case 'expired':
      return {
        label: 'Expirado',
        className: 'bg-[var(--neutral-100)] text-[var(--neutral-500)]',
        icon: <Clock size={12} />,
      };
    default:
      return {
        label: 'Pendiente',
        className: 'bg-[var(--warning)]/10 text-[var(--warning)]',
        icon: <Clock size={12} />,
      };
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface DriverTabKycProps {
  driverId: string;
}

export function DriverTabKyc({ driverId }: DriverTabKycProps) {
  const { data: verifications, isLoading } = useSupabaseQuery<KycVerification[]>(
    ['driver-kyc', driverId],
    async (sb) => {
      const result = await sb
        .from('kyc_verifications')
        .select('id, driver_id, provider, status, score, metadata, verified_at, created_at')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });
      return { data: (result.data ?? []) as KycVerification[], error: result.error };
    },
  );

  const lastVerification = verifications?.[0];
  const isLastRejected = lastVerification?.status === 'rejected';

  return (
    <div className="space-y-4">
      {/* Rejection banner */}
      {isLastRejected && (
        <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger)]/8 p-4">
          <AlertTriangle size={18} className="text-[var(--danger)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--danger)]">
              Última verificación rechazada
            </p>
            <p className="text-xs text-[var(--neutral-600)] mt-0.5">
              El conductor necesita completar una nueva verificación KYC.
            </p>
          </div>
        </div>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de verificaciones</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : !verifications?.length ? (
            <EmptyState
              icon={<Smartphone size={28} />}
              title="Este conductor aún no completó su verificación KYC desde la app."
              description="El proceso lo inicia el conductor desde su dispositivo."
            />
          ) : (
            <ul className="divide-y divide-[var(--neutral-100)]">
              {verifications.map((v) => {
                const badge = kycStatusBadge(v.status);
                return (
                  <li key={v.id} className="flex items-center gap-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--neutral-900)] capitalize">
                          {v.provider ?? 'Proveedor desconocido'}
                        </span>
                        <Badge className={badge.className + ' inline-flex items-center gap-1 text-[10px]'}>
                          {badge.icon}
                          {badge.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--neutral-500)] mt-0.5">
                        {v.created_at ? formatDateShort(v.created_at) : '—'}
                        {v.score != null && ` · Score: ${Number(v.score).toFixed(2)}`}
                      </p>
                    </div>
                    {v.verified_at && (
                      <span className="text-xs text-[var(--neutral-400)] whitespace-nowrap">
                        Verificado: {formatDateShort(v.verified_at)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
