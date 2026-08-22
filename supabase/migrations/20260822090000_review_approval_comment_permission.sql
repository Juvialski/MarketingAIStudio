-- ============================================================================
-- Forward-only hardening: approval notes obey the review comments permission.
-- The earlier approval RPC checked allow_approval but stored notes as feedback
-- without checking allow_comments.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.submit_public_campaign_approval(
  p_raw_token TEXT,
  p_status TEXT DEFAULT 'approved',
  p_notes TEXT DEFAULT NULL,
  p_reviewer_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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

  v_token_hash := encode(extensions.digest(TRIM(p_raw_token)::text, 'sha256'::text), 'hex');

  SELECT * INTO v_link
  FROM public.campaign_review_links
  WHERE token_hash = v_token_hash;

  IF NOT FOUND OR NOT v_link.is_active OR (v_link.expires_at IS NOT NULL AND v_link.expires_at < timezone('utc'::text, now())) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This review link is not active or has expired.');
  END IF;

  IF NOT v_link.allow_approval THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign approval is disabled for this review link.');
  END IF;

  v_sanitized_notes := SUBSTRING(TRIM(COALESCE(p_notes, '')) FROM 1 FOR 2000);
  IF v_sanitized_notes <> '' AND NOT v_link.allow_comments THEN
    RETURN jsonb_build_object('success', false, 'error', 'Comments are disabled for this review link.');
  END IF;

  v_sanitized_status := LOWER(TRIM(p_status));
  IF v_sanitized_status NOT IN ('approved', 'needs_changes') THEN
    v_sanitized_status := 'approved';
  END IF;

  v_sanitized_name := SUBSTRING(TRIM(COALESCE(NULLIF(TRIM(p_reviewer_name), ''), 'Reviewer')) FROM 1 FOR 100);
  v_updated_at := timezone('utc'::text, now());

  SELECT * INTO v_version
  FROM public.campaign_review_versions
  WHERE review_link_id = v_link.id
  ORDER BY version_number DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active review version found.');
  END IF;

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

COMMIT;
