-- Add slug column to businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS slug text;

-- Unique index (partial: only non-null slugs)
CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_unique ON businesses(slug) WHERE slug IS NOT NULL;

-- Backfill existing rows: first 12 hex chars of UUID (no dashes)
UPDATE businesses
SET slug = LEFT(REPLACE(id::text, '-', ''), 12)
WHERE slug IS NULL;

-- Trigger function: auto-set slug on insert
CREATE OR REPLACE FUNCTION generate_business_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := LEFT(REPLACE(NEW.id::text, '-', ''), 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_business_slug ON businesses;
CREATE TRIGGER set_business_slug
  BEFORE INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION generate_business_slug();
