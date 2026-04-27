import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tarifas — Admin' };

export default function AdminTarifasPage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-inter-tight)] font-bold text-2xl text-[var(--neutral-900)] mb-2">
        Tarifas
      </h1>
      <p className="text-sm text-[var(--neutral-500)]">Gestión de tarifas — próximamente.</p>
    </div>
  );
}
