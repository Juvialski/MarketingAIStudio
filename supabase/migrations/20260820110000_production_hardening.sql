-- ==============================================================================
-- Forward-only production hardening
--
-- This file was created with `npx supabase@2.115.0 migration new
-- production_hardening`. Review it with `supabase db diff`/`supabase migration
-- list` in an authenticated environment before deployment.
-- This migration does not repair or delete existing data.  It makes future
-- writes fail closed, and leaves legacy cross-tenant rows visible for a remote
-- operator to inventory before validating any optional constraints.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Canonical private-object metadata
-- ------------------------------------------------------------------------------
ALTER TABLE public.campaign_assets
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT NOT NULL DEFAULT 'campaign-assets';
ALTER TABLE public.campaign_assets
  ADD COLUMN IF NOT EXISTS provenance TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (provenance IN ('uploaded', 'generated', 'fixture', 'failed'));
ALTER TABLE public.campaign_assets ALTER COLUMN public_url DROP NOT NULL;

DO $$
DECLARE constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.campaign_assets'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%source%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.campaign_assets DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;
ALTER TABLE public.campaign_assets
  ADD CONSTRAINT campaign_assets_source_check
  CHECK (source IN ('upload', 'uploaded', 'gemini', 'nvidia', 'bfl', 'openai', 'generated', 'rendered_template', 'sample', 'fixture'));

ALTER TABLE public.design_exports
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT NOT NULL DEFAULT 'campaign-exports';
ALTER TABLE public.design_exports ALTER COLUMN public_url DROP NOT NULL;

