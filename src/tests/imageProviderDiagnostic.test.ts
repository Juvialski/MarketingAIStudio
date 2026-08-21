import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageProviderRegistry } from '../services/providers/imageProviderRegistry';
import { ImageProviderRouter, SupabaseEdgeImageProvider, UploadOnlyProvider, extractEdgeErrorMessage } from '../services/providers/imageProvider';
import { ImageCreativeBrief, ProviderConfig } from '../types/providers';
import { supabase } from '../services/supabase/client';

describe('Image Provider Diagnostic, Routing & Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseConfig: ProviderConfig = {
    aiProvider: 'gemini',
    defaultModelId: 'gemini-3.5-flash-lite',
    geminiModel: 'gemini-3.5-flash-lite',
    fallbackModelId: 'gemini-3.1-flash-lite',
    premiumModelId: 'gemini-3.7-flash',
    imageProvider: 'nvidia',
    imageQualityTier: 'free_dev',
    geminiImageModel: '',
    geminiImageQuotaAvailable: false,
    nvidiaModelId: 'stabilityai/stable-diffusion-3.5-large',
    bflModelId: 'flux-2-pro',
    openaiImageModel: '',
    imageSpendingLimits: {
      enablePaidGeneration: false,
      preferredPaidProvider: 'bfl',
      preferredPaidModel: 'flux-2-pro',
      maxImagesPerCampaign: 5,
      dailySpendingLimitUsd: 5,
      monthlySpendingLimitUsd: 50,
    },
    useMockFallback: false,
  };

  const sampleBrief: ImageCreativeBrief = {
    purpose: 'hero',
    subject: 'Modern single-family residence with desert landscaping in Phoenix',
    aspectRatio: '16:9',
    qualityTier: 'free_dev',
  };

  it('resolves free_dev in LIVE mode to NVIDIA with cost 0 and isPaid false', () => {
    const resolved = ImageProviderRegistry.resolveProviderForBrief(sampleBrief, baseConfig, 'live');
    expect(resolved.providerId).toBe('nvidia');
    expect(resolved.modelId).toBe('stabilityai/stable-diffusion-3.5-large');
    expect(resolved.isPaid).toBe(false);
    expect(resolved.estimatedCostUsd).toBe(0);
  });

  it('resolves free_dev in DEMO mode to mock fixture with cost 0 and isPaid false', () => {
    const resolved = ImageProviderRegistry.resolveProviderForBrief(sampleBrief, baseConfig, 'demo');
    expect(resolved.providerId).toBe('mock');
    expect(resolved.modelId).toBe('bundled-fictional-fixture');
    expect(resolved.isPaid).toBe(false);
    expect(resolved.estimatedCostUsd).toBe(0);
  });

  it('does not block NVIDIA free tier when paid generation is disabled', () => {
    const disabledConfig = {
      ...baseConfig,
      imageSpendingLimits: {
        ...baseConfig.imageSpendingLimits,
        enablePaidGeneration: false,
      },
    };
    const resolved = ImageProviderRegistry.resolveProviderForBrief(sampleBrief, disabledConfig, 'live');
    expect(resolved.providerId).toBe('nvidia');
    expect(resolved.isPaid).toBe(false);
    expect(resolved.estimatedCostUsd).toBe(0);
  });

  it('blocks BFL paid generation when paid generation is disabled', () => {
    const disabledConfig = {
      ...baseConfig,
      imageSpendingLimits: {
        ...baseConfig.imageSpendingLimits,
        enablePaidGeneration: false,
      },
    };
    const paidBrief: ImageCreativeBrief = {
      ...sampleBrief,
      qualityTier: 'paid_standard',
    };
    const resolved = ImageProviderRegistry.resolveProviderForBrief(paidBrief, disabledConfig, 'live');
    // Falls back to free NVIDIA
    expect(resolved.providerId).toBe('nvidia');
    expect(resolved.isPaid).toBe(false);
    expect(resolved.estimatedCostUsd).toBe(0);
  });

  it('allows BFL paid generation when paid generation is explicitly enabled', () => {
    const enabledConfig = {
      ...baseConfig,
      imageSpendingLimits: {
        ...baseConfig.imageSpendingLimits,
        enablePaidGeneration: true,
      },
    };
    const paidBrief: ImageCreativeBrief = {
      ...sampleBrief,
      qualityTier: 'paid_maximum',
    };
    const resolved = ImageProviderRegistry.resolveProviderForBrief(paidBrief, enabledConfig, 'live');
    expect(resolved.providerId).toBe('bfl');
    expect(resolved.modelId).toBe('flux-2-max');
    expect(resolved.isPaid).toBe(true);
    expect(resolved.estimatedCostUsd).toBe(0.07);
  });

  it('returns UploadOnlyProvider in demo mode regardless of Supabase configuration', () => {
    const adapter = ImageProviderRouter.getAdapterForConfig(baseConfig, {
      runtimeMode: 'demo',
      campaignId: 'demo-campaign',
    });
    expect(adapter).toBeInstanceOf(UploadOnlyProvider);
    expect(adapter.id).toBe('demo-fixture-provider');
  });

  it('passes organizationId and campaignId to SupabaseEdgeImageProvider invocation in live mode', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: {
        assetId: 'asset-uuid-123',
        signedUrl: 'https://example.com/asset.png',
        provider: 'nvidia',
        model: 'stabilityai/stable-diffusion-3.5-large',
        provenance: 'generated',
        isAiIllustrative: true,
        estimatedCostUsd: 0,
      },
      error: null,
    });
    vi.spyOn(supabase, 'functions', 'get').mockReturnValue({
      invoke: mockInvoke,
    } as any);

    const provider = new SupabaseEdgeImageProvider(baseConfig, {
      organizationId: 'org-uuid-456',
      campaignId: 'camp-uuid-789',
      runtimeMode: 'live',
    });
    vi.spyOn(provider, 'isConfigured').mockReturnValue(true);

    const result = await provider.generateFromBrief(sampleBrief);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith('generate-image', expect.objectContaining({
      body: expect.objectContaining({
        organizationId: 'org-uuid-456',
        campaignId: 'camp-uuid-789',
        provider: 'nvidia',
        model: 'stabilityai/stable-diffusion-3.5-large',
      }),
    }));

    expect(result.url).toBe('https://example.com/asset.png');
    expect(result.provider).toBe('nvidia');
    expect(result.provenance).toBe('generated');
    expect(result.costMetadata?.estimatedCostUsd).toBe(0);
  });

  it('extracts safe structured error messages from Edge Function errors', async () => {
    const testCases = [
      {
        error: {
          context: {
            json: async () => ({ error: 'provider_not_configured', message: 'The requested AI provider is not configured in backend secrets.' }),
          },
        },
        expectedCode: 'provider_not_configured',
        expectedMsg: 'The requested AI provider is not configured in backend secrets.',
      },
      {
        error: {
          context: {
            json: async () => ({ error: 'provider_auth_failed', message: 'Provider authentication failed. Verify the API key in Edge Function secrets.' }),
          },
        },
        expectedCode: 'provider_auth_failed',
        expectedMsg: 'Provider authentication failed. Verify the API key in Edge Function secrets.',
      },
      {
        error: {
          context: {
            json: async () => ({ error: 'paid_generation_disabled', message: 'Paid generation is disabled by workspace settings or server policy.' }),
          },
        },
        expectedCode: 'paid_generation_disabled',
        expectedMsg: 'Paid generation is disabled by workspace settings or server policy.',
      },
      {
        error: {
          context: {
            json: async () => ({ error: 'provider_rate_limited' }),
          },
        },
        expectedCode: 'provider_rate_limited',
        expectedMsg: 'AI provider rate limit reached. Please try again shortly.',
      },
    ];

    for (const tc of testCases) {
      const extracted = await extractEdgeErrorMessage(tc.error);
      expect(extracted.code).toBe(tc.expectedCode);
      expect(extracted.message).toBe(tc.expectedMsg);
    }
  });

  it('UploadOnlyProvider returns deterministic fixture in demo mode without network requests', async () => {
    const mockInvoke = vi.spyOn(supabase.functions, 'invoke');
    const demoProvider = new UploadOnlyProvider();

    const result = await demoProvider.generateFromBrief(sampleBrief);
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.provider).toBe('demo_fixture');
    expect(result.provenance).toBe('fixture');
    expect(result.url).toBe('/demo/fictional-property-exterior.png');
    expect(result.metadata?.estimatedCostUsd).toBe(0);
  });
});
