import { requireRole } from '@/lib/auth/require-role';
import { AdminShell } from '@/components/admin/admin-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(['admin']);
  return <AdminShell profile={profile}>{children}</AdminShell>;
}
