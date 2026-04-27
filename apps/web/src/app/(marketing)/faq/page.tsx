import type { Metadata } from 'next';
import { FaqSection } from '@/components/marketing/faq-section';

export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description: 'Respuestas a las preguntas más comunes sobre el servicio de remís.',
};

export default function FaqPage() {
  return (
    <div className="pt-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-4">
        <h1 className="font-[family-name:var(--font-inter-tight)] font-bold text-4xl text-[var(--neutral-900)] mb-3">
          Preguntas frecuentes
        </h1>
        <p className="text-[var(--neutral-500)] text-lg">
          Todo lo que necesitás saber antes de tu primer viaje.
        </p>
      </div>
      <FaqSection />
    </div>
  );
}
