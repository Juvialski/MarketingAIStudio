-- ==============================================================================
-- Migration: 20260821110000_review_portal_hardening.sql
-- Description: Production Hardening for Campaign Review Portal
--   1. Server-side token hashing boundary (raw token in, hash lookup)
--   2. Atomic & transactional link creation and version publishing RPCs
--   3. Version-bound feedback isolation & deterministic UPSERT uniqueness
--   4. Multi-tenant RLS policy fixes (0-arg get_user_organization_ids & campaign org check)
--   5. Search path hardening, permission lockdown, and internal ID stripping
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ------------------------------------------------------------------------------
-- 1. UNIQUE CONSTRAINT ON FEEDBACK (DETERMINISTIC UPSERT)
-- ------------------------------------------------------------------------------
-- Remove any legacy duplicates before adding unique constraint
DELETE FROM public.campaign_review_feedback a
USING public.campaign_review_feedback b
WHERE a.id < b.id
  AND a.review_link_id = b.review_link_id
  AND COALESCE(a.review_version_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(b.review_version_id, '00000000-0000-0000-0000-000000000000'::uuid)
  AND a.material_key = b.material_key
  AND COALESCE(a.reviewer_name, '') = COALESCE(b.reviewer_name, '');

-- Add deterministic unique constraint on feedback per link, version, material, and reviewer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_review_feedback_item'
  ) THEN
    ALTER TABLE public.campaign_review_feedback
      ADD CONSTRAINT uq_review_feedback_item
      UNIQUE (review_link_id, review_version_id, material_key, reviewer_name);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. HARDEN RLS POLICIES (CORRECT 0-ARG SIGNATURE & TENANT INTEGRITY)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Org members can view review links" ON public.campaign_review_links;
DROP POLICY IF EXISTS "Org members can create review links" ON public.campaign_review_links;
DROP POLICY IF EXISTS "Org members can update review links" ON public.campaign_review_links;
DROP POLICY IF EXISTS "Org members can delete review links" ON public.campaign_review_links;

DROP POLICY IF EXISTS "Org members can view review versions" ON public.campaign_review_versions;
DROP POLICY IF EXISTS "Org members can create review versions" ON public.campaign_review_versions;

DROP POLICY IF EXISTS "Org members can view review feedback" ON public.campaign_review_feedback;

-- Links RLS
CREATE POLICY "Org members can view review links"
  ON public.campaign_review_links FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids()));

CREATE POLICY "Org members can create review links"
  ON public.campaign_review_links FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organization_ids())
    AND campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id = campaign_review_links.organization_id
    )
  );

CREATE POLICY "Org members can update review links"
  ON public.campaign_review_links FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids()))
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organization_ids())
    AND campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id = campaign_review_links.organization_id
    )
  );

CREATE POLICY "Org members can delete review links"
  ON public.campaign_review_links FOR DELETE
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids()));

-- Versions RLS
CREATE POLICY "Org members can view review versions"
  ON public.campaign_review_versions FOR SELECT
  TO authenticated
  USING (
    review_link_id IN (
      SELECT id FROM public.campaign_review_links
      WHERE organization_id IN (SELECT public.get_user_organization_ids())
    )
  );

CREATE POLICY "Org members can create review versions"
  ON public.campaign_review_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    review_link_id IN (
      SELECT id FROM public.campaign_review_links
      WHERE organization_id IN (SELECT public.get_user_organization_ids())
    )
  );

-- Feedback RLS (Org owner inspection)
CREATE POLICY "Org members can view review feedback"
  ON public.campaign_review_feedback FOR SELECT
  TO authenticated
  USING (
    review_link_id IN (
      SELECT id FROM public.campaign_review_links
      WHERE organization_id IN (SELECT public.get_user_organization_ids())
    )
  );

