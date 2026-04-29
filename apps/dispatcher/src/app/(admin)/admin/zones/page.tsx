import { requireRole } from '@/lib/auth/require-role';
import { PageHeader } from '@/components/admin/page-header';
import { ZonesClient } from '@/components/admin/zones/zones-client';

export default async function AdminZonesPage() {
  await requireRole(['admin']);
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-6 lg:px-8 py-4 shrink-0">
        <PageHeader title="Zonas tarifarias" />
      </div>
      <div className="flex-1 overflow-hidden">
        <ZonesClient />
      </div>
    </div>
  );
}
