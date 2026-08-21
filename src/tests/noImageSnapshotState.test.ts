import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { buildReviewSnapshot } from '../services/review/reviewSnapshotBuilder';
import { CampaignReviewPortal } from '../components/review/CampaignReviewPortal';
import { CampaignReviewService } from '../services/supabase/campaignReviewService';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';
import { Campaign } from '../types/campaign';

describe('Clean Live No-Image Snapshot State', () => {
  const brandKit = DEFAULT_BRAND_KIT;

  beforeEach(() => {
    localStorage.clear();
  });

  it('builds live campaign snapshot with empty heroImageUrl without fictional substitution', () => {
    const liveCampaignNoImage: Campaign = {
      ...SAMPLE_CAMPAIGNS[0],
      id: 'live-campaign-12345',
      tags: ['Live', 'ValueAdd'],
      sourceData: {
        ...SAMPLE_CAMPAIGNS[0].sourceData,
        uploadedImages: [], // No images uploaded
      },
    };

    const snapshot = buildReviewSnapshot(liveCampaignNoImage, brandKit);

    // Live campaigns must NEVER use fictional demo photography
    expect(snapshot.heroImageUrl).toBe('');
    expect(snapshot.heroImageUrl).not.toContain('fictional-property-exterior');
  });

  it('renders professional branded placeholder and avoids empty img tag or Primary Asset Photography badge when no image exists', async () => {
    const liveCampaignNoImage: Campaign = {
      ...SAMPLE_CAMPAIGNS[0],
      id: 'live-campaign-no-img',
      tags: ['Live', 'Commercial'],
      sourceData: {
        ...SAMPLE_CAMPAIGNS[0].sourceData,
        uploadedImages: [],
      },
    };

    const { rawToken } = await CampaignReviewService.createReviewLink(
      'demo-org',
      liveCampaignNoImage,
      brandKit
    );

    render(React.createElement(CampaignReviewPortal, { token: rawToken }));

    // Wait for snapshot to load
    const placeholder = await screen.findByText('Property image not provided');
    expect(placeholder).toBeDefined();

    const subtext = screen.getByText('Live campaign without primary photography');
    expect(subtext).toBeDefined();

    // Verify "Primary Asset Photography" badge is NOT rendered
    expect(screen.queryByText('Primary Asset Photography')).toBeNull();

    // Verify there is no img element with empty src
    const imgElements = document.querySelectorAll('img');
    imgElements.forEach((img) => {
      expect(img.getAttribute('src')).not.toBe('');
      expect(img.getAttribute('src')).not.toBeNull();
    });
  });
});
