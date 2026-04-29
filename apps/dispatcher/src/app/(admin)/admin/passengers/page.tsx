import { requireRole } from '@/lib/auth/require-role';
import { PageHeader } from '@/components/admin/page-header';
import { PassengersClient } from '@/components/admin/passengers/passengers-client';

export default async function AdminPassengersPage() {
  await requireRole(['admin']);
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader title="Pasajeros" />
      <PassengersClient />
    </div>
  );
}
