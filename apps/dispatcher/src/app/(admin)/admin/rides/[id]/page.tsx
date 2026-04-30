import { notFound } from 'next/navigation';
import { RideDetailClient } from '@/components/admin/rides/ride-detail-client';
import { isUuid } from '@/lib/validation';

export default async function AdminRideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return <RideDetailClient rideId={id} />;
}
