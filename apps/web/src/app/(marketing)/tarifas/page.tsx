import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tarifas',
  description:
    'Consulta las tarifas de remís según la ordenanza municipal vigente. Precios fijos, sin sorpresas.',
};

const ZONE_TABLE = [
  { zona: 'Zona 1', from: 'Centro', to: 'Terminal de ómnibus', price: '$2.500' },
  { zona: 'Zona 1', from: 'Centro', to: 'Hospital regional', price: '$2.200' },
  { zona: 'Zona 2', from: 'Centro', to: 'Barrio Norte', price: '$1.800' },
  { zona: 'Zona 2', from: 'Centro', to: 'Barrio Sur', price: '$1.800' },
  { zona: 'Zona 2', from: 'Centro', to: 'Barrio Este', price: '$2.000' },
  { zona: 'Zona 3', from: 'Centro', to: 'Aeródromo', price: '$3.500' },
  { zona: 'Zona 3', from: 'Centro', to: 'Zona rural (hasta 5 km)', price: '$3.200' },
  { zona: 'Nocturno', from: 'Cualquier zona', to: 'Recargo nocturno (22–06 h)', price: '+20%' },
];

export default function TarifasPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-inter-tight)] font-bold text-4xl text-[var(--neutral-900)] mb-3">
            Tarifas
          </h1>
          <p className="text-[var(--neutral-500)] text-lg">
            Precios establecidos por ordenanza municipal vigente. Actualizados al 1 de enero de 2026.
          </p>
        </div>

        <div className="bg-[var(--neutral-50)] rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--neutral-100)] border-b border-[var(--neutral-200)]">
                <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide">
                  Zona
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide">
                  Desde
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide">
                  Hasta
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide">
                  Tarifa
                </th>
              </tr>
            </thead>
            <tbody>
              {ZONE_TABLE.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--neutral-200)] last:border-0 hover:bg-[var(--neutral-100)] transition-colors"
                >
                  <td className="px-5 py-3.5 text-[var(--neutral-500)]">{row.zona}</td>
                  <td className="px-5 py-3.5 text-[var(--neutral-700)] font-medium">{row.from}</td>
                  <td className="px-5 py-3.5 text-[var(--neutral-600)]">{row.to}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-[var(--brand-primary)]">
                    {row.price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-[var(--neutral-400)]">
          Tarifas según ordenanza municipal vigente. Sujeto a actualización por resolución del
          Honorable Concejo Deliberante. Última actualización: enero 2026.
        </p>
      </div>
    </div>
  );
}
