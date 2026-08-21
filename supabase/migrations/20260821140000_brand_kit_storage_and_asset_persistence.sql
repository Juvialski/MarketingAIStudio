-- ==============================================================================
-- Migration: 20260821140000_brand_kit_storage_and_asset_persistence.sql
-- Description: Add canonical Storage bucket and path columns to brand_kits for
--              durable logo asset persistence in private Storage.
-- ==============================================================================

BEGIN;

ALTER TABLE public.brand_kits
  ADD COLUMN IF NOT EXISTS logo_storage_bucket TEXT DEFAULT 'brand-assets',
  ADD COLUMN IF NOT EXISTS logo_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS logo_dark_storage_bucket TEXT DEFAULT 'brand-assets',
  ADD COLUMN IF NOT EXISTS logo_dark_storage_path TEXT;

COMMENT ON COLUMN public.brand_kits.logo_storage_bucket IS 'Storage bucket containing the primary brand logo object.';
COMMENT ON COLUMN public.brand_kits.logo_storage_path IS 'Tenant-scoped object path for the primary brand logo.';
COMMENT ON COLUMN public.brand_kits.logo_dark_storage_bucket IS 'Storage bucket containing the dark mode brand logo object.';
COMMENT ON COLUMN public.brand_kits.logo_dark_storage_path IS 'Tenant-scoped object path for the dark mode brand logo.';

COMMIT;
