import { RideDetailClient } from '@/components/admin/rides/ride-detail-client';

export default async function AdminRideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RideDetailClient rideId={id} />;
}
