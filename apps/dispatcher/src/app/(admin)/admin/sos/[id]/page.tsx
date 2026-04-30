import { notFound } from 'next/navigation';
import { SosDetailClient } from '@/components/admin/sos/sos-detail-client';
import { isUuid } from '@/lib/validation';

export default async function AdminSosDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return <SosDetailClient sosId={id} />;
}
