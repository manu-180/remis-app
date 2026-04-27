'use client';

import { useState } from 'react';
import {
  MOCK_DRIVERS,
  DRIVER_STATUS_COLORS,
  DRIVER_STATUS_LABELS,
} from '@/lib/mock/drivers';

type Tab = 'drivers' | 'rides';

export function LeftColumn() {
  const [activeTab, setActiveTab] = useState<Tab>('drivers');

  return (
    <aside
      className="flex flex-col border-r border-[var(--neutral-200)] bg-[var(--neutral-50)] overflow-hidden"
      aria-label="Panel izquierdo"
    >
      <div role="tablist" className="flex border-b border-[var(--neutral-200)]">
        {([['drivers', 'Choferes'], ['rides', 'Pedidos']] as [Tab, string][]).map(
          ([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-2.5 text-[var(--text-sm)] font-medium transition-colors ${
                activeTab === id
                  ? 'border-b-2 border-[var(--brand-primary)] text-[var(--neutral-900)]'
                  : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      <div
        id="panel-drivers"
        role="tabpanel"
        aria-label="Lista de choferes"
        hidden={activeTab !== 'drivers'}
        className="flex-1 overflow-y-auto"
      >
        {MOCK_DRIVERS.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--neutral-500)]">
            <span className="text-3xl" aria-hidden>📡</span>
            <p className="text-[var(--text-sm)]">Sin choferes online</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--neutral-200)]">
            {MOCK_DRIVERS.map((driver) => (
              <li
                key={driver.id}
                className="flex items-center gap-3 hover:bg-[var(--neutral-100)] transition-colors cursor-pointer"
                style={{ height: 'var(--row-height)', padding: 'var(--row-padding)' }}
              >
                <div
                  className="size-8 rounded-full flex items-center justify-center text-[var(--text-xs)] font-semibold bg-[var(--neutral-200)] text-[var(--neutral-700)] shrink-0"
                  aria-hidden
                >
                  {driver.avatarInitials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-[var(--font-family-mono)] text-[var(--text-xs)] text-[var(--neutral-500)]">
                      {driver.internalNumber}
                    </span>
                    <span className="text-[var(--text-sm)] text-[var(--neutral-800)] truncate font-medium">
                      {driver.name}
                    </span>
                  </div>
                  <p className="text-[var(--text-xs)] text-[var(--neutral-500)]">
                    {DRIVER_STATUS_LABELS[driver.status]} desde {driver.statusSince}
                    {driver.distanceKm != null && ` · ${driver.distanceKm} km`}
                  </p>
                </div>

                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: DRIVER_STATUS_COLORS[driver.status] }}
                  aria-label={`Estado: ${DRIVER_STATUS_LABELS[driver.status]}`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        id="panel-rides"
        role="tabpanel"
        aria-label="Pedidos activos"
        hidden={activeTab !== 'rides'}
        className="flex-1 flex items-center justify-center text-[var(--neutral-500)] text-[var(--text-sm)]"
      >
        Cola de pedidos — Tanda 3C
      </div>
    </aside>
  );
}
