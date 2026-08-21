import { describe, it, expect, beforeEach } from 'vitest';
import { getEffectiveReviewMaterials } from '../services/review/reviewSnapshotBuilder';
import { CampaignReviewService } from '../services/supabase/campaignReviewService';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';
import { Campaign } from '../types/campaign';

describe('Validate Actual Material Availability Before Publishing', () => {
  const brandKit = DEFAULT_BRAND_KIT;

  beforeEach(() => {
    localStorage.clear();
  });

  it('accurately calculates effective materials based on actual campaign content', () => {
    const campaignWithoutPresentationOrCopy: Campaign = {
      ...SAMPLE_CAMPAIGNS[0],
      presentation: undefined,
      copy: undefined,
    };

    // 1. No graphic formats, includePresentation = true (but campaign has NO presentation), includeCopy = false
    const resultEmpty = getEffectiveReviewMaterials(campaignWithoutPresentationOrCopy, {
      includedFormats: [],
      includePresentation: true,
      includeCopy: false,
    });

    expect(resultEmpty.hasPresentation).toBe(false);
    expect(resultEmpty.hasCopy).toBe(false);
    expect(resultEmpty.graphicFormats.length).toBe(0);
    expect(resultEmpty.totalCount).toBe(0);

    // 2. Add graphics
    const resultWithGraphics = getEffectiveReviewMaterials(campaignWithoutPresentationOrCopy, {
      includedFormats: ['square', 'portrait'],
      includePresentation: true,
      includeCopy: false,
    });
    expect(resultWithGraphics.totalCount).toBe(2);

    // 3. Campaign with presentation
    const campaignWithPresentation: Campaign = {
      ...SAMPLE_CAMPAIGNS[0],
      copy: undefined,
    };
    const resultWithPresentation = getEffectiveReviewMaterials(campaignWithPresentation, {
      includedFormats: [],
      includePresentation: true,
      includeCopy: false,
    });
    expect(resultWithPresentation.hasPresentation).toBe(true);
    expect(resultWithPresentation.totalCount).toBe(1);

    // 4. Campaign with copy
    const campaignWithCopy: Campaign = {
      ...SAMPLE_CAMPAIGNS[0],
      presentation: undefined,
      copy: SAMPLE_CAMPAIGNS[0].copy,
    };
    const resultWithCopy = getEffectiveReviewMaterials(campaignWithCopy, {
      includedFormats: [],
      includePresentation: false,
      includeCopy: true,
    });
    expect(resultWithCopy.hasCopy).toBe(true);
    expect(resultWithCopy.totalCount).toBe(1);
  });

  it('rejects creating or publishing a review package when effectiveMaterialCount is 0', async () => {
    const emptyCampaign: Campaign = {
      ...SAMPLE_CAMPAIGNS[0],
      presentation: undefined,
      copy: undefined,
    };

    // Attempt to create review link with 0 effective materials
    await expect(
      CampaignReviewService.createReviewLink(
        'demo-org',
        emptyCampaign,
        brandKit,
        undefined,
        null,
        undefined,
        {
          includedFormats: [],
          includePresentation: true, // presentation is undefined
          includeCopy: true,         // copy is undefined
        }
      )
    ).rejects.toThrow(/Cannot create a review package with no effective materials/i);
  });
});
