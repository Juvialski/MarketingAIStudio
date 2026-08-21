import { z } from 'zod';
import {
  FullKitGenerationResult,
  GenerationMetadata,
  GenerationOptions,
  GenerationProgressCallback,
  IAIProvider,
} from '../../types/providers';
import {
  Campaign,
  CampaignCopy,
  CampaignSourceData,
  CampaignStrategy,
  CopyQualityReport,
} from '../../types/campaign';
import { BrandKit, DEFAULT_BRAND_KIT } from '../../types/brandKit';
import { PresentationDeck } from '../../types/presentation';
import { presentationDeckSchema } from '../../features/presentations/schemas/presentationSchema';
import { isSupabaseConfigured, supabase } from '../supabase/client';
import { AntiSlopCritic } from '../marketing/antiSlopCritic';
import { SettingsStore } from '../storage/settingsStore';
import { ModelRegistry } from './modelRegistry';

const metadataSchema = z.object({
  requestedModel: z.string().min(1),
  actualModel: z.string().min(1),
  fallbackOccurred: z.boolean(),
  fallbackReason: z.string().optional(),
  latencyMs: z.number().nonnegative(),
  timestamp: z.string().min(1),
}).passthrough();

const strategySchema = z.object({
  targetAudience: z.object({
    name: z.string().min(1),
    description: z.string(),
    painPoints: z.array(z.string()),
    motivations: z.array(z.string()),
  }),
  primaryObjective: z.string(),
  coreAngle: z.string(),
  keyHooks: z.array(z.string()).min(1),
  valueProposition: z.string(),
  supportingEvidence: z.array(z.string()),
  ctaStrategy: z.string(),
  suggestedPlatforms: z.array(
    z.enum(['facebook', 'instagram', 'linkedin', 'email', 'video_reels'])
  ),
}).passthrough();

const platformCopySchema = z.object({
  headline: z.string(),
  body: z.string(),
  hook: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  cta: z.string(),
  hashtags: z.array(z.string()).optional(),
  characterCount: z.number().nonnegative(),
});

const copySchema = z.object({
  headlines: z.array(z.string()).min(1),
  ctas: z.array(z.string()).min(1),
  facebook: platformCopySchema,
  instagram: platformCopySchema,
  linkedin: platformCopySchema,
  emailNewsletter: z.object({
    subjectLines: z.array(z.string()).min(1),
    previewText: z.string(),
    bodyMarkdown: z.string(),
    ctaButtonText: z.string(),
    ctaUrlPlaceholder: z.string().optional(),
  }),
  videoScript: z.object({
    title: z.string(),
    durationSeconds: z.number().positive(),
    hook: z.string(),
    scenes: z.array(z.object({
      timeframe: z.string(),
      visualDirection: z.string(),
      spokenAudio: z.string(),
      onScreenText: z.string().optional(),
    })).min(1),
    callToAction: z.string(),
    targetFormat: z.literal('9:16 vertical reel'),
  }),
}).passthrough();

const qualityReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  slopIndex: z.enum(['clean', 'mild_cliches', 'heavy_slop']),
  issues: z.array(z.object({
    id: z.string(),
    severity: z.enum(['warning', 'error', 'suggestion']),
    rule: z.string(),
    matchedText: z.string(),
    explanation: z.string(),
    suggestedReplacement: z.string().optional(),
    platform: z.string().optional(),
  })),
  factualIntegrityVerified: z.boolean(),
  unsupportedClaimsDetected: z.array(z.string()),
});

type ContextualGenerationOptions = GenerationOptions & {
  campaignId?: string;
  organizationId?: string;
};

export class BackendGenerationError extends Error {
  constructor(message: string, public readonly code = 'backend_generation_failed') {
    super(message);
    this.name = 'BackendGenerationError';
  }
}

function getContext(options?: GenerationOptions) {
  const contextual = options as ContextualGenerationOptions | undefined;
  return {
    campaignId: contextual?.campaignId,
    organizationId: contextual?.organizationId,
  };
}

