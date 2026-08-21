import { describe, it, expect } from 'vitest';
import { buildReviewSnapshot } from '../services/review/reviewSnapshotBuilder';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('Review Snapshot Builder & Data Boundary', () => {
  const campaign = SAMPLE_CAMPAIGNS[0];
  const brandKit = DEFAULT_BRAND_KIT;

  it('should build a complete, sanitized snapshot from campaign and brand kit', () => {
    const snapshot = buildReviewSnapshot(campaign, brandKit, {
      includedFormats: ['square', 'portrait', 'story', 'landscape', 'flyer_letter', 'flyer_a4'],
      includePresentation: true,
      includeCopy: true,
    });

    expect(snapshot.campaignTitle).toBe(campaign.sourceData.title || campaign.name);
    expect(snapshot.targetMarket).toBe(campaign.sourceData.targetMarket);
    expect(snapshot.heroImageUrl).toBeDefined();

    // Check presentation deck
    expect(snapshot.presentation).toBeDefined();
    expect(snapshot.presentation?.slides.length).toBeGreaterThanOrEqual(4);

    // Check graphic materials and multi-variant suites
    expect(snapshot.graphicMaterials.length).toBe(6);
    const portraitMaterial = snapshot.graphicMaterials.find((m) => m.format === 'portrait');
    expect(portraitMaterial).toBeDefined();
    expect(portraitMaterial?.variants.length).toBe(5); // editorial, institutional, modern_brokerage, direct_response, market_intelligence

    // Check copy channels
    expect(snapshot.copyChannels.length).toBeGreaterThanOrEqual(3);

    // Check video script
    expect(snapshot.videoScript).toBeDefined();
    expect(snapshot.videoScript?.scenes.length).toBeGreaterThanOrEqual(3);
  });

  it('should sanitize internal database IDs, user IDs, and model parameters', () => {
    const snapshot = buildReviewSnapshot(campaign, brandKit);
    const serialized = JSON.stringify(snapshot);

    // Ensure internal model registry identifiers and sensitive quota info are not leaked
    expect(serialized).not.toContain('gemini-3.7-flash');
    expect(serialized).not.toContain('quota_exceeded');
    expect(serialized).not.toContain('auth.users');
    expect(serialized).not.toContain('service_role');
  });

  it('should include all 5 creative variant templates for each graphic format', () => {
    const snapshot = buildReviewSnapshot(campaign, brandKit);

    for (const mat of snapshot.graphicMaterials) {
      const templateFamilies = mat.variants.map((v) => v.config.templateFamily);
      expect(templateFamilies).toContain('editorial');
      expect(templateFamilies).toContain('institutional');
      expect(templateFamilies).toContain('modern_brokerage');
      expect(templateFamilies).toContain('direct_response');
      expect(templateFamilies).toContain('market_intelligence');
    }
  });
});
