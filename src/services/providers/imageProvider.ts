import {
  GeneratedImageResult,
  IImageProvider,
  ImageCreativeBrief,
  ProviderConfig,
} from '../../types/providers';
import { isSupabaseConfigured, supabase } from '../supabase/client';
import { ImageProviderRegistry } from './imageProviderRegistry';

export const CURATED_STOCK_PHOTOS = [
  {
    id: 'demo-fictional-exterior',
    name: 'Fictional Demo Property Exterior',
    url: '/demo/fictional-property-exterior.png',
    category: 'exterior',
  },
  {
    id: 'demo-fictional-interior',
    name: 'Fictional Demo Property Interior',
    url: '/demo/fictional-property-interior.png',
    category: 'interior',
  },
] as const;

/**
 * Deterministic, explicitly fictional fixtures for demo/offline mode only.
 */
export class UploadOnlyProvider implements IImageProvider {
  public id = 'demo-fixture-provider';
  public name = 'Fictional Demo Photography';

  public isConfigured(): boolean {
    return true;
  }

  public async generateConceptImage(
    prompt: string,
    aspectRatio: '1:1' | '4:5' | '16:9' | '9:16' = '1:1'
  ): Promise<GeneratedImageResult> {
    return this.generateFromBrief({
      purpose: 'hero',
      subject: prompt,
      aspectRatio,
      isConceptual: true,
    });
  }

  public async generateFromBrief(brief: ImageCreativeBrief): Promise<GeneratedImageResult> {
    const interiorPurposes = new Set(['supporting', 'background', 'renovation_concept']);
    const photo = interiorPurposes.has(brief.purpose)
      ? CURATED_STOCK_PHOTOS[1]
      : CURATED_STOCK_PHOTOS[0];

    return {
      id: `${photo.id}-${brief.purpose}`,
      url: photo.url,
      altText: `${photo.name} — demo fixture, not a real listing`,
      isAiIllustrative: true,
      provider: 'demo_fixture',
      provenance: 'fixture',
      metadata: {
        modelId: 'bundled-fictional-fixture',
        prompt: brief.subject,
        estimatedCostUsd: 0,
      },
    };
  }
}

export interface EdgeImageContext {
  campaignId?: string;
  organizationId?: string;
  runtimeMode?: 'demo' | 'live';
}

export async function extractEdgeErrorMessage(error: any): Promise<{ code: string; message: string }> {
  if (error && typeof error === 'object') {
    if (error.context && typeof error.context.json === 'function') {
      try {
        const body = await error.context.json();
        if (body && typeof body === 'object') {
          const code = typeof body.error === 'string' ? body.error : 'provider_error';
          const message = typeof body.message === 'string' ? body.message : getHumanMessageForCode(code);
          return { code, message };
        }
      } catch {
        // Fall through
      }
    }
    if (error.message) {
      return { code: 'provider_error', message: error.message };
    }
  }
  return { code: 'provider_unavailable', message: 'Image generation backend is temporarily unavailable.' };
}

function getHumanMessageForCode(code: string): string {
  const messages: Record<string, string> = {
    unauthorized: 'Authentication is required. Please sign in.',
    organization_access_denied: 'You do not have access to this organization workspace.',
    campaign_access_denied: 'You do not have access to this campaign or it has not been saved.',
    provider_not_configured: 'The selected image provider (NVIDIA NIM) is not configured in backend secrets.',
    provider_pricing_unconfigured: 'Provider pricing is not configured on the server.',
    provider_disabled: 'This image provider is not enabled on the server.',
    model_not_allowed: 'The requested AI model is not in the server allowlist.',
    paid_generation_disabled: 'Paid generation is disabled by workspace settings or server policy.',
    provider_rate_limited: 'AI provider rate limit reached. Please try again shortly.',
    provider_auth_failed: 'Provider authentication failed with NVIDIA/AI API. Verify API key in Edge secrets.',
    provider_access_denied: 'Provider access denied for this model or account.',
    provider_model_unavailable: 'The requested AI model is unavailable or not found on the provider.',
    provider_unavailable: 'AI provider service is temporarily unavailable.',
    provider_timeout: 'AI provider request timed out. Please try again.',
    asset_persist_failed: 'Failed to save generated image to workspace storage.',
    asset_url_failed: 'Failed to create access URL for generated image.',
    invalid_request: 'The image generation request was invalid.',
    server_control_unavailable: 'Generation controls are temporarily unavailable.',
  };
  return messages[code] ?? 'The image generation backend could not complete this request.';
}

