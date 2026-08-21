-- ==============================================================================
-- ZAW MARKETING STUDIO — COMPLETE SUPABASE DATABASE & STORAGE SETUP
-- ==============================================================================
-- Execute this script in the Supabase SQL Editor of your new Supabase project.
-- It initializes all normalized tables, triggers, tenant-isolation RLS policies,
-- private storage buckets, and hardened review portal RPCs.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABLES & CORE ENTITIES
-- ------------------------------------------------------------------------------

-- User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Organizations (Multi-tenant workspaces)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Organization Memberships
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(organization_id, user_id)
);

-- Brand Kits
CREATE TABLE IF NOT EXISTS public.brand_kits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  company_name TEXT NOT NULL,
  tagline TEXT,
  logo_url TEXT,
  logo_dark_url TEXT,
  logo_storage_bucket TEXT DEFAULT 'brand-assets',
  logo_storage_path TEXT,
  logo_dark_storage_bucket TEXT DEFAULT 'brand-assets',
  logo_dark_storage_path TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  colors JSONB NOT NULL DEFAULT '{
    "primary": "#0f172a",
    "secondary": "#1b3b2b",
    "accent": "#c85a32",
    "backgroundLight": "#fdfbf7",
    "backgroundDark": "#0a1128",
    "textPrimary": "#0f172a",
    "textMuted": "#64748b"
  }'::jsonb,
  typography JSONB NOT NULL DEFAULT '{
    "headlineFont": "Playfair Display",
    "bodyFont": "Inter",
    "monoFont": "JetBrains Mono",
    "familyPairing": "editorial_serif"
  }'::jsonb,
  tone_of_voice TEXT NOT NULL DEFAULT 'analytical_investor',
  target_audience_default TEXT NOT NULL DEFAULT 'Accredited real estate investors and value-add operators',
  preferred_cta TEXT NOT NULL DEFAULT 'Request Detailed Underwriting Pro Forma',
  required_disclaimer TEXT NOT NULL DEFAULT 'All investments carry risk. Pro forma estimates, ARV projections, and renovation budgets are provided for underwriting analysis only and do not constitute guaranteed returns. Conduct independent due diligence.',
  forbidden_words TEXT[] NOT NULL DEFAULT ARRAY[
    'guaranteed returns',
    'get rich quick',
    'can’t lose',
    'game-changer',
    'nestled in the heart of',
    'unlock the secret',
    'hurry before it’s gone'
  ],
  image_style_preference TEXT NOT NULL DEFAULT 'authentic_photos_first',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(id, organization_id)
);

-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_kit_id UUID REFERENCES public.brand_kits(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'fix_and_flip',
  target_market TEXT NOT NULL DEFAULT 'Phoenix, AZ',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'strategy_ready', 'copy_ready', 'designs_ready', 'completed')),
  source_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  strategy JSONB,
  design_configs JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(id, organization_id)
);

-- Campaign Content
CREATE TABLE IF NOT EXISTS public.campaign_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('all_package', 'headline', 'cta', 'facebook', 'instagram', 'linkedin', 'email', 'video_script', 'strategy', 'presentation_deck')),
  platform TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_accepted BOOLEAN NOT NULL DEFAULT true,
  quality_report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Campaign Assets
CREATE TABLE IF NOT EXISTS public.campaign_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL DEFAULT 'property_photo' CHECK (asset_type IN ('hero_photo', 'property_photo', 'ai_concept', 'rendered_graphic', 'pdf_flyer')),
  storage_bucket TEXT NOT NULL DEFAULT 'campaign-assets',
  storage_path TEXT NOT NULL,
  public_url TEXT,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  width INTEGER,
  height INTEGER,
  aspect_ratio TEXT DEFAULT '4:3',
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'uploaded', 'gemini', 'nvidia', 'bfl', 'openai', 'generated', 'rendered_template', 'sample', 'fixture')),
  provenance TEXT NOT NULL DEFAULT 'uploaded' CHECK (provenance IN ('uploaded', 'generated', 'fixture', 'failed')),
  is_hero BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Design Exports
CREATE TABLE IF NOT EXISTS public.design_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_family TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'campaign-exports',
  storage_path TEXT,
  public_url TEXT,
  format TEXT NOT NULL CHECK (format IN ('png', 'jpeg', 'pdf', 'zip')),
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Lead Lists & Leads
CREATE TABLE IF NOT EXISTS public.lead_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  metro_area TEXT NOT NULL,
  target_category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES public.lead_lists(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  category TEXT NOT NULL,
  website TEXT,
  metro_area TEXT NOT NULL,
  public_contact_email TEXT,
  public_phone TEXT,
  address_summary TEXT,
  estimated_portfolio_type TEXT,
  lead_score INTEGER NOT NULL DEFAULT 85,
  relevance_reason TEXT NOT NULL,
  source_url TEXT,
  outreach_angle JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'saved', 'contacted', 'archived')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- AI Provider Settings & Usage
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

CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  latency_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Review Portal Tables
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_review_feedback_item UNIQUE (review_link_id, review_version_id, material_key, reviewer_name)
);

-- ------------------------------------------------------------------------------
-- 3. INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON public.campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_kit_id ON public.campaigns(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_campaign_id ON public.campaign_content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_organization_id ON public.campaign_content(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_campaign_id ON public.campaign_assets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_organization_id ON public.campaign_assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_design_exports_campaign_id ON public.design_exports(campaign_id);
CREATE INDEX IF NOT EXISTS idx_design_exports_organization_id ON public.design_exports(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_id ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_list_id ON public.leads(list_id);
CREATE INDEX IF NOT EXISTS idx_lead_lists_organization_id ON public.lead_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_lists_created_by ON public.lead_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_brand_kits_org_id ON public.brand_kits(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_organization_id ON public.ai_generation_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON public.ai_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_campaign_id ON public.ai_generation_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.ai_generation_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_campaign_id ON public.ai_generation_usage(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_settings_updated_by ON public.ai_provider_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_review_links_org ON public.campaign_review_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_review_links_campaign ON public.campaign_review_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_review_links_token_hash ON public.campaign_review_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_review_versions_link ON public.campaign_review_versions(review_link_id);
CREATE INDEX IF NOT EXISTS idx_review_feedback_link ON public.campaign_review_feedback(review_link_id);
CREATE INDEX IF NOT EXISTS idx_review_feedback_version ON public.campaign_review_feedback(review_version_id);

-- ------------------------------------------------------------------------------
-- 4. INTEGRITY & SECURITY DEFINER HELPERS
-- ------------------------------------------------------------------------------

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
      WHERE bk.id = NEW.brand_kit_id AND bk.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'brand_kit_id must belong to the campaign organization' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'campaign_content' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = NEW.campaign_id AND c.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'campaign_content organization does not match campaign' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'campaign_assets' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = NEW.campaign_id AND c.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'campaign_assets organization does not match campaign' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'design_exports' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = NEW.campaign_id AND c.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'design_exports organization does not match campaign' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'leads' THEN
    IF NEW.list_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.lead_lists ll
      WHERE ll.id = NEW.list_id AND ll.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'lead list organization does not match lead' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'ai_generation_logs' THEN
    IF NEW.organization_id IS NULL OR NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'AI logs require an organization and authenticated user' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = NEW.organization_id AND om.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'AI log user is not a member of the organization' USING ERRCODE = '23514';
    END IF;
    IF NEW.campaign_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = NEW.campaign_id AND c.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'AI log campaign organization does not match organization' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'ai_generation_usage' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = NEW.organization_id AND om.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'AI usage user is not a member of the organization' USING ERRCODE = '23514';
    END IF;
    IF NEW.campaign_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = NEW.campaign_id AND c.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'AI usage campaign organization does not match organization' USING ERRCODE = '23514';
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
    RAISE EXCEPTION 'organization_id is immutable' USING ERRCODE = '42501';
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
-- 5. CALLER-BOUND RLS HELPERS
-- ------------------------------------------------------------------------------

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

-- Role management functions
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

-- AI Provider Management
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

REVOKE ALL ON FUNCTION public.set_ai_provider_settings(UUID, BOOLEAN, NUMERIC, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_ai_provider_settings(UUID, BOOLEAN, NUMERIC, INTEGER, INTEGER) TO authenticated;

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

REVOKE ALL ON FUNCTION public.claim_ai_generation(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_ai_generation(UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_generation(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_ai_generation(UUID, TEXT, NUMERIC, TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_review_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_review_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_review_feedback ENABLE ROW LEVEL SECURITY;

-- Profiles
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

-- Organizations
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));
CREATE POLICY "Owners and admins can update their organizations"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin_or_owner(id))
  WITH CHECK (public.is_org_admin_or_owner(id));

-- Organization Members
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

-- Brand Kits
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

-- Campaigns
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

-- Campaign Content
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

-- Campaign Assets
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

-- Design Exports
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

-- Lead Lists & Leads
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

-- Provider Settings & Usage
CREATE POLICY "Members can view provider settings"
  ON public.ai_provider_settings FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Members can view own usage"
  ON public.ai_generation_usage FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can view ai logs"
  ON public.ai_generation_logs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

-- Review Portal RLS
CREATE POLICY "Org members can view review links"
  ON public.campaign_review_links FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids()));

CREATE POLICY "Org members can create review links"
  ON public.campaign_review_links FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organization_ids())
    AND campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id = campaign_review_links.organization_id)
  );

CREATE POLICY "Org members can update review links"
  ON public.campaign_review_links FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids()))
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organization_ids())
    AND campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id = campaign_review_links.organization_id)
  );

