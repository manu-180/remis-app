import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminZonesPage() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Zonas"
        description="Definición y edición de zonas de cobertura del servicio."
      />
      <Card>
        <CardContent className="py-12 text-center text-sm text-[var(--neutral-500)]">
          En construcción
        </CardContent>
      </Card>
    </div>
  );
}
