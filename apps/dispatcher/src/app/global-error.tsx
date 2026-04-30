'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: 'global' } });
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAFAFA',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
          color: '#18181B',
        }}
      >
        <main
          style={{
            maxWidth: 480,
            width: '100%',
            margin: '0 16px',
            padding: 32,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: 12,
            boxShadow:
              '0 4px 6px -1px rgba(15,23,42,.07), 0 2px 4px -2px rgba(15,23,42,.05)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, color: '#52525B', marginTop: 8 }}>
            Ocurrió un error inesperado. Ya nos avisamos.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 12,
                color: '#A1A1AA',
                marginTop: 16,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <div
            style={{
              marginTop: 24,
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                height: 40,
                padding: '0 16px',
                fontSize: 14,
                fontWeight: 500,
                color: '#FFFFFF',
                backgroundColor: '#1B2A4E',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error renders outside root layout; hard navigation is intentional */}
            <a
              href="/"
              style={{
                height: 40,
                lineHeight: '40px',
                padding: '0 16px',
                fontSize: 14,
                fontWeight: 500,
                color: '#3F3F46',
                backgroundColor: '#F4F4F5',
                border: '1px solid #D4D4D8',
                borderRadius: 8,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Volver al inicio
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
