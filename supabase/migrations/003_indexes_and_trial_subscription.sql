-- Add missing indexes for frequently filtered columns
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_masters_business_id ON masters(business_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_business_id ON knowledge_items(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_created ON messages(client_id, created_at DESC);

-- Backfill: create trial subscriptions for existing businesses that don't have one yet
INSERT INTO subscriptions (
  business_id,
  plan,
  status,
  messages_limit,
  messages_used,
  period_start,
  period_end,
  price_kopecks
)
SELECT
  b.id,
  'trial',
  'active',
  400,
  0,
  now(),
  COALESCE(b.trial_ends_at, now() + interval '14 days'),
  0
FROM businesses b
LEFT JOIN subscriptions s ON s.business_id = b.id
WHERE s.id IS NULL
  AND b.subscription_status = 'trial';

-- Trigger: auto-create trial subscription when a new business is created
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO subscriptions (
    business_id,
    plan,
    status,
    messages_limit,
    messages_used,
    period_start,
    period_end,
    price_kopecks
  ) VALUES (
    NEW.id,
    'trial',
    'active',
    400,
    0,
    now(),
    COALESCE(NEW.trial_ends_at, now() + interval '14 days'),
    0
  )
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_business_created
  AFTER INSERT ON businesses
  FOR EACH ROW EXECUTE FUNCTION create_trial_subscription();
