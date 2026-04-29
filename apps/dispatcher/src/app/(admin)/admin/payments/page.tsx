import { requireRole } from '@/lib/auth/require-role';
import { PageHeader } from '@/components/admin/page-header';
import { PaymentsClient } from '@/components/admin/payments/payments-client';

export default async function AdminPaymentsPage() {
  await requireRole(['admin']);
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader title="Pagos" />
      <PaymentsClient />
    </div>
  );
}
