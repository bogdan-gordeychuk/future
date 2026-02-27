-- Atomic increment for messages_used to prevent race conditions
CREATE OR REPLACE FUNCTION increment_messages_used(sub_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE subscriptions
  SET messages_used = messages_used + 1,
      updated_at = now()
  WHERE id = sub_id;
$$;
