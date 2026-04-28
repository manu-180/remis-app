type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const REDACT_KEYS = ['token', 'password', 'secret', 'apikey', 'api_key', 'authorization'];

function maskPII(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(maskPII);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = k.toLowerCase();
    if (REDACT_KEYS.some((p) => key.includes(p))) {
      result[k] = '[REDACTED]';
    } else if (key === 'phone' && typeof v === 'string') {
      result[k] = `***${v.slice(-4)}`;
    } else if (key === 'email' && typeof v === 'string') {
      const parts = v.split('@');
      result[k] = `${parts[0]}@***.${parts[1]?.split('.').pop() ?? 'com'}`;
    } else if (key === 'dni' || key === 'document') {
      result[k] = '[redacted]';
    } else if (key === 'name' && typeof v === 'string') {
      result[k] = '[REDACTED]';
    } else {
      result[k] = maskPII(v);
    }
  }
  return result;
}

export function log(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...(maskPII(data) as Record<string, unknown>),
    }),
  );
}
