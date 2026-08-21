import { describe, it, expect, beforeEach } from 'vitest';
import { ImageSpendingTracker } from '../services/providers/imageSpendingTracker';
import { UploadOnlyProvider } from '../services/providers/imageProvider';
import { ImageSpendingLimits, ImageCreativeBrief } from '../types/providers';

describe('Image Cost Safety, Budget Limits & Fallback Guards', () => {
  beforeEach(() => {
    ImageSpendingTracker.clearSpendingHistory();
  });

  const defaultLimits: ImageSpendingLimits = {
    enablePaidGeneration: true,
    preferredPaidProvider: 'bfl',
    preferredPaidModel: 'flux-2-pro',
    maxImagesPerCampaign: 3,
    dailySpendingLimitUsd: 2.0,
    monthlySpendingLimitUsd: 20.0,
  };

  it('should block paid generation when enablePaidGeneration is false', () => {
    const disabledLimits: ImageSpendingLimits = {
      ...defaultLimits,
      enablePaidGeneration: false,
    };

    const check = ImageSpendingTracker.canExecutePaidGeneration(0.05, disabledLimits);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('disabled for this workspace');
  });

  it('should allow paid generation when within daily and monthly budgets', () => {
    const check = ImageSpendingTracker.canExecutePaidGeneration(0.08, defaultLimits);
    expect(check.allowed).toBe(true);
  });

  it('should block paid generation when daily spending limit would be exceeded', () => {
    // Record transactions up to $1.95 (limit is $2.00)
    for (let i = 0; i < 39; i++) {
      ImageSpendingTracker.recordGeneration({
        provider: 'bfl',
        model: 'flux-2-pro',
        costUsd: 0.05,
        purpose: 'supporting',
      });
    }

    const summary = ImageSpendingTracker.getSpendingSummary(defaultLimits);
    expect(summary.spentTodayUsd).toBe(1.95);

    // Attempting a $0.08 generation should be blocked because 1.95 + 0.08 = 2.03 > 2.00
    const check = ImageSpendingTracker.canExecutePaidGeneration(0.08, defaultLimits);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('Daily spending limit');
  });

  it('should block paid generation when max images per campaign limit is reached', () => {
    const campaignId = 'camp-phoenix-101';

    // Record 3 images for this campaign
    for (let i = 0; i < 3; i++) {
      ImageSpendingTracker.recordGeneration({
        provider: 'bfl',
        model: 'flux-2-pro',
        costUsd: 0.05,
        purpose: 'hero',
        campaignId,
      });
    }

    expect(ImageSpendingTracker.getCampaignImageCount(campaignId)).toBe(3);

    // 4th generation should be blocked for this campaign
    const check = ImageSpendingTracker.canExecutePaidGeneration(0.05, defaultLimits, campaignId);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('Maximum images per campaign limit (3) reached');
  });

  it('uses an explicitly fictional bundled fixture in demo mode', async () => {
    const demoProvider = new UploadOnlyProvider();
    const brief: ImageCreativeBrief = {
      purpose: 'hero',
      subject: 'Modern architectural home in Phoenix',
      aspectRatio: '1:1',
      qualityTier: 'paid_maximum',
    };

    const result = await demoProvider.generateFromBrief(brief);
    expect(result.url).toBe('/demo/fictional-property-exterior.png');
    expect(result.provider).toBe('demo_fixture');
    expect(result.altText).toContain('not a real listing');
    expect(result.isAiIllustrative).toBe(true);
    expect(result.metadata?.estimatedCostUsd).toBe(0.0);
  });

  it('chooses the deterministic interior fixture for supporting demo visuals', async () => {
    const demoProvider = new UploadOnlyProvider();
    const brief: ImageCreativeBrief = {
      purpose: 'supporting',
      subject: 'Kitchen island and quartz counter',
      aspectRatio: '4:5',
      qualityTier: 'paid_alternate',
    };

    const result = await demoProvider.generateFromBrief(brief);
    expect(result.url).toBe('/demo/fictional-property-interior.png');
    expect(result.provider).toBe('demo_fixture');
    expect(result.metadata?.estimatedCostUsd).toBe(0.0);
  });
});