function edgeError(operation: string): BackendGenerationError {
  return new BackendGenerationError(
    `${operation} is unavailable because the secure AI backend did not complete the request. No browser-side provider fallback was attempted.`
  );
}

export class SupabaseFunctionsProvider implements IAIProvider {
  public id = 'supabase_edge';
  public name = 'Secure Supabase Edge Functions';

  public isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  public async generateFullMarketingKit(
    sourceData: CampaignSourceData,
    brandKit: BrandKit,
    onProgress?: GenerationProgressCallback,
    options?: GenerationOptions
  ): Promise<FullKitGenerationResult> {
    if (!this.isConfigured()) throw edgeError('Full marketing-kit generation');

    const config = SettingsStore.get();
    const resolved = ModelRegistry.resolveModelForOperation('campaign_kit', config);
    const targetModel = options?.modelId || resolved.modelId;
    const idempotencyKey = crypto.randomUUID();
    onProgress?.('Requesting one secure full-kit generation...', 25);

    const { data, error } = await supabase.functions.invoke('generate-copy', {
      body: {
        sourceData,
        brandKit,
        isFullKit: true,
        modelId: targetModel,
        thinkingLevel: options?.thinkingLevel || resolved.thinkingLevel,
        idempotencyKey,
        ...getContext(options),
      },
    });

    if (error || !data) throw edgeError('Full marketing-kit generation');

    const parsed = z.object({
      strategy: strategySchema,
      copy: copySchema,
      metadata: metadataSchema.optional(),
      model: z.string().optional(),
    }).safeParse(data);
    if (!parsed.success) {
      throw new BackendGenerationError('The secure AI backend returned a malformed marketing kit.', 'malformed_structured_response');
    }

    const metadata: GenerationMetadata = parsed.data.metadata || {
      requestedModel: targetModel,
      actualModel: parsed.data.model || targetModel,
      fallbackOccurred: false,
      latencyMs: 0,
      timestamp: new Date().toISOString(),
    };
    const strategy = parsed.data.strategy as CampaignStrategy;
    const copy = parsed.data.copy as CampaignCopy;
    strategy.generationMetadata = metadata;
    copy.generationMetadata = metadata;
    copy.qualityReport = AntiSlopCritic.reviewCampaignCopy(copy, sourceData, brandKit);

    onProgress?.('Full marketing kit validated and ready.', 100);
    return { strategy, copy, metadata };
  }

  public async generateStrategy(
    sourceData: CampaignSourceData,
    brandKit: BrandKit,
    onProgress?: GenerationProgressCallback,
    options?: GenerationOptions
  ): Promise<CampaignStrategy> {
    if (!this.isConfigured()) throw edgeError('Campaign strategy generation');

    const config = SettingsStore.get();
    const resolved = ModelRegistry.resolveModelForOperation('campaign_strategy', config);
    const targetModel = options?.modelId || resolved.modelId;
    const idempotencyKey = crypto.randomUUID();
    onProgress?.('Requesting secure campaign strategy...', 20);

    const { data, error } = await supabase.functions.invoke('generate-campaign-strategy', {
      body: {
        sourceData,
        brandKit,
        modelId: targetModel,
        thinkingLevel: options?.thinkingLevel || resolved.thinkingLevel,
        idempotencyKey,
        ...getContext(options),
      },
    });
    if (error || !data?.strategy) throw edgeError('Campaign strategy generation');

    const parsed = strategySchema.safeParse(data.strategy);
    if (!parsed.success) {
      throw new BackendGenerationError('The secure AI backend returned a malformed strategy.', 'malformed_structured_response');
    }
    onProgress?.('Strategy validated and ready.', 100);
    return parsed.data as CampaignStrategy;
  }