CREATE POLICY "Org members can delete review links"
  ON public.campaign_review_links FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids()));

CREATE POLICY "Org members can view review versions"
  ON public.campaign_review_versions FOR SELECT TO authenticated
  USING (
    review_link_id IN (
      SELECT id FROM public.campaign_review_links
      WHERE organization_id IN (SELECT public.get_user_organization_ids())
    )
  );

CREATE POLICY "Org members can create review versions"
  ON public.campaign_review_versions FOR INSERT TO authenticated
  WITH CHECK (
    review_link_id IN (
      SELECT id FROM public.campaign_review_links
      WHERE organization_id IN (SELECT public.get_user_organization_ids())
    )
  );

CREATE POLICY "Org members can view review feedback"
  ON public.campaign_review_feedback FOR SELECT TO authenticated
  USING (
    review_link_id IN (
      SELECT id FROM public.campaign_review_links
      WHERE organization_id IN (SELECT public.get_user_organization_ids())
    )
  );

-- Grants on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
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

GRANT SELECT ON public.ai_provider_settings, public.ai_generation_usage, public.ai_generation_logs TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. ATOMIC REVIEW PORTAL SECURITY DEFINER RPCS
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
  IF auth.uid() IS NOT NULL AND NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: user is not a member of organization %', p_organization_id;
  END IF;

  SELECT * INTO v_campaign
  FROM public.campaigns
  WHERE id = p_campaign_id AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign % does not belong to organization %', p_campaign_id, p_organization_id;
  END IF;

  v_allow_comments := COALESCE((p_permissions->>'allowComments')::boolean, (p_permissions->>'allow_comments')::boolean, true);
  v_allow_selection := COALESCE((p_permissions->>'allowSelection')::boolean, (p_permissions->>'allow_selection')::boolean, true);
  v_allow_approval := COALESCE((p_permissions->>'allowApproval')::boolean, (p_permissions->>'allow_approval')::boolean, true);
  v_allow_downloads := COALESCE((p_permissions->>'allowDownloads')::boolean, (p_permissions->>'allow_downloads')::boolean, false);
  v_created_at := timezone('utc'::text, now());

  UPDATE public.campaign_review_links
  SET is_active = false, updated_at = v_created_at
  WHERE organization_id = p_organization_id AND campaign_id = p_campaign_id AND is_active = true;

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
  IF auth.uid() IS NOT NULL AND NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: user is not a member of organization %', p_organization_id;
  END IF;

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