-- Parent-side composite keys let a deployment add real composite foreign keys
-- after its existing data has been inspected.  The triggers below provide the
-- same fail-closed invariant immediately without aborting on legacy bad rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.campaigns'::regclass
      AND conname = 'campaigns_id_organization_id_key'
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_id_organization_id_key UNIQUE (id, organization_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.brand_kits'::regclass
      AND conname = 'brand_kits_id_organization_id_key'
  ) THEN
    ALTER TABLE public.brand_kits
      ADD CONSTRAINT brand_kits_id_organization_id_key UNIQUE (id, organization_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.lead_lists'::regclass
      AND conname = 'lead_lists_id_organization_id_key'
  ) THEN
    ALTER TABLE public.lead_lists
      ADD CONSTRAINT lead_lists_id_organization_id_key UNIQUE (id, organization_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.assert_tenant_parent_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_TABLE_NAME = 'campaigns' THEN
    IF NEW.brand_kit_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.brand_kits bk
      WHERE bk.id = NEW.brand_kit_id
        AND bk.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'brand_kit_id must belong to the campaign organization'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'campaign_content' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = NEW.campaign_id AND c.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'campaign_content organization does not match campaign'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'campaign_assets' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = NEW.campaign_id AND c.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'campaign_assets organization does not match campaign'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'design_exports' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = NEW.campaign_id AND c.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'design_exports organization does not match campaign'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'leads' THEN
    IF NEW.list_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.lead_lists ll
      WHERE ll.id = NEW.list_id AND ll.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'lead list organization does not match lead'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'ai_generation_logs' THEN
    IF NEW.organization_id IS NULL OR NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'AI logs require an organization and authenticated user'
        USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = NEW.organization_id AND om.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'AI log user is not a member of the organization'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.campaign_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = NEW.campaign_id AND c.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'AI log campaign organization does not match organization'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'ai_generation_usage' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = NEW.organization_id AND om.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'AI usage user is not a member of the organization'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.campaign_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = NEW.campaign_id AND c.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'AI usage campaign organization does not match organization'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_tenant_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id is immutable'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_organization_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'organization id is immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaigns_parent_integrity ON public.campaigns;
CREATE TRIGGER campaigns_parent_integrity
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_parent_integrity();
DROP TRIGGER IF EXISTS campaign_content_parent_integrity ON public.campaign_content;
CREATE TRIGGER campaign_content_parent_integrity
  BEFORE INSERT OR UPDATE ON public.campaign_content
  FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_parent_integrity();
DROP TRIGGER IF EXISTS campaign_assets_parent_integrity ON public.campaign_assets;
CREATE TRIGGER campaign_assets_parent_integrity
  BEFORE INSERT OR UPDATE ON public.campaign_assets
  FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_parent_integrity();
DROP TRIGGER IF EXISTS design_exports_parent_integrity ON public.design_exports;
CREATE TRIGGER design_exports_parent_integrity
  BEFORE INSERT OR UPDATE ON public.design_exports
  FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_parent_integrity();
DROP TRIGGER IF EXISTS leads_parent_integrity ON public.leads;
CREATE TRIGGER leads_parent_integrity
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_parent_integrity();
DROP TRIGGER IF EXISTS ai_generation_logs_parent_integrity ON public.ai_generation_logs;
CREATE TRIGGER ai_generation_logs_parent_integrity
  BEFORE INSERT OR UPDATE ON public.ai_generation_logs
  FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_parent_integrity();

DROP TRIGGER IF EXISTS campaigns_org_immutable ON public.campaigns;
CREATE TRIGGER campaigns_org_immutable
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_reassignment();
DROP TRIGGER IF EXISTS brand_kits_org_immutable ON public.brand_kits;
CREATE TRIGGER brand_kits_org_immutable
  BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_reassignment();
DROP TRIGGER IF EXISTS campaign_content_org_immutable ON public.campaign_content;
CREATE TRIGGER campaign_content_org_immutable
  BEFORE UPDATE ON public.campaign_content
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_reassignment();
DROP TRIGGER IF EXISTS campaign_assets_org_immutable ON public.campaign_assets;
CREATE TRIGGER campaign_assets_org_immutable
  BEFORE UPDATE ON public.campaign_assets
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_reassignment();
DROP TRIGGER IF EXISTS design_exports_org_immutable ON public.design_exports;
CREATE TRIGGER design_exports_org_immutable
  BEFORE UPDATE ON public.design_exports
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_reassignment();
DROP TRIGGER IF EXISTS lead_lists_org_immutable ON public.lead_lists;
CREATE TRIGGER lead_lists_org_immutable
  BEFORE UPDATE ON public.lead_lists
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_reassignment();
DROP TRIGGER IF EXISTS leads_org_immutable ON public.leads;
CREATE TRIGGER leads_org_immutable
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_reassignment();
DROP TRIGGER IF EXISTS organizations_id_immutable ON public.organizations;
CREATE TRIGGER organizations_id_immutable
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_organization_reassignment();

-- ------------------------------------------------------------------------------
-- 2. Caller-bound helpers and safe organization role management
-- ------------------------------------------------------------------------------
-- Policies in the initial migration depended on the arbitrary-user-ID versions.
-- Remove them before removing those callable APIs.
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners and admins can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage org members" ON public.organization_members;
DROP POLICY IF EXISTS "Org members can view brand kits" ON public.brand_kits;
DROP POLICY IF EXISTS "Org members can insert brand kits" ON public.brand_kits;
DROP POLICY IF EXISTS "Org members can update brand kits" ON public.brand_kits;
DROP POLICY IF EXISTS "Org members can delete brand kits" ON public.brand_kits;
DROP POLICY IF EXISTS "Org members can view campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Org members can insert campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Org members can update campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Org members can delete campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Org members can view campaign content" ON public.campaign_content;
DROP POLICY IF EXISTS "Org members can insert campaign content" ON public.campaign_content;
DROP POLICY IF EXISTS "Org members can update campaign content" ON public.campaign_content;
DROP POLICY IF EXISTS "Org members can delete campaign content" ON public.campaign_content;
DROP POLICY IF EXISTS "Org members can view campaign assets" ON public.campaign_assets;
DROP POLICY IF EXISTS "Org members can insert campaign assets" ON public.campaign_assets;
DROP POLICY IF EXISTS "Org members can delete campaign assets" ON public.campaign_assets;
DROP POLICY IF EXISTS "Org members can view design exports" ON public.design_exports;
DROP POLICY IF EXISTS "Org members can insert design exports" ON public.design_exports;
DROP POLICY IF EXISTS "Org members can view lead lists" ON public.lead_lists;
DROP POLICY IF EXISTS "Org members can manage lead lists" ON public.lead_lists;
DROP POLICY IF EXISTS "Org members can view leads" ON public.leads;
DROP POLICY IF EXISTS "Org members can manage leads" ON public.leads;
DROP POLICY IF EXISTS "Org members can view ai logs" ON public.ai_generation_logs;
DROP POLICY IF EXISTS "Authenticated users can insert ai logs" ON public.ai_generation_logs;

DROP FUNCTION IF EXISTS public.is_org_member(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_organization_ids(UUID);

CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT p_organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT p_organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.get_user_organization_ids() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_org_admin_or_owner(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin_or_owner(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_organization_member_role(
  p_organization_id UUID,
  p_user_id UUID,
  p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_role TEXT;
  target_role TEXT;
  owner_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('owner', 'admin', 'member') THEN
    RAISE EXCEPTION 'invalid organization role' USING ERRCODE = '22023';
  END IF;
  SELECT role INTO actor_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id AND user_id = auth.uid()
  FOR UPDATE;
  IF actor_role IS NULL OR actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'organization administrator required' USING ERRCODE = '42501';
  END IF;
  SELECT role INTO target_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id AND user_id = p_user_id
  FOR UPDATE;
  IF actor_role = 'admin' AND (target_role = 'owner' OR p_role = 'owner') THEN
    RAISE EXCEPTION 'only an owner may manage owner roles' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = auth.uid() AND target_role IS DISTINCT FROM 'owner' AND p_role = 'owner' THEN
    RAISE EXCEPTION 'self-promotion to owner is not allowed' USING ERRCODE = '42501';
  END IF;
  IF target_role = 'owner' AND p_role <> 'owner' THEN
    PERFORM 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
    ORDER BY user_id
    FOR UPDATE;
    SELECT count(*) INTO owner_count
    FROM public.organization_members
    WHERE organization_id = p_organization_id AND role = 'owner';
    IF owner_count < 2 THEN
      RAISE EXCEPTION 'the organization must retain an owner' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF target_role IS NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (p_organization_id, p_user_id, p_role);
  ELSE
    UPDATE public.organization_members
    SET role = p_role
    WHERE organization_id = p_organization_id AND user_id = p_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_organization_member(
  p_organization_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_role TEXT;
  target_role TEXT;
  owner_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT role INTO actor_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id AND user_id = auth.uid()
  FOR UPDATE;
  SELECT role INTO target_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id AND user_id = p_user_id
  FOR UPDATE;
  IF actor_role IS NULL OR actor_role NOT IN ('owner', 'admin') OR target_role IS NULL THEN
    RAISE EXCEPTION 'organization administrator required' USING ERRCODE = '42501';
  END IF;
  IF actor_role = 'admin' AND target_role = 'owner' THEN
    RAISE EXCEPTION 'only an owner may remove an owner' USING ERRCODE = '42501';
  END IF;
  IF target_role = 'owner' THEN
    PERFORM 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
    ORDER BY user_id
    FOR UPDATE;
    SELECT count(*) INTO owner_count
    FROM public.organization_members
    WHERE organization_id = p_organization_id AND role = 'owner';
    IF owner_count < 2 THEN
      RAISE EXCEPTION 'the organization must retain an owner' USING ERRCODE = '23514';
    END IF;
  END IF;
  DELETE FROM public.organization_members
  WHERE organization_id = p_organization_id AND user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_organization_member_role(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_organization_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_organization_member_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_organization_member(UUID, UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. Server-owned provider settings, idempotency, rate and spending ledger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_provider_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  paid_generation_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_spend_limit_usd NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (daily_spend_limit_usd >= 0),
  daily_request_limit INTEGER NOT NULL DEFAULT 100 CHECK (daily_request_limit > 0),
  requests_per_minute INTEGER NOT NULL DEFAULT 10 CHECK (requests_per_minute > 0),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.ai_generation_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  estimated_cost_usd NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  actual_cost_usd NUMERIC(12,4),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  provider_request_id TEXT,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  finished_at TIMESTAMPTZ,
  UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_organization_id ON public.ai_generation_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON public.ai_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_campaign_id ON public.ai_generation_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.ai_generation_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_campaign_id ON public.ai_generation_usage(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_settings_updated_by ON public.ai_provider_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_organization_id ON public.campaign_assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_organization_id ON public.campaign_content(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_kit_id ON public.campaigns(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_design_exports_organization_id ON public.design_exports(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_lists_created_by ON public.lead_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_lead_lists_organization_id ON public.lead_lists(organization_id);

DROP TRIGGER IF EXISTS ai_generation_usage_parent_integrity ON public.ai_generation_usage;
CREATE TRIGGER ai_generation_usage_parent_integrity
  BEFORE INSERT OR UPDATE ON public.ai_generation_usage
  FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_parent_integrity();

ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view provider settings" ON public.ai_provider_settings;
CREATE POLICY "Members can view provider settings"
  ON public.ai_provider_settings FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
DROP POLICY IF EXISTS "Members can view own usage" ON public.ai_generation_usage;
CREATE POLICY "Members can view own usage"
  ON public.ai_generation_usage FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

REVOKE INSERT, UPDATE, DELETE ON public.ai_provider_settings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ai_generation_usage FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ai_generation_logs FROM anon, authenticated;
GRANT SELECT ON public.ai_provider_settings, public.ai_generation_usage, public.ai_generation_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.set_ai_provider_settings(
  p_organization_id UUID,
  p_paid_generation_enabled BOOLEAN,
  p_daily_spend_limit_usd NUMERIC,
  p_daily_request_limit INTEGER,
  p_requests_per_minute INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor_role TEXT;
BEGIN
  SELECT role INTO actor_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id AND user_id = auth.uid();
  IF actor_role IS NULL OR actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'organization administrator required' USING ERRCODE = '42501';
  END IF;
  IF p_paid_generation_enabled AND actor_role <> 'owner' THEN
    RAISE EXCEPTION 'only an owner may enable paid generation' USING ERRCODE = '42501';
  END IF;
  IF p_daily_spend_limit_usd IS NULL OR p_daily_spend_limit_usd < 0
     OR p_daily_request_limit IS NULL OR p_daily_request_limit NOT BETWEEN 1 AND 10000
     OR p_requests_per_minute IS NULL OR p_requests_per_minute NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'invalid provider limits' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.ai_provider_settings (
    organization_id, paid_generation_enabled, daily_spend_limit_usd,
    daily_request_limit, requests_per_minute, updated_by, updated_at
  ) VALUES (
    p_organization_id, p_paid_generation_enabled, p_daily_spend_limit_usd,
    p_daily_request_limit, p_requests_per_minute, auth.uid(), now()
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    paid_generation_enabled = EXCLUDED.paid_generation_enabled,
    daily_spend_limit_usd = EXCLUDED.daily_spend_limit_usd,
    daily_request_limit = EXCLUDED.daily_request_limit,
    requests_per_minute = EXCLUDED.requests_per_minute,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.set_ai_provider_settings(UUID, BOOLEAN, NUMERIC, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_ai_provider_settings(UUID, BOOLEAN, NUMERIC, INTEGER, INTEGER)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_ai_generation(
  p_organization_id UUID,
  p_user_id UUID,
  p_campaign_id UUID,
  p_operation_type TEXT,
  p_provider TEXT,
  p_model TEXT,
  p_idempotency_key TEXT,
  p_is_paid BOOLEAN DEFAULT false,
  p_estimated_cost_usd NUMERIC DEFAULT 0
)
RETURNS TABLE (allowed BOOLEAN, reason TEXT, usage_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  settings_row public.ai_provider_settings%ROWTYPE;
  existing_id UUID;
  request_count INTEGER;
  spend_total NUMERIC;
  new_id UUID;
BEGIN
  IF p_organization_id IS NULL OR p_user_id IS NULL
     OR p_operation_type IS NULL OR length(p_operation_type) > 80
     OR p_provider IS NULL OR length(p_provider) > 80
     OR p_model IS NULL OR length(p_model) > 160
     OR p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 8 AND 128
     OR p_estimated_cost_usd IS NULL OR p_estimated_cost_usd < 0 THEN
    RETURN QUERY SELECT false, 'invalid_request', NULL::UUID;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT false, 'organization_access_denied', NULL::UUID;
    RETURN;
  END IF;
  IF p_campaign_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id = p_campaign_id AND organization_id = p_organization_id
  ) THEN
    RETURN QUERY SELECT false, 'campaign_access_denied', NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.ai_provider_settings (organization_id)
  VALUES (p_organization_id)
  ON CONFLICT (organization_id) DO NOTHING;
  SELECT * INTO settings_row
  FROM public.ai_provider_settings
  WHERE organization_id = p_organization_id
  FOR UPDATE;

  SELECT id INTO existing_id
  FROM public.ai_generation_usage
  WHERE organization_id = p_organization_id AND idempotency_key = p_idempotency_key;
  IF existing_id IS NOT NULL THEN
    RETURN QUERY SELECT false, 'duplicate_request', existing_id;
    RETURN;
  END IF;
  IF p_is_paid AND NOT settings_row.paid_generation_enabled THEN
    RETURN QUERY SELECT false, 'paid_generation_disabled', NULL::UUID;
    RETURN;
  END IF;

  SELECT count(*) INTO request_count
  FROM public.ai_generation_usage
  WHERE organization_id = p_organization_id
    AND created_at >= now() - interval '1 minute';
  IF request_count >= settings_row.requests_per_minute THEN
    RETURN QUERY SELECT false, 'rate_limit_exceeded', NULL::UUID;
    RETURN;
  END IF;
  SELECT count(*), COALESCE(sum(COALESCE(actual_cost_usd, estimated_cost_usd)), 0)
    INTO request_count, spend_total
  FROM public.ai_generation_usage
  WHERE organization_id = p_organization_id
    AND created_at >= ((timezone('America/Los_Angeles', now())::date)::timestamp AT TIME ZONE 'America/Los_Angeles')
    AND status <> 'failed';
  IF request_count >= settings_row.daily_request_limit THEN
    RETURN QUERY SELECT false, 'daily_request_limit_exceeded', NULL::UUID;
    RETURN;
  END IF;
  IF p_is_paid AND spend_total + p_estimated_cost_usd > settings_row.daily_spend_limit_usd THEN
    RETURN QUERY SELECT false, 'daily_spend_limit_exceeded', NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.ai_generation_usage (
    organization_id, user_id, campaign_id, operation_type, provider, model,
    idempotency_key, is_paid, estimated_cost_usd
  ) VALUES (
    p_organization_id, p_user_id, p_campaign_id, p_operation_type, p_provider, p_model,
    p_idempotency_key, p_is_paid, p_estimated_cost_usd
  ) RETURNING id INTO new_id;
  RETURN QUERY SELECT true, 'claimed', new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_ai_generation(
  p_usage_id UUID,
  p_status TEXT,
  p_actual_cost_usd NUMERIC DEFAULT NULL,
  p_provider_request_id TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE usage_row public.ai_generation_usage%ROWTYPE;
BEGIN
  IF p_status NOT IN ('success', 'failed') THEN
    RAISE EXCEPTION 'invalid generation status' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO usage_row FROM public.ai_generation_usage WHERE id = p_usage_id FOR UPDATE;
  IF usage_row.id IS NULL THEN
    RAISE EXCEPTION 'generation usage record not found' USING ERRCODE = '22023';
  END IF;
  UPDATE public.ai_generation_usage
  SET status = p_status,
      actual_cost_usd = CASE WHEN p_actual_cost_usd IS NULL THEN actual_cost_usd ELSE greatest(p_actual_cost_usd, 0) END,
      provider_request_id = NULLIF(left(COALESCE(p_provider_request_id, ''), 200), ''),
      error_code = NULLIF(left(COALESCE(p_error_code, ''), 80), ''),
      finished_at = now()
  WHERE id = p_usage_id;
  INSERT INTO public.ai_generation_logs (
    organization_id, user_id, campaign_id, operation_type, provider, model,
    status, error_message
  ) VALUES (
    usage_row.organization_id, usage_row.user_id, usage_row.campaign_id,
    usage_row.operation_type, usage_row.provider, usage_row.model,
    p_status, CASE WHEN p_status = 'failed' THEN NULLIF(left(COALESCE(p_error_code, 'provider_error'), 160), '') ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ai_generation(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, NUMERIC)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_ai_generation(UUID, TEXT, NUMERIC, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_generation(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, NUMERIC)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_ai_generation(UUID, TEXT, NUMERIC, TEXT, TEXT)
  TO service_role;

-- ------------------------------------------------------------------------------
-- 4. Least-privilege RLS policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));
CREATE POLICY "Owners and admins can update their organizations"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin_or_owner(id))
  WITH CHECK (public.is_org_admin_or_owner(id));

CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
-- Membership writes are only through the owner-preserving RPCs above.

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Org members can view brand kits"
  ON public.brand_kits FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can insert brand kits"
  ON public.brand_kits FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can update brand kits"
  ON public.brand_kits FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can delete brand kits"
  ON public.brand_kits FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view campaigns"
  ON public.campaigns FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can insert campaigns"
  ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can update campaigns"
  ON public.campaigns FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can delete campaigns"
  ON public.campaigns FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view campaign content"
  ON public.campaign_content FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can insert campaign content"
  ON public.campaign_content FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can update campaign content"
  ON public.campaign_content FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can delete campaign content"
  ON public.campaign_content FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view campaign assets"
  ON public.campaign_assets FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can insert campaign assets"
  ON public.campaign_assets FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can update campaign assets"
  ON public.campaign_assets FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can delete campaign assets"
  ON public.campaign_assets FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view design exports"
  ON public.design_exports FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can insert design exports"
  ON public.design_exports FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can update design exports"
  ON public.design_exports FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can delete design exports"
  ON public.design_exports FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view lead lists"
  ON public.lead_lists FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can insert lead lists"
  ON public.lead_lists FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can update lead lists"
  ON public.lead_lists FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can delete lead lists"
  ON public.lead_lists FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view leads"
  ON public.leads FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can insert leads"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can update leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can delete leads"
  ON public.leads FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view ai logs"
  ON public.ai_generation_logs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

-- Expose application tables to the authenticated Data API role. RLS remains
-- the authorization boundary; without these grants PostgREST fails before it
-- can evaluate the tenant policies.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.organizations,
  public.organization_members,
  public.brand_kits,
  public.campaigns,
  public.campaign_content,
  public.campaign_assets,
  public.design_exports,
  public.lead_lists,
  public.leads
TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. Neutral signup provisioning (no fictional company, legal or deal data)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
  company_name TEXT;
  org_slug TEXT;
BEGIN
  user_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''), 'Workspace owner');
  company_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'company_name'), ''), 'Workspace');
  org_slug := 'workspace-' || substring(NEW.id::text, 1, 12);

  INSERT INTO public.profiles (id, display_name, company_name)
  VALUES (NEW.id, user_name, company_name)
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name,
    company_name = EXCLUDED.company_name, updated_at = now();

  INSERT INTO public.organizations (name, slug)
  VALUES (company_name || ' Workspace', org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  INSERT INTO public.brand_kits (
    organization_id, is_default, company_name, tagline, website, phone,
    email, license_number
  ) VALUES (
    new_org_id, true, company_name, NULL, NULL, NULL, NEW.email, NULL
  );

  INSERT INTO public.ai_provider_settings (organization_id)
  VALUES (new_org_id)
  ON CONFLICT (organization_id) DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 6. Private, organization-prefixed Storage policies
-- ------------------------------------------------------------------------------
UPDATE storage.buckets
SET public = false
WHERE id IN ('brand-assets', 'property-media', 'campaign-assets', 'campaign-exports');

CREATE OR REPLACE FUNCTION public.storage_object_org_id(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = public, pg_temp
AS $$
DECLARE first_segment TEXT;
BEGIN
  first_segment := split_part(p_name, '/', 1);
  IF first_segment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  RETURN first_segment::UUID;
END;
$$;
REVOKE ALL ON FUNCTION public.storage_object_org_id(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_object_org_id(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Public read for brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read for property-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload property-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update property-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete property-media" ON storage.objects;
DROP POLICY IF EXISTS "Public read for campaign-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload campaign-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update campaign-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete campaign-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read for campaign-exports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload campaign-exports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update campaign-exports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete campaign-exports" ON storage.objects;

CREATE POLICY "Org members can read private brand-assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'brand-assets' AND public.is_org_member(public.storage_object_org_id(name)));
CREATE POLICY "Org members can upload private brand-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets' AND public.is_org_member(public.storage_object_org_id(name)));
CREATE POLICY "Org members can update private brand-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets' AND public.is_org_member(public.storage_object_org_id(name)))
  WITH CHECK (bucket_id = 'brand-assets' AND public.is_org_member(public.storage_object_org_id(name)));
CREATE POLICY "Org members can delete private brand-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets' AND public.is_org_member(public.storage_object_org_id(name)));

CREATE POLICY "Org members can read private property-media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'property-media' AND public.is_org_member(public.storage_object_org_id(name)));
CREATE POLICY "Org members can upload private property-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-media' AND public.is_org_member(public.storage_object_org_id(name)));
CREATE POLICY "Org members can update private property-media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'property-media' AND public.is_org_member(public.storage_object_org_id(name)))
  WITH CHECK (bucket_id = 'property-media' AND public.is_org_member(public.storage_object_org_id(name)));
CREATE POLICY "Org members can delete private property-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-media' AND public.is_org_member(public.storage_object_org_id(name)));

CREATE POLICY "Org members can read private campaign-assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'campaign-assets' AND public.is_org_member(public.storage_object_org_id(name)));
CREATE POLICY "Org members can upload private campaign-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'campaign-assets' AND public.is_org_member(public.storage_object_org_id(name)));
CREATE POLICY "Org members can update private campaign-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'campaign-assets' AND public.is_org_member(public.storage_object_org_id(name)))
  WITH CHECK (bucket_id = 'campaign-assets' AND public.is_org_member(public.storage_object_org_id(name)));
CREATE POLICY "Org members can delete private campaign-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'campaign-assets' AND public.is_org_member(public.storage_object_org_id(name)));

CREATE POLICY "Org members can read private campaign-exports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'campaign-exports' AND public.is_org_member(public.storage_object_org_id(name)));
CREATE POLICY "Org members can upload private campaign-exports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'campaign-exports' AND public.is_org_member(public.storage_object_org_id(name)));
CREATE POLICY "Org members can update private campaign-exports"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'campaign-exports' AND public.is_org_member(public.storage_object_org_id(name)))
  WITH CHECK (bucket_id = 'campaign-exports' AND public.is_org_member(public.storage_object_org_id(name)));
CREATE POLICY "Org members can delete private campaign-exports"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'campaign-exports' AND public.is_org_member(public.storage_object_org_id(name)));

COMMIT;
