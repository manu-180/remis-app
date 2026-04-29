import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/admin/dashboard/dashboard-client';

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileRes = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id ?? '')
    .single();
  const profile = profileRes.data as { full_name?: string } | null;

  const params = await searchParams;
  const period = params.period ?? 'today';

  return (
    <DashboardClient
      profileName={profile?.full_name ?? 'Admin'}
      initialPeriod={period}
    />
  );
}
