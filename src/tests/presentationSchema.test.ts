import { describe, it, expect, vi } from 'vitest';
import {
  presentationDeckSchema,
  presentationThemeSchema,
  coverSlideSchema,
  executiveSummarySlideSchema,
  propertyOverviewSlideSchema,
  investmentThesisSlideSchema,
  statGridSlideSchema,
  bigNumberSlideSchema,
  financialSnapshotSlideSchema,
  marketContextSlideSchema,
  timelineSlideSchema,
  gallerySlideSchema,
  targetAudienceSlideSchema,
  marketingStrategySlideSchema,
  creativeShowcaseSlideSchema,
  videoConceptSlideSchema,
  comparisonSlideSchema,
  tableSlideSchema,
  riskDisclaimerSlideSchema,
  nextStepsSlideSchema,
} from '../features/presentations/schemas/presentationSchema';
import { PresentationDeck } from '../types/presentation';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';
import { mapBrandKitToPresentationTheme } from '../features/presentations/themes/presentationTheme';
import { validatePresentationDeck } from '../features/presentations/utils/validatePresentationDeck';
import { resolveFactValue } from '../features/presentations/utils/resolveFactValues';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { SupabaseFunctionsProvider, BackendGenerationError } from '../services/providers/supabaseFunctionsProvider';
import { supabase } from '../services/supabase/client';

