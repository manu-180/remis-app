import posthog from 'posthog-js';

export function initPosthog() {
  if (typeof window === 'undefined' || posthog.__loaded) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return; // opcional en dev — configurable via NEXT_PUBLIC_POSTHOG_KEY en .env
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    session_recording: { maskAllInputs: true },
  });
}

export { posthog };
