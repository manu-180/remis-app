-- Tarifa wildcard global (origin/dest NULL): fallback para puntos fuera de
-- cualquier zona configurada en `tariff_zones`. Permite que `estimate_fare`
-- devuelva un monto válido en cualquier parte del país (CABA, Rosario, etc.)
-- en lugar de tirar 'No hay tarifa configurada para este recorrido'.
--
-- Las tarifas con zona específica ganan sobre este wildcard por el ORDER BY
-- de la RPC `estimate_fare` (case when origin_zone_id is not null then 1...).
--
-- Valores demo (marzo 2026 Argentina): base $2000 + $400/km + 20% nocturno.
-- El cliente puede ajustarlos en la tabla `fares` cuando defina su pricing.

insert into public.fares (
  origin_zone_id,
  dest_zone_id,
  base_amount_ars,
  per_km_ars,
  night_surcharge_pct,
  effective_from
)
select null, null, 2000.00, 400.00, 20.00, '2026-01-01'::timestamptz
where not exists (
  select 1 from public.fares
  where origin_zone_id is null
    and dest_zone_id is null
    and effective_to is null
);
