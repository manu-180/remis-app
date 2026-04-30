'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SharedErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SharedError({ error, reset }: SharedErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { segment: 'shared' } });
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--neutral-50)] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-0)] p-8 shadow-[var(--shadow-md)] text-center">
        <div className="flex justify-center mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger-bg)] text-[var(--danger)]">
            <AlertCircle size={32} aria-hidden="true" />
          </div>
        </div>
        <h1 className="text-[var(--text-xl)] font-semibold text-[var(--neutral-900)]">
          No pudimos cargar el viaje
        </h1>
        <p className="mt-2 text-[var(--text-sm)] text-[var(--neutral-600)]">
          El link del viaje compartido no se pudo cargar. Probablemente expiró o fue revocado.
        </p>
        {error.digest && (
          <p className="mt-4 font-mono text-[var(--text-xs)] text-[var(--neutral-400)]">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6">
          <Button variant="primary" onClick={reset}>
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}
