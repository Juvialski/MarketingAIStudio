import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignReviewService } from '../services/supabase/campaignReviewService';
import { generateSecureReviewToken } from '../services/review/reviewCrypto';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('Review Token Authentication & Security Boundary', () => {
  const campaign = SAMPLE_CAMPAIGNS[0];
  const brandKit = DEFAULT_BRAND_KIT;

  beforeEach(() => {
    localStorage.clear();
  });

  it('should authenticate successfully with valid raw token', async () => {
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit
    );

    expect(rawToken).toMatch(/^rev_[0-9a-f]{64}$/);

    const snapshotRes = await CampaignReviewService.getPublicSnapshot(rawToken);
    expect(snapshotRes.status).toBe('active');
    expect(snapshotRes.snapshot).toBeDefined();
    expect(snapshotRes.snapshot?.campaignTitle).toBe(campaign.sourceData.title || campaign.name);
  });

  it('should fail with not_found when given random or malformed raw token', async () => {
    const fakeToken = generateSecureReviewToken();
    const res = await CampaignReviewService.getPublicSnapshot(fakeToken);
    expect(res.status).toBe('not_found');
  });

  it('should fail when given empty or whitespace token', async () => {
    const resEmpty = await CampaignReviewService.getPublicSnapshot('');
    expect(resEmpty.status).toBe('not_found');

    const resWhitespace = await CampaignReviewService.getPublicSnapshot('   ');
    expect(resWhitespace.status).toBe('not_found');
  });

  it('should reject access immediately when review link is revoked', async () => {
    const { link, rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit
    );

    const revoked = await CampaignReviewService.revokeReviewLink('demo-org', link.id);
    expect(revoked).toBe(true);

    const res = await CampaignReviewService.getPublicSnapshot(rawToken);
    expect(res.status).toBe('revoked');
    expect(res.snapshot).toBeUndefined();
  });

  it('should reject access when review link is expired', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit,
      undefined,
      pastDate
    );

    const res = await CampaignReviewService.getPublicSnapshot(rawToken);
    expect(res.status).toBe('expired');
    expect(res.snapshot).toBeUndefined();
  });

  it('should invalidate previous token when review link is rotated', async () => {
    const { link, rawToken: token1 } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit
    );

    const { rawToken: token2 } = await CampaignReviewService.rotateReviewLink(
      'demo-org',
      link.id,
      campaign,
      brandKit
    );

    expect(token1).not.toBe(token2);

    // Old token should now fail
    const oldRes = await CampaignReviewService.getPublicSnapshot(token1);
    expect(oldRes.status).toBe('not_found');

    // New token should succeed
    const newRes = await CampaignReviewService.getPublicSnapshot(token2);
    expect(newRes.status).toBe('active');
  });
});
