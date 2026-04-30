'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
  const router = useRouter();

  useEffect(() => {
    Sentry.captureException(error, { tags: { segment: 'admin' } });
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-6">
      <div className="glass max-w-lg w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] p-8 shadow-[var(--shadow-md)] text-center">
        <div className="flex justify-center mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger-bg)] text-[var(--danger)]">
            <AlertCircle size={32} aria-hidden="true" />
          </div>
        </div>
        <h1 className="text-[var(--text-xl)] font-semibold text-[var(--neutral-900)]">
          Algo salió mal
        </h1>
        <p className="mt-2 text-[var(--text-sm)] text-[var(--neutral-600)]">
          Ocurrió un error inesperado en esta página. Ya nos avisamos.
        </p>
        {error.digest && (
          <p className="mt-4 font-mono text-[var(--text-xs)] text-[var(--neutral-400)]">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button variant="primary" onClick={reset}>
            Reintentar
          </Button>
          <Button variant="secondary" onClick={() => router.push('/admin')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