  public async generateCopy(
    sourceData: CampaignSourceData,
    strategy: CampaignStrategy,
    brandKit: BrandKit,
    onProgress?: GenerationProgressCallback,
    options?: GenerationOptions
  ): Promise<CampaignCopy> {
    if (!this.isConfigured()) throw edgeError('Campaign copy generation');

    const config = SettingsStore.get();
    const resolved = ModelRegistry.resolveModelForOperation('platform_variants', config);
    const targetModel = options?.modelId || resolved.modelId;
    const idempotencyKey = crypto.randomUUID();
    onProgress?.('Requesting secure platform copy...', 30);

    const { data, error } = await supabase.functions.invoke('generate-copy', {
      body: {
        sourceData,
        strategy,
        brandKit,
        modelId: targetModel,
        thinkingLevel: options?.thinkingLevel || resolved.thinkingLevel,
        idempotencyKey,
        ...getContext(options),
      },
    });
    if (error || !data?.copy) throw edgeError('Campaign copy generation');

    const parsed = copySchema.safeParse(data.copy);
    if (!parsed.success) {
      throw new BackendGenerationError('The secure AI backend returned malformed platform copy.', 'malformed_structured_response');
    }
    const copy = parsed.data as CampaignCopy;
    copy.qualityReport = AntiSlopCritic.reviewCampaignCopy(copy, sourceData, brandKit);
    onProgress?.('Copy validated and ready.', 100);
    return copy;
  }

  public async reviewCopyQuality(
    copy: CampaignCopy,
    sourceData: CampaignSourceData,
    brandKit: BrandKit,
    options?: GenerationOptions
  ): Promise<CopyQualityReport> {
    if (!this.isConfigured()) {
      return AntiSlopCritic.reviewCampaignCopy(copy, sourceData, brandKit);
    }

    const { data, error } = await supabase.functions.invoke('critique-copy', {
      body: {
        copy,
        sourceData,
        brandKit,
        modelId: options?.modelId,
        ...getContext(options),
      },
    });
    if (error || !data?.qualityReport) throw edgeError('Professional review');

    const parsed = qualityReportSchema.safeParse(data.qualityReport);
    if (!parsed.success) {
      throw new BackendGenerationError('The secure review backend returned a malformed report.', 'malformed_structured_response');
    }
    return parsed.data as CopyQualityReport;
  }

  public async generatePresentationDeck(
    campaign: Campaign,
    brandKit: BrandKit = DEFAULT_BRAND_KIT,
    onProgress?: GenerationProgressCallback,
    options?: GenerationOptions
  ): Promise<PresentationDeck> {
    if (!this.isConfigured()) throw edgeError('Presentation deck generation');

    const config = SettingsStore.get();
    const resolved = ModelRegistry.resolveModelForOperation('presentation_deck', config);
    const targetModel = options?.modelId || resolved.modelId;
    const idempotencyKey = crypto.randomUUID();
    onProgress?.('Generating structured presentation deck via secure backend...', 30);

    const { data, error } = await supabase.functions.invoke('generate-presentation', {
      body: {
        campaign,
        brandKit,
        modelId: targetModel,
        thinkingLevel: options?.thinkingLevel || resolved.thinkingLevel,
        idempotencyKey,
        ...getContext(options),
      },
    });
    if (error || !data?.presentation) throw edgeError('Presentation deck generation');

    onProgress?.('Validating presentation schema and semantic slide safety...', 85);
    const parsed = presentationDeckSchema.safeParse(data.presentation);
    if (!parsed.success) {
      throw new BackendGenerationError('The secure AI backend returned a malformed presentation deck.', 'malformed_structured_response');
    }

    const deck = parsed.data as PresentationDeck;
    if (!deck.generationMetadata) {
      deck.generationMetadata = data.metadata || {
        requestedModel: targetModel,
        actualModel: data.model || targetModel,
        fallbackOccurred: false,
        latencyMs: 0,
        timestamp: new Date().toISOString(),
      };
    }

    onProgress?.('Presentation deck ready.', 100);
    return deck;
  }
}
