'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useDriversStore } from '@/stores/drivers-store';
import { useRidesStore } from '@/stores/rides-store';

interface Alert {
  id: string;
  type: 'driver_offline' | 'ride_unassignable' | 'cancellation_spike';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function AlertsBar() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkAlerts = () => {
      const drivers = Array.from(useDriversStore.getState().drivers.values());
      const rides = Array.from(useRidesStore.getState().rides.values());
      const now = Date.now();
      const newAlerts: Alert[] = [];

      for (const d of drivers) {
        if (d.status === 'offline' || d.status === 'suspended') continue;
        if (!d.lastSeen) continue;
        const ageMs = now - new Date(d.lastSeen).getTime();
        if (ageMs > 7 * 60 * 1000) {
          const id = `driver-offline-${d.id}`;
          if (!dismissed.has(id)) {
            const ageMin = Math.round(ageMs / 60000);
            newAlerts.push({
              id,
              type: 'driver_offline',
              message: `Móvil ${d.internalNumber} sin señal hace ${ageMin} min`,
              actionLabel: 'Ver',
              onAction: () => useDriversStore.getState().selectDriver(d.id),
            });
          }
        }
      }

      for (const r of rides) {
        if (r.status !== 'requested') continue;
        const ageMs = now - new Date(r.requestedAt).getTime();
        if (ageMs > 8 * 60 * 1000) {
          const id = `ride-unassignable-${r.id}`;
          if (!dismissed.has(id)) {
            const ageMin = Math.round(ageMs / 60000);
            newAlerts.push({
              id,
              type: 'ride_unassignable',
              message: `#${r.id.slice(-4).toUpperCase()} sin chofer hace ${ageMin} min`,
              actionLabel: 'Asignar',
              onAction: () => useRidesStore.getState().selectRide(r.id),
            });
          }
        }
      }

      setAlerts(newAlerts);
    };

    checkAlerts();
    const id = setInterval(checkAlerts, 30_000);
    return () => clearInterval(id);
  }, [dismissed]);

  const dismiss = (alertId: string) => {
    setDismissed((prev) => new Set([...prev, alertId]));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="col-span-3 flex items-center gap-2 px-4 py-1 bg-[var(--warning)]/10 border-b border-[var(--warning)]/30 overflow-x-auto">
      <AlertTriangle size={12} className="shrink-0 text-[var(--warning)]" aria-hidden />
      <div className="flex items-center gap-3 flex-1 overflow-x-auto">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center gap-1.5 shrink-0">
            <span className="text-[var(--text-xs)] text-[var(--neutral-700)]">{alert.message}</span>
            {alert.actionLabel && (
              <button
                onClick={alert.onAction}
                className="text-[var(--text-xs)] font-semibold text-[var(--brand-primary)] hover:underline focus:outline-none"
              >
                {alert.actionLabel}
              </button>
            )}
            <button
              onClick={() => dismiss(alert.id)}
              aria-label="Descartar alerta"
              className="text-[var(--neutral-400)] hover:text-[var(--neutral-600)] transition-colors focus:outline-none"
            >
              <X size={10} />
            </button>
            <div className="w-px h-3 bg-[var(--neutral-300)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
