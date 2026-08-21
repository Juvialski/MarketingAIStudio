-- ==============================================================================
-- Migration: 20260821100000_campaign_review_portal.sql
-- Description: Shareable Campaign Review Portal Schema, Security Definer RPCs & RLS
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. CAMPAIGN REVIEW LINKS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_review_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  allow_selection BOOLEAN NOT NULL DEFAULT true,
  allow_approval BOOLEAN NOT NULL DEFAULT true,
  allow_downloads BOOLEAN NOT NULL DEFAULT false,
  passcode_hash TEXT,
  current_version_number INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. CAMPAIGN REVIEW VERSIONS (Immutable published snapshots)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_review_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_link_id UUID NOT NULL REFERENCES public.campaign_review_links(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT 'Review Package',
  notes TEXT,
  published_snapshot JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(review_link_id, version_number)
);

-- ------------------------------------------------------------------------------
-- 3. CAMPAIGN REVIEW FEEDBACK (Reviewer selections, approvals, comments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_review_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_link_id UUID NOT NULL REFERENCES public.campaign_review_links(id) ON DELETE CASCADE,
  review_version_id UUID REFERENCES public.campaign_review_versions(id) ON DELETE SET NULL,
  material_key TEXT NOT NULL,
  variant_key TEXT,
  reviewer_name TEXT,
  status TEXT NOT NULL DEFAULT 'preferred' CHECK (status IN ('not_reviewed', 'preferred', 'approved', 'needs_changes')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 4. INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_review_links_org ON public.campaign_review_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_review_links_campaign ON public.campaign_review_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_review_links_token_hash ON public.campaign_review_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_review_versions_link ON public.campaign_review_versions(review_link_id);
CREATE INDEX IF NOT EXISTS idx_review_feedback_link ON public.campaign_review_feedback(review_link_id);
CREATE INDEX IF NOT EXISTS idx_review_feedback_version ON public.campaign_review_feedback(review_version_id);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.campaign_review_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_review_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_review_feedback ENABLE ROW LEVEL SECURITY;

-- Organization members can read review links
CREATE POLICY "Org members can view review links"
  ON public.campaign_review_links FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids()));

-- Organization members can create review links
CREATE POLICY "Org members can create review links"
  ON public.campaign_review_links FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids()));

-- Organization members can update review links
CREATE POLICY "Org members can update review links"
  ON public.campaign_review_links FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids()));

-- Organization members can delete review links
CREATE POLICY "Org members can delete review links"
  ON public.campaign_review_links FOR DELETE
  TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids()));

-- Organization members can view published review versions
CREATE POLICY "Org members can view review versions"
  ON public.campaign_review_versions FOR SELECT
  TO authenticated
  USING (
    review_link_id IN (
      SELECT id FROM public.campaign_review_links
      WHERE organization_id IN (SELECT public.get_user_organization_ids())
    )
  );

-- Organization members can insert review versions
CREATE POLICY "Org members can create review versions"
  ON public.campaign_review_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    review_link_id IN (
      SELECT id FROM public.campaign_review_links
      WHERE organization_id IN (SELECT public.get_user_organization_ids())
    )
  );

-- Organization members can view review feedback
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
-- 6. SECURITY DEFINER PUBLIC RPCS
-- ------------------------------------------------------------------------------

-- Public RPC: Get sanitized review snapshot
CREATE OR REPLACE FUNCTION public.get_public_review_snapshot(
  p_token_hash TEXT,
  p_passcode_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link RECORD;
  v_version RECORD;
  v_feedback_json JSONB;
BEGIN
  -- 1. Validate link existence and status
  SELECT * INTO v_link
  FROM public.campaign_review_links
  WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found', 'error', 'This review link is invalid or no longer active.');
  END IF;

  IF NOT v_link.is_active THEN
    RETURN jsonb_build_object('status', 'revoked', 'error', 'This review link is no longer active.');
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < timezone('utc'::text, now()) THEN
    RETURN jsonb_build_object('status', 'expired', 'error', 'This review link is no longer active.');
  END IF;

  -- 2. Validate passcode if required
  IF v_link.passcode_hash IS NOT NULL THEN
    IF p_passcode_hash IS NULL OR v_link.passcode_hash <> p_passcode_hash THEN
      RETURN jsonb_build_object('status', 'passcode_required', 'error', 'A passcode is required to view this review package.');
    END IF;
  END IF;

  -- 3. Fetch latest active published version
  SELECT * INTO v_version
  FROM public.campaign_review_versions
  WHERE review_link_id = v_link.id
  ORDER BY version_number DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_version', 'error', 'No published review package is available.');
  END IF;

  -- 4. Fetch reviewer feedback for this link & version
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
  WHERE f.review_link_id = v_link.id;

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

-- Public RPC: Submit material feedback (preferred version / status / comment)
CREATE OR REPLACE FUNCTION public.submit_public_review_feedback(
  p_token_hash TEXT,
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
  v_link RECORD;
  v_version RECORD;
  v_feedback_id UUID;
  v_sanitized_status TEXT;
  v_sanitized_name TEXT;
  v_sanitized_comment TEXT;
BEGIN
  -- 1. Validate link
  SELECT * INTO v_link
  FROM public.campaign_review_links
  WHERE token_hash = p_token_hash;

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

  -- 3. Get active version
  SELECT id INTO v_version
  FROM public.campaign_review_versions
  WHERE review_link_id = v_link.id
  ORDER BY version_number DESC
  LIMIT 1;

  -- 4. If status is 'preferred', remove any previous preferred marker for this material by this reviewer
  IF v_sanitized_status = 'preferred' THEN
    UPDATE public.campaign_review_feedback
    SET status = 'not_reviewed', updated_at = timezone('utc'::text, now())
    WHERE review_link_id = v_link.id
      AND material_key = p_material_key
      AND reviewer_name = v_sanitized_name
      AND status = 'preferred';
  END IF;

  -- 5. Insert or update feedback record
  INSERT INTO public.campaign_review_feedback (
    review_link_id,
    review_version_id,
    material_key,
    variant_key,
    reviewer_name,
    status,
    comment,
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
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_feedback_id;

  RETURN jsonb_build_object(
    'success', true,
    'feedback_id', v_feedback_id,
    'material_key', p_material_key,
    'variant_key', p_variant_key,
    'status', v_sanitized_status
  );
END;
$$;

-- Public RPC: Submit overall campaign approval
CREATE OR REPLACE FUNCTION public.submit_public_campaign_approval(
  p_token_hash TEXT,
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
  v_link RECORD;
  v_version RECORD;
  v_feedback_id UUID;
  v_sanitized_status TEXT;
  v_sanitized_name TEXT;
  v_sanitized_notes TEXT;
BEGIN
  -- 1. Validate link
  SELECT * INTO v_link
  FROM public.campaign_review_links
  WHERE token_hash = p_token_hash;

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

  SELECT id INTO v_version
  FROM public.campaign_review_versions
  WHERE review_link_id = v_link.id
  ORDER BY version_number DESC
  LIMIT 1;

  INSERT INTO public.campaign_review_feedback (
    review_link_id,
    review_version_id,
    material_key,
    variant_key,
    reviewer_name,
    status,
    comment,
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
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_feedback_id;

  RETURN jsonb_build_object(
    'success', true,
    'feedback_id', v_feedback_id,
    'status', v_sanitized_status,
    'approved_at', timezone('utc'::text, now())
  );
END;
$$;

COMMIT;
