const PII_KEYS = ['email', 'phone', 'name', 'token', 'password', 'secret'];

function redact(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = PII_KEYS.some((p) => k.toLowerCase().includes(p)) ? '[REDACTED]' : redact(v);
  }
  return result;
}

export function log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
  console.log(JSON.stringify({ level, message, data: data ? redact(data) : undefined, ts: new Date().toISOString() }));
}
