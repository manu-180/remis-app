-- KYC verifications y feature flags

-- ─────────────────────────────────────────────
-- kyc_verifications: resultado de Didit + AWS Rekognition
-- ─────────────────────────────────────────────
create table public.kyc_verifications (
  id          uuid            primary key default uuid_generate_v4(),
  driver_id   uuid            not null references public.drivers(id) on delete cascade,
  provider    text            not null check (provider in ('didit', 'aws_rekognition')),
  status      public.kyc_status not null default 'pending',
  score       numeric(5,4)    check (score between 0 and 1),
  metadata    jsonb,
  verified_at timestamptz,
  created_at  timestamptz     not null default now(),
  updated_at  timestamptz     not null default now()
);

create index kyc_driver_idx    on public.kyc_verifications(driver_id, created_at desc);
create index kyc_pending_idx   on public.kyc_verifications(status) where status = 'pending';

create trigger kyc_updated_at
  before update on public.kyc_verifications
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- feature_flags: tabla consultada al startup, cacheada 60s
-- Seed con todos los flags conocidos
-- ─────────────────────────────────────────────
create table public.feature_flags (
  key         text            primary key,
  enabled     boolean         not null default false,
  description text,
  updated_at  timestamptz     not null default now()
);

create trigger feature_flags_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

-- Seed de flags
insert into public.feature_flags (key, enabled, description) values
  ('caller_id_enabled',      false, 'Twilio Caller-ID: mostrar número del pasajero al dispatcher'),
  ('mp_payment_enabled',     false, 'MercadoPago Checkout Pro habilitado'),
  ('kyc_strict_mode',        false, 'Bloquear conductor si falla KYC (modo estricto)'),
  ('auto_dispatch_enabled',  false, 'Despacho automático sin intervención del dispatcher'),
  ('trip_share_enabled',     true,  'Compartir viaje con link público'),
  ('masked_calling_enabled', false, 'Llamadas enmascaradas vía Twilio Proxy')
on conflict (key) do update set
  description = excluded.description;
