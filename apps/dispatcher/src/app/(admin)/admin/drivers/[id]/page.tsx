import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DriverProfileClient } from '@/components/admin/drivers/driver-profile-client';
import { isUuid } from '@/lib/validation';

export default async function DriverProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await getSupabaseServerClient();
  const { data: driver, error } = await supabase
    .from('drivers')
    .select(`*, profiles!inner(*), vehicles(*)`)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!driver) notFound();

  return <DriverProfileClient driver={driver} />;
}
