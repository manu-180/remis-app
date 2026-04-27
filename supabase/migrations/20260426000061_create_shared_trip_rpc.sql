create or replace function public.create_shared_trip(
  p_ride_id  uuid,
  p_user_id  uuid
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_token    uuid;
  v_expires  timestamptz;
  v_ride     public.rides;
begin
  select * into v_ride from public.rides where id = p_ride_id;
  if not found then
    raise exception 'Ride not found' using errcode = 'P0004';
  end if;
  -- Expires at end of trip + 30min, or 4h from now if ongoing
  v_expires := case
    when v_ride.ended_at is not null then v_ride.ended_at + interval '30 minutes'
    else now() + interval '4 hours'
  end;
  insert into public.shared_trips(ride_id, expires_at, created_by)
  values (p_ride_id, v_expires, p_user_id)
  returning token into v_token;
  return v_token;
end;
$$;
