import { requireRole } from '@/lib/auth/require-role';
import { PageHeader } from '@/components/admin/page-header';
import { SettingsClient } from '@/components/admin/settings/settings-client';

export default async function AdminSettingsPage() {
  await requireRole(['admin']);
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader title="Configuración" />
      <SettingsClient />
    </div>
  );
}
