export function GET() {
  return Response.json({ status: 'ok', service: 'remis-web', ts: Date.now() });
}
