import { describe, it, expect } from 'vitest';
import { ModelRegistry, GEMINI_TEXT_MODELS, IMAGE_MODELS } from '../services/providers/modelRegistry';
import { ProviderConfig } from '../types/providers';

describe('AI Model Registry & Quotas', () => {
  it('should define Gemini 3.5 Flash Lite as the default high-volume model with 500 RPD', () => {
    const defaultModel = ModelRegistry.getDefaultTextModel();
    expect(defaultModel.id).toBe('gemini-3.5-flash-lite');
    expect(defaultModel.displayName).toBe('Gemini 3.5 Flash Lite');
    expect(defaultModel.userLabel).toBe('Recommended · High Volume');
    expect(defaultModel.tier).toBe('high_volume');
    expect(defaultModel.recommended).toBe(true);
    expect(defaultModel.observedRPM).toBe(15);
    expect(defaultModel.observedTPM).toBe(250000);
    expect(defaultModel.observedRPD).toBe(500);
  });

  it('should define Gemini 3.1 Flash Lite as the primary high-volume fallback with 500 RPD', () => {
    const fallbackModel = ModelRegistry.getFallbackTextModel();
    expect(fallbackModel.id).toBe('gemini-3.1-flash-lite');
    expect(fallbackModel.displayName).toBe('Gemini 3.1 Flash Lite');
    expect(fallbackModel.userLabel).toBe('High Volume Fallback');
    expect(fallbackModel.tier).toBe('fallback');
    expect(fallbackModel.observedRPM).toBe(15);
    expect(fallbackModel.observedTPM).toBe(250000);
    expect(fallbackModel.observedRPD).toBe(500);
  });

  it('should define Gemini 3.7 Flash as the preferred premium model with 20 RPD', () => {
    const premiumModel = ModelRegistry.getPreferredPremiumModel();
    expect(premiumModel.id).toBe('gemini-3.7-flash');
    expect(premiumModel.displayName).toBe('Gemini 3.7 Flash');
    expect(premiumModel.userLabel).toBe('Latest · Highest Quality · Limited');
    expect(premiumModel.tier).toBe('premium');
    expect(premiumModel.observedRPM).toBe(5);
    expect(premiumModel.observedTPM).toBe(250000);
    expect(premiumModel.observedRPD).toBe(20);
    expect(premiumModel.supportsThinking).toBe(true);
  });

  it('should define intermediate models Gemini 3.5 Flash and 3.6 Flash with 20 RPD', () => {
    const flash35 = GEMINI_TEXT_MODELS['gemini-3.5-flash'];
    const flash36 = GEMINI_TEXT_MODELS['gemini-3.6-flash'];

    expect(flash35.userLabel).toBe('Enhanced Quality · Limited');
    expect(flash35.observedRPD).toBe(20);
    expect(flash35.observedRPM).toBe(5);

    expect(flash36.userLabel).toBe('Advanced · Limited');
    expect(flash36.observedRPD).toBe(20);
    expect(flash36.observedRPM).toBe(5);
  });

  it('should resolve default models for routine operations and premium for review', () => {
    const config: Partial<ProviderConfig> = {
      defaultModelId: 'gemini-3.5-flash-lite',
      premiumModelId: 'gemini-3.7-flash',
    };

    const routine = ModelRegistry.resolveModelForOperation('campaign_kit', config);
    expect(routine.modelId).toBe('gemini-3.5-flash-lite');
    expect(routine.thinkingLevel).toBe('low');

    const review = ModelRegistry.resolveModelForOperation('final_review', config);
    expect(review.modelId).toBe('gemini-3.7-flash');
    expect(review.thinkingLevel).toBe('high');
  });

  it('should respect per-operation overrides when configured', () => {
    const config: Partial<ProviderConfig> = {
      defaultModelId: 'gemini-3.5-flash-lite',
      operationOverrides: {
        campaign_strategy: 'gemini-3.6-flash',
      },
      thinkingLevels: {
        campaign_strategy: 'medium',
      },
    };

    const strategy = ModelRegistry.resolveModelForOperation('campaign_strategy', config);
    expect(strategy.modelId).toBe('gemini-3.6-flash');
    expect(strategy.thinkingLevel).toBe('medium');
  });

  it('should configure correct fallback chains', () => {
    const highVolumeChain = ModelRegistry.getFallbackChain('gemini-3.5-flash-lite');
    expect(highVolumeChain).toEqual(['gemini-3.1-flash-lite']);

    const premiumChain = ModelRegistry.getFallbackChain('gemini-3.7-flash');
    expect(premiumChain).toContain('gemini-3.6-flash');
    expect(premiumChain).toContain('gemini-3.5-flash');
    expect(premiumChain).toContain('gemini-3.5-flash-lite');
  });

  it('marks current image models as unavailable until server access is verified', () => {
    const geminiImage = IMAGE_MODELS['gemini-3.1-flash-image'];
    expect(geminiImage.quotaAvailable).toBe(false);

    const nvidiaModel = IMAGE_MODELS['stabilityai/stable-diffusion-3.5-large'];
    expect(nvidiaModel.quotaAvailable).toBe(false);
    expect(nvidiaModel.provider).toBe('nvidia');

    const uploadOnly = IMAGE_MODELS['authentic-upload-only'];
    expect(uploadOnly.quotaAvailable).toBe(true);
    expect(uploadOnly.provider).toBe('upload');
  });
});
