import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminSosPage() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="SOS"
        description="Alertas de emergencia activas y registros históricos."
      />
      <Card>
        <CardContent className="py-12 text-center text-sm text-[var(--neutral-500)]">
          En construcción
        </CardContent>
      </Card>
    </div>
  );
}
