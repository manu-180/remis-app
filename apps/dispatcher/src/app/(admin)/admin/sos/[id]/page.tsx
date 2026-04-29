import { SosDetailClient } from '@/components/admin/sos/sos-detail-client';

export default async function AdminSosDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SosDetailClient sosId={id} />;
}
