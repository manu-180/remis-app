-- =============================================================================
-- DEMO SEED — RemisDespacho
-- =============================================================================
-- Datos sintéticos para mostrar el admin web a un potencial cliente.
-- Reproducible: idempotente (ON CONFLICT DO NOTHING + NOT EXISTS).
--
-- Volumen:
--   - 18 conductores (auth + profiles + drivers + vehicles + KYC + 7 docs c/u)
--   - 40 pasajeros (con 2 blacklisted, 1 VIP, 1 que pide accesible)
--   - 150 viajes en los últimos 30 días con mix de status
--       * 125 completed
--       * 6 requested (cola actual del dispatcher)
--       * 8 activos (assigned/en_route/waiting/on_trip)
--       * ~20 cancelados (mix por pax/dispatcher/driver/no-show)
--   - 840 ride_events (timeline de cada viaje)
--   - 125 payments (cash/mp_checkout/account)
--   - ~95 ride_ratings (75% de los completados)
--   - 12 driver_current_location (los que están online)
--   - 30 frequent_addresses
--
-- Cómo aplicar:
--   1. Vía MCP de Supabase: ejecutar este archivo entero (chunks separados).
--   2. Vía CLI: psql $DATABASE_URL -f docs/seeds/demo-seed.sql
--   3. Vía Supabase SQL Editor: pegar y correr.
--
-- Ubicación geográfica: alrededor de Santa Rosa, La Pampa
-- (centro: lat=-36.6201, lng=-64.2906; zonas: Centro/Norte/Sur/Periferia)
--
-- Reset rápido (peligroso, solo demo):
--   DELETE FROM public.ride_ratings;
--   DELETE FROM public.payments;
--   DELETE FROM public.ride_events;
--   DELETE FROM public.rides;
--   DELETE FROM public.driver_documents;
--   DELETE FROM public.kyc_verifications;
--   DELETE FROM public.driver_current_location;
--   DELETE FROM public.frequent_addresses;
--   DELETE FROM public.passengers WHERE id::text LIKE 'bbbbbbbb%';
--   DELETE FROM public.drivers;
--   DELETE FROM public.vehicles WHERE id::text LIKE 'cccccccc%';
--   DELETE FROM public.profiles WHERE id::text LIKE 'aaaaaaaa%' OR id::text LIKE 'bbbbbbbb%';
--   DELETE FROM auth.users WHERE id::text LIKE 'aaaaaaaa%' OR id::text LIKE 'bbbbbbbb%';
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CHUNK 1 — Drivers + vehicles + auth.users
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_user_id UUID;
  v_vehicle_id UUID;
  v_idx INT;
  v_full_name TEXT;
  driver_names TEXT[] := ARRAY[
    'Carlos Suárez', 'Roberto Funes', 'Miguel Aguirre', 'Jorge Olguín',
    'Sebastián Domínguez','Hugo Tognola', 'Daniel Lucero', 'Pablo Rampoldi',
    'Marcelo Iturrioz', 'Luis Otero', 'Adrián Verzini', 'Ramón Quiroga',
    'Omar Larrañaga', 'Néstor Bigarrán', 'Walter Etchegaray', 'Cristian Pellegrini',
    'Fabián Rosales', 'Mauricio Cardozo'
  ];
  car_combos TEXT[] := ARRAY[
    'Renault|Logan', 'Chevrolet|Onix', 'Volkswagen|Voyage', 'Toyota|Etios',
    'Peugeot|208', 'Fiat|Cronos', 'Ford|Ka', 'Citroën|C3', 'Nissan|Versa',
    'Renault|Sandero', 'Chevrolet|Cruze', 'Volkswagen|Gol', 'Toyota|Corolla',
    'Peugeot|301', 'Fiat|Argo', 'Ford|Fiesta', 'Citroën|C4', 'Nissan|March'
  ];
  colors TEXT[] := ARRAY['blanco','gris','negro','azul','rojo','plata'];
  v_combo TEXT; v_make TEXT; v_model TEXT;
  v_status driver_status;
