import { corsHeaders } from './cors.ts';
import { log } from './logger.ts';

export function respondError(message: string, status = 400, data?: unknown): Response {
  log('error', message, data);
  return Response.json({ error: message }, { status, headers: corsHeaders });
}
