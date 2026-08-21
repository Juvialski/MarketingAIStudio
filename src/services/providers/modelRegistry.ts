import { AIModelDefinition, AIOperationType, ProviderConfig, ThinkingLevel } from '../../types/providers';

/**
 * Real Gemini Text Model Catalog with Observed Project Quotas
 * Observed limits:
 * - Gemini 3.5 Flash Lite: 15 RPM / 250K TPM / 500 RPD (DEFAULT)
 * - Gemini 3.1 Flash Lite: 15 RPM / 250K TPM / 500 RPD (FALLBACK)
 * - Gemini 3.5 Flash: 5 RPM / 250K TPM / 20 RPD (Enhanced Quality)
 * - Gemini 3.6 Flash: 5 RPM / 250K TPM / 20 RPD (Advanced)
 * - Gemini 3.7 Flash: 5 RPM / 250K TPM / 20 RPD (Preferred Premium)
 */
export const GEMINI_TEXT_MODELS: Record<string, AIModelDefinition> = {
  'gemini-3.5-flash-lite': {
    id: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    displayName: 'Gemini 3.5 Flash Lite',
    userLabel: 'Recommended · High Volume',
    tier: 'high_volume',
    supportsThinking: true,
    supportsVision: true,
    supportsStructuredOutput: true,
    active: true,
    recommended: true,
    observedRPM: 15,
    observedTPM: 250000,
    observedRPD: 500,
    defaultThinkingLevel: 'low',
    description: 'Default high-volume model for campaign drafts, platform copy variations, headlines, CTAs, lead summaries, and background structured JSON generation.',
  },
  'gemini-3.1-flash-lite': {
    id: 'gemini-3.1-flash-lite',
    provider: 'gemini',
    displayName: 'Gemini 3.1 Flash Lite',
    userLabel: 'High Volume Fallback',
    tier: 'fallback',
    supportsThinking: false,
    supportsVision: true,
    supportsStructuredOutput: true,
    active: true,
    recommended: false,
    observedRPM: 15,
    observedTPM: 250000,
    observedRPD: 500,
    defaultThinkingLevel: 'minimal',
    description: 'Primary high-volume fallback model when 3.5 Flash Lite is busy or temporarily rate-limited.',
  },
  'gemini-3.5-flash': {
    id: 'gemini-3.5-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.5 Flash',
    userLabel: 'Enhanced Quality · Limited',
    tier: 'intermediate',
    supportsThinking: true,
    supportsVision: true,
    supportsStructuredOutput: true,
    active: true,
    recommended: false,
    observedRPM: 5,
    observedTPM: 250000,
    observedRPD: 20,
    defaultThinkingLevel: 'medium',
    description: 'Intermediate quality model for enhanced market copy when deeper reasoning is needed.',
  },
  'gemini-3.6-flash': {
    id: 'gemini-3.6-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.6 Flash',
    userLabel: 'Advanced · Limited',
    tier: 'intermediate',
    supportsThinking: true,
    supportsVision: true,
    supportsStructuredOutput: true,
    active: true,
    recommended: false,
    observedRPM: 5,
    observedTPM: 250000,
    observedRPD: 20,
    defaultThinkingLevel: 'medium',
    description: 'Advanced reasoning and quantitative deal analysis with a limited 20 RPD allowance.',
  },
  'gemini-3.7-flash': {
    id: 'gemini-3.7-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.7 Flash',
    userLabel: 'Latest · Highest Quality · Limited',
    tier: 'premium',
    supportsThinking: true,
    supportsVision: true,
    supportsStructuredOutput: true,
    active: true,
    recommended: true,
    observedRPM: 5,
    observedTPM: 250000,
    observedRPD: 20,
    defaultThinkingLevel: 'high',
    description: 'Flagship reasoning model for institutional acquisitions strategy, complex underwriting synthesis, and final client-facing QA review.',
  },
};

export interface ImageModelDefinition {
  id: string;
  provider: 'nvidia' | 'gemini' | 'upload';
  displayName: string;
  description: string;
  quotaAvailable: boolean;
  recommended: boolean;
}

export const IMAGE_MODELS: Record<string, ImageModelDefinition> = {
  'stabilityai/stable-diffusion-3.5-large': {
    id: 'stabilityai/stable-diffusion-3.5-large',
    provider: 'nvidia',
    displayName: 'NVIDIA: Stable Diffusion 3.5 Large',
    description: 'Current visual NIM catalog model; server-account access must be verified before enablement.',
    quotaAvailable: false,
    recommended: false,
  },
  'black-forest-labs/flux.1-schnell': {
    id: 'black-forest-labs/flux.1-schnell',
    provider: 'nvidia',
    displayName: 'NVIDIA: FLUX.1 Schnell',
    description: 'Current visual NIM catalog model; server-account access must be verified before enablement.',
    quotaAvailable: false,
    recommended: false,
  },
  'gemini-3.1-flash-image': {
    id: 'gemini-3.1-flash-image',
    provider: 'gemini',
    displayName: 'Google Gemini 3.1 Flash Image',
    description: 'Current official native image model; server project access and pricing remain unverified.',
    quotaAvailable: false,
    recommended: false,
  },
  'authentic-upload-only': {
    id: 'authentic-upload-only',
    provider: 'upload',
    displayName: 'Authentic Property Photos (Upload Only)',
    description: 'Real uploaded property photography — strongly recommended for authentic deal marketing.',
    quotaAvailable: true,
    recommended: true,
  },
};

