import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { CommandPalette } from '@/components/command-palette';
import { DensityHotkeys } from '@/components/layout/density-hotkeys';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['dispatcher', 'admin'].includes(profile.role)) {
    redirect('/login');
  }

  return (
    <>
      <AppShell>{children}</AppShell>
      <CommandPalette />
      <DensityHotkeys />
    </>
  );
}
