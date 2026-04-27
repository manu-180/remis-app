-- Add fcm_token column to profiles so the passenger (and driver) apps can
-- persist their FCM registration token. The server-side dispatch-fcm Edge
-- Function reads this column to address push notifications to the correct
-- device (see triggers in 20260426000040_triggers_fcm_dispatch.sql).
--
-- Using `add column if not exists` makes this migration safe to re-run.

alter table public.profiles
  add column if not exists fcm_token text;

-- Partial index: only index rows that actually have a token.
-- The Edge Function looks up tokens by user id (pk), but this index helps
-- any admin query that needs to find all registered devices quickly.
create index if not exists profiles_fcm_token_idx
  on public.profiles(fcm_token)
  where fcm_token is not null;
