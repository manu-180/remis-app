import type { Metric } from 'web-vitals';
import { posthog } from './posthog';

function sendToAnalytics(metric: Metric) {
  posthog.capture('web_vital', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
}

export async function initWebVitals() {
  const { onLCP, onINP, onCLS, onFCP, onTTFB } = await import('web-vitals');
  onLCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
