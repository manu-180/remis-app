import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@remis/shared-types/database';
import { env } from '@/lib/env';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return client;
}
