import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignReviewService } from '../services/supabase/campaignReviewService';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('Review Feedback Snapshot Key Validation', () => {
  const campaign = SAMPLE_CAMPAIGNS[0];
  const brandKit = DEFAULT_BRAND_KIT;

  beforeEach(() => {
    localStorage.clear();
  });

  it('accepts feedback for valid material and valid variant in published snapshot', async () => {
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit,
      { allowSelection: true, allowComments: true, allowApproval: true },
      null,
      undefined,
      { includedFormats: ['square', 'portrait'], includePresentation: true, includeCopy: true }
    );

    const res = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'editorial',
      'preferred',
      'Clean typography and layout.',
      'Alice'
    );

    expect(res.success).toBe(true);
    expect(res.feedback?.materialKey).toBe('graphic_square');
    expect(res.feedback?.variantKey).toBe('editorial');
    expect(res.feedback?.status).toBe('preferred');
  });

  it('rejects feedback for fabricated/non-existent material key', async () => {
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit
    );

    const res = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_fabricated_99',
      'editorial',
      'preferred',
      'Should fail.',
      'Attacker'
    );

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/does not exist in the published review package/i);
  });

  it('rejects feedback for valid material but invalid/fabricated variant', async () => {
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit
    );

    const res = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'non_existent_family_xyz',
      'preferred',
      'Should fail due to invalid variant.',
      'Alice'
    );

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Specified variant does not exist/i);
  });

  it('rejects feedback for material excluded from the published snapshot', async () => {
    // Publish snapshot with ONLY square format included
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit,
      { allowSelection: true, allowComments: true },
      null,
      undefined,
      { includedFormats: ['square'], includePresentation: false, includeCopy: false }
    );

    // graphic_story was omitted from the snapshot
    const storyRes = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_story',
      'editorial',
      'preferred',
      'Story feedback on excluded format',
      'Bob'
    );

    expect(storyRes.success).toBe(false);
    expect(storyRes.error).toMatch(/does not exist in the published review package/i);

    // Presentation was excluded from snapshot
    const presRes = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'presentation',
      undefined,
      'approved',
      'Presentation feedback on excluded deck',
      'Bob'
    );

    expect(presRes.success).toBe(false);
    expect(presRes.error).toMatch(/does not exist in the published review package/i);
  });

  it('rejects arbitrary oversized or injected material keys', async () => {
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit
    );

    const oversizedKey = 'graphic_' + 'x'.repeat(100);
    const resOversized = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      oversizedKey,
      'editorial',
      'preferred',
      'Oversized test'
    );

    expect(resOversized.success).toBe(false);
    expect(resOversized.error).toMatch(/Invalid or missing material key/i);

    const injectedKey = "graphic_square'; DROP TABLE campaigns; --";
    const resInjected = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      injectedKey,
      'editorial',
      'preferred',
      'Injection test'
    );

    expect(resInjected.success).toBe(false);
  });

  it('prohibits campaign_overall submission through item feedback endpoint', async () => {
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit
    );

    const res = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'campaign_overall',
      undefined,
      'approved',
      'Attempting overall approval via item feedback'
    );

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/dedicated approval endpoint/i);
  });

  it('rejects variant key passed to presentation or non-variant copy materials', async () => {
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit,
      { allowSelection: true, allowApproval: true },
      null,
      undefined,
      { includedFormats: ['square'], includePresentation: true, includeCopy: true }
    );

    const resPres = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'presentation',
      'arbitrary_variant',
      'approved',
      'Deck feedback'
    );

    expect(resPres.success).toBe(false);
    expect(resPres.error).toMatch(/Variants are not supported/i);
  });
});
