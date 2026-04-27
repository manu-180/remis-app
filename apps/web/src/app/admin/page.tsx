import type { Metadata } from 'next';
import { Car, TrendingUp, Users, DollarSign, Award } from 'lucide-react';

export const metadata: Metadata = { title: 'Resumen — Admin' };

const KPI_CARDS = [
  { label: 'Viajes hoy', value: '—', icon: Car, sub: 'sin datos' },
  { label: 'Viajes esta semana', value: '—', icon: TrendingUp, sub: 'sin datos' },
  { label: 'Viajes este mes', value: '—', icon: TrendingUp, sub: 'sin datos' },
  { label: 'Ingresos del mes', value: '—', icon: DollarSign, sub: 'sin datos' },
  { label: 'Choferes activos', value: '—', icon: Users, sub: 'sin datos' },
];

const TOP_DRIVERS = [
  { name: 'Conductor 1', trips: '—' },
  { name: 'Conductor 2', trips: '—' },
  { name: 'Conductor 3', trips: '—' },
  { name: 'Conductor 4', trips: '—' },
  { name: 'Conductor 5', trips: '—' },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-inter-tight)] font-bold text-2xl text-[var(--neutral-900)]">
          Resumen
        </h1>
        <p className="text-sm text-[var(--neutral-500)] mt-1">
          Vista general de la operación — datos en tiempo real próximamente.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {KPI_CARDS.map(({ label, value, icon: Icon, sub }) => (
          <div
            key={label}
            className="bg-[var(--neutral-0)] rounded-[var(--radius-xl)] border border-[var(--neutral-200)] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[var(--neutral-500)] uppercase tracking-wide">
                {label}
              </p>
              <Icon size={16} className="text-[var(--neutral-400)]" strokeWidth={1.75} />
            </div>
            <p className="font-[family-name:var(--font-inter-tight)] font-bold text-2xl text-[var(--neutral-900)]">
              {value}
            </p>
            <p className="text-xs text-[var(--neutral-400)] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Top drivers */}
      <div className="bg-[var(--neutral-0)] rounded-[var(--radius-xl)] border border-[var(--neutral-200)] p-6">
        <div className="flex items-center gap-2 mb-5">
          <Award size={18} className="text-[var(--brand-accent)]" strokeWidth={1.75} />
          <h2 className="font-[family-name:var(--font-inter-tight)] font-bold text-lg text-[var(--neutral-900)]">
            Top 5 conductores del mes
          </h2>
        </div>
        <div className="space-y-3">
          {TOP_DRIVERS.map(({ name, trips }, i) => (
            <div
              key={name}
              className="flex items-center justify-between py-2 border-b border-[var(--neutral-100)] last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--neutral-200)] text-[var(--neutral-600)] text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm text-[var(--neutral-700)] font-medium">{name}</span>
              </div>
              <span className="text-sm font-semibold text-[var(--neutral-500)]">{trips} viajes</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
