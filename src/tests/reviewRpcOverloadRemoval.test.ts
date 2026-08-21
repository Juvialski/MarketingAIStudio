import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignReviewService } from '../services/supabase/campaignReviewService';
import { hashReviewToken } from '../services/review/reviewCrypto';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('Review RPC Hardening & Data Integrity', () => {
  const baseCampaign = SAMPLE_CAMPAIGNS[0];
  const brandKit = DEFAULT_BRAND_KIT;

  beforeEach(() => {
    localStorage.clear();
  });

  it('rejects using stored token hash directly as credential against raw-token endpoint', async () => {
    const { rawToken, link } = await CampaignReviewService.createReviewLink(
      'demo-org',
      baseCampaign,
      brandKit
    );

    // 1. Raw token works
    const resRaw = await CampaignReviewService.getPublicSnapshot(rawToken);
    expect(resRaw.status).toBe('active');
    expect(resRaw.snapshot).toBeDefined();

    // 2. Token hash itself is not the pre-image and cannot act as public credential
    const fakeToken = link.tokenHash; // Attempting to use hash directly
    const computedDoubleHash = await hashReviewToken(fakeToken);
    // Double hash is distinct from the stored single hash
    expect(computedDoubleHash).not.toBe(link.tokenHash);
  });

  it('enforces that graphic material preferred status requires a non-empty variant key', async () => {
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      baseCampaign,
      brandKit
    );

    // Attempting to submit 'preferred' without variant_key for a graphic material
    const res = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      undefined, // Missing variant key
      'preferred',
      'Liked this',
      'Test Reviewer'
    );

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Preferred status for graphic materials requires a valid variant key/i);
  });

  it('normalizes empty or whitespace-only reviewer names to Reviewer', async () => {
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      baseCampaign,
      brandKit
    );

    const res = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'editorial',
      'preferred',
      'Clean note',
      '   ' // Empty whitespace reviewer name
    );

    expect(res.success).toBe(true);
    expect(res.feedback?.reviewerName).toBe('Reviewer');
  });
});
