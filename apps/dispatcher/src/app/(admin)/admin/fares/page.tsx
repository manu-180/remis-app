import { requireRole } from '@/lib/auth/require-role';
import { PageHeader } from '@/components/admin/page-header';
import { FaresClient } from '@/components/admin/fares/fares-client';

export default async function AdminFaresPage() {
  await requireRole(['admin']);
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader title="Tarifas" description="Configuración de precios por zona." />
      <FaresClient />
    </div>
  );
}
