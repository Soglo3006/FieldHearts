-- Run once on Postgres (e.g. Supabase SQL editor)
ALTER TABLE services ADD COLUMN IF NOT EXISTS listing_tags jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS has_custom_tags boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_services_has_custom_tags ON services (has_custom_tags) WHERE has_custom_tags = true;
CREATE INDEX IF NOT EXISTS idx_services_listing_tags ON services USING gin (listing_tags);
