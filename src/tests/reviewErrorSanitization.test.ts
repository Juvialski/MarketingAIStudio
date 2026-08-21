import { describe, it, expect } from 'vitest';
import { CampaignReviewService } from '../services/supabase/campaignReviewService';

describe('Public Review Error Message Sanitization', () => {
  it('sanitizes raw pgcrypto digest error', () => {
    const rawError = 'function digest(text, unknown) does not exist';
    const sanitized = CampaignReviewService.sanitizeErrorMessage(rawError);
    expect(sanitized).toBe(CampaignReviewService.SAFE_GENERIC_ERROR);
    expect(sanitized).not.toContain('digest');
  });

  it('sanitizes relation does not exist error', () => {
    const rawError = 'relation "campaign_review_links" does not exist';
    const sanitized = CampaignReviewService.sanitizeErrorMessage(rawError);
    expect(sanitized).toBe(CampaignReviewService.SAFE_GENERIC_ERROR);
    expect(sanitized).not.toContain('relation');
  });

  it('sanitizes permission denied error', () => {
    const rawError = 'permission denied for table campaign_review_links';
    const sanitized = CampaignReviewService.sanitizeErrorMessage(rawError);
    expect(sanitized).toBe(CampaignReviewService.SAFE_GENERIC_ERROR);
    expect(sanitized).not.toContain('permission denied');
  });

  it('sanitizes PostgREST PGRST error codes', () => {
    const rawError = 'PGRST301: JWT expired or invalid token';
    const sanitized = CampaignReviewService.sanitizeErrorMessage(rawError);
    expect(sanitized).toBe(CampaignReviewService.SAFE_GENERIC_ERROR);
    expect(sanitized).not.toContain('PGRST');
  });

  it('sanitizes PostgreSQL internal syntax and column errors', () => {
    const rawError = 'PostgreSQL error: column "xyz" does not exist';
    const sanitized = CampaignReviewService.sanitizeErrorMessage(rawError);
    expect(sanitized).toBe(CampaignReviewService.SAFE_GENERIC_ERROR);
    expect(sanitized).not.toContain('PostgreSQL');
  });

  it('preserves clean user-facing business validation errors', () => {
    const userError = 'This review link is invalid or no longer active.';
    const result = CampaignReviewService.sanitizeErrorMessage(userError);
    expect(result).toBe('This review link is invalid or no longer active.');

    const expiredError = 'This review link has expired.';
    expect(CampaignReviewService.sanitizeErrorMessage(expiredError)).toBe('This review link has expired.');

    const variantError = 'Preferred status for graphic materials requires a valid variant key.';
    expect(CampaignReviewService.sanitizeErrorMessage(variantError)).toBe(variantError);
  });

  it('handles null, undefined, and empty string errors safely', () => {
    expect(CampaignReviewService.sanitizeErrorMessage(null)).toBe(CampaignReviewService.SAFE_GENERIC_ERROR);
    expect(CampaignReviewService.sanitizeErrorMessage(undefined)).toBe(CampaignReviewService.SAFE_GENERIC_ERROR);
    expect(CampaignReviewService.sanitizeErrorMessage('')).toBe(CampaignReviewService.SAFE_GENERIC_ERROR);
    expect(CampaignReviewService.sanitizeErrorMessage('   ')).toBe(CampaignReviewService.SAFE_GENERIC_ERROR);
  });
});
