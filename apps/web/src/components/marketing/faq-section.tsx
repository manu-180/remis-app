'use client';

import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    q: '¿Cómo pido un remís?',
    a: 'Podés pedir desde la app ingresando tu destino, o llamar directamente a la agencia. Respondemos las 24 horas.',
  },
  {
    q: '¿Cuánto demora en llegar?',
    a: 'En general entre 5 y 15 minutos dentro del casco urbano. La app te muestra el tiempo estimado en tiempo real.',
  },
  {
    q: '¿Cómo se calculan las tarifas?',
    a: 'Las tarifas son fijas, establecidas por ordenanza municipal vigente. No hay cargos adicionales por horario ni condición climática.',
  },
  {
    q: '¿Puedo pagar con transferencia?',
    a: 'Sí, aceptamos efectivo y transferencias bancarias. El conductor te confirma las opciones al inicio del viaje.',
  },
  {
    q: '¿Los conductores están habilitados?',
    a: 'Todos los conductores cuentan con habilitación municipal vigente, licencia profesional y seguro del pasajero.',
  },
  {
    q: '¿Hay servicio los feriados?',
    a: 'Sí, operamos todos los días del año incluyendo feriados. En fechas especiales puede haber mayor demora.',
  },
  {
    q: '¿Puedo programar un viaje con anticipación?',
    a: 'Sí, podés programar viajes desde la app o llamando. Recomendamos hacerlo con al menos 30 minutos de anticipación.',
  },
  {
    q: '¿Qué hago si olvidé algo en el remís?',
    a: 'Comunicate de inmediato con la agencia al número de contacto. Registramos cada viaje y podemos contactar al conductor.',
  },
];

export function FaqSection() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-[var(--neutral-50)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-[family-name:var(--font-inter-tight)] font-bold text-3xl md:text-4xl text-[var(--neutral-900)] mb-3">
            Preguntas frecuentes
          </h2>
          <p className="text-[var(--neutral-500)] text-lg">
            Todo lo que necesitás saber antes de pedir tu primer viaje.
          </p>
        </div>

        <Accordion.Root type="single" collapsible className="space-y-2">
          {FAQS.map(({ q, a }, i) => (
            <Accordion.Item
              key={i}
              value={String(i)}
              className="bg-[var(--neutral-0)] rounded-[var(--radius-lg)] border border-[var(--neutral-200)] overflow-hidden"
            >
              <Accordion.Header>
                <Accordion.Trigger
                  className={cn(
                    'group flex w-full items-center justify-between px-5 py-4 text-left',
                    'font-medium text-[var(--neutral-800)] hover:text-[var(--brand-primary)]',
                    'transition-colors [&[data-state=open]]:text-[var(--brand-primary)]',
                  )}
                >
                  {q}
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-[var(--neutral-400)] transition-transform duration-200 group-data-[state=open]:rotate-180"
                    strokeWidth={2}
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=open]:animate-none data-[state=closed]:animate-none">
                <div className="px-5 pb-5 text-[var(--neutral-500)] leading-relaxed text-[0.9375rem] border-t border-[var(--neutral-100)] pt-3">
                  {a}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
