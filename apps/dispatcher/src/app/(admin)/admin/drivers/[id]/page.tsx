import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DriverProfileClient } from '@/components/admin/drivers/driver-profile-client';

export default async function DriverProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: driver } = await supabase
    .from('drivers')
    .select(`*, profiles!inner(*), vehicles(*)`)
    .eq('id', id)
    .single();

  if (!driver) notFound();

  return <DriverProfileClient driver={driver} />;
}
