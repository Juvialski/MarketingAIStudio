-- ==============================================================================
-- Migration: 20260820100001_storage_setup.sql
-- Description: Provision Supabase Storage Buckets and Storage RLS Policies
-- Buckets: brand-assets, property-media, campaign-assets, campaign-exports
-- ==============================================================================

-- 1. Insert Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('brand-assets', 'brand-assets', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
  ('property-media', 'property-media', true, 26214400, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('campaign-assets', 'campaign-assets', true, 26214400, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('campaign-exports', 'campaign-exports', true, 52428800, ARRAY['image/png', 'image/jpeg', 'application/pdf', 'application/zip'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage RLS Policies for brand-assets
CREATE POLICY "Public read for brand-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated users can upload brand-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update brand-assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'brand-assets'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete brand-assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-assets'
    AND auth.role() = 'authenticated'
  );

-- 3. Storage RLS Policies for property-media
CREATE POLICY "Public read for property-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-media');

CREATE POLICY "Authenticated users can upload property-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update property-media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete property-media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-media'
    AND auth.role() = 'authenticated'
  );

-- 4. Storage RLS Policies for campaign-assets
CREATE POLICY "Public read for campaign-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-assets');

CREATE POLICY "Authenticated users can upload campaign-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'campaign-assets'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update campaign-assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'campaign-assets'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete campaign-assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'campaign-assets'
    AND auth.role() = 'authenticated'
  );

-- 5. Storage RLS Policies for campaign-exports
CREATE POLICY "Public read for campaign-exports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-exports');

CREATE POLICY "Authenticated users can upload campaign-exports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'campaign-exports'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update campaign-exports"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'campaign-exports'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete campaign-exports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'campaign-exports'
    AND auth.role() = 'authenticated'
  );
