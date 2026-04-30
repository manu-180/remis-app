import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] p-8 shadow-[var(--shadow-md)] text-center">
        <div className="flex justify-center mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--neutral-100)] text-[var(--neutral-400)]">
            <FileQuestion size={32} aria-hidden="true" />
          </div>
        </div>
        <p className="text-[var(--text-4xl)] font-bold text-[var(--neutral-300)] leading-none">
          404
        </p>
        <h1 className="mt-3 text-[var(--text-xl)] font-semibold text-[var(--neutral-900)]">
          Página no encontrada
        </h1>
        <p className="mt-2 text-[var(--text-sm)] text-[var(--neutral-600)]">
          La página que buscás no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link href="/admin" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            Volver al panel
          </Link>
        </div>
      </div>
    </div>
  );
}
