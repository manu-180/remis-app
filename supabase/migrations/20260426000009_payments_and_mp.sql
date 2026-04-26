-- Pagos y webhook events de MercadoPago (idempotencia CRÍTICA)

create table public.payments (
  id                   uuid            primary key default uuid_generate_v4(),
  ride_id              uuid            not null references public.rides(id) on delete restrict,
  method               public.payment_method not null,
  amount_ars           numeric(10,2)   not null check (amount_ars >= 0),
  status               public.payment_status not null default 'pending',
  mp_payment_id        text,
  mp_preference_id     text,
  mp_external_reference text,
  paid_at              timestamptz,
  created_at           timestamptz     not null default now(),
  updated_at           timestamptz     not null default now()
);

create index payments_ride_idx        on public.payments(ride_id);
create index payments_mp_payment_idx  on public.payments(mp_payment_id) where mp_payment_id is not null;
create index payments_status_idx      on public.payments(status) where status = 'pending';

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- mp_webhook_events: idempotencia por x_request_id + (data_id, action)
-- Garantiza que webhooks duplicados de MP no generen pagos dobles
-- ─────────────────────────────────────────────
create table public.mp_webhook_events (
  id                uuid            primary key default uuid_generate_v4(),
  x_request_id      text            unique not null,
  data_id           text            not null,
  action            text,
  raw_body          jsonb           not null,
  signature_valid   boolean         not null,
  processed_status  text            not null default 'pending'
                      check (processed_status in ('pending', 'processed', 'failed', 'skipped')),
  processed_at      timestamptz,
  error_message     text,
  received_at       timestamptz     not null default now()
);

-- Idempotencia por combinación data_id + action (cuando action no es null)
create unique index mp_webhook_data_action_unique
  on public.mp_webhook_events(data_id, action)
  where action is not null;

create index mp_webhook_pending_idx
  on public.mp_webhook_events(received_at)
  where processed_status = 'pending';
