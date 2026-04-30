-- Track quién y cuándo se hizo cargo de cada SOS (separado de resolved_at).
ALTER TABLE public.sos_events
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatched_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
