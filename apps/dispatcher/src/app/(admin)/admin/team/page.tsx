import { requireRole } from '@/lib/auth/require-role';
import { PageHeader } from '@/components/admin/page-header';
import { TeamClient } from '@/components/admin/team/team-client';

export default async function AdminTeamPage() {
  await requireRole(['admin']);
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Equipo"
        description="Gestión de administradores y despachadores."
      />
      <TeamClient />
    </div>
  );
}
