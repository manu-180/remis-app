import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Conductores — Admin' };

export default function AdminConductoresPage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-inter-tight)] font-bold text-2xl text-[var(--neutral-900)] mb-2">
        Conductores
      </h1>
      <p className="text-sm text-[var(--neutral-500)]">Gestión de conductores — próximamente.</p>
    </div>
  );
}
