-- ==============================================================================
-- Migration: 20260820100000_initial_schema.sql
-- Description: Initial Normalized Schema for Zaw Marketing Studio
-- Tables: profiles, organizations, organization_members, brand_kits, campaigns,
--         campaign_content, campaign_assets, design_exports, lead_lists, leads,
--         ai_generation_logs
-- Security: Row Level Security (RLS) on all tables with Security Definer helpers
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Authenticated User Profile)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. ORGANIZATIONS & MEMBERSHIP (Multi-tenant Workspace)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(organization_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 3. BRAND KITS (Firm Identity, Typography, Colors, Compliance)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_kits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  company_name TEXT NOT NULL,
  tagline TEXT,
  logo_url TEXT,
  logo_dark_url TEXT,
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 4. CAMPAIGNS (Property Marketing & Investment Campaigns)
-- ------------------------------------------------------------------------------
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 5. CAMPAIGN CONTENT (Multi-platform Copy, Headlines, Video Scripts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('all_package', 'headline', 'cta', 'facebook', 'instagram', 'linkedin', 'email', 'video_script', 'strategy')),
  platform TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_accepted BOOLEAN NOT NULL DEFAULT true,
  quality_report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 6. CAMPAIGN ASSETS (Photos, Concept Renders, Uploaded Media)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL DEFAULT 'property_photo' CHECK (asset_type IN ('hero_photo', 'property_photo', 'ai_concept', 'rendered_graphic', 'pdf_flyer')),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  width INTEGER,
  height INTEGER,
  aspect_ratio TEXT DEFAULT '4:3',
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'gemini', 'nvidia', 'rendered_template', 'sample')),
  is_hero BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 7. DESIGN EXPORTS (Final Rendered Social Graphics & Printable Flyers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.design_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_family TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  storage_path TEXT,
  public_url TEXT,
  format TEXT NOT NULL CHECK (format IN ('png', 'jpeg', 'pdf', 'zip')),
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 8. LEAD LISTS & LEADS (Public Business Investor Discovery)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  metro_area TEXT NOT NULL,
  target_category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
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

-- ------------------------------------------------------------------------------
-- 9. AI GENERATION LOGS (Operation Auditing & Diagnostics)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 10. INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON public.campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaign_content_campaign_id ON public.campaign_content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_campaign_id ON public.campaign_assets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_design_exports_campaign_id ON public.design_exports(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_id ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_list_id ON public.leads(list_id);
CREATE INDEX IF NOT EXISTS idx_brand_kits_org_id ON public.brand_kits(organization_id);

-- ------------------------------------------------------------------------------
-- 11. SECURITY DEFINER HELPER FUNCTIONS FOR RLS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = check_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_ids(check_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = check_user_id;
$$;

-- ------------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
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
ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Organizations: Members can view their organizations
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "Owners and admins can update their organizations"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Organization Members: Members can view fellow members in their org
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "Admins can manage org members"
  ON public.organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Brand Kits: Org members can view and manage brand kits
CREATE POLICY "Org members can view brand kits"
  ON public.brand_kits FOR SELECT
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can insert brand kits"
  ON public.brand_kits FOR INSERT
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can update brand kits"
  ON public.brand_kits FOR UPDATE
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can delete brand kits"
  ON public.brand_kits FOR DELETE
  USING (public.is_org_member(organization_id, auth.uid()));

-- Campaigns: Org members can view and manage campaigns
CREATE POLICY "Org members can view campaigns"
  ON public.campaigns FOR SELECT
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can insert campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can update campaigns"
  ON public.campaigns FOR UPDATE
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can delete campaigns"
  ON public.campaigns FOR DELETE
  USING (public.is_org_member(organization_id, auth.uid()));

-- Campaign Content: Org members can view and manage content
CREATE POLICY "Org members can view campaign content"
  ON public.campaign_content FOR SELECT
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can insert campaign content"
  ON public.campaign_content FOR INSERT
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can update campaign content"
  ON public.campaign_content FOR UPDATE
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can delete campaign content"
  ON public.campaign_content FOR DELETE
  USING (public.is_org_member(organization_id, auth.uid()));

-- Campaign Assets: Org members can view and manage assets
CREATE POLICY "Org members can view campaign assets"
  ON public.campaign_assets FOR SELECT
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can insert campaign assets"
  ON public.campaign_assets FOR INSERT
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can delete campaign assets"
  ON public.campaign_assets FOR DELETE
  USING (public.is_org_member(organization_id, auth.uid()));

-- Design Exports: Org members can view and manage exports
CREATE POLICY "Org members can view design exports"
  ON public.design_exports FOR SELECT
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can insert design exports"
  ON public.design_exports FOR INSERT
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));

-- Lead Lists & Leads: Org members can view and manage leads
CREATE POLICY "Org members can view lead lists"
  ON public.lead_lists FOR SELECT
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can manage lead lists"
  ON public.lead_lists FOR ALL
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can view leads"
  ON public.leads FOR SELECT
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can manage leads"
  ON public.leads FOR ALL
  USING (public.is_org_member(organization_id, auth.uid()));

-- AI Generation Logs: Org members can view logs
CREATE POLICY "Org members can view ai logs"
  ON public.ai_generation_logs FOR SELECT
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Authenticated users can insert ai logs"
  ON public.ai_generation_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ------------------------------------------------------------------------------
-- 13. AUTO-PROVISIONING TRIGGER (On auth.users Signup)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
  org_slug TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  org_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substring(NEW.id::text, 1, 6);

  -- 1. Create Profile
  INSERT INTO public.profiles (id, display_name, company_name)
  VALUES (NEW.id, user_name, COALESCE(NEW.raw_user_meta_data->>'company_name', 'Apex Capital & Acquisitions'));

  -- 2. Create Default Organization
  INSERT INTO public.organizations (name, slug)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', user_name || ' Workspace'), org_slug)
  RETURNING id INTO new_org_id;

  -- 3. Add User as Owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- 4. Create Default Brand Kit
  INSERT INTO public.brand_kits (
    organization_id,
    is_default,
    company_name,
    tagline,
    website,
    phone,
    email,
    license_number
  ) VALUES (
    new_org_id,
    true,
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Apex Capital & Acquisitions'),
    'Institutional Quality Real Estate Investments & Value-Add Opportunities',
    'www.apexcapitalpartners.com',
    '(480) 555-0194',
    NEW.email,
    'AZ DRE #LC682019000'
  );

  RETURN NEW;
END;
$$;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
