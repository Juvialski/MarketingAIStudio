/**
 * Canonical Server-Independent Public Demo Review Provider
 * Provides a reliable, zero-storage, universally accessible public review room
 * for bundled marketing demo campaigns (e.g. Phoenix Value-Add).
 */

import { PublicReviewPortalResponse } from '../../types/review';
import { SAMPLE_CAMPAIGNS } from '../../data/sampleCampaigns';
import { DEFAULT_BRAND_KIT } from '../../types/brandKit';
import { buildReviewSnapshot } from './reviewSnapshotBuilder';
import { generateDeterministicPresentationDeck } from '../../features/presentations/services/demoDeckGenerator';
import { Campaign } from '../../types/campaign';

export const CANONICAL_DEMO_SLUGS = [
  'demo/phoenix-value-add',
  'demo-phoenix-value-add',
  'demo/phoenix',
  'demo-phoenix',
  'demo-phoenix-fix-flip',
  'demo/dallas-multifamily',
  'demo-dallas-multifamily',
] as const;

export const PRIMARY_DEMO_REVIEW_PATH = '/review/demo/phoenix-value-add';

/**
 * Checks if a given raw token or path is a canonical demo review slug.
 */
export function isCanonicalDemoToken(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const normalized = token.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (normalized.startsWith('review/')) {
    const after = normalized.slice(7);
    return isCanonicalDemoToken(after);
  }
  return (
    normalized === 'demo/phoenix-value-add' ||
    normalized === 'demo-phoenix-value-add' ||
    normalized === 'demo/phoenix' ||
    normalized === 'demo-phoenix' ||
    normalized === 'demo-phoenix-fix-flip' ||
    normalized === 'phoenix-value-add' ||
    normalized === 'demo/dallas-multifamily' ||
    normalized === 'demo-dallas-multifamily' ||
    normalized === 'dallas-multifamily'
  );
}

/**
 * Resolves the appropriate sample campaign for a demo review token.
 */
export function resolveDemoCampaign(token?: string | null): Campaign {
  if (!token) return SAMPLE_CAMPAIGNS[0];
  const normalized = token.trim().toLowerCase();
  if (normalized.includes('dallas')) {
    return SAMPLE_CAMPAIGNS.find((c) => c.id.includes('dallas')) || SAMPLE_CAMPAIGNS[1] || SAMPLE_CAMPAIGNS[0];
  }
  return SAMPLE_CAMPAIGNS[0]; // Default Phoenix Value-Add
}

/**
 * Generates an immutable, fully hydrated review package for the public demo.
 * Completely server-independent, requires no login or localStorage.
 */
export function getCanonicalDemoSnapshot(token?: string | null): PublicReviewPortalResponse {
  const baseCampaign = resolveDemoCampaign(token);

  // Ensure presentation deck is initialized
  const deck = baseCampaign.presentation || generateDeterministicPresentationDeck(baseCampaign, DEFAULT_BRAND_KIT);
  const campaignWithDeck: Campaign = {
    ...baseCampaign,
    presentation: deck,
  };

  const snapshot = buildReviewSnapshot(campaignWithDeck, DEFAULT_BRAND_KIT);

  return {
    status: 'active',
    versionNumber: 1,
    versionTitle: 'Public Demo Review Package · v1',
    publishedAt: baseCampaign.updatedAt || '2026-08-18T14:30:00Z',
    snapshot,
    permissions: {
      allowComments: true,
      allowSelection: true,
      allowApproval: true,
      allowDownloads: false,
    },
    feedback: [],
  };
}

/**
 * Builds the canonical public shareable URL for the demo campaign.
 */
export function getCanonicalPublicDemoUrl(campaignId?: string): string {
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  if (campaignId && campaignId.includes('dallas')) {
    return `${origin}/review/demo/dallas-multifamily`;
  }
  return `${origin}${PRIMARY_DEMO_REVIEW_PATH}`;
}
