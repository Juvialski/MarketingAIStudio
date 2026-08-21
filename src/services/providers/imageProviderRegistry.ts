import {
  ImageCreativeBrief,
  ImageProviderDefinition,
  ImageProviderType,
  ImageQualityTier,
  ProviderConfig,
} from '../../types/providers';

export interface ImageModelCatalogItem {
  id: string;
  providerId: ImageProviderType;
  displayName: string;
  userLabel: string;
  tier: ImageQualityTier;
  estimatedCostUsd: number;
  supportsMultipleReferences: boolean;
  supportsEditing: boolean;
  supportsHighResolution: boolean;
  supportsBrandColorControl: boolean;
  supportsGrounding: boolean;
  recommendedFor: string;
  description: string;
}

/**
 * Informational client catalog. The Edge Function owns the authoritative
 * allowlist, provider availability, pricing calculation, and spend decision.
 */
export const IMAGE_PROVIDER_DEFINITIONS: Record<ImageProviderType, ImageProviderDefinition> = {
  upload: {
    providerId: 'upload',
    displayName: 'Authentic uploads and fictional demo fixtures',
    tier: 'free_dev',
    models: ['authentic-real-upload', 'bundled-fictional-fixture'],
    supportsTextToImage: false,
    supportsEditing: false,
    supportsMultipleReferences: true,
    supportsHighResolution: true,
    supportsBrandColorControl: false,
    supportsGrounding: true,
    estimatedCostPerImageUsd: 0,
    active: true,
    configured: true,
    description: 'Real property photography in live workspaces; explicitly fictional bundled imagery in demo mode.',
  },
  nvidia: {
    providerId: 'nvidia',
    displayName: 'NVIDIA NIM Visual Generation',
    tier: 'free_dev',
    models: [
      'stabilityai/stable-diffusion-3.5-large',
      'black-forest-labs/flux.1-dev',
      'black-forest-labs/flux.1-schnell',
    ],
    supportsTextToImage: true,
    supportsEditing: false,
    supportsMultipleReferences: false,
    supportsHighResolution: true,
    supportsBrandColorControl: false,
    supportsGrounding: false,
    estimatedCostPerImageUsd: 0,
    active: true,
    configured: true,
    description: 'Free development visual concept generation via server-side NVIDIA NIM.',
  },
  bfl: {
    providerId: 'bfl',
    displayName: 'Black Forest Labs FLUX.2',
    tier: 'paid_standard',
    models: ['flux-2-pro', 'flux-2-max', 'flux-2-flex'],
    supportsTextToImage: true,
    supportsEditing: true,
    supportsMultipleReferences: true,
    supportsHighResolution: true,
    supportsBrandColorControl: true,
    supportsGrounding: true,
    estimatedCostPerImageUsd: 0.03,
    active: true,
    configured: false,
    description: 'Server-only FLUX.2 generation. Prices shown in the UI are estimates; the server records actual request metadata.',
  },
  gemini_image: {
    providerId: 'gemini_image',
    displayName: 'Google Gemini native image generation',
    tier: 'paid_alternate',
    models: [
      'gemini-3.1-flash-image',
      'gemini-3.1-flash-lite-image',
      'gemini-3-pro-image',
      'gemini-2.5-flash-image',
    ],
    supportsTextToImage: true,
    supportsEditing: true,
    supportsMultipleReferences: true,
    supportsHighResolution: true,
    supportsBrandColorControl: true,
    supportsGrounding: true,
    estimatedCostPerImageUsd: 0,
    active: false,
    configured: false,
    description: 'Google Gemini native image generation is not enabled on this deployment.',
  },
  openai_image: {
    providerId: 'openai_image',
    displayName: 'OpenAI GPT Image',
    tier: 'paid_standard',
    models: ['gpt-image-2'],
    supportsTextToImage: true,
    supportsEditing: true,
    supportsMultipleReferences: true,
    supportsHighResolution: true,
    supportsBrandColorControl: false,
    supportsGrounding: false,
    estimatedCostPerImageUsd: 0,
    active: false,
    configured: false,
    description: 'Future server adapter; no browser implementation or false DALL·E substitution.',
  },
  mock: {
    providerId: 'mock',
    displayName: 'Fictional demo fixture',
    tier: 'free_dev',
    models: ['bundled-fictional-fixture'],
    supportsTextToImage: false,
    supportsEditing: false,
    supportsMultipleReferences: false,
    supportsHighResolution: true,
    supportsBrandColorControl: false,
    supportsGrounding: false,
    estimatedCostPerImageUsd: 0,
    active: true,
    configured: true,
    description: 'Deterministic offline image fixture, always labeled as fictional demo content.',
  },
};

