import { Smartphone, Car, MapPin } from 'lucide-react';

const STEPS = [
  {
    icon: Smartphone,
    step: '01',
    title: 'Pedí desde la app',
    description:
      'Abrí la app, ingresá tu destino y confirmá. En segundos te conectamos con un conductor disponible.',
  },
  {
    icon: Car,
    step: '02',
    title: 'Te buscamos',
    description:
      'Un conductor verificado de la agencia sale a buscarte. Podés seguir el viaje en tiempo real.',
  },
  {
    icon: MapPin,
    step: '03',
    title: 'Llegás a destino',
    description:
      'Viajá tranquilo. Tarifa fija según ordenanza, sin sorpresas. Pagá en efectivo o por transferencia.',
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20 md:py-28 bg-[var(--neutral-50)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="font-[family-name:var(--font-inter-tight)] font-bold text-3xl md:text-4xl text-[var(--neutral-900)] mb-3">
            Cómo funciona
          </h2>
          <p className="text-[var(--neutral-500)] text-lg max-w-md mx-auto">
            Simple, rápido y confiable. Como siempre fue, ahora con app.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map(({ icon: Icon, step, title, description }) => (
            <div
              key={step}
              className="bg-[var(--neutral-0)] rounded-[var(--radius-xl)] p-7 border-t-2 border-[var(--brand-accent)] shadow-sm"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--neutral-100)]">
                  <Icon size={22} className="text-[var(--brand-primary)]" strokeWidth={1.75} />
                </div>
                <span className="font-[family-name:var(--font-inter-tight)] font-bold text-4xl text-[var(--neutral-200)]">
                  {step}
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-inter-tight)] font-bold text-xl text-[var(--neutral-900)] mb-2">
                {title}
              </h3>
              <p className="text-[var(--neutral-500)] leading-relaxed text-[0.9375rem]">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
