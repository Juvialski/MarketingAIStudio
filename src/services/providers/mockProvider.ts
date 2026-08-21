import { IAIProvider, GenerationProgressCallback, GenerationOptions, FullKitGenerationResult } from '../../types/providers';
import { Campaign, CampaignSourceData, CampaignStrategy, CampaignCopy, CopyQualityReport } from '../../types/campaign';
import { BrandKit, DEFAULT_BRAND_KIT } from '../../types/brandKit';
import { PresentationDeck } from '../../types/presentation';
import { AntiSlopCritic } from '../marketing/antiSlopCritic';
import { generateDeterministicPresentationDeck } from '../../features/presentations/services/demoDeckGenerator';

export class MockAIProvider implements IAIProvider {
  public id = 'mock-provider';
  public name = 'Mock AI Provider (High-Fidelity Fixtures)';

  public isConfigured(): boolean {
    return true;
  }

  private async simulateProgress(
    steps: { name: string; percent: number; detail: string }[],
    onProgress?: GenerationProgressCallback
  ): Promise<void> {
    if (!onProgress) return;
    for (const step of steps) {
      onProgress(step.name, step.percent, step.detail);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  public async generateStrategy(
    sourceData: CampaignSourceData,
    brandKit: BrandKit,
    onProgress?: GenerationProgressCallback,
    _options?: GenerationOptions
  ): Promise<CampaignStrategy> {
    await this.simulateProgress(
      [
        { name: 'Analyzing Property & Market', percent: 25, detail: `Parsing financial metrics for ${sourceData.targetMarket}...` },
        { name: 'Identifying Target Investor Profile', percent: 50, detail: 'Matching investment thesis with capital profile...' },
        { name: 'Synthesizing Value Proposition & Hooks', percent: 75, detail: 'Formulating non-slop quantifiable angles...' },
        { name: 'Finalizing Multi-Channel Distribution Plan', percent: 100, detail: 'Validating against Brand Kit constraints...' },
      ],
      onProgress
    );

    const prop = sourceData.property;
    const price = prop?.financials.purchasePrice ? `$${prop.financials.purchasePrice.toLocaleString()}` : '$285,000';
    const arv = prop?.financials.arv ? `$${prop.financials.arv.toLocaleString()}` : '$390,000';
    const spread = prop?.financials.equitySpread
      ? `$${prop.financials.equitySpread.toLocaleString()}`
      : prop?.financials.purchasePrice && prop?.financials.arv
      ? `$${(prop.financials.arv - prop.financials.purchasePrice - (prop.financials.renovationEstimate || 0)).toLocaleString()}`
      : '$70,000';

    return {
      targetAudience: {
        name: brandKit.targetAudienceDefault || 'Accredited Investors & Value-Add Operators',
        description: `Active real estate investors, syndication partners, and capital operators seeking documented equity spread and risk-adjusted returns in ${sourceData.targetMarket}.`,
        painPoints: [
          'Inflated MLS pricing leaving insufficient margin for unexpected renovation overages',
          'Heavy unverified pro formas with exaggerated market rent assumptions',
          'Slow closing timelines causing friction with private capital partners',
        ],
        motivations: [
          `Clear ${spread} spread supported by immediate comparable sales`,
          'Direct off-market acquisition basis minimizing intermediary markups',
          'Defined cosmetic scope with predictable 60–90 day execution window',
        ],
      },
      primaryObjective: 'Generate direct inquiries from qualified capital partners and provide access to the full underwriting data room.',
      coreAngle: `Underwritten Value-Add Opportunity: ${price} Basis with ${arv} Conservative ARV in ${sourceData.targetMarket}`,
      keyHooks: [
        `${price} entry basis with validated ${arv} closed comparables`,
        `Estimated ${spread} gross spread on a clean, manageable scope`,
        `Located in high-liquidity corridor with strong buyer demand`,
      ],
      valueProposition: `A rigorously underwritten real estate opportunity delivering transparent financial economics, clear scope parameters, and verifiable submarket comps.`,
      supportingEvidence: [
        `Submarket inventory in ${sourceData.targetMarket} currently supports rapid absorption`,
        `Comparable sales within 0.75-mile radius confirm target square-foot valuation`,
        `Clear title and immediate closing capability`,
      ],
      ctaStrategy: `Drive qualified prospects directly to the complete underwriting pro forma and due diligence package.`,
      suggestedPlatforms: ['facebook', 'instagram', 'linkedin', 'email', 'video_reels'],
      generationMetadata: {
        requestedModel: 'mock-provider',
        actualModel: 'mock-provider',
        fallbackOccurred: false,
        latencyMs: 150,
        timestamp: new Date().toISOString(),
      },
    };
  }

  public async generateCopy(
    sourceData: CampaignSourceData,
    strategy: CampaignStrategy,
    brandKit: BrandKit,
    onProgress?: GenerationProgressCallback,
    _options?: GenerationOptions
  ): Promise<CampaignCopy> {
    await this.simulateProgress(
      [
        { name: 'Drafting Headlines & Hooks', percent: 20, detail: 'Generating high-impact non-sensational headlines...' },
        { name: 'Writing Platform Copy (FB, IG, LinkedIn)', percent: 50, detail: 'Customizing length, structure, and tone for each channel...' },
        { name: 'Drafting Email Memorandum & Newsletter', percent: 75, detail: 'Structuring institutional deal briefing and bullet points...' },
        { name: 'Generating Short-Form Video / Reel Script', percent: 90, detail: 'Timing visual cues and concise audio hook...' },
        { name: 'Running Anti-Slop Quality Verification', percent: 100, detail: 'Checking for banned buzzwords and unverified claims...' },
      ],
      onProgress
    );

    const prop = sourceData.property;
    const priceStr = prop?.financials.purchasePrice ? `$${prop.financials.purchasePrice.toLocaleString()}` : '$285,000';
    const arvStr = prop?.financials.arv ? `$${prop.financials.arv.toLocaleString()}` : '$390,000';
    const renoStr = prop?.financials.renovationEstimate ? `$${prop.financials.renovationEstimate.toLocaleString()}` : '$35,000';
    const spreadStr = prop?.financials.equitySpread ? `$${prop.financials.equitySpread.toLocaleString()}` : '$70,000';
    const address = prop?.address ? `${prop.address}, ${prop.city}` : `${sourceData.targetMarket} Asset`;

    const headlines = [
      `${sourceData.targetMarket} Value-Add Opportunity: ${priceStr} Basis / ${arvStr} ARV`,
      `Underwritten ${sourceData.campaignType.replace(/_/g, ' ')} Deal: ${spreadStr} Gross Equity Spread`,
      `Off-Market Acquisition Brief: ${address} (${priceStr} Purchase)`,
    ];

    const ctas = [
      'Request Complete Underwriting Pro Forma & Inspection Notes',
      'Access Due Diligence Room & Comps Package',
      `Contact ${brandKit.companyName} Acquisitions Desk`,
    ];

    const facebook = {
      headline: `${sourceData.targetMarket} Opportunity: ${priceStr} Purchase | ${arvStr} ARV`,
      body: `New acquisition overview in ${sourceData.targetMarket}.\n\nUnderwriting highlights:\n• Purchase Basis: ${priceStr}\n• Estimated Scope: ${renoStr}\n• Underwritten ARV: ${arvStr}\n• Projected Gross Spread: ${spreadStr}\n\nProperty configuration: ${prop?.bedrooms || 3} Bed / ${prop?.bathrooms || 2} Bath (${prop?.squareFeet?.toLocaleString() || '1,840'} SF).\n\nSubmarket comparables support conservative valuation with steady demand. Detailed line-item scope and comparable sales matrix are available for verified partners.`,
      cta: 'Send a direct message or comment to receive the full underwriting brief.',
      characterCount: 520,
    };

    const instagram = {
      headline: `${priceStr} Basis | ${arvStr} ARV | ${sourceData.targetMarket}`,
      body: `Deal Breakdown: ${address}\n\n📍 ${sourceData.targetMarket}\n📐 ${prop?.bedrooms || 3} Bed | ${prop?.bathrooms || 2} Bath | ${prop?.squareFeet?.toLocaleString() || '1,840'} SF\n💵 Purchase Price: ${priceStr}\n🔨 Estimated Scope: ${renoStr}\n📈 Underwritten ARV: ${arvStr}\n💰 Projected Spread: ${spreadStr}\n\nStrictly cosmetic upgrades with clear comp support in immediate submarket. Clean title and straightforward closing timeline.`,
      cta: `Link in bio or DM for full pro forma package.`,
      hashtags: ['#RealEstateInvesting', '#ValueAddRealEstate', '#PropertyInvestment', '#CommercialRealEstate', '#FixAndFlip', '#Acquisitions'],
      characterCount: 580,
    };

    const linkedin = {
      headline: `Acquisition Underwriting Brief: ${address}`,
      body: `Investment Summary:\n\n${brandKit.companyName} has underwritten an off-market value-add opportunity in ${sourceData.targetMarket}.\n\nCore Transaction Metrics:\n• Acquisition Basis: ${priceStr}\n• Estimated Capital Expenditure: ${renoStr}\n• Conservative Exit Valuation (ARV): ${arvStr}\n• Projected Gross Equity Spread: ${spreadStr}\n\nUnderwriting Thesis:\nThe asset presents a manageable cosmetic scope allowing efficient turnaround without structural exposure. Comparable sales in the immediate submarket demonstrate solid liquidity and support target pricing.\n\nAccredited operators and capital partners may review the complete due diligence dossier and financial pro forma upon request.`,
      cta: `Direct message or contact our team at ${brandKit.email} for complete access.`,
      characterCount: 780,
    };

    const emailNewsletter = {
      subjectLines: [
        `Deal Brief: ${sourceData.targetMarket} Value-Add (${priceStr} Basis / ${arvStr} ARV)`,
        `New Underwriting Memorandum: ${address}`,
        `[Investment Package] ${sourceData.targetMarket} — ${spreadStr} Spread`,
      ],
      previewText: `${priceStr} purchase basis with ${renoStr} scope and ${arvStr} conservative ARV in ${sourceData.targetMarket}.`,
      bodyMarkdown: `### Executive Deal Summary: ${address}\n\nWe are pleased to present the underwriting memorandum for our latest value-add acquisition in **${sourceData.targetMarket}**.\n\n#### Key Financial Metrics\n* **Acquisition Price:** ${priceStr}\n* **Estimated Renovation:** ${renoStr}\n* **Projected ARV:** ${arvStr}\n* **Gross Equity Spread:** ${spreadStr}\n* **Property Size:** ${prop?.squareFeet?.toLocaleString() || '1,840'} SF (${prop?.bedrooms || 3} Bed / ${prop?.bathrooms || 2} Bath)\n\n#### Investment Rationale\n${prop?.investmentThesis || strategy.valueProposition}\n\n#### Due Diligence & Scope\nAll inspection reports, title commitments, and contractor estimates have been organized in the secure deal room.\n\n${brandKit.requiredDisclaimer}`,
      ctaButtonText: 'Download Complete Underwriting Package',
    };

    const videoScript = {
      title: `60-Second Deal Breakdown: ${address}`,
      durationSeconds: 56,
      targetFormat: '9:16 vertical reel' as const,
      hook: `How we underwrote this ${sourceData.targetMarket} deal with a ${spreadStr} spread.`,
      callToAction: `Comment DEAL or tap the link in bio for the complete underwriting package.`,
      scenes: [
        {
          timeframe: '0:00 - 0:06',
          visualDirection: 'Property exterior with price overlay banner.',
          spokenAudio: `Here is a quick look at our latest acquisition in ${sourceData.targetMarket}, secured at ${priceStr}.`,
          onScreenText: `${priceStr} Purchase Price`,
        },
        {
          timeframe: '0:06 - 0:25',
          visualDirection: 'Interior living and kitchen footage showing layout.',
          spokenAudio: `We have allocated ${renoStr} for cosmetic improvements including flooring, kitchen refacing, and modern finishes. No major structural work.`,
          onScreenText: `${renoStr} Renovation Scope`,
        },
        {
          timeframe: '0:25 - 0:42',
          visualDirection: 'Comps map overlay and financial summary chart.',
          spokenAudio: `Comparable sales on this corridor support a conservative ARV of ${arvStr}, leaving an estimated ${spreadStr} gross spread.`,
          onScreenText: `ARV: ${arvStr} | Spread: ${spreadStr}`,
        },
        {
          timeframe: '0:42 - 0:56',
          visualDirection: 'Presenter to camera with clear CTA graphic.',
          spokenAudio: `Tap the link in our bio or leave a comment to get the complete pro forma and contractor bid sheet.`,
          onScreenText: `Comment "DEAL" for Full Pro Forma`,
        },
      ],
    };

    const copyObj: CampaignCopy = {
      headlines,
      ctas,
      facebook,
      instagram,
      linkedin,
      emailNewsletter,
      videoScript,
      generationMetadata: {
        requestedModel: 'mock-provider',
        actualModel: 'mock-provider',
        fallbackOccurred: false,
        latencyMs: 180,
        timestamp: new Date().toISOString(),
      },
    };

    const qualityReport = AntiSlopCritic.reviewCampaignCopy(copyObj, sourceData, brandKit);
    copyObj.qualityReport = qualityReport;

    return copyObj;
  }

  public async generateFullMarketingKit(
    sourceData: CampaignSourceData,
    brandKit: BrandKit,
    onProgress?: GenerationProgressCallback,
    options?: GenerationOptions
  ): Promise<FullKitGenerationResult> {
    onProgress?.('Synthesizing Strategy & Multi-Platform Copy (Single-Turn Batch)...', 30);
    const strategy = await this.generateStrategy(sourceData, brandKit, onProgress, options);
    onProgress?.('Generating Multi-Platform Copy & Video Script...', 70);
    const copy = await this.generateCopy(sourceData, strategy, brandKit, onProgress, options);
    onProgress?.('Validating Anti-Slop Rules & Schema...', 100);

    return {
      strategy,
      copy,
      metadata: {
        requestedModel: 'mock-provider',
        actualModel: 'mock-provider',
        fallbackOccurred: false,
        latencyMs: 300,
        timestamp: new Date().toISOString(),
      },
    };
  }

  public async reviewCopyQuality(
    copy: CampaignCopy,
    sourceData: CampaignSourceData,
    brandKit: BrandKit,
    _options?: GenerationOptions
  ): Promise<CopyQualityReport> {
    return AntiSlopCritic.reviewCampaignCopy(copy, sourceData, brandKit);
  }

  public async generatePresentationDeck(
    campaign: Campaign,
    brandKit: BrandKit = DEFAULT_BRAND_KIT,
    onProgress?: GenerationProgressCallback,
    _options?: GenerationOptions
  ): Promise<PresentationDeck> {
    await this.simulateProgress(
      [
        { name: 'Extracting Campaign Facts & Financials', percent: 25, detail: 'Computing canonical valuation metrics...' },
        { name: 'Designing Responsive Slide Layouts', percent: 50, detail: 'Mapping semantic structures to Brand Kit...' },
        { name: 'Synthesizing Narrative & Speaker Notes', percent: 75, detail: 'Structuring investor thesis and market context...' },
        { name: 'Validating Preflight Presentation Schema', percent: 100, detail: 'Verifying arithmetic facts and disclaimer compliance...' },
      ],
      onProgress
    );

    return generateDeterministicPresentationDeck(campaign, brandKit);
  }
}
