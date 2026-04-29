const cache = new Map<string, string>();
let lastRequestTime = 0;

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key)!;

  // Rate limit: max 1 req/sec (Nominatim policy)
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1000) await new Promise<void>((r) => setTimeout(r, 1000 - elapsed));
  lastRequestTime = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'RemisDespacho/1.0',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.display_name as string | undefined;
    if (addr) {
      cache.set(key, addr);
      return addr;
    }
    return null;
  } catch {
    return null;
  }
}