interface EdgeImageResponse {
  assetId?: string;
  signedUrl?: string;
  storageBucket?: string;
  storagePath?: string;
  asset?: {
    id?: string;
    accessUrl?: string;
    signedUrl?: string;
    storagePath?: string;
  };
  url?: string;
  provider?: string;
  model?: string;
  estimatedCostUsd?: number;
  provenance?: 'generated' | 'uploaded' | 'fixture' | 'fallback' | 'failed';
  isAiIllustrative?: boolean;
}

/**
 * The browser sends an authenticated request to the application backend. It
 * never receives or uses a provider credential and never falls back to a live
 * provider in browser JavaScript.
 */
export class SupabaseEdgeImageProvider implements IImageProvider {
  public id = 'supabase-edge-image';
  public name = 'Secure Server Image Generation';

  constructor(
    private readonly config: ProviderConfig,
    private readonly context: EdgeImageContext = {}
  ) {}

  public isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  public async generateConceptImage(
    prompt: string,
    aspectRatio: '1:1' | '4:5' | '16:9' | '9:16' = '1:1',
    contextNotes?: string
  ): Promise<GeneratedImageResult> {
    return this.generateFromBrief({
      purpose: 'hero',
      subject: prompt,
      aspectRatio,
      constraints: contextNotes,
      isConceptual: true,
      qualityTier: this.config.imageQualityTier,
    });
  }

  public async generateFromBrief(
    brief: ImageCreativeBrief,
    onProgress?: (step: string, percent: number) => void
  ): Promise<GeneratedImageResult> {
    if (!this.isConfigured()) {
      throw new Error('Live image generation requires the authenticated backend.');
    }

    const resolved = ImageProviderRegistry.resolveProviderForBrief(
      brief,
      this.config,
      this.context.runtimeMode ?? 'live'
    );
    onProgress?.('Requesting secure server-side image generation...', 35);

    const { data, error } = await supabase.functions.invoke<EdgeImageResponse>('generate-image', {
      body: {
        brief,
        provider: resolved.providerId,
        model: resolved.modelId,
        campaignId: this.context.campaignId,
        organizationId: this.context.organizationId,
        idempotencyKey: crypto.randomUUID(),
      },
    });

    if (error) {
      const safeError = await extractEdgeErrorMessage(error);
      throw new Error(safeError.message);
    }

    const url = data?.asset?.accessUrl || data?.asset?.signedUrl || data?.signedUrl || data?.url;
    if (!data || data.provenance === 'failed' || !url) {
      throw new Error('The image provider did not produce a persisted image asset.');
    }

    onProgress?.('Image persisted to private workspace storage.', 100);
    return {
      id: data.asset?.id || data.assetId || `server-image-${Date.now()}`,
      url,
      altText: `${brief.purpose} conceptual image — ${brief.subject}`,
      isAiIllustrative: data.isAiIllustrative ?? true,
      provider: data.provider || resolved.providerId,
      provenance: data.provenance || 'generated',
      storageBucket: data.storageBucket,
      storagePath: data.storagePath || data.asset?.storagePath,
      costMetadata: {
        estimatedCostUsd: data.estimatedCostUsd || 0,
        provider: data.provider || resolved.providerId,
        model: data.model || resolved.modelId,
        resolution: brief.aspectRatio,
        isEstimated: true,
        timestamp: new Date().toISOString(),
      },
      metadata: {
        modelId: data.model || resolved.modelId,
        prompt: brief.subject,
        estimatedCostUsd: data.estimatedCostUsd || 0,
      },
    };
  }
}

// Backwards-compatible names now resolve only to the safe fixture adapter.
export const UploadImageProvider = UploadOnlyProvider;
export const GeminiImageProvider = SupabaseEdgeImageProvider;

export class ImageProviderRouter {
  public static getAdapterForConfig(
    config: ProviderConfig,
    context: EdgeImageContext = {}
  ): IImageProvider {
    const runtimeMode = context.runtimeMode ?? config.runtimeMode ?? 'live';
    if (runtimeMode === 'demo') {
      return new UploadOnlyProvider();
    }

    if (isSupabaseConfigured()) {
      return new SupabaseEdgeImageProvider(config, context);
    }

    return new UploadOnlyProvider();
  }
}
