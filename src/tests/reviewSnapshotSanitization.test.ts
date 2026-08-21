import { describe, it, expect } from 'vitest';
import { buildReviewSnapshot } from '../services/review/reviewSnapshotBuilder';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';
import { Campaign } from '../types/campaign';

const liveCampaignWithoutImages: Campaign = {
  ...SAMPLE_CAMPAIGNS[1],
  id: 'live-prod-campaign-uuid-9999',
  name: 'Dallas 24-Unit Multifamily Deal',
  tags: ['Live', 'Production'],
  sourceData: {
    ...SAMPLE_CAMPAIGNS[1].sourceData,
    uploadedImages: [], // No uploaded images
  },
  presentation: undefined, // No reviewed presentation
};

describe('Review Snapshot Sanitization & Boundary Isolation', () => {
  const brandKit = DEFAULT_BRAND_KIT;

  it('should not include database campaignId or internal database identifiers in public snapshot', () => {
    const snapshot = buildReviewSnapshot(liveCampaignWithoutImages, brandKit);

    // campaignId should be undefined (stripped from public snapshot)
    expect(snapshot.campaignId).toBeUndefined();
    expect(snapshot.campaignTitle).toBe(liveCampaignWithoutImages.sourceData.title || liveCampaignWithoutImages.name);
  });

  it('should not leak fictional demo image (/demo/...) into live production campaign snapshots', () => {
    const snapshot = buildReviewSnapshot(liveCampaignWithoutImages, brandKit);

    // Live campaign without images should have empty heroImageUrl, NOT fictional demo property
    expect(snapshot.heroImageUrl).not.toContain('/demo/');
    expect(snapshot.heroImageUrl).toBe('');
  });

  it('should not auto-generate unreviewed presentations when campaign has no presentation deck', () => {
    // Campaign has no presentation
    expect(liveCampaignWithoutImages.presentation).toBeUndefined();

    const snapshot = buildReviewSnapshot(liveCampaignWithoutImages, brandKit);

    // Snapshot should NOT auto-generate a deck during snapshot build
    expect(snapshot.presentation).toBeUndefined();
  });

  it('should respect custom material selection options', () => {
    const snapshot = buildReviewSnapshot(liveCampaignWithoutImages, brandKit, {
      includedFormats: ['square', 'flyer_letter'],
      includePresentation: false,
      includeCopy: false,
    });

    expect(snapshot.graphicMaterials.length).toBe(2);
    expect(snapshot.graphicMaterials.map((m) => m.format)).toEqual(['square', 'flyer_letter']);
    expect(snapshot.copyChannels.length).toBe(0);
    expect(snapshot.presentation).toBeUndefined();
  });
});