export class ModelRegistry {
  public static readonly DEFAULT_TEXT_MODEL = 'gemini-3.5-flash-lite';
  public static readonly FALLBACK_TEXT_MODEL = 'gemini-3.1-flash-lite';
  public static readonly PREFERRED_PREMIUM_MODEL = 'gemini-3.7-flash';
  public static readonly DEFAULT_NVIDIA_MODEL = 'stabilityai/stable-diffusion-3.5-large';

  public static getTextModel(id: string): AIModelDefinition {
    return GEMINI_TEXT_MODELS[id] || GEMINI_TEXT_MODELS[this.DEFAULT_TEXT_MODEL];
  }

  public static listTextModels(): AIModelDefinition[] {
    return Object.values(GEMINI_TEXT_MODELS);
  }

  public static listImageModels(): ImageModelDefinition[] {
    return Object.values(IMAGE_MODELS);
  }

  public static getDefaultTextModel(): AIModelDefinition {
    return GEMINI_TEXT_MODELS[this.DEFAULT_TEXT_MODEL];
  }

  public static getFallbackTextModel(): AIModelDefinition {
    return GEMINI_TEXT_MODELS[this.FALLBACK_TEXT_MODEL];
  }

  public static getPreferredPremiumModel(): AIModelDefinition {
    return GEMINI_TEXT_MODELS[this.PREFERRED_PREMIUM_MODEL];
  }

  /**
   * Resolves the target model ID and thinking level for a given operation.
   * Priority:
   * 1. Per-operation override in config
   * 2. Operation default tier (e.g. final_review -> preferred premium model)
   * 3. Global default model
   */
  public static resolveModelForOperation(
    operation: AIOperationType,
    config?: Partial<ProviderConfig>
  ): { modelId: string; thinkingLevel: ThinkingLevel } {
    // Check if user set an explicit override for this operation
    const userOverride = config?.operationOverrides?.[operation];
    if (userOverride && GEMINI_TEXT_MODELS[userOverride]) {
      const thinking = config?.thinkingLevels?.[operation] || GEMINI_TEXT_MODELS[userOverride].defaultThinkingLevel || 'low';
      return { modelId: userOverride, thinkingLevel: thinking };
    }

    // Operation-specific sensible defaults
    switch (operation) {
      case 'final_review':
      case 'copy_critique':
        return {
          modelId: config?.premiumModelId || this.PREFERRED_PREMIUM_MODEL,
          thinkingLevel: config?.thinkingLevels?.[operation] || 'high',
        };

      case 'campaign_strategy':
        // If user explicitly configured a premium model for strategy, use it; otherwise use default
        return {
          modelId: config?.defaultModelId || this.DEFAULT_TEXT_MODEL,
          thinkingLevel: config?.thinkingLevels?.[operation] || 'medium',
        };

      case 'presentation_deck':
        return {
          modelId: config?.defaultModelId || this.DEFAULT_TEXT_MODEL,
          thinkingLevel: config?.thinkingLevels?.[operation] || 'medium',
        };

      case 'campaign_kit':
      case 'campaign_draft':
      case 'platform_variants':
      case 'lead_summary':
      case 'general_generation':
      default:
        return {
          modelId: config?.defaultModelId || this.DEFAULT_TEXT_MODEL,
          thinkingLevel: config?.thinkingLevels?.[operation] || 'low',
        };
    }
  }

  /**
   * Returns the fallback chain for a given requested model.
   */
  public static getFallbackChain(requestedModelId: string): string[] {
    const model = this.getTextModel(requestedModelId);

    if (model.tier === 'premium' || model.tier === 'intermediate') {
      // Premium fallback chain: 3.7 -> 3.6 -> 3.5 -> 3.5 Flash Lite -> 3.1 Flash Lite
      const chain = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
      const startIndex = chain.indexOf(requestedModelId);
      return startIndex >= 0 ? chain.slice(startIndex + 1) : ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
    }

    // High volume fallback chain: 3.5 Flash Lite -> 3.1 Flash Lite
    if (requestedModelId === 'gemini-3.5-flash-lite') {
      return ['gemini-3.1-flash-lite'];
    }

    return [];
  }
}
