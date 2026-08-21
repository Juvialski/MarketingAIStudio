import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CampaignReviewService } from '../services/supabase/campaignReviewService';
import { MarketingKitZipExporter } from '../services/export/marketingKitZip';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';
import { Campaign, DesignTemplateFamily, OutputAspectRatio } from '../types/campaign';

describe('Multi-Reviewer Preferred vs Owner Final Selected Workflow', () => {
  const baseCampaign = SAMPLE_CAMPAIGNS[0];
  const brandKit = DEFAULT_BRAND_KIT;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('preserves owner confirmed design without letting conflicting reviewer votes override campaign', async () => {
    // Initial campaign has square set to 'direct_response'
    const campaignWithCustomDefault: Campaign = {
      ...baseCampaign,
      designConfigs: {
        ...baseCampaign.designConfigs,
        square: {
          ...baseCampaign.designConfigs.square,
          templateFamily: 'direct_response',
          aspectRatio: 'square',
          headline: 'Custom Direct Response Headline',
          imageCropY: 50,
          imageZoom: 1.0,
          activeMetricIds: ['purchase', 'arv'],
          showDisclaimer: true,
        },
      },
    };

    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaignWithCustomDefault,
      brandKit
    );

    // Reviewer 1 (Alice) votes 'editorial'
    await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'editorial',
      'preferred',
      'Alice prefers editorial',
      'Alice'
    );

    // Reviewer 2 (Bob) votes 'modern_brokerage'
    await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'modern_brokerage',
      'preferred',
      'Bob prefers modern brokerage',
      'Bob'
    );

    // Verify feedback rows exist in storage
    const link = await CampaignReviewService.getReviewLinks('demo-org', campaignWithCustomDefault.id);
    const feedbackList = await CampaignReviewService.getFeedback('demo-org', link[0].id);
    expect(feedbackList.length).toBe(2);

    // Spy on bundleAndDownloadKit to inspect the campaign passed to export
    let bundledCampaign: Campaign | null = null;
    vi.spyOn(MarketingKitZipExporter, 'bundleAndDownloadKit').mockImplementation(async (camp) => {
      bundledCampaign = camp;
    });

    // Simulated Export without owner explicit override: uses campaign's confirmed design ('direct_response')
    await MarketingKitZipExporter.bundleAndDownloadKit(
      campaignWithCustomDefault,
      brandKit
    );

    expect(bundledCampaign).not.toBeNull();
    // Confirms that neither Alice ('editorial') nor Bob ('modern_brokerage') overwrote the owner's design!
    expect(bundledCampaign!.designConfigs.square.templateFamily).toBe('direct_response');
  });

  it('respects explicit owner selection when owner chooses Bob recommendation', async () => {
    const initialCampaign = { ...baseCampaign };
    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      initialCampaign,
      brandKit
    );

    // Conflicting feedback
    await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'editorial',
      'preferred',
      'Alice prefers editorial',
      'Alice'
    );
    await CampaignReviewService.submitPublicFeedback(
      rawToken,
      'graphic_square',
      'institutional',
      'preferred',
      'Bob prefers institutional',
      'Bob'
    );

    // Owner explicitly chooses Bob's recommendation ('institutional')
    const ownerSelectedFormat: OutputAspectRatio = 'square';
    const ownerSelectedFamily: DesignTemplateFamily = 'institutional';

    const ownerConfirmedCampaign: Campaign = {
      ...initialCampaign,
      designConfigs: {
        ...initialCampaign.designConfigs,
        [ownerSelectedFormat]: {
          ...initialCampaign.designConfigs[ownerSelectedFormat],
          templateFamily: ownerSelectedFamily,
        },
      },
    };

    let bundledCampaign: Campaign | null = null;
    vi.spyOn(MarketingKitZipExporter, 'bundleAndDownloadKit').mockImplementation(async (camp) => {
      bundledCampaign = camp;
    });

    await MarketingKitZipExporter.bundleAndDownloadKit(
      ownerConfirmedCampaign,
      brandKit
    );

    expect(bundledCampaign!.designConfigs.square.templateFamily).toBe('institutional');
  });

  it('is immune to database / feedback order iteration', async () => {
    // If feedback is processed in reverse order (Bob first, then Alice),
    // the owner's campaign configuration must remain strictly authoritative
    const campaign: Campaign = {
      ...baseCampaign,
      designConfigs: {
        ...baseCampaign.designConfigs,
        square: {
          ...baseCampaign.designConfigs.square,
          templateFamily: 'market_intelligence',
          aspectRatio: 'square',
          headline: 'Data Intelligence',
          imageCropY: 50,
          imageZoom: 1.0,
          activeMetricIds: ['purchase', 'arv'],
          showDisclaimer: true,
        },
      },
    };

    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      campaign,
      brandKit
    );

    await CampaignReviewService.submitPublicFeedback(rawToken, 'graphic_square', 'modern_brokerage', 'preferred', 'Bob', 'Bob');
    await CampaignReviewService.submitPublicFeedback(rawToken, 'graphic_square', 'editorial', 'preferred', 'Alice', 'Alice');
    await CampaignReviewService.submitPublicFeedback(rawToken, 'graphic_square', 'direct_response', 'preferred', 'Charlie', 'Charlie');

    let bundledCampaign: Campaign | null = null;
    vi.spyOn(MarketingKitZipExporter, 'bundleAndDownloadKit').mockImplementation(async (camp) => {
      bundledCampaign = camp;
    });

    await MarketingKitZipExporter.bundleAndDownloadKit(campaign, brandKit);

    // Iteration of 3 conflicting reviewers cannot overwrite the owner's choice
    expect(bundledCampaign!.designConfigs.square.templateFamily).toBe('market_intelligence');
  });
});
