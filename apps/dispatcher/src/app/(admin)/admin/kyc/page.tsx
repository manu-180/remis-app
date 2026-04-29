import { requireRole } from '@/lib/auth/require-role';
import { PageHeader } from '@/components/admin/page-header';
import { KycClient } from '@/components/admin/kyc/kyc-client';

export default async function AdminKycPage() {
  await requireRole(['admin']);
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader title="Revisión KYC" description="Verificaciones de identidad de conductores." />
      <KycClient />
    </div>
  );
}
