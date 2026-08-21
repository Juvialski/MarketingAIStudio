import { describe, it, expect } from 'vitest';
import { 
  isCanonicalDemoToken, 
  getCanonicalDemoSnapshot, 
  getCanonicalPublicDemoUrl,
  PRIMARY_DEMO_REVIEW_PATH 
} from '../services/review/canonicalDemoReview';
import { CampaignReviewService } from '../services/supabase/campaignReviewService';

describe('Canonical Public Demo Review Provider', () => {
  it('identifies canonical demo tokens and route paths correctly', () => {
    expect(isCanonicalDemoToken('demo/phoenix-value-add')).toBe(true);
    expect(isCanonicalDemoToken('demo-phoenix-value-add')).toBe(true);
    expect(isCanonicalDemoToken('demo/phoenix')).toBe(true);
    expect(isCanonicalDemoToken('demo-phoenix')).toBe(true);
    expect(isCanonicalDemoToken('/review/demo/phoenix-value-add')).toBe(true);
    expect(isCanonicalDemoToken('review/demo/phoenix-value-add')).toBe(true);
    expect(isCanonicalDemoToken('demo/dallas-multifamily')).toBe(true);
    expect(isCanonicalDemoToken('demo-dallas-multifamily')).toBe(true);

    // Negative cases
    expect(isCanonicalDemoToken('rev_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')).toBe(false);
    expect(isCanonicalDemoToken('random_token_xyz')).toBe(false);
    expect(isCanonicalDemoToken('')).toBe(false);
    expect(isCanonicalDemoToken(null)).toBe(false);
    expect(isCanonicalDemoToken(undefined)).toBe(false);
  });

  it('builds a complete, fully hydrated review package for public demo with zero storage dependencies', () => {
    const demoPackage = getCanonicalDemoSnapshot('demo/phoenix-value-add');

    expect(demoPackage.status).toBe('active');
    expect(demoPackage.versionNumber).toBe(1);
    expect(demoPackage.snapshot).toBeDefined();

    const snapshot = demoPackage.snapshot!;
    expect(snapshot.campaignTitle).toContain('Phoenix');
    expect(snapshot.targetMarket).toContain('Phoenix, AZ');

    // Verify property images exist and point to bundled /demo/* assets
    expect(snapshot.heroImageUrl).toBe('/demo/fictional-property-exterior.png');

    // Verify presentation deck exists and is deterministic
    expect(snapshot.presentation).toBeDefined();
    expect(snapshot.presentation?.slides.length).toBeGreaterThanOrEqual(10);
    expect(snapshot.presentation?.slides[0].title).toBeTruthy();

    // Verify graphic materials exist with multiple formats and variants
    expect(snapshot.graphicMaterials.length).toBeGreaterThan(0);
    const squareGraphic = snapshot.graphicMaterials.find((g) => g.format === 'square');
    expect(squareGraphic).toBeDefined();
    expect(squareGraphic?.variants.length).toBeGreaterThan(0);

    // Verify copy channels exist
    expect(snapshot.copyChannels.length).toBeGreaterThan(0);

    // Verify permissions allow client evaluation
    expect(demoPackage.permissions?.allowComments).toBe(true);
    expect(demoPackage.permissions?.allowSelection).toBe(true);
    expect(demoPackage.permissions?.allowApproval).toBe(true);
  });

  it('CampaignReviewService.getPublicSnapshot returns canonical demo package immediately without backend calls', async () => {
    const res = await CampaignReviewService.getPublicSnapshot('demo/phoenix-value-add');
    expect(res.status).toBe('active');
    expect(res.snapshot).toBeDefined();
    expect(res.snapshot!.campaignTitle).toContain('Phoenix');
  });

  it('CampaignReviewService.submitPublicFeedback and submitPublicCampaignApproval work smoothly for demo links', async () => {
    const feedbackRes = await CampaignReviewService.submitPublicFeedback(
      'demo/phoenix-value-add',
      'graphic_square',
      'editorial',
      'preferred',
      'Looks fantastic!',
      'Jane Investor'
    );
    expect(feedbackRes.success).toBe(true);
    expect(feedbackRes.feedback?.reviewerName).toBe('Jane Investor');
    expect(feedbackRes.feedback?.status).toBe('preferred');

    const approvalRes = await CampaignReviewService.submitPublicCampaignApproval(
      'demo/phoenix-value-add',
      'approved',
      'Ready to send to LPs',
      'Jane Investor'
    );
    expect(approvalRes.success).toBe(true);
    expect(approvalRes.status).toBe('approved');
  });

  it('generates canonical public demo review URL path', () => {
    const url = getCanonicalPublicDemoUrl('campaign-phoenix-fix-flip');
    expect(url).toContain(PRIMARY_DEMO_REVIEW_PATH);
  });
});
