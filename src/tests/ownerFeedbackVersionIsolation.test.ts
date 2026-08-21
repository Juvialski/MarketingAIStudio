import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignReviewService } from '../services/supabase/campaignReviewService';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';
import { Campaign } from '../types/campaign';

describe('Owner Dashboard Version Feedback Isolation', () => {
  const baseCampaign: Campaign = {
    ...SAMPLE_CAMPAIGNS[0],
    id: 'campaign-version-isolation-test',
    tags: ['Live', 'Commercial'],
  };
  const brandKit = DEFAULT_BRAND_KIT;

  beforeEach(() => {
    localStorage.clear();
  });

  it('isolates feedback by review version and defaults owner view to active version', async () => {
    // 1. Publish v1
    const { link: linkV1, rawToken: rawTokenV1, version: version1 } = await CampaignReviewService.createReviewLink(
      'demo-org',
      baseCampaign,
      brandKit
    );
    expect(linkV1.currentVersionNumber).toBe(1);
    expect(version1.versionNumber).toBe(1);

    // 2. Alice selects Editorial on v1
    const feedbackAlice = await CampaignReviewService.submitPublicFeedback(
      rawTokenV1,
      'graphic_square',
      'editorial',
      'preferred',
      'Alice likes editorial for v1',
      'Alice'
    );
    expect(feedbackAlice.success).toBe(true);

    // Verify v1 feedback is present
    const feedbackListV1 = await CampaignReviewService.getFeedback('demo-org', linkV1.id, version1.id);
    expect(feedbackListV1.length).toBe(1);
    expect(feedbackListV1[0].reviewerName).toBe('Alice');
    expect(feedbackListV1[0].variantKey).toBe('editorial');

    // 3. Publish v2
    const version2 = await CampaignReviewService.publishNewVersion(
      'demo-org',
      linkV1.id,
      baseCampaign,
      brandKit,
      'Review Package v2'
    );
    expect(version2.versionNumber).toBe(2);

    // 4. Bob selects Institutional on v2
    const feedbackBob = await CampaignReviewService.submitPublicFeedback(
      rawTokenV1, // Token stays constant across version publishing
      'graphic_square',
      'institutional',
      'preferred',
      'Bob likes institutional for v2',
      'Bob'
    );
    expect(feedbackBob.success).toBe(true);

    // 5. Current owner dashboard must treat Bob/v2 as current version feedback
    const currentFeedbackV2 = await CampaignReviewService.getFeedback('demo-org', linkV1.id, version2.id);
    expect(currentFeedbackV2.length).toBe(1);
    expect(currentFeedbackV2[0].reviewerName).toBe('Bob');
    expect(currentFeedbackV2[0].variantKey).toBe('institutional');
    expect(currentFeedbackV2[0].status).toBe('preferred');

    // 6. Alice/v1 remains stored historically but does not count as current-v2 preference
    const historicalFeedbackV1 = await CampaignReviewService.getFeedback('demo-org', linkV1.id, version1.id);
    expect(historicalFeedbackV1.length).toBe(1);
    expect(historicalFeedbackV1[0].reviewerName).toBe('Alice');
    expect(historicalFeedbackV1[0].variantKey).toBe('editorial');

    // Confirm that querying by version2 strictly excludes Alice/v1
    const v2Reviewers = currentFeedbackV2.map((f) => f.reviewerName);
    expect(v2Reviewers).toContain('Bob');
    expect(v2Reviewers).not.toContain('Alice');
  });
});
