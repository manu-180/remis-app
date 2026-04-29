import { requireRole } from '@/lib/auth/require-role';
import { PageHeader } from '@/components/admin/page-header';
import { AuditClient } from '@/components/admin/audit/audit-client';

export default async function AdminAuditPage() {
  await requireRole(['admin']);
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Audit Log"
        description="Registro de todas las acciones administrativas."
      />
      <AuditClient />
    </div>
  );
}
