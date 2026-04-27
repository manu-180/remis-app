import { Nav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="flex-1 pt-16">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-16 text-base leading-relaxed">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