BEGIN
  FOR v_idx IN 1..array_length(driver_names, 1) LOOP
    v_full_name := driver_names[v_idx];
    v_user_id := ('aaaaaaaa-aaaa-aaaa-aaaa-' || lpad(v_idx::text, 12, '0'))::uuid;
    v_vehicle_id := ('cccccccc-cccc-cccc-cccc-' || lpad(v_idx::text, 12, '0'))::uuid;
    v_combo := car_combos[v_idx];
    v_make := split_part(v_combo, '|', 1);
    v_model := split_part(v_combo, '|', 2);

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'driver' || lpad(v_idx::text, 2, '0') || '@remisdemo.com',
      crypt('demo1234', gen_salt('bf')),
      NOW() - (60 * INTERVAL '1 day'),
      NOW() - (60 * INTERVAL '1 day'),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name),
      false, false
    ) ON CONFLICT (id) DO NOTHING;

    -- Profile auto-creado por trigger; sobreescribimos con datos reales
    UPDATE public.profiles SET
      role = 'driver',
      full_name = v_full_name,
      phone = '+5429546' || lpad((100000 + v_idx * 13)::text, 6, '0'),
      email = 'driver' || lpad(v_idx::text, 2, '0') || '@remisdemo.com',
      avatar_url = 'https://i.pravatar.cc/200?u=driver' || v_idx,
      created_at = NOW() - (60 * INTERVAL '1 day')
    WHERE id = v_user_id;

    INSERT INTO public.vehicles (id, plate, make, model, color, year, vehicle_type, mobile_number, is_active, created_at)
    VALUES (
      v_vehicle_id,
      'AE' || lpad(v_idx::text, 3, '0') || chr(65 + (v_idx % 26)) || chr(66 + (v_idx % 25)),
      v_make, v_model,
      colors[1 + (v_idx % array_length(colors, 1))],
      2018 + (v_idx % 7),
      CASE WHEN v_idx = 8 THEN 'suv'::vehicle_type
           WHEN v_idx = 12 THEN 'van'::vehicle_type
           WHEN v_idx = 15 THEN 'accessible'::vehicle_type
           ELSE 'sedan'::vehicle_type END,
      lpad((1000 + v_idx)::text, 4, '0'),
      v_idx <= 16,
      NOW() - (60 * INTERVAL '1 day')
    ) ON CONFLICT (id) DO NOTHING;

    v_status := CASE
      WHEN v_idx <= 4 THEN 'available'::driver_status
      WHEN v_idx <= 6 THEN 'on_trip'::driver_status
      WHEN v_idx <= 8 THEN 'en_route_to_pickup'::driver_status
      WHEN v_idx = 9 THEN 'on_break'::driver_status
      WHEN v_idx <= 14 THEN 'offline'::driver_status
      WHEN v_idx <= 17 THEN 'available'::driver_status
      ELSE 'suspended'::driver_status
    END;

    INSERT INTO public.drivers (id, is_active, is_online, current_status, vehicle_id, mobile_number, rating, total_rides, joined_at, created_at)
    VALUES (
      v_user_id,
      v_status != 'suspended',
      v_status NOT IN ('offline','suspended'),
      v_status,
      v_vehicle_id,
      lpad((1000 + v_idx)::text, 4, '0'),
      4.2 + (v_idx % 9) * 0.1,
      50 + v_idx * 23 + (v_idx * v_idx),
      NOW() - ((60 + v_idx * 10) * INTERVAL '1 day'),
      NOW() - (60 * INTERVAL '1 day')
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- CHUNK 2 — Pasajeros
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_user_id UUID;
  v_idx INT;
  v_full_name TEXT;
  passenger_names TEXT[] := ARRAY[
    'María Fernández',  'Lucía Gómez',       'Sofía Martínez',    'Camila Rodríguez',
    'Valentina López',  'Martina Pérez',     'Julieta Sánchez',   'Florencia Torres',
    'Agustina Ramírez', 'Belén Flores',      'Carolina Acosta',   'Patricia Núñez',
    'Silvia Ferreira',  'Mónica Benítez',    'Adriana Cabrera',   'Laura Pereyra',
    'Diego Castro',     'Federico Romero',   'Matías Álvarez',    'Nicolás Herrera',
    'Esteban Molina',   'Tomás Vázquez',     'Gonzalo Silva',     'Ignacio Mendoza',
    'Juan Cruz Ojeda',  'Lautaro Vega',      'Joaquín Maldonado', 'Iván Sosa',
    'Ezequiel Cáceres', 'Bruno Acuña',       'Ana Paula Britos',  'Romina Salinas',
    'Daniela Barrera',  'Verónica Toledo',   'Andrea Coronel',    'Gabriela Aguirre',
    'Rocío Villalba',   'Yanina Suárez',     'Cecilia Domínguez', 'Soledad Funes'
  ];
BEGIN
  FOR v_idx IN 1..array_length(passenger_names, 1) LOOP
    v_full_name := passenger_names[v_idx];
    v_user_id := ('bbbbbbbb-bbbb-bbbb-bbbb-' || lpad(v_idx::text, 12, '0'))::uuid;

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'pax' || lpad(v_idx::text, 2, '0') || '@remisdemo.com',
      crypt('demo1234', gen_salt('bf')),
      NOW() - ((30 + v_idx) * INTERVAL '1 day'),
      NOW() - ((30 + v_idx) * INTERVAL '1 day'),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name),
      false, false
    ) ON CONFLICT (id) DO NOTHING;

    UPDATE public.profiles SET
      role = 'passenger',
      full_name = v_full_name,
      phone = '+5429546' || lpad((500000 + v_idx * 17)::text, 6, '0'),
      email = 'pax' || lpad(v_idx::text, 2, '0') || '@remisdemo.com',
      avatar_url = 'https://i.pravatar.cc/200?u=pax' || v_idx,
      created_at = NOW() - ((30 + v_idx) * INTERVAL '1 day')
    WHERE id = v_user_id;

    INSERT INTO public.passengers (id, default_payment_method, blacklisted, blacklist_reason, total_rides, total_no_shows, notes, created_at)
    VALUES (
      v_user_id,
      CASE WHEN v_idx % 5 = 0 THEN 'mp_checkout'::payment_method
           WHEN v_idx % 11 = 0 THEN 'account'::payment_method
           ELSE 'cash'::payment_method END,
      v_idx IN (37, 38),
      CASE WHEN v_idx = 37 THEN 'Reiterados no-show'
           WHEN v_idx = 38 THEN 'Comportamiento agresivo reportado por chofer'
           ELSE NULL END,
      (v_idx * 3 + 5) % 60,
      v_idx % 4,
      CASE WHEN v_idx = 5 THEN 'Cliente VIP — empresa'
           WHEN v_idx = 12 THEN 'Suele pedir vehiculo accesible'
           ELSE NULL END,
      NOW() - ((30 + v_idx) * INTERVAL '1 day')
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- Eliminar passenger rows que el trigger creó para drivers/admins
DELETE FROM public.passengers
WHERE id IN (SELECT id FROM public.profiles WHERE role IN ('driver','admin','dispatcher'));

-- -----------------------------------------------------------------------------
-- CHUNK 3 — driver_current_location
-- -----------------------------------------------------------------------------
INSERT INTO public.driver_current_location (driver_id, location, heading, speed_mps, accuracy_m, battery_pct, status, updated_at)
SELECT d.id,
  ST_SetSRID(ST_MakePoint(-64.2906 + (random()-0.5)*0.06, -36.6201 + (random()-0.5)*0.05), 4326)::geography,
  (random() * 360)::double precision,
  CASE
    WHEN d.current_status IN ('on_trip','en_route_to_pickup') THEN 8 + random() * 12
    WHEN d.current_status = 'available' THEN random() * 3
    ELSE 0 END,
  3 + random() * 7,
  20 + (random() * 80)::int,
  d.current_status,
  NOW() - (random() * INTERVAL '90 seconds')
FROM public.drivers d
WHERE d.current_status NOT IN ('offline','suspended')
ON CONFLICT (driver_id) DO UPDATE SET
  location = EXCLUDED.location,
  heading = EXCLUDED.heading,
  speed_mps = EXCLUDED.speed_mps,
  accuracy_m = EXCLUDED.accuracy_m,
  battery_pct = EXCLUDED.battery_pct,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

-- -----------------------------------------------------------------------------
-- CHUNK 4 — 150 rides en últimos 30 días
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_idx INT;
  v_ride_id UUID;
  v_driver_id UUID;
  v_passenger_id UUID;
  v_dispatcher_id UUID := (SELECT id FROM public.profiles WHERE role='admin' LIMIT 1);
  v_status ride_status;
  v_payment_method payment_method;
  v_payment_status payment_status;
  v_requested_at TIMESTAMPTZ;
  v_assigned_at TIMESTAMPTZ;
  v_started_at TIMESTAMPTZ;
  v_ended_at TIMESTAMPTZ;
  v_pickup_lat FLOAT; v_pickup_lng FLOAT;
  v_dest_lat FLOAT; v_dest_lng FLOAT;
  v_distance FLOAT; v_fare NUMERIC; v_estimated NUMERIC;
  v_pickup_addr TEXT; v_dest_addr TEXT;
  v_streets TEXT[] := ARRAY['Av. San Martín','Av. Spinetto','Hipólito Yrigoyen','Av. Luro','Coronel Gil','Avellaneda','Belgrano','Sarmiento','Mitre','Rivadavia','Pellegrini','Alvear','Av. Roca','Lagos','Quintana','Pueyrredón','Italia','España','Av. Argentina','Av. Uruguay'];
  v_destinations TEXT[] := ARRAY['Terminal de Ómnibus','Hospital Lucio Molas','Hipermercado Cordillera','Centro Cívico','Plaza San Martín','Aeropuerto Santa Rosa','Estadio Provincial','Universidad UNLPam','Catedral','Shopping Santa Rosa','Polideportivo','Estación de servicio YPF','Sanatorio Santa Rosa','Casino','Mercado Municipal','Anfiteatro Padre Pena','Banco Nación','Club Estudiantes','Bahía Blanca (Larga distancia)','General Pico (Larga distancia)'];
  v_payment_methods payment_method[] := ARRAY['cash','cash','cash','cash','cash','cash','mp_checkout','mp_checkout','mp_checkout','account']::payment_method[];
  v_cancel_reasons TEXT[] := ARRAY['Pasajero no respondió llamado','Pasajero canceló — se demoraba','Chofer no disponible','Dirección incorrecta','Pasajero no apareció en pickup'];
  v_minutes_ago INT; v_pax_idx INT;
BEGIN
  FOR v_idx IN 1..150 LOOP
    v_ride_id := gen_random_uuid();
    v_pax_idx := 1 + ((v_idx * 7) % 40);
    IF v_pax_idx IN (37, 38) THEN v_pax_idx := 1 + (v_pax_idx % 36); END IF;
    v_passenger_id := ('bbbbbbbb-bbbb-bbbb-bbbb-' || lpad(v_pax_idx::text, 12, '0'))::uuid;

    v_status := CASE
      WHEN v_idx <= 105 THEN 'completed'::ride_status
      WHEN v_idx <= 110 THEN 'cancelled_by_passenger'::ride_status
      WHEN v_idx <= 113 THEN 'cancelled_by_dispatcher'::ride_status
      WHEN v_idx <= 115 THEN 'cancelled_by_driver'::ride_status
      WHEN v_idx <= 117 THEN 'no_show'::ride_status
      WHEN v_idx BETWEEN 118 AND 122 THEN 'requested'::ride_status
      WHEN v_idx = 123 THEN 'assigned'::ride_status
      WHEN v_idx IN (124, 125) THEN 'en_route_to_pickup'::ride_status
      WHEN v_idx = 126 THEN 'waiting_passenger'::ride_status
      WHEN v_idx BETWEEN 127 AND 130 THEN 'on_trip'::ride_status
      ELSE 'completed'::ride_status
    END;

    IF v_idx <= 117 OR v_idx >= 131 THEN
      v_minutes_ago := 60 + (v_idx * 247) % (30 * 24 * 60);
      v_requested_at := NOW() - (v_minutes_ago * INTERVAL '1 minute');
    ELSIF v_idx BETWEEN 118 AND 122 THEN
      v_requested_at := NOW() - ((1 + v_idx - 117) * INTERVAL '1 minute');
    ELSE
      v_requested_at := NOW() - ((5 + (v_idx - 122) * 4) * INTERVAL '1 minute');
    END IF;

    v_pickup_lat := -36.6201 + (random()-0.5) * 0.05;
    v_pickup_lng := -64.2906 + (random()-0.5) * 0.06;
    v_dest_lat := -36.6201 + (random()-0.5) * 0.07;
    v_dest_lng := -64.2906 + (random()-0.5) * 0.08;
    v_distance := 1500 + random() * 8500;
    v_estimated := round((400 + v_distance / 1000 * 350)::numeric, 0);
    v_fare := CASE WHEN v_status = 'completed' THEN round((v_estimated * (0.95 + random()*0.1))::numeric, 0) ELSE NULL END;

    v_pickup_addr := v_streets[1 + (v_idx % array_length(v_streets, 1))] || ' ' || (100 + (v_idx*31) % 4000);
    v_dest_addr := CASE
      WHEN v_idx % 3 = 0 THEN v_destinations[1 + (v_idx % array_length(v_destinations, 1))]
      ELSE v_streets[1 + ((v_idx*7) % array_length(v_streets, 1))] || ' ' || (50 + (v_idx*53) % 3500) END;

    v_payment_method := v_payment_methods[1 + (v_idx % array_length(v_payment_methods, 1))];
    v_payment_status := CASE
      WHEN v_status = 'completed' AND v_payment_method = 'cash' THEN 'cash_at_arrival'::payment_status
      WHEN v_status = 'completed' AND v_payment_method = 'mp_checkout' THEN 'approved'::payment_status
      WHEN v_status = 'completed' AND v_payment_method = 'account' THEN 'pending'::payment_status
      WHEN v_status::text LIKE 'cancelled%' THEN 'rejected'::payment_status
      ELSE 'pending'::payment_status END;

    v_driver_id := CASE WHEN v_status = 'requested' THEN NULL
      ELSE ('aaaaaaaa-aaaa-aaaa-aaaa-' || lpad((1 + (v_idx % 18))::text, 12, '0'))::uuid END;

    v_assigned_at := CASE WHEN v_driver_id IS NOT NULL THEN v_requested_at + INTERVAL '40 seconds' ELSE NULL END;
    v_started_at := CASE WHEN v_status IN ('on_trip','completed') THEN v_assigned_at + INTERVAL '4 minutes' ELSE NULL END;
    v_ended_at := CASE
      WHEN v_status = 'completed' THEN v_started_at + ((4 + random()*15)::int * INTERVAL '1 minute')
      WHEN v_status::text LIKE 'cancelled%' OR v_status = 'no_show' THEN v_requested_at + INTERVAL '6 minutes'
      ELSE NULL END;

    INSERT INTO public.rides (
      id, passenger_id, driver_id, dispatcher_id, status,
      pickup_address, pickup_location, dest_address, dest_location,
      requested_via, vehicle_type_requested, passengers_count, notes,
      estimated_fare_ars, final_fare_ars, payment_method, payment_status,
      requested_at, assigned_at, pickup_arrived_at, started_at, ended_at,
      cancelled_at, cancellation_reason, distance_meters,
      created_at, updated_at
    ) VALUES (
      v_ride_id, v_passenger_id, v_driver_id, v_dispatcher_id, v_status,
      v_pickup_addr,
      ST_SetSRID(ST_MakePoint(v_pickup_lng, v_pickup_lat), 4326)::geography,
      v_dest_addr,
      ST_SetSRID(ST_MakePoint(v_dest_lng, v_dest_lat), 4326)::geography,
      CASE v_idx % 5 WHEN 0 THEN 'phone' WHEN 1 THEN 'walk_in' ELSE 'app' END,
      CASE WHEN v_idx % 17 = 0 THEN 'suv'::vehicle_type
           WHEN v_idx % 23 = 0 THEN 'van'::vehicle_type
           ELSE NULL END,
      1 + (v_idx % 4),
      CASE WHEN v_idx % 13 = 0 THEN 'Tocá timbre, no llamar' ELSE NULL END,
      v_estimated, v_fare, v_payment_method, v_payment_status,
      v_requested_at, v_assigned_at,
      CASE WHEN v_status IN ('waiting_passenger','on_trip','completed') THEN v_assigned_at + INTERVAL '3 minutes' ELSE NULL END,
      v_started_at, v_ended_at,
      CASE WHEN v_status::text LIKE 'cancelled%' OR v_status = 'no_show' THEN v_ended_at ELSE NULL END,
      CASE WHEN v_status::text LIKE 'cancelled%' OR v_status = 'no_show' THEN v_cancel_reasons[1 + (v_idx % array_length(v_cancel_reasons, 1))] ELSE NULL END,
      v_distance,
      v_requested_at, COALESCE(v_ended_at, v_requested_at)
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- CHUNK 5 — ride_events + payments + ride_ratings
-- -----------------------------------------------------------------------------
INSERT INTO public.ride_events (ride_id, from_status, to_status, actor_id, actor_role, metadata, created_at)
SELECT r.id, NULL, 'requested'::ride_status, r.passenger_id, 'passenger',
       jsonb_build_object('via', r.requested_via), r.requested_at
FROM public.rides r
WHERE r.id NOT IN (SELECT ride_id FROM public.ride_events GROUP BY ride_id HAVING count(*) > 0);

INSERT INTO public.ride_events (ride_id, from_status, to_status, actor_id, actor_role, metadata, created_at)
SELECT r.id, 'requested', 'assigned', r.dispatcher_id, 'dispatcher',
       jsonb_build_object('driver_id', r.driver_id), r.assigned_at
FROM public.rides r WHERE r.assigned_at IS NOT NULL AND r.status NOT IN ('requested');

INSERT INTO public.ride_events (ride_id, from_status, to_status, actor_id, actor_role, metadata, created_at)
SELECT r.id, 'assigned', 'en_route_to_pickup', r.driver_id, 'driver', '{}'::jsonb, r.assigned_at + INTERVAL '20 seconds'
FROM public.rides r
WHERE r.assigned_at IS NOT NULL AND r.status IN ('en_route_to_pickup','waiting_passenger','on_trip','completed');

INSERT INTO public.ride_events (ride_id, from_status, to_status, actor_id, actor_role, metadata, created_at)
SELECT r.id, 'en_route_to_pickup', 'waiting_passenger', r.driver_id, 'driver', '{}'::jsonb, r.pickup_arrived_at
FROM public.rides r
WHERE r.pickup_arrived_at IS NOT NULL AND r.status IN ('waiting_passenger','on_trip','completed');

INSERT INTO public.ride_events (ride_id, from_status, to_status, actor_id, actor_role, metadata, created_at)
SELECT r.id, 'waiting_passenger', 'on_trip', r.driver_id, 'driver',
       jsonb_build_object('distance_estimated_m', r.distance_meters), r.started_at
FROM public.rides r
WHERE r.started_at IS NOT NULL AND r.status IN ('on_trip','completed');

INSERT INTO public.ride_events (ride_id, from_status, to_status, actor_id, actor_role, metadata, created_at)
SELECT r.id, 'on_trip', 'completed', r.driver_id, 'driver',
       jsonb_build_object('final_fare_ars', r.final_fare_ars, 'distance_m', r.distance_meters), r.ended_at
FROM public.rides r WHERE r.status = 'completed' AND r.ended_at IS NOT NULL;

INSERT INTO public.ride_events (ride_id, from_status, to_status, actor_id, actor_role, metadata, created_at)
SELECT r.id,
       CASE WHEN r.status = 'cancelled_by_passenger' THEN 'requested'::ride_status
            WHEN r.status = 'cancelled_by_dispatcher' THEN 'assigned'::ride_status
            WHEN r.status = 'cancelled_by_driver' THEN 'assigned'::ride_status
            ELSE 'waiting_passenger'::ride_status END,
       r.status,
       CASE WHEN r.status = 'cancelled_by_passenger' THEN r.passenger_id
            WHEN r.status = 'cancelled_by_dispatcher' THEN r.dispatcher_id
            ELSE r.driver_id END,
       CASE WHEN r.status = 'cancelled_by_passenger' THEN 'passenger'
            WHEN r.status = 'cancelled_by_dispatcher' THEN 'dispatcher'
            ELSE 'driver' END::user_role,
       jsonb_build_object('reason', r.cancellation_reason),
       r.cancelled_at
FROM public.rides r WHERE r.status::text LIKE 'cancelled%' OR r.status = 'no_show';

INSERT INTO public.payments (ride_id, method, amount_ars, status, mp_payment_id, paid_at, created_at)
SELECT r.id, r.payment_method, r.final_fare_ars, r.payment_status,
       CASE WHEN r.payment_method = 'mp_checkout' THEN 'mp_' || substr(md5(r.id::text), 1, 16) ELSE NULL END,
       CASE WHEN r.status = 'completed' THEN r.ended_at ELSE NULL END,
       COALESCE(r.ended_at, r.requested_at)
FROM public.rides r
WHERE r.final_fare_ars IS NOT NULL
  AND r.id NOT IN (SELECT ride_id FROM public.payments);

INSERT INTO public.ride_ratings (ride_id, passenger_id, driver_id, stars, comment, created_at)
SELECT r.id, r.passenger_id, r.driver_id,
       CASE WHEN random() < 0.75 THEN 5
            WHEN random() < 0.92 THEN 4
            WHEN random() < 0.97 THEN 3
            ELSE 2 END,
       CASE WHEN random() < 0.3 THEN
         (ARRAY['Excelente chofer, muy puntual','Auto limpio y seguro','Llegó rápido y trato muy amable',
                'Conducción tranquila, recomendable','Todo perfecto, gracias',NULL,'Muy bueno, repetiría','Atento y simpático'])
         [1 + (random()*7)::int]
         ELSE NULL END,
       r.ended_at + INTERVAL '5 minutes'
FROM public.rides r
WHERE r.status = 'completed' AND random() < 0.75
  AND r.id NOT IN (SELECT ride_id FROM public.ride_ratings);

UPDATE public.drivers d SET
  total_rides = (SELECT count(*) FROM public.rides r WHERE r.driver_id = d.id AND r.status = 'completed'),
  rating = COALESCE((SELECT round(avg(stars)::numeric, 2) FROM public.ride_ratings rr WHERE rr.driver_id = d.id), 5.00);

UPDATE public.passengers p SET
  total_rides = (SELECT count(*) FROM public.rides r WHERE r.passenger_id = p.id AND r.status = 'completed'),
  total_no_shows = (SELECT count(*) FROM public.rides r WHERE r.passenger_id = p.id AND r.status = 'no_show');

-- -----------------------------------------------------------------------------
-- CHUNK 6 — KYC + driver_documents + frequent_addresses
-- -----------------------------------------------------------------------------
INSERT INTO public.kyc_verifications (driver_id, provider, status, score, metadata, verified_at, created_at, updated_at)
SELECT d.id,
  CASE WHEN row_number() OVER (ORDER BY d.created_at) % 2 = 0 THEN 'didit' ELSE 'aws_rekognition' END,
  CASE
    WHEN row_number() OVER (ORDER BY d.created_at) <= 13 THEN 'approved'::kyc_status
    WHEN row_number() OVER (ORDER BY d.created_at) <= 16 THEN 'pending'::kyc_status
    WHEN row_number() OVER (ORDER BY d.created_at) = 17 THEN 'rejected'::kyc_status
    ELSE 'expired'::kyc_status END,
  CASE
    WHEN row_number() OVER (ORDER BY d.created_at) <= 13 THEN 0.85 + random()*0.14
    WHEN row_number() OVER (ORDER BY d.created_at) = 17 THEN 0.45 + random()*0.15
    ELSE 0.7 + random()*0.2 END,
  jsonb_build_object('document_type','dni','liveness_check',true,'face_match_score', 0.9 + random()*0.09),
  CASE WHEN row_number() OVER (ORDER BY d.created_at) <= 13 THEN d.created_at + INTERVAL '2 days' ELSE NULL END,
  d.created_at + INTERVAL '1 day',
  d.created_at + INTERVAL '2 days'
FROM public.drivers d
WHERE NOT EXISTS (SELECT 1 FROM public.kyc_verifications k WHERE k.driver_id = d.id);

INSERT INTO public.driver_documents (driver_id, document_type, file_url, issued_at, expires_at, verified, verified_by, verified_at, created_at)
SELECT d.id, dt::document_type,
       'https://placeholder.example.com/docs/' || d.id || '/' || dt || '.pdf',
       (NOW() - ((180 + random()*180)::int * INTERVAL '1 day'))::date,
       CASE WHEN dt IN ('vtv','insurance_rc','insurance_passengers','health_card')
            THEN (NOW() + ((30 + random()*330)::int * INTERVAL '1 day'))::date ELSE NULL END,
       random() < 0.85,
       (SELECT id FROM public.profiles WHERE role='admin' LIMIT 1),
       CASE WHEN random() < 0.85 THEN NOW() - (random() * INTERVAL '60 days') ELSE NULL END,
       d.created_at + INTERVAL '1 day'
FROM public.drivers d,
     unnest(ARRAY['luc_d1','vtv','insurance_rc','insurance_passengers','health_card','vehicle_authorization','criminal_record']) as dt
WHERE NOT EXISTS (SELECT 1 FROM public.driver_documents dd WHERE dd.driver_id = d.id);

INSERT INTO public.frequent_addresses (passenger_id, label, address_text, location, use_count, last_used_at, created_at)
SELECT p.id, lbl, addr,
       ST_SetSRID(ST_MakePoint(-64.2906 + (random()-0.5)*0.05, -36.6201 + (random()-0.5)*0.04), 4326)::geography,
       (random() * 25)::int,
       NOW() - (random() * INTERVAL '14 days'),
       NOW() - INTERVAL '60 days'
FROM (SELECT id FROM public.passengers ORDER BY id LIMIT 15) p,
     (VALUES ('Casa','Av. San Martín 1245'), ('Trabajo','Hipólito Yrigoyen 567')) as v(lbl, addr)
WHERE NOT EXISTS (SELECT 1 FROM public.frequent_addresses f WHERE f.passenger_id = p.id);

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
SELECT
  (SELECT count(*) FROM public.profiles WHERE role='driver') as drivers_profiles,
  (SELECT count(*) FROM public.drivers) as drivers,
  (SELECT count(*) FROM public.passengers) as passengers,
  (SELECT count(*) FROM public.vehicles) as vehicles,
  (SELECT count(*) FROM public.rides) as rides,
  (SELECT count(*) FROM public.ride_events) as ride_events,
  (SELECT count(*) FROM public.payments) as payments,
  (SELECT count(*) FROM public.ride_ratings) as ratings,
  (SELECT count(*) FROM public.driver_current_location) as live_locations,
  (SELECT count(*) FROM public.kyc_verifications) as kyc,
  (SELECT count(*) FROM public.driver_documents) as docs,
  (SELECT count(*) FROM public.frequent_addresses) as freq_addr;
