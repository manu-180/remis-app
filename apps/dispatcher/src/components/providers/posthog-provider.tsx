'use client';

import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { initPosthog, posthog } from '@/lib/observability/posthog';
import { initWebVitals } from '@/lib/observability/web-vitals';

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPosthog();
    initWebVitals();
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
