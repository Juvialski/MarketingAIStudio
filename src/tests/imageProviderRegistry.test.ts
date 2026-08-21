import { describe, it, expect } from 'vitest';
import { ImageProviderRegistry, IMAGE_MODELS } from '../services/providers/imageProviderRegistry';
import { CreativeBriefComposer } from '../services/providers/creativeBriefComposer';
import { ImageCreativeBrief, ProviderConfig } from '../types/providers';
import { CampaignSourceData } from '../types/campaign';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('Image Provider Registry, Quality Tiers & Creative Brief Composer', () => {
  it('should register all expected free, paid, and future image providers', () => {
    const providers = ImageProviderRegistry.getAllProviders();
    const providerIds = providers.map((p) => p.providerId);

    expect(providerIds).toContain('upload');
    expect(providerIds).toContain('nvidia');
    expect(providerIds).toContain('bfl');
    expect(providerIds).toContain('gemini_image');
    expect(providerIds).toContain('openai_image');
  });

  it('defines current FLUX.2 endpoints with documented starting estimates and tiers', () => {
    const fluxPro = IMAGE_MODELS['flux-2-pro'];
    const fluxMax = IMAGE_MODELS['flux-2-max'];
    const fluxFlex = IMAGE_MODELS['flux-2-flex'];

    expect(fluxPro.tier).toBe('paid_standard');
    expect(fluxPro.estimatedCostUsd).toBe(0.03);
    expect(fluxPro.supportsMultipleReferences).toBe(true);

    expect(fluxMax.tier).toBe('paid_maximum');
    expect(fluxMax.userLabel).toContain('maximum quality');
    expect(fluxMax.estimatedCostUsd).toBe(0.07);

    expect(fluxFlex.tier).toBe('paid_specialized');
    expect(fluxFlex.estimatedCostUsd).toBe(0.05);
  });

  it('uses a current official Gemini image ID without an Imagen substitution', () => {
    const geminiImage = IMAGE_MODELS['gemini-3.1-flash-image'];
    expect(geminiImage.tier).toBe('paid_alternate');
    expect(geminiImage.estimatedCostUsd).toBe(0);
    expect(geminiImage.supportsGrounding).toBe(true);
    expect(geminiImage.description).toContain('no retired Imagen substitution');
  });

  it('should strictly force free/dev tier when enablePaidGeneration is false', () => {
    const config: ProviderConfig = {
      aiProvider: 'gemini',
      defaultModelId: 'gemini-3.5-flash-lite',
      geminiModel: 'gemini-3.5-flash-lite',
      fallbackModelId: 'gemini-3.1-flash-lite',
      premiumModelId: 'gemini-3.7-flash',
      imageProvider: 'bfl',
      imageQualityTier: 'paid_maximum',
      geminiImageModel: 'gemini-3.1-flash-image',
      geminiImageQuotaAvailable: false,
      nvidiaModelId: 'stabilityai/stable-diffusion-3.5-large',
      imageSpendingLimits: {
        enablePaidGeneration: false, // OFF
        preferredPaidProvider: 'bfl',
        preferredPaidModel: 'flux-2-max',
        maxImagesPerCampaign: 5,
        dailySpendingLimitUsd: 5.0,
        monthlySpendingLimitUsd: 50.0,
      },
      useMockFallback: true,
    };

    const brief: ImageCreativeBrief = {
      purpose: 'hero',
      subject: 'Luxury modern villa',
      aspectRatio: '1:1',
      qualityTier: 'paid_maximum',
    };

    const resolvedLive = ImageProviderRegistry.resolveProviderForBrief(brief, config, 'live');
    expect(resolvedLive.isPaid).toBe(false);
    expect(resolvedLive.estimatedCostUsd).toBe(0.0);
    expect(resolvedLive.providerId).toBe('nvidia');
    expect(resolvedLive.modelId).toBe('stabilityai/stable-diffusion-3.5-large');

    const resolvedDemo = ImageProviderRegistry.resolveProviderForBrief(brief, config, 'demo');
    expect(resolvedDemo.isPaid).toBe(false);
    expect(resolvedDemo.estimatedCostUsd).toBe(0.0);
    expect(resolvedDemo.providerId).toBe('mock');
    expect(resolvedDemo.modelId).toBe('bundled-fictional-fixture');
  });

  it('should resolve FLUX.2 Max for hero and FLUX.2 Pro for supporting in auto mode when paid is enabled', () => {
    const config: ProviderConfig = {
      aiProvider: 'gemini',
      defaultModelId: 'gemini-3.5-flash-lite',
      geminiModel: 'gemini-3.5-flash-lite',
      fallbackModelId: 'gemini-3.1-flash-lite',
      premiumModelId: 'gemini-3.7-flash',
      imageProvider: 'bfl',
      imageQualityTier: 'auto',
      geminiImageModel: 'gemini-3.1-flash-image',
      geminiImageQuotaAvailable: false,
      nvidiaModelId: 'stabilityai/stable-diffusion-3.5-large',
      imageSpendingLimits: {
        enablePaidGeneration: true,
        preferredPaidProvider: 'bfl',
        preferredPaidModel: 'flux-2-max',
        maxImagesPerCampaign: 5,
        dailySpendingLimitUsd: 5.0,
        monthlySpendingLimitUsd: 50.0,
      },
      useMockFallback: true,
    };

    const heroBrief: ImageCreativeBrief = {
      purpose: 'hero',
      subject: 'Exterior front elevation',
      aspectRatio: '16:9',
      qualityTier: 'auto',
    };
    const resolvedHero = ImageProviderRegistry.resolveProviderForBrief(heroBrief, config);
    expect(resolvedHero.isPaid).toBe(true);
    expect(resolvedHero.modelId).toBe('flux-2-max');
    expect(resolvedHero.estimatedCostUsd).toBe(0.07);

    const supportingBrief: ImageCreativeBrief = {
      purpose: 'supporting',
      subject: 'Kitchen remodel',
      aspectRatio: '1:1',
      qualityTier: 'auto',
    };
    const resolvedSupporting = ImageProviderRegistry.resolveProviderForBrief(supportingBrief, config);
    expect(resolvedSupporting.isPaid).toBe(true);
    expect(resolvedSupporting.modelId).toBe('flux-2-pro');
    expect(resolvedSupporting.estimatedCostUsd).toBe(0.03);
  });

  it('should compose structured creative briefs from property and brand context', () => {
    const sourceData: CampaignSourceData = {
      campaignType: 'fix_and_flip',
      title: 'Midtown Value-Add',
      targetMarket: 'Scottsdale, AZ',
      property: {
        address: '4502 N Camelback Rd',
        city: 'Scottsdale',
        state: 'AZ',
        neighborhood: 'Old Town',
        propertyType: 'single_family',
        financials: { purchasePrice: 500000, arv: 720000 },
        investmentThesis: 'Cosmetic flip',
        dealHighlights: ['Spread: $220k'],
      },
      uploadedImages: [],
    };

    const brief = CreativeBriefComposer.composeBrief({
      sourceData,
      brandKit: DEFAULT_BRAND_KIT,
      purpose: 'hero',
      style: 'dusk_luxury',
      aspectRatio: '16:9',
    });

    expect(brief.purpose).toBe('hero');
    expect(brief.subject).toContain('Old Town, Scottsdale');
    expect(brief.style).toBe('dusk_luxury');
    expect(brief.brandColors).toBeDefined();
    expect(brief.brandColors!.length).toBeGreaterThan(0);

    const prompt = CreativeBriefComposer.briefToPrompt(brief);
    expect(prompt).toContain('Twilight architectural lighting');
    expect(prompt).toContain('Photorealistic 8k commercial real estate imagery');
  });
});
