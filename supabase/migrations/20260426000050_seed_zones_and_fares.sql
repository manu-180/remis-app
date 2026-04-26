-- Seed: zonas tarifarias placeholder para La Pampa (Santa Rosa área)
-- TODO: Revisar estos polígonos contra el GIS municipal real antes de producción
-- Los polígonos son aproximaciones plausibles de las áreas de Santa Rosa, LP
-- Coordenadas reales: Santa Rosa ~36.6°S, 64.3°W

insert into public.tariff_zones (id, name, polygon, priority, is_active) values

-- Zona 1: Centro (área comercial / catedral)
(
  'tz-centro-0001-0001-000000000001',
  'Centro',
  st_geogfromtext(
    'POLYGON((-64.3200 -36.6100, -64.2900 -36.6100,
              -64.2900 -36.6350, -64.3200 -36.6350,
              -64.3200 -36.6100))'
  ),
  10,
  true
),

-- Zona 2: Norte
(
  'tz-norte-0002-0002-000000000002',
  'Norte',
  st_geogfromtext(
    'POLYGON((-64.3500 -36.5700, -64.2600 -36.5700,
              -64.2600 -36.6100, -64.3500 -36.6100,
              -64.3500 -36.5700))'
  ),
  5,
  true
),

-- Zona 3: Sur
(
  'tz-sur---0003-0003-000000000003',
  'Sur',
  st_geogfromtext(
    'POLYGON((-64.3500 -36.6350, -64.2600 -36.6350,
              -64.2600 -36.6700, -64.3500 -36.6700,
              -64.3500 -36.6350))'
  ),
  5,
  true
),

-- Zona 4: Periferia (area rural / ruta)
(
  'tz-perif-0004-0004-000000000004',
  'Periferia',
  st_geogfromtext(
    'POLYGON((-64.5000 -36.5000, -64.1000 -36.5000,
              -64.1000 -36.7500, -64.5000 -36.7500,
              -64.5000 -36.5000))'
  ),
  1,
  true
)

on conflict (id) do update set
  name     = excluded.name,
  polygon  = excluded.polygon,
  priority = excluded.priority;

-- ─────────────────────────────────────────────
-- Matriz de tarifas 4×4
-- TODO: Confirmar valores reales con el cliente antes de producción
-- Valores en ARS a Abril 2026 (actualizar con inflación)
-- ─────────────────────────────────────────────
insert into public.fares (
  origin_zone_id, dest_zone_id,
  base_amount_ars, per_km_ars, flat_amount_ars,
  night_surcharge_pct, effective_from
) values

-- Centro → Centro
('tz-centro-0001-0001-000000000001', 'tz-centro-0001-0001-000000000001',
 2500, 350, null, 20, '2026-01-01'),

-- Centro → Norte
('tz-centro-0001-0001-000000000001', 'tz-norte-0002-0002-000000000002',
 3000, 350, null, 20, '2026-01-01'),

-- Centro → Sur
('tz-centro-0001-0001-000000000001', 'tz-sur---0003-0003-000000000003',
 3000, 350, null, 20, '2026-01-01'),

-- Centro → Periferia
('tz-centro-0001-0001-000000000001', 'tz-perif-0004-0004-000000000004',
 5000, 400, null, 25, '2026-01-01'),

-- Norte → Centro
('tz-norte-0002-0002-000000000002', 'tz-centro-0001-0001-000000000001',
 3000, 350, null, 20, '2026-01-01'),

-- Norte → Norte
('tz-norte-0002-0002-000000000002', 'tz-norte-0002-0002-000000000002',
 2500, 350, null, 20, '2026-01-01'),

-- Norte → Sur
('tz-norte-0002-0002-000000000002', 'tz-sur---0003-0003-000000000003',
 4000, 380, null, 20, '2026-01-01'),

-- Norte → Periferia
('tz-norte-0002-0002-000000000002', 'tz-perif-0004-0004-000000000004',
 5500, 400, null, 25, '2026-01-01'),

-- Sur → Centro
('tz-sur---0003-0003-000000000003', 'tz-centro-0001-0001-000000000001',
 3000, 350, null, 20, '2026-01-01'),

-- Sur → Norte
('tz-sur---0003-0003-000000000003', 'tz-norte-0002-0002-000000000002',
 4000, 380, null, 20, '2026-01-01'),

-- Sur → Sur
('tz-sur---0003-0003-000000000003', 'tz-sur---0003-0003-000000000003',
 2500, 350, null, 20, '2026-01-01'),

-- Sur → Periferia
('tz-sur---0003-0003-000000000003', 'tz-perif-0004-0004-000000000004',
 5500, 400, null, 25, '2026-01-01'),

-- Periferia → Centro
('tz-perif-0004-0004-000000000004', 'tz-centro-0001-0001-000000000001',
 5000, 400, null, 25, '2026-01-01'),

-- Periferia → Norte
('tz-perif-0004-0004-000000000004', 'tz-norte-0002-0002-000000000002',
 5500, 400, null, 25, '2026-01-01'),

-- Periferia → Sur
('tz-perif-0004-0004-000000000004', 'tz-sur---0003-0003-000000000003',
 5500, 400, null, 25, '2026-01-01'),

-- Periferia → Periferia
('tz-perif-0004-0004-000000000004', 'tz-perif-0004-0004-000000000004',
 4000, 420, null, 25, '2026-01-01')

on conflict do nothing;