describe('presentationSchema (Zod Validation, Contract Alignment & Security)', () => {
  const phoenixCampaign = SAMPLE_CAMPAIGNS.find((c) => c.id === 'campaign-phoenix-fix-flip')!;
  const validTheme = mapBrandKitToPresentationTheme(DEFAULT_BRAND_KIT, 'dark');

  const createValidDeck = (): PresentationDeck => ({
    schemaVersion: '1.0.0',
    id: 'deck-test-1',
    campaignId: 'campaign-test',
    title: 'Acquisition Brief',
    subtitle: 'Value-Add Single Family Flip',
    generatedAt: new Date().toISOString(),
    isDemo: true,
    theme: validTheme,
    slides: [
      {
        id: 'slide-1',
        type: 'cover',
        navLabel: 'Cover',
        kicker: 'Opportunity',
        title: 'Phoenix Value-Add Opportunity',
        subtitle: 'High-Yield Residential Flip',
        foot: 'Confidential Memo',
        speakerNotes: 'Welcome investors.',
      },
      {
        id: 'slide-2',
        type: 'stat_grid',
        navLabel: 'Metrics',
        kicker: 'Financial Snapshot',
        title: 'Core Deal Metrics',
        stats: [
          { label: 'Purchase Basis', value: '$285,000', factKey: 'purchase_price' },
          { label: 'Renovation Budget', value: '$35,000', factKey: 'renovation_estimate' },
        ],
      },
    ],
  });

  const createComprehensiveLiveDeck = (): PresentationDeck => ({
    schemaVersion: '1.0.0',
    id: 'deck-live-ai-001',
    campaignId: phoenixCampaign.id,
    title: 'Institutional Investment Memorandum',
    subtitle: 'High-Yield Residential Value-Add Opportunity',
    generatedAt: '2026-08-20T12:00:00.000Z',
    isDemo: false,
    theme: validTheme,
    slides: [
      {
        id: 's-1-cover',
        type: 'cover',
        navLabel: 'Cover',
        kicker: 'Acquisition Memorandum',
        title: '4421 E Cambridge Ave',
        subtitle: 'Turnkey Value-Add Single Family Investment',
        foot: 'Confidential Investor Briefing',
        imageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
        speakerNotes: 'Welcome investors to the underwriting presentation.',
      },
      {
        id: 's-2-summary',
        type: 'executive_summary',
        navLabel: 'Summary',
        kicker: 'Executive Summary',
        title: 'High-Velocity Value-Add in Prime Corridor',
        summary: 'Acquisition of single-family asset at $155/SF in a submarket where renovated inventory trades at $212+/SF.',
        highlights: [
          'Acquisition basis secured at $285,000',
          'Conservative $35,000 cosmetic renovation budget',
          'Projected ARV of $390,000 backed by recent closed comps',
          'Estimated $70,000 gross equity spread (21.9% on cost)',
        ],
        speakerNotes: 'Emphasize the margin of safety and speed of cosmetic execution.',
      },
      {
        id: 's-3-property',
        type: 'property_overview',
        navLabel: 'Property',
        kicker: 'Asset Specifications',
        title: 'Physical & Location Specifications',
        address: '4421 E Cambridge Ave',
        city: 'Phoenix',
        state: 'AZ',
        zipCode: '85008',
        propertyType: 'single_family',
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1840,
        yearBuilt: 1978,
        highlights: ['Solid block construction', 'Permitted 2-car garage', 'Low-maintenance desert landscaping'],
      },
      {
        id: 's-4-thesis',
        type: 'investment_thesis',
        navLabel: 'Thesis',
        kicker: 'Strategic Thesis',
        title: 'Cosmetic Repositioning & Arbitrage',
        thesis: 'Targeted aesthetic modernization capturing substantial price-per-square-foot expansion without structural or zoning risk.',
        pillars: [
          'Entry basis at deep discount to median submarket replacement cost',
          'Strict cosmetic-only scope preventing contractor overruns',
          'Sub-25 day average market velocity for renovated 3-bed product',
        ],
      },
      {
        id: 's-5-financials',
        type: 'financial_snapshot',
        navLabel: 'Financials',
        kicker: 'Underwriting Economics',
        title: 'Project Pro Forma & Capital Breakdown',
        metrics: [
          { label: 'Purchase Price', value: '$285,000', factKey: 'purchase_price' },
          { label: 'Renovation Budget', value: '$35,000', factKey: 'renovation_estimate' },
          { label: 'All-In Basis', value: '$320,000', factKey: 'all_in_basis' },
          { label: 'Projected ARV', value: '$390,000', factKey: 'arv' },
          { label: 'Gross Spread', value: '$70,000', factKey: 'gross_spread', highlight: true },
          { label: 'Spread on Cost', value: '21.9%', factKey: 'gross_spread_percent_on_cost', highlight: true },
        ],
        disclosures: [
          'Underwriting excludes debt financing fees and closing costs.',
          'ARV estimate based on trailing 60-day closed comps within 0.75-mile radius.',
        ],
      },
      {
        id: 's-6-marketing',
        type: 'marketing_strategy',
        navLabel: 'Marketing',
        kicker: 'Syndication Strategy',
        title: 'Omnichannel Buyer & Investor Outreach',
        coreAngle: 'Prime Phoenix Value-Add with $70,000 Documented Spread',
        hooks: [
          'Secured at $155/SF vs $212/SF renovated comps',
          'Cosmetic-only renovation with 60-day capital return',
          'Turnkey owner-occupant or rental exit',
        ],
        platforms: ['linkedin', 'instagram', 'facebook', 'email'],
        cta: 'Request Full Underwriting Pro Forma',
      },
      {
        id: 's-7-video',
        type: 'video_concept',
        navLabel: 'Video',
        kicker: 'Short-Form Video',
        title: '60-Second Vertical Walkthrough Plan',
        hook: 'How we found a $70,000 spread in Phoenix without touching a single load-bearing wall.',
        durationSeconds: 58,
        scenes: [
          { timeframe: '0:00-0:05', visualDirection: 'Front facade establishing shot', spokenAudio: 'This Phoenix 3-bed was secured at $285k.' },
          { timeframe: '0:05-0:25', visualDirection: 'Kitchen walkthrough and finishes', spokenAudio: 'Our $35k cosmetic update refreshes cabinets, counters, and flooring.' },
          { timeframe: '0:25-0:58', visualDirection: 'Closing shot with CTA banner', spokenAudio: 'Tap the link or comment DEAL for the pro forma.' },
        ],
        cta: 'Comment DEAL for Complete Packet',
      },
      {
        id: 's-8-disclaimer',
        type: 'risk_disclaimer',
        navLabel: 'Disclosures',
        kicker: 'Risk Notice',
        title: 'Underwriting Disclaimers & Disclosures',
        disclaimerText: 'All pro forma figures and valuation projections are subject to market conditions and physical diligence.',
        additionalCaveats: ['Not an offer of securities.', 'Independent inspection recommended.'],
      },
      {
        id: 's-9-next-steps',
        type: 'next_steps',
        navLabel: 'Next Steps',
        kicker: 'Action',
        title: 'Request Complete Due Diligence File',
        ctaText: 'Contact our acquisitions desk to reserve allocation.',
        contactInfo: {
          name: 'Acquisitions Team',
          company: 'Zaw Capital Partners',
          email: 'deals@zawcapital.com',
          phone: '(602) 555-0199',
          website: 'https://zawcapital.com',
          licenseNumber: 'AZ-DRE-992100',
        },
      },
    ],
    generationMetadata: {
      requestedModel: 'gemini-3.5-flash-lite',
      actualModel: 'gemini-3.5-flash-lite',
      fallbackOccurred: false,
      latencyMs: 1420,
      timestamp: '2026-08-20T12:00:00.000Z',
    },
  });

  it('successfully validates a well-formed presentation deck', () => {
    const deck = createValidDeck();
    const result = presentationDeckSchema.safeParse(deck);
    expect(result.success).toBe(true);
  });

  it('rejects raw HTML/script tags in slide title to prevent XSS', () => {
    const deck = createValidDeck();
    deck.slides[0] = {
      ...deck.slides[0],
      title: 'Malicious <script>alert("xss")</script> Title',
    };
    const result = presentationDeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it('rejects decks with duplicate slide IDs', () => {
    const deck = createValidDeck();
    deck.slides[1].id = deck.slides[0].id;
    const result = presentationDeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it('rejects decks with empty slide arrays', () => {
    const deck = createValidDeck();
    deck.slides = [];
    const result = presentationDeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it('rejects unrecognized slide types', () => {
    const deck = createValidDeck();
    (deck.slides[0] as unknown as { type: string }).type = 'unknown_invalid_type';
    const result = presentationDeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  // Targeted contract tests
  it('verifies that server flat theme schema matches frontend presentationThemeSchema exactly', () => {
    const parseResult = presentationThemeSchema.safeParse(validTheme);
    expect(parseResult.success).toBe(true);

    const requiredKeys = [
      'name', 'bg', 'bgGrad1', 'bgGrad2', 'surface', 'surface2',
      'fg', 'fgMuted', 'fgFaint', 'hair', 'hair2', 'primary',
      'accent', 'accentInk', 'radius', 'radiusSm', 'radiusLg',
      'fontHead', 'fontBody', 'fontMono', 'colorScheme',
    ];
    for (const key of requiredKeys) {
      expect(validTheme).toHaveProperty(key);
    }
  });

  it('validates that a comprehensive live-AI style deck passes presentationDeckSchema', () => {
    const deck = createComprehensiveLiveDeck();
    const result = presentationDeckSchema.safeParse(deck);
    expect(result.success).toBe(true);
  });

  it('rejects the old nested theme format (mode, colors, typography, radii)', () => {
    const oldNestedTheme = {
      mode: 'dark',
      colors: {
        background: '#090e17',
        surface: 'rgba(255,255,255,0.05)',
        surfaceHighlight: 'rgba(255,255,255,0.1)',
        foreground: '#ffffff',
        foregroundMuted: '#94a3b8',
        foregroundFaint: '#64748b',
        border: 'rgba(255,255,255,0.1)',
        borderFaint: 'rgba(255,255,255,0.05)',
        primary: '#c85a32',
        accentGradient: 'linear-gradient(125deg, #c85a32, #1b3b2b)',
        accentText: '#060d13',
      },
      typography: {
        headingFont: 'Playfair Display',
        bodyFont: 'Inter',
        monoFont: 'JetBrains Mono',
      },
      radii: {
        sm: '8px',
        md: '16px',
        lg: '24px',
      },
    };

    expect(presentationThemeSchema.safeParse(oldNestedTheme).success).toBe(false);

    const deck = createComprehensiveLiveDeck();
    (deck as unknown as { theme: unknown }).theme = oldNestedTheme;
    expect(presentationDeckSchema.safeParse(deck).success).toBe(false);
  });

  it('rejects slides missing required title', () => {
    const deck = createComprehensiveLiveDeck();
    const invalidSlide = { ...deck.slides[0] };
    delete (invalidSlide as Record<string, unknown>).title;
    deck.slides[0] = invalidSlide as any;

    expect(presentationDeckSchema.safeParse(deck).success).toBe(false);
  });

  it('rejects slides missing required type-specific fields across variants', () => {
    expect(coverSlideSchema.safeParse({ id: 's', type: 'cover' }).success).toBe(false);
    expect(executiveSummarySlideSchema.safeParse({ id: 's', type: 'executive_summary', title: 'T', summary: 'S' }).success).toBe(false);
    expect(propertyOverviewSlideSchema.safeParse({ id: 's', type: 'property_overview', title: 'T', city: 'C', state: 'S', propertyType: 'single_family', highlights: ['H'] }).success).toBe(false);
    expect(investmentThesisSlideSchema.safeParse({ id: 's', type: 'investment_thesis', title: 'T', thesis: 'Th' }).success).toBe(false);
    expect(statGridSlideSchema.safeParse({ id: 's', type: 'stat_grid', title: 'T' }).success).toBe(false);
    expect(bigNumberSlideSchema.safeParse({ id: 's', type: 'big_number', title: 'T', value: 'V' }).success).toBe(false);
    expect(financialSnapshotSlideSchema.safeParse({ id: 's', type: 'financial_snapshot', title: 'T' }).success).toBe(false);
    expect(marketContextSlideSchema.safeParse({ id: 's', type: 'market_context', title: 'T', submarket: 'M' }).success).toBe(false);
    expect(timelineSlideSchema.safeParse({ id: 's', type: 'timeline', title: 'T' }).success).toBe(false);
    expect(gallerySlideSchema.safeParse({ id: 's', type: 'gallery', title: 'T', layout: 'bento' }).success).toBe(false);
    expect(targetAudienceSlideSchema.safeParse({ id: 's', type: 'target_audience', title: 'T', audienceName: 'A', description: 'D' }).success).toBe(false);
    expect(marketingStrategySlideSchema.safeParse({ id: 's', type: 'marketing_strategy', title: 'T', coreAngle: 'A', hooks: ['H'], platforms: ['linkedin'] }).success).toBe(false);
    expect(creativeShowcaseSlideSchema.safeParse({ id: 's', type: 'creative_showcase', title: 'T' }).success).toBe(false);
    expect(videoConceptSlideSchema.safeParse({ id: 's', type: 'video_concept', title: 'T', hook: 'H', durationSeconds: 60 }).success).toBe(false);
    expect(comparisonSlideSchema.safeParse({ id: 's', type: 'comparison', title: 'T', rows: [] }).success).toBe(false);
    expect(tableSlideSchema.safeParse({ id: 's', type: 'table', title: 'T', columns: ['C'] }).success).toBe(false);
    expect(riskDisclaimerSlideSchema.safeParse({ id: 's', type: 'risk_disclaimer', title: 'T' }).success).toBe(false);
    expect(nextStepsSlideSchema.safeParse({ id: 's', type: 'next_steps', title: 'T', ctaText: 'CTA' }).success).toBe(false);
  });

  it('validates financial_snapshot slide with canonical metrics and disclosures', () => {
    const finSlide = {
      id: 's-fin',
      type: 'financial_snapshot',
      title: 'Financial Underwriting',
      metrics: [
        { label: 'Purchase Price', value: '$285,000', factKey: 'purchase_price' },
        { label: 'Renovation Budget', value: '$35,000', factKey: 'renovation_estimate' },
        { label: 'All-In Basis', value: '$320,000', factKey: 'all_in_basis' },
        { label: 'Projected ARV', value: '$390,000', factKey: 'arv' },
        { label: 'Gross Spread', value: '$70,000', factKey: 'gross_spread', highlight: true },
      ],
      disclosures: ['All projections subject to physical inspection.'],
    };

    expect(financialSnapshotSlideSchema.safeParse(finSlide).success).toBe(true);
  });

  it('flags unverified fact keys during presentation validation and resolves verified facts', () => {
    expect(resolveFactValue('purchase_price', phoenixCampaign)).toBe('$285,000');
    expect(resolveFactValue('renovation_estimate', phoenixCampaign)).toBe('$35,000');
    expect(resolveFactValue('all_in_basis', phoenixCampaign)).toBe('$320,000');
    expect(resolveFactValue('arv', phoenixCampaign)).toBe('$390,000');
    expect(resolveFactValue('gross_spread', phoenixCampaign)).toBe('$70,000');
    expect(resolveFactValue('unsupported_invented_key', phoenixCampaign)).toBeNull();

    const deck = createComprehensiveLiveDeck();
    const finSlide = deck.slides.find((s) => s.type === 'financial_snapshot') as any;
    finSlide.metrics.push({
      label: 'Fabricated Yield',
      value: '45.0%',
      factKey: 'fabricated_hallucinated_yield_key',
    });

    const report = validatePresentationDeck(deck, phoenixCampaign);
    expect(report.warnings.some((w) => w.includes('fabricated_hallucinated_yield_key'))).toBe(true);
    expect(report.score).toBeLessThan(100);
  });

  it('live provider (SupabaseFunctionsProvider) rejects malformed Edge output with BackendGenerationError', async () => {
    const provider = new SupabaseFunctionsProvider();
    vi.spyOn(provider, 'isConfigured').mockReturnValue(true);

    const functionsSpy = vi.spyOn(supabase, 'functions', 'get').mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        data: {
          presentation: {
            schemaVersion: '1.0.0',
            id: 'deck-bad',
            campaignId: 'camp-1',
            title: 'Bad Deck',
            generatedAt: new Date().toISOString(),
            theme: validTheme,
            slides: [],
          },
        },
        error: null,
      }),
    } as any);

    await expect(
      provider.generatePresentationDeck(phoenixCampaign, DEFAULT_BRAND_KIT)
    ).rejects.toThrow(BackendGenerationError);

    functionsSpy.mockRestore();
  });

  it('validates a realistic live Gemini server response payload end-to-end through provider parser', async () => {
    const provider = new SupabaseFunctionsProvider();
    vi.spyOn(provider, 'isConfigured').mockReturnValue(true);

    const realisticServerPayload = {
      presentation: createComprehensiveLiveDeck(),
      metadata: {
        requestedModel: 'gemini-3.5-flash-lite',
        actualModel: 'gemini-3.5-flash-lite',
        fallbackOccurred: false,
        latencyMs: 980,
        timestamp: new Date().toISOString(),
      },
      model: 'gemini-3.5-flash-lite',
      provenance: 'generated',
    };

    const functionsSpy = vi.spyOn(supabase, 'functions', 'get').mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        data: realisticServerPayload,
        error: null,
      }),
    } as any);

    const generatedDeck = await provider.generatePresentationDeck(phoenixCampaign, DEFAULT_BRAND_KIT);
    expect(generatedDeck).toBeDefined();
    expect(generatedDeck.schemaVersion).toBe('1.0.0');
    expect(generatedDeck.slides.length).toBe(9);
    expect(generatedDeck.generationMetadata?.requestedModel).toBe('gemini-3.5-flash-lite');

    functionsSpy.mockRestore();
  });
});

