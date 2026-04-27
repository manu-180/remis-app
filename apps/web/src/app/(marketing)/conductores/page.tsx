import type { Metadata } from 'next';
import { CheckCircle, FileText, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Conductores',
  description:
    'Sumate a nuestra flota de remiseros. Trabajá con autonomía, respaldo local y clientes garantizados.',
};

const REQUIREMENTS = [
  'Licencia de conducir profesional vigente (categoría D)',
  'Registro de conductor de remís habilitado por municipio',
  'Seguro del vehículo con cobertura de pasajeros',
  'Revisión técnica vehicular (RTV) al día',
  'Antecedentes penales sin causas activas',
  'Teléfono compatible con la app (Android 10+ o iOS 15+)',
];

export default function ConductoresPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-14">
          <h1 className="font-[family-name:var(--font-inter-tight)] font-bold text-4xl text-[var(--neutral-900)] mb-3">
            Trabajá con nosotros
          </h1>
          <p className="text-[var(--neutral-500)] text-lg max-w-2xl">
            Sumate a la agencia de remises más confiable de la zona. Sin inversión inicial,
            con clientes reales desde el primer día.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">
          <div className="bg-[var(--neutral-50)] rounded-[var(--radius-xl)] border border-[var(--neutral-200)] p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--neutral-100)]">
                <FileText size={20} className="text-[var(--brand-primary)]" strokeWidth={1.75} />
              </div>
              <h2 className="font-[family-name:var(--font-inter-tight)] font-bold text-xl text-[var(--neutral-900)]">
                Requisitos
              </h2>
            </div>
            <ul className="space-y-3">
              {REQUIREMENTS.map((req) => (
                <li key={req} className="flex items-start gap-3 text-sm text-[var(--neutral-600)]">
                  <CheckCircle
                    size={16}
                    className="shrink-0 mt-0.5 text-[var(--success)]"
                    strokeWidth={2}
                  />
                  {req}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[var(--neutral-50)] rounded-[var(--radius-xl)] border border-[var(--neutral-200)] p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--neutral-100)]">
                <Phone size={20} className="text-[var(--brand-primary)]" strokeWidth={1.75} />
              </div>
              <h2 className="font-[family-name:var(--font-inter-tight)] font-bold text-xl text-[var(--neutral-900)]">
                Cómo aplicar
              </h2>
            </div>
            <p className="text-sm text-[var(--neutral-600)] leading-relaxed mb-5">
              El proceso de incorporación es simple. Contactanos con tu documentación y coordinamos
              una entrevista presencial en la agencia.
            </p>
            <ol className="space-y-3">
              {[
                'Llamá o escribí a la agencia',
                'Presentá tu documentación',
                'Entrevista breve en la agencia',
                'Activación en la plataforma',
              ].map((step, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-[var(--neutral-700)]">
                  <span className="w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div
          className="rounded-[var(--radius-xl)] p-8 text-center"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), #1e3a6e)' }}
        >
          <h2 className="font-[family-name:var(--font-inter-tight)] font-bold text-2xl text-white mb-2">
            ¿Listo para empezar?
          </h2>
          <p className="text-white/70 mb-6">Llamanos directamente o dejanos un mensaje.</p>
          <a
            href="tel:+540000000000"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-lg)] font-semibold bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-hover)] transition-colors"
          >
            <Phone size={17} />
            Llamar a la agencia
          </a>
        </div>
      </div>
    </div>
  );
}