CREATE OR REPLACE FUNCTION public.get_public_review_snapshot(
  p_raw_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, extensions, pg_temp
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

  v_token_hash := encode(extensions.digest(TRIM(p_raw_token)::text, 'sha256'::text), 'hex');

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

  SELECT * INTO v_version
  FROM public.campaign_review_versions
  WHERE review_link_id = v_link.id
  ORDER BY version_number DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_version', 'error', 'No published review package is available.');
  END IF;

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
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_token_hash TEXT;
  v_link RECORD;
  v_version RECORD;
  v_feedback_id UUID;
  v_sanitized_status TEXT;
  v_sanitized_name TEXT;
  v_sanitized_comment TEXT;
  v_sanitized_variant TEXT;
  v_updated_at TIMESTAMPTZ;
  v_is_valid_material BOOLEAN := false;
  v_is_valid_variant BOOLEAN := false;
  v_is_graphic BOOLEAN := false;
  v_snapshot JSONB;
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

  IF p_material_key IS NULL OR LENGTH(p_material_key) > 64 OR TRIM(p_material_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or missing material key.');
  END IF;

  IF LOWER(TRIM(p_material_key)) = 'campaign_overall' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign overall approval must be submitted through the dedicated approval endpoint.');
  END IF;

  IF p_variant_key IS NOT NULL AND (LENGTH(p_variant_key) > 64 OR TRIM(p_variant_key) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid variant key.');
  END IF;

  -- Material check
  IF p_material_key = 'presentation' THEN
    IF (v_snapshot ? 'presentation') AND v_snapshot->'presentation' IS NOT NULL AND v_snapshot->'presentation' != 'null'::jsonb THEN
      v_is_valid_material := true;
      IF p_variant_key IS NOT NULL AND TRIM(p_variant_key) <> '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Variants are not supported for presentation material.');
      END IF;
    END IF;
  END IF;

  IF NOT v_is_valid_material AND (p_material_key = 'video_script' OR p_material_key = 'copy_video_script') THEN
    IF (v_snapshot ? 'videoScript') AND v_snapshot->'videoScript' IS NOT NULL AND v_snapshot->'videoScript' != 'null'::jsonb THEN
      v_is_valid_material := true;
      IF p_variant_key IS NOT NULL AND TRIM(p_variant_key) <> '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Variants are not supported for video script.');
      END IF;
    END IF;
  END IF;

  IF NOT v_is_valid_material AND (p_material_key = 'email_newsletter' OR p_material_key = 'copy_email') THEN
    IF (v_snapshot ? 'emailNewsletter') AND v_snapshot->'emailNewsletter' IS NOT NULL AND v_snapshot->'emailNewsletter' != 'null'::jsonb THEN
      v_is_valid_material := true;
      IF p_variant_key IS NOT NULL AND TRIM(p_variant_key) <> '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Variants are not supported for email newsletter.');
      END IF;
    END IF;
  END IF;

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

  IF NOT v_is_valid_material AND (v_snapshot ? 'graphicMaterials') AND jsonb_typeof(v_snapshot->'graphicMaterials') = 'array' THEN
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_snapshot->'graphicMaterials') AS gm
      WHERE gm->>'id' = p_material_key
    ) INTO v_is_valid_material;

    IF v_is_valid_material THEN
      v_is_graphic := true;
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

  v_sanitized_status := LOWER(TRIM(p_status));
  IF v_sanitized_status NOT IN ('not_reviewed', 'preferred', 'approved', 'needs_changes') THEN
    v_sanitized_status := 'preferred';
  END IF;

  IF v_is_graphic AND v_sanitized_status = 'preferred' THEN
    IF p_variant_key IS NULL OR TRIM(p_variant_key) = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Preferred status for graphic materials requires a valid variant key.');
    END IF;
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

  v_sanitized_name := SUBSTRING(TRIM(COALESCE(NULLIF(TRIM(p_reviewer_name), ''), 'Reviewer')) FROM 1 FOR 100);
  v_sanitized_comment := SUBSTRING(TRIM(COALESCE(p_comment, '')) FROM 1 FOR 2000);
  v_sanitized_variant := NULLIF(TRIM(p_variant_key), '');
  v_updated_at := timezone('utc'::text, now());

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
    v_sanitized_variant,
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

  RETURN jsonb_build_object(
    'success', true,
    'feedback', jsonb_build_object(
      'id', v_feedback_id,
      'material_key', p_material_key,
      'variant_key', v_sanitized_variant,
      'status', v_sanitized_status,
      'comment', CASE WHEN v_sanitized_comment = '' THEN NULL ELSE v_sanitized_comment END,
      'reviewer_name', v_sanitized_name,
      'updated_at', v_updated_at
    )
  );
END;
$$;

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

  v_sanitized_status := LOWER(TRIM(p_status));
  IF v_sanitized_status NOT IN ('approved', 'needs_changes') THEN
    v_sanitized_status := 'approved';
  END IF;

  v_sanitized_name := SUBSTRING(TRIM(COALESCE(NULLIF(TRIM(p_reviewer_name), ''), 'Reviewer')) FROM 1 FOR 100);
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

REVOKE ALL ON FUNCTION public.get_public_review_snapshot(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_review_snapshot(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_public_review_feedback(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_review_feedback(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_public_campaign_approval(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_campaign_approval(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_campaign_review_link_atomic(UUID, UUID, TEXT, JSONB, JSONB, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_campaign_review_link_atomic(UUID, UUID, TEXT, JSONB, JSONB, TIMESTAMPTZ, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.publish_campaign_review_version_atomic(UUID, UUID, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_campaign_review_version_atomic(UUID, UUID, JSONB, TEXT, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 8. USER SIGNUP TRIGGER (NEUTRAL INITIAL PROVISIONING)
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
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    company_name = EXCLUDED.company_name,
    updated_at = now();

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 9. STORAGE BUCKETS AND STORAGE RLS POLICIES
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('brand-assets', 'brand-assets', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
  ('property-media', 'property-media', false, 26214400, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('campaign-assets', 'campaign-assets', false, 26214400, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('campaign-exports', 'campaign-exports', false, 52428800, ARRAY['image/png', 'image/jpeg', 'application/pdf', 'application/zip'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

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

-- Storage policies
DROP POLICY IF EXISTS "Org members can read private brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload private brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update private brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete private brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can read private property-media" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload private property-media" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update private property-media" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete private property-media" ON storage.objects;
DROP POLICY IF EXISTS "Org members can read private campaign-assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload private campaign-assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update private campaign-assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete private campaign-assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can read private campaign-exports" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload private campaign-exports" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update private campaign-exports" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete private campaign-exports" ON storage.objects;

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