function model(
  item: Omit<ImageModelCatalogItem, 'supportsBrandColorControl' | 'supportsGrounding'> &
    Partial<Pick<ImageModelCatalogItem, 'supportsBrandColorControl' | 'supportsGrounding'>>
): ImageModelCatalogItem {
  return {
    supportsBrandColorControl: false,
    supportsGrounding: false,
    ...item,
  };
}

export const IMAGE_MODELS: Record<string, ImageModelCatalogItem> = {
  'stabilityai/stable-diffusion-3.5-large': model({
    id: 'stabilityai/stable-diffusion-3.5-large',
    providerId: 'nvidia',
    displayName: 'Stable Diffusion 3.5 Large (NVIDIA NIM)',
    userLabel: 'Server access verification required',
    tier: 'free_dev',
    estimatedCostUsd: 0,
    supportsMultipleReferences: false,
    supportsEditing: false,
    supportsHighResolution: true,
    recommendedFor: 'Development concepts after account smoke verification',
    description: 'Current NVIDIA visual NIM catalog model; not assumed configured.',
  }),
  'black-forest-labs/flux.1-schnell': model({
    id: 'black-forest-labs/flux.1-schnell',
    providerId: 'nvidia',
    displayName: 'FLUX.1 Schnell (NVIDIA NIM)',
    userLabel: 'Server access verification required',
    tier: 'free_dev',
    estimatedCostUsd: 0,
    supportsMultipleReferences: false,
    supportsEditing: false,
    supportsHighResolution: true,
    recommendedFor: 'Fast development concepts after account smoke verification',
    description: 'Current NVIDIA visual NIM catalog model; not assumed configured.',
  }),
  'flux-2-pro': model({
    id: 'flux-2-pro',
    providerId: 'bfl',
    displayName: 'FLUX.2 Pro',
    userLabel: 'Paid production standard',
    tier: 'paid_standard',
    estimatedCostUsd: 0.03,
    supportsMultipleReferences: true,
    supportsEditing: true,
    supportsHighResolution: true,
    supportsBrandColorControl: true,
    supportsGrounding: true,
    recommendedFor: 'Supporting campaign visuals',
    description: 'Official BFL FLUX.2 Pro endpoint; estimate begins at current base pricing.',
  }),
  'flux-2-max': model({
    id: 'flux-2-max',
    providerId: 'bfl',
    displayName: 'FLUX.2 Max',
    userLabel: 'Paid maximum quality',
    tier: 'paid_maximum',
    estimatedCostUsd: 0.07,
    supportsMultipleReferences: true,
    supportsEditing: true,
    supportsHighResolution: true,
    supportsBrandColorControl: true,
    supportsGrounding: true,
    recommendedFor: 'Final conceptual hero imagery',
    description: 'Official BFL FLUX.2 Max endpoint; estimate begins at current base pricing.',
  }),
  'flux-2-flex': model({
    id: 'flux-2-flex',
    providerId: 'bfl',
    displayName: 'FLUX.2 Flex',
    userLabel: 'Paid specialized control',
    tier: 'paid_specialized',
    estimatedCostUsd: 0.05,
    supportsMultipleReferences: true,
    supportsEditing: true,
    supportsHighResolution: true,
    supportsBrandColorControl: true,
    supportsGrounding: true,
    recommendedFor: 'Reference-guided controlled imagery',
    description: 'Official BFL FLUX.2 Flex endpoint; estimate begins at current base pricing.',
  }),
  'gemini-3.1-flash-image': model({
    id: 'gemini-3.1-flash-image',
    providerId: 'gemini_image',
    displayName: 'Gemini 3.1 Flash Image',
    userLabel: 'Server access verification required',
    tier: 'paid_alternate',
    estimatedCostUsd: 0,
    supportsMultipleReferences: true,
    supportsEditing: true,
    supportsHighResolution: true,
    supportsBrandColorControl: true,
    supportsGrounding: true,
    recommendedFor: 'Brand-grounded iterative visuals after project verification',
    description: 'Current official Gemini native image model; no retired Imagen substitution.',
  }),
  'gpt-image-2': model({
    id: 'gpt-image-2',
    providerId: 'openai_image',
    displayName: 'GPT Image 2',
    userLabel: 'Future server adapter',
    tier: 'paid_standard',
    estimatedCostUsd: 0,
    supportsMultipleReferences: true,
    supportsEditing: true,
    supportsHighResolution: true,
    recommendedFor: 'Future server integration',
    description: 'No active client adapter and no DALL·E substitution.',
  }),
};

