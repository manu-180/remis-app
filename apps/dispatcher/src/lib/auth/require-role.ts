import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@remis/shared-types/database';

type Role = Database['public']['Enums']['user_role'];

export async function requireRole(
  allowed: ReadonlyArray<Role>,
  redirectTo = '/login',
) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(redirectTo);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, avatar_url, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !allowed.includes(profile.role as Role)) redirect(redirectTo);

  return { user, profile: profile as {
    id: string;
    role: Role;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  }};
}
