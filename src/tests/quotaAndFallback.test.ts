import { describe, it, expect, beforeEach } from 'vitest';
import { QuotaManager } from '../services/providers/quotaManager';
import { UsageTracker } from '../services/providers/usageTracker';
import { UploadOnlyProvider } from '../services/providers/imageProvider';
import { MockAIProvider } from '../services/providers/mockProvider';
import { CampaignSourceData } from '../types/campaign';
import { BrandKit, DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('Quota Manager, Error Classification & Fallback Engine', () => {
  beforeEach(() => {
    UsageTracker.clearUsageHistory();
  });

  it('should correctly classify 401/403 as invalid_api_key', () => {
    const err = { status: 401, message: 'API_KEY_INVALID' };
    const classified = QuotaManager.classifyError(err);
    expect(classified.errorCode).toBe('invalid_api_key');
    expect(classified.isAuthError).toBe(true);
    expect(classified.retryable).toBe(false);
  });

  it('should correctly classify daily quota exhaustion (RPD)', () => {
    const err = { status: 429, message: 'ResourceExhausted: Quota exceeded perDay for models/gemini-3.7-flash' };
    const classified = QuotaManager.classifyError(err);
    expect(classified.errorCode).toBe('daily_quota_exhausted');
    expect(classified.isDailyQuotaExhausted).toBe(true);
    expect(classified.retryable).toBe(false);
  });

  it('should correctly classify RPM and TPM rate limits', () => {
    const rpmErr = { status: 429, message: 'Rate limit exceeded perMinute RPM' };
    expect(QuotaManager.classifyError(rpmErr).errorCode).toBe('rate_limit_rpm');

    const tpmErr = { status: 429, message: 'Token limit exceeded TPM' };
    expect(QuotaManager.classifyError(tpmErr).errorCode).toBe('rate_limit_tpm');
  });

  it('should correctly classify unavailable models and malformed JSON', () => {
    const modelErr = { status: 404, message: 'models/gemini-old is not found' };
    expect(QuotaManager.classifyError(modelErr).errorCode).toBe('model_unavailable');

    const jsonErr = new SyntaxError('Unexpected token < in JSON at position 0');
    expect(QuotaManager.classifyError(jsonErr).errorCode).toBe('malformed_structured_response');
  });

  it('should execute fallback chain when primary model encounters 429 quota error', async () => {
    let callCount = 0;
    const attemptedModels: string[] = [];

    const { result, metadata } = await QuotaManager.executeWithFallback<string>({
      requestedModelId: 'gemini-3.5-flash-lite',
      operation: 'campaign_kit',
      execute: async (modelId) => {
        callCount++;
        attemptedModels.push(modelId);
        if (modelId === 'gemini-3.5-flash-lite') {
          throw { status: 429, message: 'ResourceExhausted: daily limit' };
        }
        return 'success-from-fallback';
      },
    });

    expect(result).toBe('success-from-fallback');
    expect(attemptedModels).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
    expect(metadata.fallbackOccurred).toBe(true);
    expect(metadata.requestedModel).toBe('gemini-3.5-flash-lite');
    expect(metadata.actualModel).toBe('gemini-3.1-flash-lite');
    expect(metadata.fallbackReason).toContain('switched to gemini-3.1-flash-lite');
  });

  it('should fallback to mock fixture when all live models fail', async () => {
    const { result, metadata } = await QuotaManager.executeWithFallback<string>({
      requestedModelId: 'gemini-3.5-flash-lite',
      operation: 'campaign_draft',
      execute: async () => {
        throw { status: 500, message: 'Internal Server Error' };
      },
      fallbackToMock: async () => 'mock-generated-content',
    });

    expect(result).toBe('mock-generated-content');
    expect(metadata.fallbackOccurred).toBe(true);
    expect(metadata.actualModel).toBe('mock-provider');
  });

  it('should track usage records and compute estimated remaining daily quotas', () => {
    // Record 2 calls for gemini-3.7-flash
    UsageTracker.recordUsage({
      provider: 'gemini',
      model: 'gemini-3.7-flash',
      operation: 'final_review',
      success: true,
      latencyMs: 320,
    });
    UsageTracker.recordUsage({
      provider: 'gemini',
      model: 'gemini-3.7-flash',
      operation: 'final_review',
      success: true,
      latencyMs: 290,
    });

    const status = UsageTracker.getModelQuotaStatus('gemini-3.7-flash');
    expect(status.usedToday).toBe(2);
    expect(status.rpdLimit).toBe(20);
    expect(status.remainingToday).toBe(18);
    expect(status.isEstimate).toBe(true);
    expect(status.label).toContain('2 / 20 estimated calls used today');
  });

  it('should conserve quota by generating complete campaign kit in a single batch turn', async () => {
    const mock = new MockAIProvider();
    const sourceData: CampaignSourceData = {
      campaignType: 'fix_and_flip',
      title: 'Phoenix Fix & Flip',
      targetMarket: 'Phoenix, AZ',
      uploadedImages: [],
    };
    const brandKit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      companyName: 'Apex Capital',
      toneOfVoice: 'institutional',
    };

    const fullKit = await mock.generateFullMarketingKit(sourceData, brandKit);
    expect(fullKit.strategy).toBeDefined();
    expect(fullKit.strategy.coreAngle).toContain('Phoenix, AZ');
    expect(fullKit.copy).toBeDefined();
    expect(fullKit.copy.headlines.length).toBeGreaterThan(0);
    expect(fullKit.copy.facebook.headline).toBeDefined();
    expect(fullKit.copy.videoScript.scenes.length).toBe(4);
    expect(fullKit.metadata.actualModel).toBe('mock-provider');
  });

  it('returns an explicit deterministic demo fixture without calling a provider', async () => {
    const fixtureProvider = new UploadOnlyProvider();
    const image = await fixtureProvider.generateConceptImage('fictional villa kitchen', '4:5');
    expect(image.url).toBe('/demo/fictional-property-exterior.png');
    expect(image.provider).toBe('demo_fixture');
    expect(image.metadata?.modelId).toBe('bundled-fictional-fixture');
  });
});
