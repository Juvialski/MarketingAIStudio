import { describe, it, expect } from 'vitest';
import { AntiSlopCritic } from '../services/marketing/antiSlopCritic';
import { CampaignCopy, CampaignSourceData } from '../types/campaign';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('AntiSlopCritic - Quality Review Engine', () => {
  it('should detect standard AI slop clichés', () => {
    const slopText = 'Unlock the full potential of this game-changing property nestled in the heart of Phoenix. Whether you are an investor or buyer, act fast before it is gone!';
    const issues = AntiSlopCritic.reviewText(slopText, 'Test Platform');

    expect(issues.length).toBeGreaterThanOrEqual(4);
    const ruleNames = issues.map((i) => i.rule);
    expect(ruleNames.some((r) => r.includes('Unlock'))).toBe(true);
    expect(ruleNames.some((r) => r.includes('Hyperbole'))).toBe(true);
    expect(ruleNames.some((r) => r.includes('Nestled'))).toBe(true);
    expect(ruleNames.some((r) => r.includes('Audience Hedge'))).toBe(true);
  });

  it('should detect regulatory violations like guaranteed returns', () => {
    const dangerousText = 'This deal offers guaranteed returns and is a risk-free investment you cannot lose on.';
    const issues = AntiSlopCritic.reviewText(dangerousText);

    expect(issues.some((i) => i.rule.includes('Guaranteed Return'))).toBe(true);
    expect(issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('should detect custom forbidden words defined in Brand Kit', () => {
    const customText = 'Hurry before it’s gone, this is a secret deal.';
    const issues = AntiSlopCritic.reviewText(customText, 'Email', ['hurry before it’s gone']);

    expect(issues.some((i) => i.rule.includes('Forbidden Brand Phrase'))).toBe(true);
  });

  it('should auto-clean text replacing clichés with professional alternatives', () => {
    const slopText = 'Unlock the potential of this property.';
    const cleaned = AntiSlopCritic.autoCleanText(slopText);

    expect(cleaned).not.toContain('Unlock the potential');
    expect(cleaned).toContain('capture value-add upside');
  });

  it('should score clean institutional copy with high scores (95+)', () => {
    const cleanCopy: CampaignCopy = {
      headlines: ['Phoenix Value-Add Opportunity: $285k Basis with $390k ARV'],
      ctas: ['Request Detailed Underwriting Pro Forma'],
      facebook: {
        headline: 'Phoenix 3-Bed Value-Add',
        body: 'Acquisition basis of $285,000 with $35,000 cosmetic scope. Underwritten ARV of $390,000 supported by closed comps.',
        cta: 'Message for full pro forma.',
        characterCount: 140,
      },
      instagram: {
        headline: '$285k Basis | $390k ARV',
        body: '3 Bed / 2 Bath in Arcadia Lite corridor. $70k spread.',
        cta: 'Link in bio.',
        characterCount: 60,
      },
      linkedin: {
        headline: 'Investment Brief: 4421 E Cambridge Ave',
        body: 'Acquisition basis of $154.89/sqft against $211.95/sqft neighborhood median. 17.9% gross margin on cost.',
        cta: 'Contact acquisitions desk.',
        characterCount: 130,
      },
      emailNewsletter: {
        subjectLines: ['Phoenix Value-Add Brief ($285k Basis)'],
        previewText: '$285k basis with $35k cosmetic scope.',
        bodyMarkdown: '### Deal Summary\n\n* Purchase: $285,000\n* ARV: $390,000',
        ctaButtonText: 'Download Package',
      },
      videoScript: {
        title: 'Phoenix 60s Breakdown',
        durationSeconds: 55,
        targetFormat: '9:16 vertical reel',
        hook: 'How to find a $70k spread in Phoenix.',
        callToAction: 'Comment DEAL for the pro forma.',
        scenes: [
          {
            timeframe: '0:00 - 0:05',
            visualDirection: 'Exterior shot',
            spokenAudio: 'This Phoenix 3-bed was secured at $285,000.',
          },
        ],
      },
    };

    const sourceData: CampaignSourceData = {
      campaignType: 'fix_and_flip',
      title: 'Phoenix Value-Add',
      targetMarket: 'Phoenix, AZ',
      uploadedImages: [],
      property: {
        address: '4421 E Cambridge Ave',
        city: 'Phoenix',
        state: 'AZ',
        propertyType: 'single_family',
        financials: {
          purchasePrice: 285000,
          renovationEstimate: 35000,
          arv: 390000,
          equitySpread: 70000,
        },
        investmentThesis: 'Cosmetic flip in Arcadia corridor.',
        dealHighlights: ['Spread: $70,000'],
      },
    };

    const report = AntiSlopCritic.reviewCampaignCopy(cleanCopy, sourceData, DEFAULT_BRAND_KIT);
    expect(report.overallScore).toBeGreaterThanOrEqual(95);
    expect(report.slopIndex).toBe('clean');
    expect(report.factualIntegrityVerified).toBe(true);
  });
});
