type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function redactPII(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };
  if (typeof result['phone'] === 'string') {
    result['phone'] = `***${result['phone'].slice(-4)}`;
  }
  if (result['dni'] !== undefined) {
    result['dni'] = '[redacted]';
  }
  if (typeof result['email'] === 'string') {
    const parts = result['email'].split('@');
    result['email'] = `${parts[0]}@***.${parts[1]?.split('.').pop() ?? 'com'}`;
  }
  return result;
}

export function log(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...redactPII(data),
    }),
  );
}
