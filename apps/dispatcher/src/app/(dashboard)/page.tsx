import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';

export default async function DashboardPage() {
  const { profile } = await requireRole(['dispatcher', 'admin']);

  if (profile.role === 'admin') {
    redirect('/admin');
  }

  redirect('/rides');
}