export class ImageProviderRegistry {
  public static getAllProviders(): ImageProviderDefinition[] {
    return Object.values(IMAGE_PROVIDER_DEFINITIONS);
  }

  public static getProvider(id: ImageProviderType): ImageProviderDefinition {
    return IMAGE_PROVIDER_DEFINITIONS[id] || IMAGE_PROVIDER_DEFINITIONS.upload;
  }

  public static getModelsByTier(tier: ImageQualityTier): ImageModelCatalogItem[] {
    return Object.values(IMAGE_MODELS).filter((item) => item.tier === tier);
  }

  public static resolveProviderForBrief(
    brief: ImageCreativeBrief,
    config: ProviderConfig,
    runtimeMode: 'demo' | 'live' = 'live'
  ): { providerId: ImageProviderType; modelId: string; isPaid: boolean; estimatedCostUsd: number } {
    const requestedTier = brief.qualityTier || config.imageQualityTier || 'free_dev';
    const paidEnabled = config.imageSpendingLimits?.enablePaidGeneration === true;

    if (runtimeMode === 'demo') {
      return {
        providerId: 'mock',
        modelId: 'bundled-fictional-fixture',
        isPaid: false,
        estimatedCostUsd: 0,
      };
    }

    if (requestedTier === 'free_dev' || !paidEnabled) {
      return {
        providerId: 'nvidia',
        modelId: config.nvidiaModelId || 'stabilityai/stable-diffusion-3.5-large',
        isPaid: false,
        estimatedCostUsd: 0,
      };
    }

    if (requestedTier === 'paid_maximum' || (requestedTier === 'auto' && brief.purpose === 'hero')) {
      return { providerId: 'bfl', modelId: 'flux-2-max', isPaid: true, estimatedCostUsd: 0.07 };
    }
    if (requestedTier === 'paid_specialized') {
      return { providerId: 'bfl', modelId: 'flux-2-flex', isPaid: true, estimatedCostUsd: 0.05 };
    }
    if (requestedTier === 'paid_alternate') {
      // Gemini image is not enabled on this deployment; fallback safely to free NVIDIA tier
      return {
        providerId: 'nvidia',
        modelId: config.nvidiaModelId || 'stabilityai/stable-diffusion-3.5-large',
        isPaid: false,
        estimatedCostUsd: 0,
      };
    }
    return { providerId: 'bfl', modelId: 'flux-2-pro', isPaid: true, estimatedCostUsd: 0.03 };
  }

  public static getCostEstimate(modelIdOrTier: string): number {
    if (IMAGE_MODELS[modelIdOrTier]) return IMAGE_MODELS[modelIdOrTier].estimatedCostUsd;
    switch (modelIdOrTier as ImageQualityTier) {
      case 'paid_maximum': return 0.07;
      case 'paid_specialized': return 0.05;
      case 'paid_standard': return 0.03;
      default: return 0;
    }
  }
}
