import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../services/providers/mockProvider';
import { CampaignSourceData } from '../types/campaign';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('Strategy & Copy Engine Pipeline', () => {
  const provider = new MockAIProvider();

  const mockSourceData: CampaignSourceData = {
    campaignType: 'fix_and_flip',
    title: 'Phoenix 3-Bed Value-Add Flip Opportunity',
    targetMarket: 'Phoenix, AZ (Arcadia Lite)',
    uploadedImages: [],
    property: {
      address: '4421 E Cambridge Ave',
      city: 'Phoenix',
      state: 'AZ',
      propertyType: 'single_family',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1840,
      financials: {
        purchasePrice: 285000,
        renovationEstimate: 35000,
        arv: 390000,
        equitySpread: 70000,
      },
      investmentThesis: 'Cosmetic modernization in prime corridor.',
      dealHighlights: ['Spread: $70k', 'Purchase: $285k', 'ARV: $390k'],
    },
  };

  it('should generate a structured strategy with quantifiable hooks', async () => {
    const strategy = await provider.generateStrategy(mockSourceData, DEFAULT_BRAND_KIT);

    expect(strategy).toBeDefined();
    expect(strategy.targetAudience.name).toBeTruthy();
    expect(strategy.coreAngle).toContain('$285,000');
    expect(strategy.keyHooks.length).toBeGreaterThanOrEqual(3);
    expect(strategy.supportingEvidence.length).toBeGreaterThanOrEqual(3);
    expect(strategy.suggestedPlatforms.length).toBeGreaterThan(0);
  });

  it('should generate multi-platform copy tailored for LinkedIn, IG, FB, Email, and Video Reel', async () => {
    const strategy = await provider.generateStrategy(mockSourceData, DEFAULT_BRAND_KIT);
    const copy = await provider.generateCopy(mockSourceData, strategy, DEFAULT_BRAND_KIT);

    expect(copy).toBeDefined();
    expect(copy.headlines.length).toBeGreaterThanOrEqual(3);
    expect(copy.ctas.length).toBeGreaterThanOrEqual(3);

    // LinkedIn
    expect(copy.linkedin.headline).toBeTruthy();
    expect(copy.linkedin.body).toContain('$285,000');

    // Instagram
    expect(copy.instagram.hashtags).toBeDefined();
    expect(copy.instagram.hashtags?.length).toBeGreaterThan(0);

    // Email
    expect(copy.emailNewsletter.subjectLines.length).toBeGreaterThanOrEqual(3);
    expect(copy.emailNewsletter.bodyMarkdown).toContain('$285,000');

    // Video Reel Script
    expect(copy.videoScript.scenes.length).toBeGreaterThanOrEqual(3);
    expect(copy.videoScript.hook).toBeTruthy();
    expect(copy.videoScript.callToAction).toBeTruthy();
  });
});
