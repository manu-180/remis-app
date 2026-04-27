import type { Metadata } from 'next';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Contactá a la agencia de remises. Teléfono, dirección y horarios de atención.',
};

export default function ContactoPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-12">
          <h1 className="font-[family-name:var(--font-inter-tight)] font-bold text-4xl text-[var(--neutral-900)] mb-3">
            Contacto
          </h1>
          <p className="text-[var(--neutral-500)] text-lg">
            Estamos disponibles para atenderte las 24 horas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              icon: Phone,
              title: 'Teléfono',
              value: '(0000) 000-0000',
              href: 'tel:+540000000000',
              sub: 'Disponible 24 hs.',
            },
            {
              icon: Mail,
              title: 'Email',
              value: 'info@remis.com.ar',
              href: 'mailto:info@remis.com.ar',
              sub: 'Respondemos en menos de 24 hs.',
            },
            {
              icon: MapPin,
              title: 'Dirección',
              value: 'Av. [Calle] 000, [PUEBLO]',
              href: '#',
              sub: 'La Pampa, Argentina',
            },
            {
              icon: Clock,
              title: 'Horario de oficina',
              value: 'Lun–Vie 8:00–20:00',
              href: null,
              sub: 'Servicio de remís: 24 hs.',
            },
          ].map(({ icon: Icon, title, value, href, sub }) => (
            <div
              key={title}
              className="flex items-start gap-4 p-6 bg-[var(--neutral-50)] rounded-[var(--radius-xl)] border border-[var(--neutral-200)]"
            >
              <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--neutral-100)] shrink-0">
                <Icon size={20} className="text-[var(--brand-primary)]" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide mb-1">
                  {title}
                </p>
                {href ? (
                  <a
                    href={href}
                    className="text-[var(--neutral-900)] font-medium hover:text-[var(--brand-primary)] transition-colors"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="text-[var(--neutral-900)] font-medium">{value}</p>
                )}
                <p className="text-sm text-[var(--neutral-400)] mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