-- ------------------------------------------------------------------------------
-- 3. ATOMIC RPC: CREATE REVIEW LINK + V1 SNAPSHOT IN ONE TRANSACTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_campaign_review_link_atomic(
  p_organization_id UUID,
  p_campaign_id UUID,
  p_token_hash TEXT,
  p_snapshot JSONB,
  p_permissions JSONB DEFAULT '{}'::jsonb,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_campaign RECORD;
  v_link_id UUID;
  v_version_id UUID;
  v_allow_comments BOOLEAN;
  v_allow_selection BOOLEAN;
  v_allow_approval BOOLEAN;
  v_allow_downloads BOOLEAN;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- 1. Authorization check: Calling user must belong to organization
  IF auth.uid() IS NOT NULL AND NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: user is not a member of organization %', p_organization_id;
  END IF;

  -- 2. Multi-tenant check: Campaign must belong to the specified organization
  SELECT * INTO v_campaign
  FROM public.campaigns
  WHERE id = p_campaign_id AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign % does not belong to organization %', p_campaign_id, p_organization_id;
  END IF;

  -- 3. Extract permissions
  v_allow_comments := COALESCE((p_permissions->>'allowComments')::boolean, (p_permissions->>'allow_comments')::boolean, true);
  v_allow_selection := COALESCE((p_permissions->>'allowSelection')::boolean, (p_permissions->>'allow_selection')::boolean, true);
  v_allow_approval := COALESCE((p_permissions->>'allowApproval')::boolean, (p_permissions->>'allow_approval')::boolean, true);
  v_allow_downloads := COALESCE((p_permissions->>'allowDownloads')::boolean, (p_permissions->>'allow_downloads')::boolean, false);
  v_created_at := timezone('utc'::text, now());

  -- 4. Atomically deactivate existing active links for this campaign
  UPDATE public.campaign_review_links
  SET is_active = false, updated_at = v_created_at
  WHERE organization_id = p_organization_id AND campaign_id = p_campaign_id AND is_active = true;

  -- 5. Insert new review link
  INSERT INTO public.campaign_review_links (
    organization_id,
    campaign_id,
    token_hash,
    is_active,
    expires_at,
    allow_comments,
    allow_selection,
    allow_approval,
    allow_downloads,
    current_version_number,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    p_organization_id,
    p_campaign_id,
    p_token_hash,
    true,
    p_expires_at,
    v_allow_comments,
    v_allow_selection,
    v_allow_approval,
    v_allow_downloads,
    1,
    COALESCE(p_user_id, auth.uid()),
    v_created_at,
    v_created_at
  )
  RETURNING id INTO v_link_id;

  -- 6. Insert Version 1 snapshot
  INSERT INTO public.campaign_review_versions (
    review_link_id,
    version_number,
    title,
    published_snapshot,
    published_at
  )
  VALUES (
    v_link_id,
    1,
    'Review Package v1',
    p_snapshot,
    v_created_at
  )
  RETURNING id INTO v_version_id;

  RETURN jsonb_build_object(
    'link_id', v_link_id,
    'version_id', v_version_id,
    'version_number', 1,
    'created_at', v_created_at
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC RPC: PUBLISH NEW REVIEW VERSION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_campaign_review_version_atomic(
  p_organization_id UUID,
  p_review_link_id UUID,
  p_snapshot JSONB,
  p_title TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link RECORD;
  v_next_version INTEGER;
  v_version_id UUID;
  v_published_at TIMESTAMPTZ;
  v_title TEXT;
BEGIN
  -- 1. Authorization check
  IF auth.uid() IS NOT NULL AND NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: user is not a member of organization %', p_organization_id;
  END IF;

  -- 2. Lock review link row
  SELECT * INTO v_link
  FROM public.campaign_review_links
  WHERE id = p_review_link_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review link % not found for organization %', p_review_link_id, p_organization_id;
  END IF;

  v_next_version := v_link.current_version_number + 1;
  v_published_at := timezone('utc'::text, now());
  v_title := COALESCE(p_title, 'Review Package v' || v_next_version);

  -- 3. Insert new immutable version
  INSERT INTO public.campaign_review_versions (
    review_link_id,
    version_number,
    title,
    notes,
    published_snapshot,
    published_at
  )
  VALUES (
    v_link.id,
    v_next_version,
    v_title,
    p_notes,
    p_snapshot,
    v_published_at
  )
  RETURNING id INTO v_version_id;

  -- 4. Update current version on link
  UPDATE public.campaign_review_links
  SET current_version_number = v_next_version,
      updated_at = v_published_at
  WHERE id = v_link.id;

  RETURN jsonb_build_object(
    'version_id', v_version_id,
    'version_number', v_next_version,
    'title', v_title,
    'published_at', v_published_at
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. PUBLIC RPC: GET REVIEW SNAPSHOT (SERVER-SIDE HASH LOOKUP)
-- ------------------------------------------------------------------------------
-- Drop legacy RPC signatures from 20260821100000 before recreating with new parameter names and hardened behavior:
-- 1. Drop legacy (TEXT, TEXT) overload accepting token hash + passcode
DROP FUNCTION IF EXISTS public.get_public_review_snapshot(TEXT, TEXT);

-- 2. Drop legacy feedback RPC with parameter 'p_token_hash' to allow renaming to 'p_raw_token'
DROP FUNCTION IF EXISTS public.submit_public_review_feedback(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 3. Drop legacy approval RPC with parameter 'p_token_hash' to allow renaming to 'p_raw_token'
DROP FUNCTION IF EXISTS public.submit_public_campaign_approval(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_public_review_snapshot(
  p_raw_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token_hash TEXT;
  v_link RECORD;
  v_version RECORD;
  v_feedback_json JSONB;
BEGIN
  IF p_raw_token IS NULL OR TRIM(p_raw_token) = '' THEN
    RETURN jsonb_build_object('status', 'not_found', 'error', 'Invalid review token.');
  END IF;

  -- 1. Compute SHA-256 hash server-side
  v_token_hash := encode(digest(TRIM(p_raw_token), 'sha256'), 'hex');

  -- 2. Validate link existence and status
  SELECT * INTO v_link
  FROM public.campaign_review_links
  WHERE token_hash = v_token_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found', 'error', 'This review link is invalid or no longer active.');
  END IF;

  IF NOT v_link.is_active THEN
    RETURN jsonb_build_object('status', 'revoked', 'error', 'This review link is no longer active.');
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < timezone('utc'::text, now()) THEN
    RETURN jsonb_build_object('status', 'expired', 'error', 'This review link has expired.');
  END IF;

  -- 3. Fetch latest published version
  SELECT * INTO v_version
  FROM public.campaign_review_versions
  WHERE review_link_id = v_link.id
  ORDER BY version_number DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_version', 'error', 'No published review package is available.');
  END IF;

  -- 4. Fetch reviewer feedback strictly bounded to THIS version
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'material_key', f.material_key,
      'variant_key', f.variant_key,
      'reviewer_name', f.reviewer_name,
      'status', f.status,
      'comment', f.comment,
      'updated_at', f.updated_at
    )
  ), '[]'::jsonb) INTO v_feedback_json
  FROM public.campaign_review_feedback f
  WHERE f.review_link_id = v_link.id
    AND f.review_version_id = v_version.id;

  -- 5. Return sanitized public payload
  RETURN jsonb_build_object(
    'status', 'active',
    'version_number', v_version.version_number,
    'version_title', v_version.title,
    'published_at', v_version.published_at,
    'snapshot', v_version.published_snapshot,
    'permissions', jsonb_build_object(
      'allow_comments', v_link.allow_comments,
      'allow_selection', v_link.allow_selection,
      'allow_approval', v_link.allow_approval,
      'allow_downloads', v_link.allow_downloads
    ),
    'feedback', v_feedback_json
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. PUBLIC RPC: SUBMIT REVIEW FEEDBACK (DETERMINISTIC UPSERT)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_public_review_feedback(
  p_raw_token TEXT,
  p_material_key TEXT,
  p_variant_key TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'preferred',
  p_comment TEXT DEFAULT NULL,
  p_reviewer_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token_hash TEXT;
  v_link RECORD;
  v_version RECORD;
  v_feedback_id UUID;
  v_sanitized_status TEXT;
  v_sanitized_name TEXT;
  v_sanitized_comment TEXT;
  v_updated_at TIMESTAMPTZ;
BEGIN
  IF p_raw_token IS NULL OR TRIM(p_raw_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid review token.');
  END IF;

  v_token_hash := encode(digest(TRIM(p_raw_token), 'sha256'), 'hex');

  -- 1. Validate link
  SELECT * INTO v_link
  FROM public.campaign_review_links
  WHERE token_hash = v_token_hash;

  IF NOT FOUND OR NOT v_link.is_active OR (v_link.expires_at IS NOT NULL AND v_link.expires_at < timezone('utc'::text, now())) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This review link is not active or has expired.');
  END IF;

  -- 2. Validate input and permissions
  v_sanitized_status := LOWER(TRIM(p_status));
  IF v_sanitized_status NOT IN ('not_reviewed', 'preferred', 'approved', 'needs_changes') THEN
    v_sanitized_status := 'preferred';
  END IF;

  IF v_sanitized_status = 'preferred' AND NOT v_link.allow_selection THEN
    RETURN jsonb_build_object('success', false, 'error', 'Variant selection is disabled for this review link.');
  END IF;

  IF v_sanitized_status IN ('approved', 'needs_changes') AND NOT v_link.allow_approval THEN
    RETURN jsonb_build_object('success', false, 'error', 'Approvals are disabled for this review link.');
  END IF;

  IF p_comment IS NOT NULL AND TRIM(p_comment) <> '' AND NOT v_link.allow_comments THEN
    RETURN jsonb_build_object('success', false, 'error', 'Comments are disabled for this review link.');
  END IF;

  v_sanitized_name := SUBSTRING(TRIM(COALESCE(p_reviewer_name, 'Reviewer')) FROM 1 FOR 100);
  v_sanitized_comment := SUBSTRING(TRIM(COALESCE(p_comment, '')) FROM 1 FOR 2000);
  v_updated_at := timezone('utc'::text, now());

  -- 3. Get active version
  SELECT * INTO v_version
  FROM public.campaign_review_versions
  WHERE review_link_id = v_link.id
  ORDER BY version_number DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active review version found.');
  END IF;

  -- 4. Deterministic UPSERT: insert or update feedback for (link, version, material, reviewer)
  INSERT INTO public.campaign_review_feedback (
    review_link_id,
    review_version_id,
    material_key,
    variant_key,
    reviewer_name,
    status,
    comment,
    created_at,
    updated_at
  )
  VALUES (
    v_link.id,
    v_version.id,
    p_material_key,
    p_variant_key,
    v_sanitized_name,
    v_sanitized_status,
    CASE WHEN v_sanitized_comment = '' THEN NULL ELSE v_sanitized_comment END,
    v_updated_at,
    v_updated_at
  )
  ON CONFLICT (review_link_id, review_version_id, material_key, reviewer_name)
  DO UPDATE SET
    variant_key = EXCLUDED.variant_key,
    status = EXCLUDED.status,
    comment = EXCLUDED.comment,
    updated_at = EXCLUDED.updated_at
  RETURNING id INTO v_feedback_id;

  -- 5. Return typed feedback matching TypeScript interface
  RETURN jsonb_build_object(
    'success', true,
    'feedback', jsonb_build_object(
      'id', v_feedback_id,
      'material_key', p_material_key,
      'variant_key', p_variant_key,
      'status', v_sanitized_status,
      'comment', CASE WHEN v_sanitized_comment = '' THEN NULL ELSE v_sanitized_comment END,
      'reviewer_name', v_sanitized_name,
      'updated_at', v_updated_at
    )
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. PUBLIC RPC: SUBMIT CAMPAIGN OVERALL APPROVAL
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_public_campaign_approval(
  p_raw_token TEXT,
  p_status TEXT DEFAULT 'approved',
  p_notes TEXT DEFAULT NULL,
  p_reviewer_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token_hash TEXT;
  v_link RECORD;
  v_version RECORD;
  v_feedback_id UUID;
  v_sanitized_status TEXT;
  v_sanitized_name TEXT;
  v_sanitized_notes TEXT;
  v_updated_at TIMESTAMPTZ;
BEGIN
  IF p_raw_token IS NULL OR TRIM(p_raw_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid review token.');
  END IF;

  v_token_hash := encode(digest(TRIM(p_raw_token), 'sha256'), 'hex');

  -- 1. Validate link
  SELECT * INTO v_link
  FROM public.campaign_review_links
  WHERE token_hash = v_token_hash;

  IF NOT FOUND OR NOT v_link.is_active OR (v_link.expires_at IS NOT NULL AND v_link.expires_at < timezone('utc'::text, now())) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This review link is not active or has expired.');
  END IF;

  IF NOT v_link.allow_approval THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign approval is disabled for this review link.');
  END IF;

  v_sanitized_status := LOWER(TRIM(p_status));
  IF v_sanitized_status NOT IN ('approved', 'needs_changes') THEN
    v_sanitized_status := 'approved';
  END IF;

  v_sanitized_name := SUBSTRING(TRIM(COALESCE(p_reviewer_name, 'Reviewer')) FROM 1 FOR 100);
  v_sanitized_notes := SUBSTRING(TRIM(COALESCE(p_notes, '')) FROM 1 FOR 2000);
  v_updated_at := timezone('utc'::text, now());

  SELECT * INTO v_version
  FROM public.campaign_review_versions
  WHERE review_link_id = v_link.id
  ORDER BY version_number DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active review version found.');
  END IF;

  -- Insert/update campaign overall feedback record
  INSERT INTO public.campaign_review_feedback (
    review_link_id,
    review_version_id,
    material_key,
    variant_key,
    reviewer_name,
    status,
    comment,
    created_at,
    updated_at
  )
  VALUES (
    v_link.id,
    v_version.id,
    'campaign_overall',
    NULL,
    v_sanitized_name,
    v_sanitized_status,
    CASE WHEN v_sanitized_notes = '' THEN NULL ELSE v_sanitized_notes END,
    v_updated_at,
    v_updated_at
  )
  ON CONFLICT (review_link_id, review_version_id, material_key, reviewer_name)
  DO UPDATE SET
    status = EXCLUDED.status,
    comment = EXCLUDED.comment,
    updated_at = EXCLUDED.updated_at
  RETURNING id INTO v_feedback_id;

  RETURN jsonb_build_object(
    'success', true,
    'feedback_id', v_feedback_id,
    'status', v_sanitized_status,
    'approved_at', v_updated_at
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. GRANT / REVOKE PERMISSIONS
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_campaign_review_link_atomic(UUID, UUID, TEXT, JSONB, JSONB, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_campaign_review_link_atomic(UUID, UUID, TEXT, JSONB, JSONB, TIMESTAMPTZ, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.publish_campaign_review_version_atomic(UUID, UUID, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_campaign_review_version_atomic(UUID, UUID, JSONB, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_public_review_snapshot(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_review_snapshot(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_public_review_feedback(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_review_feedback(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_public_campaign_approval(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_campaign_approval(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

COMMIT;
