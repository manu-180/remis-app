/**
 * Trunca un UUID/ID para logs. Defensivo: cruzar UUIDs entre logs puede des-anonimizar
 * usuarios incluso si por sí solos no son PII directa.
 */
export function shortId(id: string | null | undefined): string {
  if (!id) return '';
  return id.slice(0, 8);
}
