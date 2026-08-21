-- ==============================================================================
-- Migration: 20260821120000_feedback_snapshot_validation.sql
-- Description: Server-side validation of feedback material & variant keys against
--              the published snapshot, and deprecation of unused passcode column.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. HARDEN submit_public_review_feedback TO VALIDATE AGAINST published_snapshot
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
  v_is_valid_material BOOLEAN := false;
  v_is_valid_variant BOOLEAN := false;
  v_snapshot JSONB;
BEGIN
  -- 1. Validate raw token
  IF p_raw_token IS NULL OR TRIM(p_raw_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid review token.');
  END IF;

  v_token_hash := encode(digest(TRIM(p_raw_token), 'sha256'), 'hex');

  -- 2. Validate review link
  SELECT * INTO v_link
  FROM public.campaign_review_links
  WHERE token_hash = v_token_hash;

  IF NOT FOUND OR NOT v_link.is_active OR (v_link.expires_at IS NOT NULL AND v_link.expires_at < timezone('utc'::text, now())) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This review link is not active or has expired.');
  END IF;

  -- 3. Fetch active version & published snapshot
  SELECT * INTO v_version
  FROM public.campaign_review_versions
  WHERE review_link_id = v_link.id
  ORDER BY version_number DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active review version found.');
  END IF;

  v_snapshot := v_version.published_snapshot;
  IF v_snapshot IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Review snapshot is unavailable.');
  END IF;

  -- 4. Validate material key bounds & prohibit campaign_overall through item feedback
  IF p_material_key IS NULL OR LENGTH(p_material_key) > 64 OR TRIM(p_material_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or missing material key.');
  END IF;

  IF LOWER(TRIM(p_material_key)) = 'campaign_overall' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign overall approval must be submitted through the dedicated approval endpoint.');
  END IF;

  IF p_variant_key IS NOT NULL AND (LENGTH(p_variant_key) > 64 OR TRIM(p_variant_key) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid variant key.');
  END IF;

  -- 5. Inspect published snapshot for material existence
  -- Check presentation
  IF p_material_key = 'presentation' THEN
    IF (v_snapshot ? 'presentation') AND v_snapshot->'presentation' IS NOT NULL AND v_snapshot->'presentation' != 'null'::jsonb THEN
      v_is_valid_material := true;
      IF p_variant_key IS NOT NULL AND TRIM(p_variant_key) <> '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Variants are not supported for presentation material.');
      END IF;
    END IF;
  END IF;

  -- Check video script
  IF NOT v_is_valid_material AND (p_material_key = 'video_script' OR p_material_key = 'copy_video_script') THEN
    IF (v_snapshot ? 'videoScript') AND v_snapshot->'videoScript' IS NOT NULL AND v_snapshot->'videoScript' != 'null'::jsonb THEN
      v_is_valid_material := true;
      IF p_variant_key IS NOT NULL AND TRIM(p_variant_key) <> '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Variants are not supported for video script.');
      END IF;
    END IF;
  END IF;

  -- Check email newsletter
  IF NOT v_is_valid_material AND (p_material_key = 'email_newsletter' OR p_material_key = 'copy_email') THEN
    IF (v_snapshot ? 'emailNewsletter') AND v_snapshot->'emailNewsletter' IS NOT NULL AND v_snapshot->'emailNewsletter' != 'null'::jsonb THEN
      v_is_valid_material := true;
      IF p_variant_key IS NOT NULL AND TRIM(p_variant_key) <> '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Variants are not supported for email newsletter.');
      END IF;
    END IF;
  END IF;

  -- Check copy channels
  IF NOT v_is_valid_material AND (v_snapshot ? 'copyChannels') AND jsonb_typeof(v_snapshot->'copyChannels') = 'array' THEN
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_snapshot->'copyChannels') AS ch
      WHERE ch->>'id' = p_material_key
    ) THEN
      v_is_valid_material := true;
      IF p_variant_key IS NOT NULL AND TRIM(p_variant_key) <> '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Variants are not supported for copy channels.');
      END IF;
    END IF;
  END IF;

  -- Check graphic materials and variants
  IF NOT v_is_valid_material AND (v_snapshot ? 'graphicMaterials') AND jsonb_typeof(v_snapshot->'graphicMaterials') = 'array' THEN
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_snapshot->'graphicMaterials') AS gm
      WHERE gm->>'id' = p_material_key
    ) INTO v_is_valid_material;

    IF v_is_valid_material THEN
      IF p_variant_key IS NOT NULL AND TRIM(p_variant_key) <> '' THEN
        SELECT EXISTS (
          SELECT 1 
          FROM jsonb_array_elements(v_snapshot->'graphicMaterials') AS gm,
               jsonb_array_elements(gm->'variants') AS v
          WHERE gm->>'id' = p_material_key AND v->>'id' = p_variant_key
        ) INTO v_is_valid_variant;

        IF NOT v_is_valid_variant THEN
          RETURN jsonb_build_object('success', false, 'error', 'Specified variant does not exist for this material.');
        END IF;
      END IF;
    END IF;
  END IF;

  IF NOT v_is_valid_material THEN
    RETURN jsonb_build_object('success', false, 'error', 'Material key does not exist in the published review package.');
  END IF;

  -- 6. Validate input and permissions
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

  -- 7. Deterministic UPSERT
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

  -- 8. Return response
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
-- 2. DEPRECATE PASSCODE COLUMN
-- ------------------------------------------------------------------------------
COMMENT ON COLUMN public.campaign_review_links.passcode_hash IS 'DEPRECATED: Public review links use cryptographically secure URL tokens and do not enforce passcodes.';

REVOKE ALL ON FUNCTION public.submit_public_review_feedback(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_review_feedback(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

COMMIT;
