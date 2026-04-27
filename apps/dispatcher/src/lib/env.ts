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

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  throw new Error('Variables de entorno inválidas. Revisar .env.local');
}

export const env = parsed.data;
