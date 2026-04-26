-- seed.sql — Datos de desarrollo
-- Solo corre con: supabase db reset
-- NUNCA se aplica en producción
-- Todos los INSERTs usan ON CONFLICT DO NOTHING

-- ─────────────────────────────────────────────
-- UUIDs fijos para seed (reproducibles)
-- ─────────────────────────────────────────────
-- admin:       00000000-0000-0000-0000-000000000001
-- dispatcher:  00000000-0000-0000-0000-000000000002
-- drivers:     00000000-0000-0000-0001-000000000001 ... 0005
-- passengers:  00000000-0000-0000-0002-000000000001 ... 0010
-- vehicles:    00000000-0000-0000-0003-000000000001 ... 0005

-- ─────────────────────────────────────────────
-- 1. auth.users (usuarios base)
-- ─────────────────────────────────────────────
insert into auth.users (
  id, email, phone, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role
)
values
  -- Admin
  ('00000000-0000-0000-0000-000000000001',
   'admin@remispampa.com.ar', null,
   crypt('Admin1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Admin Sistema","role":"admin"}',
   'authenticated', 'authenticated'),

  -- Dispatcher
  ('00000000-0000-0000-0000-000000000002',
   'dispatcher@remispampa.com.ar', null,
   crypt('Disp1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"María González","role":"dispatcher"}',
   'authenticated', 'authenticated'),

  -- Conductores (con teléfono para login SMS)
  ('00000000-0000-0000-0001-000000000001',
   null, '+542954100001',
   crypt('Driver1234!', gen_salt('bf')), null, now(), now(),
   '{"provider":"phone","providers":["phone"]}',
   '{"full_name":"Carlos Rodríguez","role":"driver"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0001-000000000002',
   null, '+542954100002',
   crypt('Driver1234!', gen_salt('bf')), null, now(), now(),
   '{"provider":"phone","providers":["phone"]}',
   '{"full_name":"Juan Pérez","role":"driver"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0001-000000000003',
   null, '+542954100003',
   crypt('Driver1234!', gen_salt('bf')), null, now(), now(),
   '{"provider":"phone","providers":["phone"]}',
   '{"full_name":"Roberto Díaz","role":"driver"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0001-000000000004',
   null, '+542954100004',
   crypt('Driver1234!', gen_salt('bf')), null, now(), now(),
   '{"provider":"phone","providers":["phone"]}',
   '{"full_name":"Luis Martínez","role":"driver"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0001-000000000005',
   null, '+542954100005',
   crypt('Driver1234!', gen_salt('bf')), null, now(), now(),
   '{"provider":"phone","providers":["phone"]}',
   '{"full_name":"Pablo García","role":"driver"}',
   'authenticated', 'authenticated'),

  -- Pasajeros
  ('00000000-0000-0000-0002-000000000001',
   'pasajero1@test.com', '+542954200001',
   crypt('Pass1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Ana López","role":"passenger"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0002-000000000002',
   'pasajero2@test.com', '+542954200002',
   crypt('Pass1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Pedro Fernández","role":"passenger"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0002-000000000003',
   'pasajero3@test.com', '+542954200003',
   crypt('Pass1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Laura Sánchez","role":"passenger"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0002-000000000004',
   'pasajero4@test.com', '+542954200004',
   crypt('Pass1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Diego Torres","role":"passenger"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0002-000000000005',
   'pasajero5@test.com', '+542954200005',
   crypt('Pass1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Sofía Ramírez","role":"passenger"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0002-000000000006',
   'vip@test.com', '+542954200006',
   crypt('Pass1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Carmen Villanueva","role":"passenger"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0002-000000000007',
   'frecuente@test.com', '+542954200007',
   crypt('Pass1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Jorge Morales","role":"passenger"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0002-000000000008',
   'blacklisted@test.com', '+542954200008',
   crypt('Pass1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Ricardo Blanco","role":"passenger"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0002-000000000009',
   'pasajero9@test.com', '+542954200009',
   crypt('Pass1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Marcela Ruiz","role":"passenger"}',
   'authenticated', 'authenticated'),

  ('00000000-0000-0000-0002-000000000010',
   'pasajero10@test.com', '+542954200010',
   crypt('Pass1234!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Héctor Cabrera","role":"passenger"}',
   'authenticated', 'authenticated')

on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- 2. profiles (el trigger handle_new_user crea los profiles,
--    pero en seed lo hacemos manualmente para mayor control)
-- ─────────────────────────────────────────────
insert into public.profiles (id, role, full_name, phone, email)
values
  ('00000000-0000-0000-0000-000000000001', 'admin',      'Admin Sistema',        null,              'admin@remispampa.com.ar'),
  ('00000000-0000-0000-0000-000000000002', 'dispatcher', 'María González',       null,              'dispatcher@remispampa.com.ar'),
  ('00000000-0000-0000-0001-000000000001', 'driver',     'Carlos Rodríguez',     '+542954100001',   null),
  ('00000000-0000-0000-0001-000000000002', 'driver',     'Juan Pérez',           '+542954100002',   null),
  ('00000000-0000-0000-0001-000000000003', 'driver',     'Roberto Díaz',         '+542954100003',   null),
  ('00000000-0000-0000-0001-000000000004', 'driver',     'Luis Martínez',        '+542954100004',   null),
  ('00000000-0000-0000-0001-000000000005', 'driver',     'Pablo García',         '+542954100005',   null),
  ('00000000-0000-0000-0002-000000000001', 'passenger',  'Ana López',            '+542954200001',   'pasajero1@test.com'),
  ('00000000-0000-0000-0002-000000000002', 'passenger',  'Pedro Fernández',      '+542954200002',   'pasajero2@test.com'),
  ('00000000-0000-0000-0002-000000000003', 'passenger',  'Laura Sánchez',        '+542954200003',   'pasajero3@test.com'),
  ('00000000-0000-0000-0002-000000000004', 'passenger',  'Diego Torres',         '+542954200004',   'pasajero4@test.com'),
  ('00000000-0000-0000-0002-000000000005', 'passenger',  'Sofía Ramírez',        '+542954200005',   'pasajero5@test.com'),
  ('00000000-0000-0000-0002-000000000006', 'passenger',  'Carmen Villanueva',    '+542954200006',   'vip@test.com'),
  ('00000000-0000-0000-0002-000000000007', 'passenger',  'Jorge Morales',        '+542954200007',   'frecuente@test.com'),
  ('00000000-0000-0000-0002-000000000008', 'passenger',  'Ricardo Blanco',       '+542954200008',   'blacklisted@test.com'),
  ('00000000-0000-0000-0002-000000000009', 'passenger',  'Marcela Ruiz',         '+542954200009',   'pasajero9@test.com'),
  ('00000000-0000-0000-0002-000000000010', 'passenger',  'Héctor Cabrera',       '+542954200010',   'pasajero10@test.com')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- 3. vehicles
-- ─────────────────────────────────────────────
insert into public.vehicles (id, plate, make, model, color, year, vehicle_type, mobile_number)
values
  ('00000000-0000-0000-0003-000000000001', 'ABC123', 'Volkswagen', 'Gol',    'Blanco', 2021, 'sedan', 'Móvil 1'),
  ('00000000-0000-0000-0003-000000000002', 'DEF456', 'Renault',    'Logan',  'Gris',   2020, 'sedan', 'Móvil 2'),
  ('00000000-0000-0000-0003-000000000003', 'GHI789', 'Ford',       'EcoSport','Negro', 2022, 'suv',   'Móvil 3'),
  ('00000000-0000-0000-0003-000000000004', 'JKL012', 'Chevrolet',  'Cruze',  'Plata',  2019, 'sedan', 'Móvil 4'),
  ('00000000-0000-0000-0003-000000000005', 'MNO345', 'Fiat',       'Cronos', 'Rojo',   2023, 'sedan', 'Móvil 5')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- 4. drivers
-- ─────────────────────────────────────────────
insert into public.drivers (id, is_active, is_online, current_status, vehicle_id, mobile_number, rating, total_rides, joined_at)
values
  ('00000000-0000-0000-0001-000000000001', true, true,  'available', '00000000-0000-0000-0003-000000000001', 'Móvil 1', 4.80, 342, '2023-01-15'),
  ('00000000-0000-0000-0001-000000000002', true, true,  'available', '00000000-0000-0000-0003-000000000002', 'Móvil 2', 4.95, 567, '2022-06-01'),
  ('00000000-0000-0000-0001-000000000003', true, false, 'offline',   '00000000-0000-0000-0003-000000000003', 'Móvil 3', 4.60, 189, '2024-02-10'),
  ('00000000-0000-0000-0001-000000000004', true, true,  'on_trip',   '00000000-0000-0000-0003-000000000004', 'Móvil 4', 4.75, 421, '2023-09-20'),
  ('00000000-0000-0000-0001-000000000005', true, true,  'available', '00000000-0000-0000-0003-000000000005', 'Móvil 5', 4.90, 198, '2024-11-05')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- 5. driver_documents (con docs vigentes para los 5 conductores)
-- ─────────────────────────────────────────────
insert into public.driver_documents (
  id, driver_id, document_type, file_url, issued_at, expires_at, verified
)
select
  uuid_generate_v4(),
  d.id,
  dt.doc_type::public.document_type,
  'https://storage.example.com/docs/placeholder.pdf',
  current_date - interval '6 months',
  current_date + interval '6 months',
  true
from
  (values
    ('00000000-0000-0000-0001-000000000001'),
    ('00000000-0000-0000-0001-000000000002'),
    ('00000000-0000-0000-0001-000000000003'),
    ('00000000-0000-0000-0001-000000000004'),
    ('00000000-0000-0000-0001-000000000005')
  ) as d(id),
  (values
    ('luc_d1'), ('vtv'), ('insurance_rc'),
    ('insurance_passengers'), ('health_card'), ('vehicle_authorization')
  ) as dt(doc_type)
on conflict do nothing;

-- ─────────────────────────────────────────────
-- 6. passengers
-- ─────────────────────────────────────────────
insert into public.passengers (id, default_payment_method, blacklisted, blacklist_reason, total_rides, total_no_shows)
values
  ('00000000-0000-0000-0002-000000000001', 'cash',        false, null,                             12,  0),
  ('00000000-0000-0000-0002-000000000002', 'mp_checkout', false, null,                             45,  1),
  ('00000000-0000-0000-0002-000000000003', 'cash',        false, null,                              3,  0),
  ('00000000-0000-0000-0002-000000000004', 'mp_checkout', false, null,                             89,  0),
  ('00000000-0000-0000-0002-000000000005', 'cash',        false, null,                              7,  0),
  ('00000000-0000-0000-0002-000000000006', 'mp_checkout', false, null,                            234,  0),
  ('00000000-0000-0000-0002-000000000007', 'cash',        false, null,                            156,  2),
  ('00000000-0000-0000-0002-000000000008', 'cash',        true,  'No-show reiterado + mal trato',    5,  4),
  ('00000000-0000-0000-0002-000000000009', 'cash',        false, null,                             23,  0),
  ('00000000-0000-0000-0002-000000000010', 'mp_checkout', false, null,                             61,  1)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- 7. driver_current_location (los conductores online)
-- Coordenadas en el área de Santa Rosa, La Pampa
-- ─────────────────────────────────────────────
insert into public.driver_current_location (
  driver_id, location, heading, speed_mps, status, updated_at
)
values
  ('00000000-0000-0000-0001-000000000001',
   st_makepoint(-64.2950, -36.6200)::geography, 45,  0,    'available', now()),
  ('00000000-0000-0000-0001-000000000002',
   st_makepoint(-64.3100, -36.6150)::geography, 180, 0,    'available', now()),
  ('00000000-0000-0000-0001-000000000004',
   st_makepoint(-64.3050, -36.6300)::geography, 90,  8.33, 'on_trip',   now()),
  ('00000000-0000-0000-0001-000000000005',
   st_makepoint(-64.2850, -36.6050)::geography, 270, 0,    'available', now())
on conflict (driver_id) do update set
  location   = excluded.location,
  heading    = excluded.heading,
  speed_mps  = excluded.speed_mps,
  status     = excluded.status,
  updated_at = now();

-- ─────────────────────────────────────────────
-- 8. rides en distintos estados
-- ─────────────────────────────────────────────
insert into public.rides (
  id, passenger_id, driver_id, dispatcher_id, status,
  pickup_address, pickup_location, dest_address, dest_location,
  pickup_zone_id, dest_zone_id,
  requested_via, passengers_count,
  estimated_fare_ars, final_fare_ars, payment_method, payment_status,
  requested_at, assigned_at, started_at, ended_at
)
values

-- Ride completado (histórico)
(uuid_generate_v4(),
 '00000000-0000-0000-0002-000000000001',
 '00000000-0000-0000-0001-000000000002',
 '00000000-0000-0000-0000-000000000002',
 'completed',
 'Av. Roca 120, Santa Rosa', st_makepoint(-64.2960, -36.6220)::geography,
 'Pellegrini 450, Santa Rosa', st_makepoint(-64.3020, -36.6180)::geography,
 'tz-centro-0001-0001-000000000001', 'tz-centro-0001-0001-000000000001',
 'app', 1, 3200.00, 3200.00, 'cash', 'cash_at_arrival',
 now() - interval '2 days', now() - interval '2 days' + interval '3 minutes',
 now() - interval '2 days' + interval '8 minutes',
 now() - interval '2 days' + interval '25 minutes'),

-- Ride en curso
(uuid_generate_v4(),
 '00000000-0000-0000-0002-000000000004',
 '00000000-0000-0000-0001-000000000004',
 '00000000-0000-0000-0000-000000000002',
 'on_trip',
 'Luro 300, Santa Rosa', st_makepoint(-64.3100, -36.6280)::geography,
 'Lisandro Olmos 890, Santa Rosa', st_makepoint(-64.2900, -36.6350)::geography,
 'tz-centro-0001-0001-000000000001', 'tz-sur---0003-0003-000000000003',
 'app', 1, 3500.00, null, 'mp_checkout', 'pending',
 now() - interval '15 minutes', now() - interval '12 minutes',
 now() - interval '7 minutes', null),

-- Ride asignado (conductor yendo al pickup)
(uuid_generate_v4(),
 '00000000-0000-0000-0002-000000000002',
 '00000000-0000-0000-0001-000000000001',
 '00000000-0000-0000-0000-000000000002',
 'en_route_to_pickup',
 'Italia 567, Santa Rosa', st_makepoint(-64.3150, -36.6150)::geography,
 'Hipólito Yrigoyen 234, Santa Rosa', st_makepoint(-64.2980, -36.6090)::geography,
 'tz-norte-0002-0002-000000000002', 'tz-centro-0001-0001-000000000001',
 'phone', 2, 2800.00, null, 'cash', 'pending',
 now() - interval '5 minutes', now() - interval '3 minutes',
 null, null),

-- Ride pendiente de asignación
(uuid_generate_v4(),
 '00000000-0000-0000-0002-000000000003',
 null, null,
 'requested',
 'Falucho 89, Santa Rosa', st_makepoint(-64.3050, -36.6200)::geography,
 'Terminal de Ómnibus Santa Rosa', st_makepoint(-64.3200, -36.6120)::geography,
 'tz-centro-0001-0001-000000000001', 'tz-norte-0002-0002-000000000002',
 'app', 1, 2700.00, null, 'cash', 'pending',
 now() - interval '2 minutes', null, null, null),

-- Ride pendiente de asignación (programado para mañana)
(uuid_generate_v4(),
 '00000000-0000-0000-0002-000000000006',
 null, null,
 'requested',
 'Mitre 445, Santa Rosa', st_makepoint(-64.2990, -36.6230)::geography,
 'Aeropuerto Santa Rosa', st_makepoint(-64.2620, -36.5780)::geography,
 'tz-centro-0001-0001-000000000001', 'tz-norte-0002-0002-000000000002',
 'app', 1, 5500.00, null, 'mp_checkout', 'pending',
 now(), null, null, null)

on conflict do nothing;

-- ─────────────────────────────────────────────
-- 9. Verificar que el seed corrió OK
-- ─────────────────────────────────────────────
do $$
declare
  v_profiles   int;
  v_drivers    int;
  v_passengers int;
  v_rides      int;
  v_zones      int;
begin
  select count(*) into v_profiles   from public.profiles;
  select count(*) into v_drivers    from public.drivers;
  select count(*) into v_passengers from public.passengers;
  select count(*) into v_rides      from public.rides;
  select count(*) into v_zones      from public.tariff_zones;

  raise notice '=== SEED COMPLETADO ===';
  raise notice 'Profiles:   %', v_profiles;
  raise notice 'Drivers:    %', v_drivers;
  raise notice 'Passengers: %', v_passengers;
  raise notice 'Rides:      %', v_rides;
  raise notice 'Zones:      %', v_zones;
end $$;
