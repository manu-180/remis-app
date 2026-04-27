// @deno-types="npm:@sentry/types"
import * as Sentry from 'npm:@sentry/deno@8';

export function initSentry() {
  Sentry.init({
    dsn: Deno.env.get('SENTRY_DSN_EDGE'),
    environment: Deno.env.get('ENVIRONMENT') ?? 'dev',
    tracesSampleRate: 0.2,
  });
}

export function captureWithContext(err: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureException(err);
  });
}
