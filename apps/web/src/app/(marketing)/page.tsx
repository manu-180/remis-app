import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/hero';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { PricingPreview } from '@/components/marketing/pricing-preview';
import { DriversCta } from '@/components/marketing/drivers-cta';
import { FaqSection } from '@/components/marketing/faq-section';

export const metadata: Metadata = {
  title: 'Remis — Tu remís en la pampa, a un toque',
  description:
    'Pedí tu remís desde la app o llamando. Conductores conocidos, tarifas de ordenanza municipal. Servicio de remisería local en La Pampa.',
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <PricingPreview />
      <DriversCta />
      <FaqSection />
    </>
  );
}
