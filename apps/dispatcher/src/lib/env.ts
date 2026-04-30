import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_MAPLIBRE_STYLE_URL: z.string().min(1).default('/map-style-dark.json'),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  NEXT_PUBLIC_MAPLIBRE_STYLE_URL: process.env['NEXT_PUBLIC_MAPLIBRE_STYLE_URL'],
});

export const envValid = parsed.success;

if (!parsed.success) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  if (typeof window === 'undefined') {
    // Server-side: build/runtime debe fallar fuerte para que no salga a produccion roto.
    console.error('Variables de entorno invalidas:', fieldErrors);
    throw new Error('Variables de entorno invalidas. Revisar .env.local');
  } else {
    // Client-side: log pero no tirar el bundle entero. La pagina vacia es peor que un toast/error visible.
    console.error('[env] Variables de entorno invalidas en el cliente:', fieldErrors);
  }
}

export const env = parsed.success
  ? parsed.data
  : {
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      NEXT_PUBLIC_MAPLIBRE_STYLE_URL: '/map-style-dark.json',
    };
