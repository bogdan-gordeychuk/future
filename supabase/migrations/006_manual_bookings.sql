-- Migration 006: Support manual bookings (clients without Telegram)
-- Allow telegram_user_id to be NULL for manually created clients

-- Make telegram_user_id nullable (for manual/phone bookings)
ALTER TABLE public.clients ALTER COLUMN telegram_user_id DROP NOT NULL;

-- Update unique constraint to handle NULL telegram_user_id
-- (NULL values are not equal in SQL, so multiple NULLs are allowed)
-- The existing unique constraint on (business_id, telegram_user_id) still works correctly
-- because NULL != NULL in SQL unique constraints

-- Add a source column to track how the client was created
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS source text DEFAULT 'telegram' 
  CHECK (source IN ('telegram', 'manual', 'import'));

-- Update existing clients to have source = 'telegram'
UPDATE public.clients SET source = 'telegram' WHERE source IS NULL;
