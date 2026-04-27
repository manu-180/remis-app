import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Reportes — Admin' };

export default function ReportesPage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-inter-tight)] font-bold text-2xl text-[var(--neutral-900)] mb-2">
        Reportes
      </h1>
      <p className="text-sm text-[var(--neutral-500)]">Reportes y estadísticas — próximamente.</p>
    </div>
  );
}
