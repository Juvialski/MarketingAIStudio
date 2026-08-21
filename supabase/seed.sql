-- ==============================================================================
-- Seed: supabase/seed.sql
-- Description: Fictional Demonstration Data for Apex Capital & Acquisitions
-- Includes: Demo Organization, Default Brand Kit, 2 Full Campaigns, and Lead Lists
-- ==============================================================================

DO $$
DECLARE
  demo_org_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
  demo_brand_kit_id UUID := 'b0000000-0000-0000-0000-000000000001'::uuid;
  demo_camp_1_id UUID := 'c0000000-0000-0000-0000-000000000001'::uuid;
  demo_camp_2_id UUID := 'c0000000-0000-0000-0000-000000000002'::uuid;
  demo_lead_list_id UUID := 'd0000000-0000-0000-0000-000000000001'::uuid;
BEGIN

  -- 1. Insert Demo Organization
  INSERT INTO public.organizations (id, name, slug)
  VALUES (demo_org_id, 'Apex Capital Partners', 'apex-capital-partners')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- 2. Insert Default Brand Kit
  INSERT INTO public.brand_kits (
    id,
    organization_id,
    is_default,
    company_name,
    tagline,
    website,
    phone,
    email,
    license_number,
    colors,
    typography,
    tone_of_voice,
    target_audience_default,
    preferred_cta,
    required_disclaimer,
    forbidden_words,
    image_style_preference
  ) VALUES (
    demo_brand_kit_id,
    demo_org_id,
    true,
    'Apex Capital & Acquisitions',
    'Institutional Quality Real Estate Investments & Value-Add Opportunities',
    'www.apexcapitalpartners.com',
    '(480) 555-0194',
    'acquisitions@apexcapitalpartners.com',
    'AZ DRE #LC682019000',
    '{
      "primary": "#0f172a",
      "secondary": "#1b3b2b",
      "accent": "#c85a32",
      "backgroundLight": "#fdfbf7",
      "backgroundDark": "#0a1128",
      "textPrimary": "#0f172a",
      "textMuted": "#64748b"
    }'::jsonb,
    '{
      "headlineFont": "Playfair Display",
      "bodyFont": "Inter",
      "monoFont": "JetBrains Mono",
      "familyPairing": "editorial_serif"
    }'::jsonb,
    'analytical_investor',
    'Accredited private equity real estate buyers and institutional fix-and-flip operators',
    'Request Detailed Underwriting Pro Forma',
    'All investments carry risk. Pro forma estimates, ARV projections, and renovation budgets are provided for underwriting analysis only and do not constitute guaranteed returns. Conduct independent due diligence.',
    ARRAY[
      'guaranteed returns',
      'get rich quick',
      'can’t lose',
      'game-changer',
      'nestled in the heart of',
      'unlock the secret',
      'hurry before it’s gone'
    ],
    'authentic_photos_first'
  ) ON CONFLICT (id) DO NOTHING;

  -- 3. Insert Campaign 1: Phoenix 3-Bed Fix & Flip
  INSERT INTO public.campaigns (
    id,
    organization_id,
    brand_kit_id,
    name,
    campaign_type,
    target_market,
    status,
    source_data,
    strategy,
    design_configs,
    tags
  ) VALUES (
    demo_camp_1_id,
    demo_org_id,
    demo_brand_kit_id,
    'Phoenix Value-Add 3-Bed ($285k Basis)',
    'fix_and_flip',
    'Phoenix, AZ (Arcadia Lite)',
    'completed',
    '{
      "campaignType": "fix_and_flip",
      "title": "Phoenix Value-Add 3-Bed ($285k Basis)",
      "targetMarket": "Phoenix, AZ (Arcadia Lite)",
      "uploadedImages": [
        {
          "id": "img-phx-1",
          "url": "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1600&q=80",
          "name": "Front Elevation",
          "source": "sample",
          "aspectRatio": 1.5,
          "isHero": true
        },
        {
          "id": "img-phx-2",
          "url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
          "name": "Living & Kitchen",
          "source": "sample",
          "aspectRatio": 1.5,
          "isHero": false
        }
      ],
      "selectedHeroImageId": "img-phx-1",
      "property": {
        "address": "4421 E Cambridge Ave",
        "city": "Phoenix",
        "state": "AZ",
        "zipCode": "85008",
        "neighborhood": "Arcadia Lite corridor",
        "propertyType": "single_family",
        "bedrooms": 3,
        "bathrooms": 2,
        "squareFeet": 1840,
        "lotSizeSqFt": 7200,
        "yearBuilt": 1978,
        "financials": {
          "purchasePrice": 285000,
          "renovationEstimate": 35000,
          "arv": 390000,
          "equitySpread": 70000,
          "projectedProfit": 70000,
          "cashRequired": 75000
        },
        "investmentThesis": "Off-market value-add single family acquisition in prime Phoenix submarket. Light cosmetic scope to modernize kitchen, bathrooms, and flooring with a 45-day turnaround.",
        "dealHighlights": [
          "Acquisition basis: $285,000 ($154.89/sqft) vs submarket median $211.95/sqft",
          "Cosmetic renovation scope: $35,000 (flooring, paint, quartz counters, bath updates)",
          "Conservative ARV: $390,000 supported by 3 recent closed neighborhood comps within 0.5 miles",
          "Gross equity margin: $70,000 (17.9% gross margin on total cost)"
        ]
      }
    }'::jsonb,
    '{
      "targetAudience": {
        "name": "Fix & Flip Operators & Private Capital Buyers",
        "painPoints": ["Overpaying for competitive on-market MLS deals", "Unexpected foundation/structural risk", "Compressed margin spreads"],
        "motivations": ["Predictable cosmetic rehab scope", "High submarket velocity (<30 DOM)", "Clear 15%+ margin on cost"]
      },
      "coreAngle": "Clear $70,000 gross margin on a light 45-day cosmetic renovation in Phoenix’s high-demand Arcadia Lite corridor.",
      "valueProposition": "Secured 27% below prevailing neighborhood comps with zero structural work required.",
      "keyHooks": [
        "$285,000 Acquisition Basis ($155/sqft in a $212/sqft median submarket)",
        "Underwritten $35,000 cosmetic scope with conservative $390,000 ARV comps",
        "Submarket liquidity: 24 average days on market for remodeled single family homes"
      ],
      "supportingEvidence": [
        "4438 E Cambridge closed at $395,000 (similar square footage)",
        "4210 E Thomas renovated comp closed at $410,000",
        "Roof and HVAC serviced and certified in 2023"
      ],
      "suggestedPlatforms": ["linkedin", "instagram", "facebook", "email", "video"]
    }'::jsonb,
    '{
      "square": { "aspectRatio": "square", "templateFamily": "editorial", "headline": "Phoenix Value-Add Single Family", "subtitle": "Arcadia Lite Corridor | $285,000 Basis", "activeMetricIds": ["purchase", "arv", "spread"], "imageZoom": 1.0, "imageCropY": 50, "showLogo": true, "showDisclaimer": true },
      "portrait": { "aspectRatio": "portrait", "templateFamily": "institutional", "headline": "Underwriting Brief: 4421 E Cambridge", "subtitle": "$70,000 Equity Spread | 17.9% Margin on Cost", "activeMetricIds": ["purchase", "arv", "spread", "reno"], "imageZoom": 1.0, "imageCropY": 50, "showLogo": true, "showDisclaimer": true },
      "story": { "aspectRatio": "story", "templateFamily": "direct_response", "headline": "$70k Value-Add Spread", "subtitle": "45-Day Cosmetic Turnaround", "activeMetricIds": ["purchase", "spread"], "imageZoom": 1.0, "imageCropY": 50, "showLogo": true, "showDisclaimer": true },
      "landscape": { "aspectRatio": "landscape", "templateFamily": "modern_brokerage", "headline": "Phoenix Single Family Value-Add", "subtitle": "Acquisition Basis: $285,000 | ARV: $390,000", "activeMetricIds": ["purchase", "arv", "spread"], "imageZoom": 1.0, "imageCropY": 50, "showLogo": true, "showDisclaimer": true },
      "flyer_letter": { "aspectRatio": "flyer_letter", "templateFamily": "institutional", "headline": "Investment Memorandum: 4421 E Cambridge Ave", "subtitle": "Single Family Value-Add Acquisition | Phoenix, AZ", "activeMetricIds": ["purchase", "arv", "spread", "reno"], "imageZoom": 1.0, "imageCropY": 50, "showLogo": true, "showDisclaimer": true },
      "flyer_a4": { "aspectRatio": "flyer_a4", "templateFamily": "institutional", "headline": "Investment Memorandum: 4421 E Cambridge Ave", "subtitle": "Single Family Value-Add Acquisition | Phoenix, AZ", "activeMetricIds": ["purchase", "arv", "spread", "reno"], "imageZoom": 1.0, "imageCropY": 50, "showLogo": true, "showDisclaimer": true }
    }'::jsonb,
    ARRAY['phoenix', 'fix-and-flip', 'value-add', 'single-family']
  ) ON CONFLICT (id) DO NOTHING;

  -- 4. Insert Lead List & Sample Leads
  INSERT INTO public.lead_lists (
    id,
    organization_id,
    name,
    metro_area,
    target_category
  ) VALUES (
    demo_lead_list_id,
    demo_org_id,
    'DFW & Phoenix Value-Add Operators',
    'Dallas-Fort Worth, TX & Phoenix, AZ',
    'real_estate_investors'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.leads (
    list_id,
    organization_id,
    company_name,
    category,
    website,
    metro_area,
    public_contact_email,
    public_phone,
    address_summary,
    estimated_portfolio_type,
    lead_score,
    relevance_reason,
    source_url,
    outreach_angle,
    status
  ) VALUES 
  (
    demo_lead_list_id,
    demo_org_id,
    'Lone Star Capital Acquisitions',
    'Multi-Family Value-Add Syndicator',
    'https://lonestarcapgroup.com',
    'Dallas-Fort Worth, TX',
    'acquisitions@lonestarcapgroup.com',
    '(214) 555-0182',
    '1400 Preston Rd, Plano, TX',
    'B/C class multi-family assets (50-200 units)',
    94,
    'Active buyer of value-add multi-family in North Texas with proven track record of executing interior unit modernizations.',
    'https://lonestarcapgroup.com/portfolio',
    '{
      "headline": "Underwritten Value-Add Multi-Family in DFW Corridor",
      "suggestedAngle": "Highlight in-place cash flow with immediate 22% rent upside via cosmetic interior renovations.",
      "bestAssetToSend": "Institutional Pro Forma Flyer (PDF)",
      "emailStarterDraft": "Hi Acquisitions Team at Lone Star Capital,\n\nWe underwrote an 8-unit value-add multi-family opportunity in the Dallas-Fort Worth corridor that matches your buy box: $1.15M purchase basis with a 9.4% stabilized cap rate upon cosmetic refresh.\n\nHappy to send over the underwriting model and rent roll summary if helpful.\n\nBest regards,\nApex Capital Partners"
    }'::jsonb,
    'new'
  ),
  (
    demo_lead_list_id,
    demo_org_id,
    'Desert Sun Residential Holdings',
    'Fix & Flip Investment Fund',
    'https://desertsunholdings.com',
    'Phoenix, AZ',
    'deals@desertsunholdings.com',
    '(602) 555-0143',
    '2400 E Camelback Rd, Phoenix, AZ',
    'Single Family Residential ($200k-$500k entry)',
    91,
    'High-volume residential buyer in Maricopa County specializing in 3-4 bedroom cosmetic renovations.',
    'https://desertsunholdings.com/criteria',
    '{
      "headline": "Off-Market $70k Spread in Arcadia Lite Corridor",
      "suggestedAngle": "Emphasize low DOM (24 days) and clean title with no structural capex needed.",
      "bestAssetToSend": "Executive One-Page Memorandum (PDF)",
      "emailStarterDraft": "Hi Acquisitions Team,\n\nWe have an off-market 3-bed residential opportunity in Arcadia Lite ($285k entry basis, $35k cosmetic scope, conservative $390k ARV backed by 3 closed comps).\n\nLet me know if you would like the full pro forma package.\n\nBest regards,\nApex Capital Partners"
    }'::jsonb,
    'new'
  ) ON CONFLICT DO NOTHING;

END $$;
