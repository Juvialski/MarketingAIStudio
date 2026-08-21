import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignReviewService } from '../services/supabase/campaignReviewService';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('Review Flow & Local Storage Operations', () => {
  const campaign = SAMPLE_CAMPAIGNS[0];
  const brandKit = DEFAULT_BRAND_KIT;
  const orgId = 'test-org-1';

  beforeEach(() => {
    localStorage.clear();
  });

  it('should create an active review link with initial snapshot version', async () => {
    const { link, version, rawToken } = await CampaignReviewService.createReviewLink(
      orgId,
      campaign,
      brandKit
    );

    expect(link.id).toBeDefined();
    expect(link.isActive).toBe(true);
    expect(link.currentVersionNumber).toBe(1);
    expect(version.versionNumber).toBe(1);
    expect(rawToken).toMatch(/^rev_[0-9a-f]{64}$/);

    // Verify public lookup works with the raw token
    const publicRes = await CampaignReviewService.getPublicSnapshot(rawToken);
    expect(publicRes.status).toBe('active');
    expect(publicRes.snapshot?.campaignTitle).toBe(campaign.sourceData.title || campaign.name);
    expect(publicRes.versionNumber).toBe(1);
  });

  it('should publish a new version without altering the review token', async () => {
    const { link, rawToken } = await CampaignReviewService.createReviewLink(
      orgId,
      campaign,
      brandKit
    );

    const version2 = await CampaignReviewService.publishNewVersion(
      orgId,
      link.id,
      {
        ...campaign,
        name: 'Updated Executive Title',
        sourceData: { ...campaign.sourceData, title: 'Updated Executive Title' },
      },
      brandKit,
      'Review Package v2'
    );

    expect(version2.versionNumber).toBe(2);

    // Verify public lookup retrieves v2 snapshot
    const publicRes = await CampaignReviewService.getPublicSnapshot(rawToken);
    expect(publicRes.status).toBe('active');
    expect(publicRes.versionNumber).toBe(2);
    expect(publicRes.snapshot?.campaignTitle).toBe('Updated Executive Title');
  });

  it('should handle token rotation by invalidating the old token and activating the new one', async () => {
    const { link, rawToken: oldToken } = await CampaignReviewService.createReviewLink(
      orgId,
      campaign,
      brandKit
    );

    const rotated = await CampaignReviewService.rotateReviewLink(
      orgId,
      link.id,
      campaign,
      brandKit
    );

    expect(rotated.rawToken).not.toBe(oldToken);

    // Old token should fail
    const oldRes = await CampaignReviewService.getPublicSnapshot(oldToken);
    expect(oldRes.status).toBe('not_found');

    // New token should succeed
    const newRes = await CampaignReviewService.getPublicSnapshot(rotated.rawToken);
    expect(newRes.status).toBe('active');
  });

  it('should immediately fail-closed when link is revoked', async () => {
    const { link, rawToken } = await CampaignReviewService.createReviewLink(
      orgId,
      campaign,
      brandKit
    );

    await CampaignReviewService.revokeReviewLink(orgId, link.id);

    const publicRes = await CampaignReviewService.getPublicSnapshot(rawToken);
    expect(publicRes.status).toBe('revoked');
    expect(publicRes.snapshot).toBeFalsy();
  });

  it('should record reviewer preferred selections and approvals', async () => {
    const { link, rawToken } = await CampaignReviewService.createReviewLink(
      orgId,
      campaign,
      brandKit
    );

    // Submit preferred variant
    const res = await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_portrait',
      'institutional',
      'preferred',
      'Clean institutional typography fits our brand best',
      'Alice Investor'
    );

    expect(res.success).toBe(true);
    expect(res.feedback?.status).toBe('preferred');
    expect(res.feedback?.variantKey).toBe('institutional');
    expect(res.feedback?.reviewerName).toBe('Alice Investor');

    // Verify owner can fetch the feedback
    const ownerFeedback = await CampaignReviewService.getFeedback(orgId, link.id);
    expect(ownerFeedback.length).toBe(1);
    expect(ownerFeedback[0].variantKey).toBe('institutional');
    expect(ownerFeedback[0].comment).toContain('Clean institutional');
  });
});
