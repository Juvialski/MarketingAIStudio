import { describe, it, expect } from 'vitest';
import { validateCampaignConsistency } from '../services/marketing/consistencyValidator';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';

describe('Campaign Consistency Validator', () => {
  it('validates Phoenix and Dallas sample campaigns as internally consistent', () => {
    for (const campaign of SAMPLE_CAMPAIGNS) {
      const report = validateCampaignConsistency(campaign);
      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);
    }
  });

  it('catches mathematical inconsistencies in copy', () => {
    const invalidCampaign = JSON.parse(JSON.stringify(SAMPLE_CAMPAIGNS[0]));
    // Inject the erroneous 17.9% on cost claim
    invalidCampaign.copy.linkedin.body = 'Projected Gross Margin: 17.9% on cost ($70,000 spread)';

    const report = validateCampaignConsistency(invalidCampaign);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes('margin on cost'))).toBe(true);
  });

  it('catches rent gap inconsistencies in copy', () => {
    const invalidCampaign = JSON.parse(JSON.stringify(SAMPLE_CAMPAIGNS[1]));
    // Inject conflicting $250/mo claim
    invalidCampaign.copy.strategy = {
      ...invalidCampaign.copy.strategy,
      motivations: ['Clear $250/mo rent gap to surrounding market comparables'],
    };
    invalidCampaign.copy.facebook.body = 'Clear $250/mo below market in Dallas';

    const report = validateCampaignConsistency(invalidCampaign);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes('$250/mo below market'))).toBe(true);
  });
});
