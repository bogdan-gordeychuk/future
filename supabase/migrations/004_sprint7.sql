-- 1. Preferred name for client (bot asks how to address them)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferred_name text;

-- 2. Master time-off: owner marks master unavailable for a date range
CREATE TABLE IF NOT EXISTS public.master_time_off (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  master_id uuid NOT NULL REFERENCES public.masters(id) ON DELETE CASCADE,
  date_from date NOT NULL,
  date_to date NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.master_time_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage master time-off" ON public.master_time_off
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_id AND b.owner_id = auth.uid()
  ));

-- 3. Unique partial index: prevent double-booking same master+slot
CREATE UNIQUE INDEX IF NOT EXISTS bookings_no_double_booking
  ON public.bookings (master_id, scheduled_at)
  WHERE status IN ('pending', 'confirmed');

-- 4. Index for analytics queries
CREATE INDEX IF NOT EXISTS bookings_scheduled_business
  ON public.bookings (business_id, scheduled_at, status);
