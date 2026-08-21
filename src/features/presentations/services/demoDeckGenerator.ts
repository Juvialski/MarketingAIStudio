import { Campaign } from '../../../types/campaign';
import { BrandKit, DEFAULT_BRAND_KIT } from '../../../types/brandKit';
import { PresentationDeck, PresentationSlide } from '../../../types/presentation';
import { mapBrandKitToPresentationTheme } from '../themes/presentationTheme';
import { buildCampaignFactLedger } from '../../../services/financials/campaignFactLedger';

export function generateDeterministicPresentationDeck(
  campaign: Campaign,
  brandKit: BrandKit = DEFAULT_BRAND_KIT
): PresentationDeck {
  const ledger = buildCampaignFactLedger(campaign);
  const fin = ledger.financials;
  const prop = campaign.sourceData.property;
  const isDemo = ledger.isDemo;

  const isPhoenixFixture = campaign.id === 'campaign-phoenix-fix-flip' || (isDemo && prop?.city === 'Phoenix');
  const isDallasFixture = campaign.id === 'campaign-dallas-multifamily' || (isDemo && prop?.city === 'Dallas');
  const isMultiFamily = prop?.propertyType === 'multi_family';

  const theme = mapBrandKitToPresentationTheme(brandKit, 'dark');
  const heroImage = campaign.sourceData.uploadedImages.find((img) => img.isHero)?.url ||
    campaign.sourceData.uploadedImages[0]?.url;
  const secondaryImage = campaign.sourceData.uploadedImages.find((img) => !img.isHero)?.url ||
    campaign.sourceData.uploadedImages[1]?.url;

  // Resolve comps: only use fixture comps if explicit fixture, otherwise omit if not provided in campaign
  const comps = isPhoenixFixture
    ? [
        { address: '4318 E Cambridge Ave', price: '$405,000', sqft: '$223.75/SF', notes: 'Renovated 3/2, closed in 18 DOM' },
        { address: '4502 E Montecito Ave', price: '$392,000', sqft: '$220.22/SF', notes: 'Standard cosmetic update, closed in 22 DOM' },
      ]
    : isDallasFixture
    ? [
        { address: '1814 Henderson Ave', price: '$1,620,000', sqft: '$202,500/door', notes: 'Renovated 8-unit, 5.8% cap rate' },
        { address: '2209 Greenville Ave', price: '$1,550,000', sqft: '$193,750/door', notes: 'Turnkey 8-unit, 6.1% cap rate' },
      ]
    : undefined;

  // Timeline items
  const timelineItems = isPhoenixFixture
    ? [
        { time: 'Week 1-2', title: 'Closing & Scope Mobilization', body: 'Close escrow, pull permits, mobilize trades and staging contractors.' },
        { time: 'Week 3-4', title: 'Interior & Exterior Renovation', body: 'Cabinet refinish, quartz counters, LVP flooring throughout, dual vanity bath upgrade, desert curb appeal.' },
        { time: 'Week 5-6', title: 'Staging, Photography & MLS Launch', body: 'Professional architectural capture, launch coordinated multi-platform marketing.' },
        { time: 'Week 7-8', title: 'Contract Execution & Disposition', body: 'Under contract to owner-occupant or cash buyer, closing and capital return (60-day turnaround).' },
      ]
    : isDallasFixture
    ? [
        { time: 'Month 1-2', title: 'Acquisition & Operational Takeover', body: 'Close escrow, transition property management, audit unit leases.' },
        { time: 'Month 3-6', title: 'Phased Interior Modernization', body: 'Renovate vacant units with modern quartz, stainless appliances, and LVP flooring.' },
        { time: 'Month 7-9', title: 'Lease-Up at Market Rates', body: 'Achieve projected $1,400/mo target rents across repositioned units.' },
        { time: 'Month 10-12', title: 'Stabilization & Refinance / Disposition', body: 'Stabilize at 9.4% cap rate on purchase (8.7% yield on total cost) for long-term cash flow or agency exit.' },
      ]
    : isMultiFamily
    ? [
        { time: 'Phase 1', title: 'Acquisition & Operational Audit', body: 'Complete closing, transition property management, and review in-place leases.' },
        { time: 'Phase 2', title: 'Capital Improvements & Unit Refresh', body: 'Execute phased value-add capital improvement program upon natural lease turns.' },
        { time: 'Phase 3', title: 'Lease-Up & Optimization', body: 'Lease repositioned units at market rates.' },
        { time: 'Phase 4', title: 'Stabilization & Value Realization', body: 'Achieve stabilized yield on total basis.' },
      ]
    : [
        { time: 'Phase 1', title: 'Closing & Mobilization', body: 'Close escrow, finalize permits, and mobilize contractor teams.' },
        { time: 'Phase 2', title: 'Renovation & Capital Improvements', body: 'Execute planned cosmetic and value-add updates.' },
        { time: 'Phase 3', title: 'Staging & Marketing Launch', body: 'Professional media capture and multi-channel marketing campaign launch.' },
        { time: 'Phase 4', title: 'Contract Execution & Disposition', body: 'Contract execution, escrow closing, and capital return.' },
      ];

  // Video scenes
  const videoScenes = campaign.copy?.videoScript.scenes && campaign.copy.videoScript.scenes.length > 0
    ? campaign.copy.videoScript.scenes
    : isPhoenixFixture
    ? [
        { timeframe: '0:00 - 0:05', visualDirection: 'Front elevation shot, pointing out exterior character and roof condition. Text overlay with price.', spokenAudio: 'This 3-bed home in Phoenix was just secured at $285,000. That’s $155 a square foot in a submarket where renovated comps are closing over $215.', onScreenText: '$285,000 Purchase | $155/SF' },
        { timeframe: '0:05 - 0:20', visualDirection: 'Walking through open living area into kitchen. Quick pans of solid cabinet boxes and floor layout.', spokenAudio: 'Here is the math: our renovation budget is $35,000. We are doing cosmetic-only updates—new quartz tops, cabinet refacing, LVP flooring, and bathroom modernization. No structural moves.', onScreenText: '$35K Cosmetic Renovation Budget' },
        { timeframe: '0:20 - 0:40', visualDirection: 'Show master bedroom and backyard space. Quick split screen showing the two recent comps.', spokenAudio: 'All-in basis is $320,000. Comps directly on this street closed at $392k and $405k within the last 60 days. That leaves a conservative $70,000 gross spread.', onScreenText: 'Comps: $392K & $405K | ARV: $390,000' },
        { timeframe: '0:40 - 0:58', visualDirection: 'Host to camera with property background. Clear CTA banner.', spokenAudio: 'With days on market under 25 days in this pocket, execution speed is everything. Tap the link in bio or comment DEAL to get the complete pro forma and contractor bid.', onScreenText: 'Comment "DEAL" for Full Pro Forma' },
      ]
    : isDallasFixture
    ? [
        { timeframe: '0:00 - 0:05', visualDirection: 'Exterior building shot with clean graphics displaying price and unit count.', spokenAudio: 'Here is an 8-unit multi-family property in East Dallas acquired at $1.15M. That’s just $143,000 per door.', onScreenText: '$1.15M Purchase | 8 Units ($143K/Door)' },
        { timeframe: '0:05 - 0:25', visualDirection: 'Interior shot of current unit followed by comparison graphic.', spokenAudio: 'All 8 units are 2-bedroom, 1-bath layouts currently rented at $1,050 a month. But renovated 2-beds on this exact corridor are leasing for $1,400 to $1,500.', onScreenText: 'Current Rent: $1,050/mo ➔ Comps: $1,400/mo (+$350/mo)' },
        { timeframe: '0:25 - 0:45', visualDirection: 'Financial summary card highlighting stabilized cap rate.', spokenAudio: 'With a modest $12,000 per door cosmetic update upon lease turnover, the gross rent increases by over $33,000 annually, pushing our stabilized cap rate to 9.4%.', onScreenText: '+$33,600/yr Gross Rent Upside | 9.4% Cap' },
        { timeframe: '0:45 - 0:55', visualDirection: 'Host closing with clear CTA.', spokenAudio: 'Comment CASHFLOW or tap the link in bio to get the full T-12 and underwriting file.', onScreenText: 'Comment "CASHFLOW" for Full Package' },
      ]
    : [
        { timeframe: '0:00 - 0:05', visualDirection: 'Property exterior and submarket establishing shot', spokenAudio: `Reviewing an underwritten acquisition opportunity in ${campaign.sourceData.targetMarket}.`, onScreenText: campaign.sourceData.title || campaign.name },
        { timeframe: '0:05 - 0:20', visualDirection: 'Interior walkthrough highlighting value-add opportunities', spokenAudio: 'Reviewing property layout, condition, and underwritten capital improvement plan.', onScreenText: 'Value-Add Scope Overview' },
        { timeframe: '0:20 - 0:40', visualDirection: 'Underwriting economics and market comparable review', spokenAudio: 'Analyzing financial metrics, acquisition basis, and projected returns.', onScreenText: 'Underwritten Deal Economics' },
        { timeframe: '0:40 - 0:58', visualDirection: 'Host to camera with contact details', spokenAudio: 'Contact our team or request the full due diligence package.', onScreenText: 'Request Investment Package' },
      ];

  const singleFamilyMetrics = [
    { label: 'Purchase Price', value: fin.purchasePrice ? '$' + fin.purchasePrice.toLocaleString() : (isPhoenixFixture ? '$285,000' : 'Not provided'), factKey: 'purchase_price' },
    { label: 'Renovation Budget', value: fin.renovationEstimate !== undefined ? '$' + fin.renovationEstimate.toLocaleString() : (isPhoenixFixture ? '$35,000' : 'Not provided'), factKey: 'renovation_estimate' },
    { label: 'All-In Project Basis', value: fin.allInBasis !== undefined ? '$' + fin.allInBasis.toLocaleString() : (isPhoenixFixture ? '$320,000' : 'Not provided'), factKey: 'all_in_basis' },
    { label: 'Projected ARV', value: fin.arv ? '$' + fin.arv.toLocaleString() : (isPhoenixFixture ? '$390,000' : 'Not provided'), factKey: 'arv' },
    { label: 'Projected Gross Spread', value: fin.grossSpread !== undefined ? '$' + fin.grossSpread.toLocaleString() : (isPhoenixFixture ? '$70,000' : 'Not provided'), factKey: 'gross_spread', highlight: true },
    { label: 'Gross Spread on Cost', value: fin.grossSpreadPercentOnCost !== undefined ? `${fin.grossSpreadPercentOnCost.toFixed(1)}%` : (isPhoenixFixture ? '21.9%' : 'Not provided'), factKey: 'gross_spread_percent_on_cost', highlight: true },
  ];

  const multiFamilyMetrics = [
    { label: 'Purchase Price', value: fin.purchasePrice ? '$' + fin.purchasePrice.toLocaleString() : (isDallasFixture ? '$1,150,000' : 'Not provided'), factKey: 'purchase_price' },
    { label: 'Renovation Budget', value: fin.renovationEstimate !== undefined ? '$' + fin.renovationEstimate.toLocaleString() : (isDallasFixture ? '$96,000' : 'Not provided'), factKey: 'renovation_estimate' },
    { label: 'All-In Project Basis', value: fin.allInBasis !== undefined ? '$' + fin.allInBasis.toLocaleString() : (isDallasFixture ? '$1,246,000' : 'Not provided'), factKey: 'all_in_basis' },
    { label: 'In-Place Cap Rate', value: fin.inPlaceCapRateOnPurchase ? `${fin.inPlaceCapRateOnPurchase.toFixed(1)}%` : (isDallasFixture ? '6.8%' : 'Not provided'), factKey: 'in_place_cap_rate' },
    { label: 'Stabilized Cap Rate (Purchase)', value: fin.stabilizedCapRateOnPurchase ? `${fin.stabilizedCapRateOnPurchase.toFixed(1)}%` : (isDallasFixture ? '9.4%' : 'Not provided'), factKey: 'stabilized_cap_rate_on_purchase', highlight: true },
    { label: 'Stabilized Yield on Cost', value: fin.stabilizedYieldOnTotalCost ? `${fin.stabilizedYieldOnTotalCost.toFixed(1)}%` : (isDallasFixture ? '8.7%' : 'Not provided'), factKey: 'stabilized_yield_on_cost', highlight: true },
  ];

  const slides: PresentationSlide[] = [
    // 1. Cover
    {
      id: `${campaign.id}-slide-1-cover`,
      type: 'cover',
      navLabel: 'Cover',
      kicker: `${brandKit.companyName} · ${isDemo ? 'FICTIONAL DEMO' : 'INVESTMENT OPPORTUNITY'}`,
      title: campaign.sourceData.title || campaign.name,
      subtitle: prop?.investmentThesis || campaign.strategy?.coreAngle || 'High-Yield Value-Add Acquisition Brief',
      imageUrl: heroImage,
      foot: `${isDemo ? 'DEMO FIXTURE · ' : ''}${campaign.sourceData.targetMarket || 'Target Market'} · ${new Date().getFullYear()}`,
      speakerNotes: 'Welcome everyone. Today we are presenting a targeted value-add opportunity underwritten with conservative underwriting metrics.',
    },

    // 2. Executive Summary
    {
      id: `${campaign.id}-slide-2-exec-summary`,
      type: 'executive_summary',
      navLabel: 'Summary',
      kicker: 'Executive Summary',
      title: 'Opportunity & Underwriting Overview',
      summary: prop?.investmentThesis || campaign.strategy?.valueProposition || 'Acquire at favorable basis with clear cosmetic/value-add upside in high-liquidity submarket.',
      highlights: prop?.dealHighlights && prop.dealHighlights.length > 0
        ? prop.dealHighlights.slice(0, 4)
        : [
            `Purchase Basis: ${fin.purchasePrice ? '$' + fin.purchasePrice.toLocaleString() : 'Underwritten'}`,
            `Estimated Renovation: ${fin.renovationEstimate !== undefined ? '$' + fin.renovationEstimate.toLocaleString() : 'Underwritten'}`,
            fin.grossSpread !== undefined ? `Gross Equity Spread: $${fin.grossSpread.toLocaleString()} (${fin.grossSpreadPercentOnCost?.toFixed(1)}% on cost)` : 'Favorable submarket spread',
            `Target Market: ${campaign.sourceData.targetMarket || 'Target Submarket'}`,
          ],
      speakerNotes: 'Highlight the acquisition basis discount and turnaround schedule minimizing holding costs.',
    },

    // 3. Property Overview
    {
      id: `${campaign.id}-slide-3-property`,
      type: 'property_overview',
      navLabel: 'Property',
      kicker: 'Asset Specifications',
      title: prop?.address ? `${prop.address}` : (isPhoenixFixture ? '4421 E Cambridge Ave' : isDallasFixture ? '1824 Skillman St' : 'Property Specifications'),
      address: prop?.address || (isPhoenixFixture ? '4421 E Cambridge Ave' : isDallasFixture ? '1824 Skillman St' : 'Address not provided'),
      city: prop?.city || (isPhoenixFixture ? 'Phoenix' : isDallasFixture ? 'Dallas' : (campaign.sourceData.targetMarket.split(',')[0]?.trim() || 'Target Market')),
      state: prop?.state || (isPhoenixFixture ? 'AZ' : isDallasFixture ? 'TX' : (campaign.sourceData.targetMarket.split(',')[1]?.trim() || 'N/A')),
      zipCode: prop?.zipCode || (isPhoenixFixture ? '85008' : isDallasFixture ? '75206' : undefined),
      propertyType: prop?.propertyType || (isMultiFamily ? 'multi_family' : 'single_family'),
      bedrooms: prop?.bedrooms,
      bathrooms: prop?.bathrooms,
      squareFeet: prop?.squareFeet,
      yearBuilt: prop?.yearBuilt,
      highlights: prop?.dealHighlights && prop.dealHighlights.length > 0
        ? prop.dealHighlights
        : (isPhoenixFixture
            ? ['Clear title', 'Vacant on close', 'Standard 10-day inspection period']
            : isDallasFixture
            ? ['100% occupied garden apartments', 'Individual electric meters', 'Low historical turnover']
            : ['Title diligence underway', 'Physical inspection pending', 'Standard closing period']),
      imageUrl: secondaryImage || heroImage,
      speakerNotes: 'Review the physical layout, floor plan specifications, and submarket neighborhood context.',
    },

    // 4. Investment Thesis
    {
      id: `${campaign.id}-slide-4-thesis`,
      type: 'investment_thesis',
      navLabel: 'Thesis',
      kicker: 'Strategic Thesis',
      title: 'Value-Add Acquisition & Value Creation',
      thesis: prop?.investmentThesis || campaign.strategy?.valueProposition || 'Acquisition at favorable basis relative to neighborhood renovated comparables, enabling equity creation through targeted capital improvements.',
      pillars: campaign.strategy?.keyHooks && campaign.strategy.keyHooks.length > 0
        ? campaign.strategy.keyHooks.slice(0, 3)
        : [
            'Favorable acquisition basis providing downside protection',
            'Defined capital improvement scope mitigating construction risk',
            'Targeted submarket liquidity supporting planned exit',
          ],
      speakerNotes: 'Walk through why this deal is defensible and how we protect downside capital.',
    },

    // 5. Financial Snapshot (Financial Truth Engine)
    {
      id: `${campaign.id}-slide-5-financials`,
      type: 'financial_snapshot',
      navLabel: 'Financials',
      kicker: 'Underwritten Financials',
      title: isMultiFamily ? 'Stabilized Yield & Pro Forma Summary' : 'Acquisition Basis & Equity Spread',
      metrics: isMultiFamily ? multiFamilyMetrics : singleFamilyMetrics,
      disclosures: ledger.disclosures,
      speakerNotes: 'All metrics shown are canonical calculations derived from verified underwriting inputs.',
    },

    // 6. Execution Timeline
    {
      id: `${campaign.id}-slide-6-timeline`,
      type: 'timeline',
      navLabel: 'Timeline',
      kicker: 'Project Execution',
      title: isMultiFamily ? 'Repositioning & Value-Add Milestones' : 'Renovation & Disposition Timeline',
      items: timelineItems,
      speakerNotes: 'Review the phased project milestones and operational timeline.',
    },

    // 7. Market Context & Comps
    {
      id: `${campaign.id}-slide-7-market`,
      type: 'market_context',
      navLabel: 'Market',
      kicker: 'Submarket Intelligence',
      title: `${campaign.sourceData.targetMarket || 'Submarket'} Dynamics`,
      submarket: campaign.sourceData.targetMarket || 'Target Submarket',
      insights: campaign.strategy?.supportingEvidence && campaign.strategy.supportingEvidence.length > 0
        ? campaign.strategy.supportingEvidence
        : [
            'Submarket inventory remains constrained with tight months of supply.',
            'Strong buyer demand for renovated inventory in prime corridors.',
            'Average days on market for updated properties remains favorable.',
          ],
      comps,
      speakerNotes: 'Demonstrate that our exit price and rental assumptions are supported by market evidence.',
    },

    // 8. Marketing Strategy & Platform Hooks
    {
      id: `${campaign.id}-slide-8-marketing-strategy`,
      type: 'marketing_strategy',
      navLabel: 'Marketing',
      kicker: 'Syndication & Marketing',
      title: 'Multi-Channel Acquisition & Investor Outreach',
      coreAngle: campaign.strategy?.coreAngle || 'Targeted Value-Add Opportunity with Documented Spread',
      hooks: campaign.strategy?.keyHooks && campaign.strategy.keyHooks.length > 0
        ? campaign.strategy.keyHooks.slice(0, 3)
        : [
            'Favorable acquisition basis with verified valuation support',
            'Defined renovation scope avoiding structural risk',
            'Targeted submarket with documented buyer demand',
          ],
      platforms: campaign.strategy?.suggestedPlatforms || ['linkedin', 'instagram', 'facebook', 'email', 'video_reels'],
      cta: campaign.strategy?.ctaStrategy || brandKit.preferredCta,
      speakerNotes: 'Explain how ZawMarketing orchestrates simultaneous multi-platform campaigns for this opportunity.',
    },

    // 9. Creative Showcase
    {
      id: `${campaign.id}-slide-9-creative-showcase`,
      type: 'creative_showcase',
      navLabel: 'Creatives',
      kicker: 'Coordinated Asset Suite',
      title: 'One Campaign Brief → Complete Creative Suite',
      subtitle: 'Deterministic social graphics and flyers generated in tandem with this investment memorandum.',
      previewFormats: ['square', 'portrait', 'story', 'landscape'],
      speakerNotes: 'Show that ZawMarketing produces a unified package: social graphics, flyers, copy, video scripts, and this presentation deck.',
    },

    // 10. Short-Form Video Concept
    {
      id: `${campaign.id}-slide-10-video-concept`,
      type: 'video_concept',
      navLabel: 'Video Plan',
      kicker: 'Short-Form Video Strategy',
      title: '60-Second Vertical Reel / Storyboard Plan',
      hook: campaign.copy?.videoScript.hook || (isPhoenixFixture ? 'How to find a $70,000 spread in Phoenix without touching a single load-bearing wall.' : 'Why investors are targeting value-add opportunities in this submarket.'),
      durationSeconds: campaign.copy?.videoScript.durationSeconds || (isPhoenixFixture ? 58 : 60),
      scenes: videoScenes,
      cta: campaign.copy?.videoScript.callToAction || 'Request Full Underwriting Pro Forma',
      speakerNotes: 'Review the short-form video production plan designed for vertical reels and social channels.',
    },

    // 11. Risk & Disclaimer
    {
      id: `${campaign.id}-slide-11-disclaimer`,
      type: 'risk_disclaimer',
      navLabel: 'Disclosures',
      kicker: 'Compliance & Disclosures',
      title: 'Underwriting Assumptions & Risk Notice',
      disclaimerText: brandKit.requiredDisclaimer,
      additionalCaveats: [
        'Pro forma financials, renovation estimates, and ARV projections are based on current market conditions and do not guarantee future performance.',
        'Investors are advised to conduct independent physical, environmental, zoning, and financial due diligence prior to investment.',
        isDemo ? 'FICTIONAL DEMO SAMPLE: All property details and financial figures are demonstration fixtures for marketing platform evaluation.' : 'Confidential marketing presentation for qualified and accredited parties only.',
      ],
      speakerNotes: 'Ensure all investors and partners understand the underwriting assumptions and risk caveats.',
    },

    // 12. Next Steps / CTA
    {
      id: `${campaign.id}-slide-12-next-steps`,
      type: 'next_steps',
      navLabel: 'Next Steps',
      kicker: 'Take Action',
      title: 'Request Detailed Due Diligence Package',
      ctaText: brandKit.preferredCta,
      contactInfo: {
        company: brandKit.companyName,
        email: brandKit.email,
        phone: brandKit.phone,
        website: brandKit.website,
        licenseNumber: brandKit.licenseNumber,
      },
      speakerNotes: 'Open the floor for questions and direct partners to request the full underwriting package.',
    },
  ];

  return {
    schemaVersion: '1.0.0',
    id: `deck-${campaign.id}`,
    campaignId: campaign.id,
    title: campaign.sourceData.title || campaign.name,
    subtitle: prop?.investmentThesis || campaign.strategy?.coreAngle,
    generatedAt: new Date().toISOString(),
    isDemo,
    theme,
    slides,
    generationMetadata: {
      requestedModel: 'deterministic-truth-engine',
      actualModel: 'deterministic-truth-engine',
      fallbackOccurred: false,
      latencyMs: 0,
      timestamp: new Date().toISOString(),
    },
  };
}
