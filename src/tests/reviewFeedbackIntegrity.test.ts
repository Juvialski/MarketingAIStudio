import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignReviewService } from '../services/supabase/campaignReviewService';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('Review Feedback Integrity & Deterministic UPSERT', () => {
  const campaign = SAMPLE_CAMPAIGNS[0];
  const brandKit = DEFAULT_BRAND_KIT;

  beforeEach(() => {
    localStorage.clear();
  });

  it('should perform deterministic UPSERT without inserting duplicate feedback rows', async () => {
    const { link, rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit
    );

    // Reviewer Alice marks 'editorial' as preferred
    const res1 = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'editorial',
      'preferred',
      'Love the typography.',
      'Alice Partner'
    );
    expect(res1.success).toBe(true);

    // Reviewer Alice changes mind to 'institutional' with updated comment
    const res2 = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'institutional',
      'preferred',
      'Switched to institutional style.',
      'Alice Partner'
    );
    expect(res2.success).toBe(true);

    // Verify feedback count in link
    const allFeedback = await CampaignReviewService.getFeedback('demo-org', link.id);
    const aliceSquareFeedback = allFeedback.filter(
      (f) => f.materialKey === 'graphic_square' && f.reviewerName === 'Alice Partner'
    );

    // Must be exactly 1 row for Alice on graphic_square (UPSERT update in-place)
    expect(aliceSquareFeedback.length).toBe(1);
    expect(aliceSquareFeedback[0].variantKey).toBe('institutional');
    expect(aliceSquareFeedback[0].comment).toBe('Switched to institutional style.');
  });

  it('should maintain distinct preferences for different reviewers without overwrite', async () => {
    const { link, rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit
    );

    // Alice prefers editorial
    await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'editorial',
      'preferred',
      'Alice vote',
      'Alice'
    );

    // Bob prefers direct_response
    await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'direct_response',
      'preferred',
      'Bob vote',
      'Bob'
    );

    const allFeedback = await CampaignReviewService.getFeedback('demo-org', link.id);
    const squareFeedback = allFeedback.filter((f) => f.materialKey === 'graphic_square');

    expect(squareFeedback.length).toBe(2);
    expect(squareFeedback.find((f) => f.reviewerName === 'Alice')?.variantKey).toBe('editorial');
    expect(squareFeedback.find((f) => f.reviewerName === 'Bob')?.variantKey).toBe('direct_response');
  });

  it('should enforce disabled selection permission', async () => {
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit,
      { allowSelection: false, allowComments: true, allowApproval: true }
    );

    const res = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'editorial',
      'preferred',
      'Attempting selection',
      'Reviewer'
    );

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/disabled/i);
  });

  it('should enforce disabled comments permission', async () => {
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit,
      { allowSelection: true, allowComments: false, allowApproval: true }
    );

    const res = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'editorial',
      'preferred',
      'A comment should be blocked',
      'Reviewer'
    );

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/disabled/i);
  });

  it('should record overall campaign approval with deterministic UPSERT', async () => {
    const { link, rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit
    );

    const res1 = await CampaignReviewService.submitPublicCampaignApproval(
      rawToken,
      'approved',
      'Approved for LP distribution.',
      'General Partner'
    );
    expect(res1.success).toBe(true);

    const allFeedback = await CampaignReviewService.getFeedback('demo-org', link.id);
    const approval = allFeedback.find((f) => f.materialKey === 'campaign_overall');

    expect(approval).toBeDefined();
    expect(approval?.status).toBe('approved');
    expect(approval?.comment).toBe('Approved for LP distribution.');
  });
});
