-- get_shift_summary: resumen de viajes del turno actual (últimas 24 h)
-- Devuelve jsonb con total_rides, total_earnings_ars, total_distance_m

create or replace function public.get_shift_summary(p_driver_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total_rides',        count(*),
    'total_earnings_ars', coalesce(sum(final_fare_ars), 0),
    'total_distance_m',   coalesce(sum(distance_meters), 0)
  )
  from public.rides
  where driver_id = p_driver_id
    and status    = 'completed'
    and ended_at >= now() - interval '24 hours'
$$;

grant execute on function public.get_shift_summary(uuid) to authenticated;
