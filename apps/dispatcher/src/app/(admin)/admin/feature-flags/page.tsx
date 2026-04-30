import { PageHeader } from '@/components/admin/page-header';
import { FeatureFlagsClient } from '@/components/admin/feature-flags/feature-flags-client';

export default function AdminFeatureFlagsPage() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Feature Flags"
        description="Activación y desactivación de funcionalidades por entorno."
      />
      <FeatureFlagsClient />
    </div>
  );
}
