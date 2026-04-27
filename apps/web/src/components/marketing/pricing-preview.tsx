import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const ZONES = [
  { from: 'Centro', to: 'Terminal de ómnibus', price: '$2.500' },
  { from: 'Centro', to: 'Barrio Norte / Sur', price: '$1.800' },
  { from: 'Centro', to: 'Zona rural (hasta 5 km)', price: '$3.200' },
];

export function PricingPreview() {
  return (
    <section id="tarifas" className="py-20 md:py-28 bg-[var(--neutral-0)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-[family-name:var(--font-inter-tight)] font-bold text-3xl md:text-4xl text-[var(--neutral-900)] mb-3">
            Tarifas claras
          </h2>
          <p className="text-[var(--neutral-500)] text-lg max-w-md mx-auto">
            Precios fijos, sin negociación. Según ordenanza municipal vigente.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-[var(--neutral-50)] rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 px-6 py-3 bg-[var(--neutral-100)] border-b border-[var(--neutral-200)]">
              <span className="text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide">
                Desde
              </span>
              <span className="text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide">
                Hasta
              </span>
              <span className="text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide text-right">
                Tarifa
              </span>
            </div>

            {/* Rows */}
            {ZONES.map((zone, i) => (
              <div
                key={i}
                className="grid grid-cols-3 px-6 py-4 border-b border-[var(--neutral-200)] last:border-0 hover:bg-[var(--neutral-100)] transition-colors"
              >
                <span className="text-sm text-[var(--neutral-700)] font-medium">{zone.from}</span>
                <span className="text-sm text-[var(--neutral-600)]">{zone.to}</span>
                <span className="text-sm font-bold text-[var(--brand-primary)] text-right">
                  {zone.price}
                </span>
              </div>
            ))}

            {/* Footer */}
            <div className="px-6 py-4 bg-[var(--neutral-100)]">
              <p className="text-xs text-[var(--neutral-500)]">
                Tarifas según ordenanza municipal vigente. Los valores pueden actualizarse por
                resolución del municipio.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/tarifas"
              className="inline-flex items-center gap-2 text-[var(--brand-primary)] font-semibold hover:underline"
            >
              Ver tabla completa de tarifas
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
