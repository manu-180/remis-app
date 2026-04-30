'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Navigation,
  Users,
  DollarSign,
  XCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { Card } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDashboardKPIs, type Period } from './use-dashboard-kpis';
import { RidesSparkline } from './rides-sparkline';
import { TopDrivers } from './top-drivers';
import { DemandHeatmap } from './demand-heatmap-wrapper';
import { ActivityFeed } from './activity-feed';

interface DashboardClientProps {
  profileName: string;
  initialPeriod: string;
}

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoy' },
];

export function DashboardClient({ profileName, initialPeriod }: DashboardClientProps) {
  const validPeriod = (initialPeriod === 'today' || initialPeriod === 'yesterday')
    ? initialPeriod
    : 'today';

  const [period, setPeriod] = useState<Period>(validPeriod as Period);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const {
    kpis,
    isLoading: kpisLoading,
    error: kpisError,
    refetch: kpisRefetch,
  } = useDashboardKPIs(period);

  const handlePeriodChange = (v: string) => {
    setPeriod(v as Period);
    router.push(`/admin?period=${v}`, { scroll: false });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await kpisRefetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const loading = kpisLoading;

  const kpiCards: Array<{
    label: string;
    value: number;
    delta?: number;
    icon: React.ReactNode;
    prefix?: string;
  }> = [
    {
      label: 'VIAJES HOY',
      value: kpis?.ridesTotal ?? 0,
      ...(kpis?.ridesTotalDelta != null ? { delta: kpis.ridesTotalDelta } : {}),
      icon: <Activity size={18} />,
    },
    {
      label: 'EN CURSO',
      value: kpis?.ridesActive ?? 0,
      icon: <Navigation size={18} />,
    },
    {
      label: 'CONDUCTORES ONLINE',
      value: kpis?.driversOnline ?? 0,
      icon: <Users size={18} />,
    },
    {
      label: 'INGRESOS EST.',
      value: kpis?.revenueARS ?? 0,
      ...(kpis?.revenueARSDelta != null ? { delta: kpis.revenueARSDelta } : {}),
      icon: <DollarSign size={18} />,
      prefix: '$',
    },
    {
      label: 'CANCELADOS',
      value: kpis?.ridesCancelled ?? 0,
      ...(kpis?.ridesCancelledDelta != null ? { delta: kpis.ridesCancelledDelta } : {}),
      icon: <XCircle size={18} />,
    },
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title={`Hola, ${profileName} \u{1F44B}`}
        actions={
          <div className="flex items-center gap-2">
            <Select
              options={PERIOD_OPTIONS}
              value={period}
              onValueChange={handlePeriodChange}
              className="w-44"
            />
            <button
              onClick={() => void handleRefresh()}
              className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--neutral-100)] transition-colors focus-ring"
              aria-label="Actualizar"
              type="button"
            >
              <RefreshCw
                size={16}
                className={cn(
                  'text-[var(--neutral-500)]',
                  isRefreshing && 'animate-spin'
                )}
              />
            </button>
          </div>
        }
      />

      {/* KPI Grid o banner de error */}
      {kpisError ? (
        <Card className="p-4 border-l-4 border-l-[var(--danger)]">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-[var(--danger)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-sm)] font-medium text-[var(--neutral-900)]">
                No pudimos cargar las métricas.
              </p>
              <p className="text-[var(--text-xs)] text-[var(--neutral-500)] mt-0.5">
                Hubo un problema al consultar los datos. Reintentá en unos segundos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="px-3 py-1.5 text-[var(--text-sm)] font-medium rounded-[var(--radius-md)] border border-[var(--neutral-300)] text-[var(--neutral-800)] hover:bg-[var(--neutral-100)] transition-colors focus-ring"
            >
              Reintentar
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpiCards.map((card) => (
            <Card key={card.label}>
              <Stat
                label={card.label}
                value={card.value}
                icon={card.icon}
                loading={loading}
                {...(card.delta !== undefined ? { delta: card.delta } : {})}
                {...(card.prefix !== undefined ? { prefix: card.prefix } : {})}
              />
            </Card>
          ))}
        </div>
      )}

      {/* Row 2: Sparkline + Top Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RidesSparkline />
        <TopDrivers />
      </div>

      {/* Row 3: Heatmap + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DemandHeatmap />
        <ActivityFeed />
      </div>
    </div>
  );
}
