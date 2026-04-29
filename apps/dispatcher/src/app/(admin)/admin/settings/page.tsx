import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Settings"
        description="Configuración general de la remisería y del sistema."
      />
      <Card>
        <CardContent className="py-12 text-center text-sm text-[var(--neutral-500)]">
          En construcción
        </CardContent>
      </Card>
    </div>
  );
}
