/**
 * AI and Image Provider Interface Definitions
 */

import { Campaign, CampaignSourceData, CampaignStrategy, CampaignCopy, CopyQualityReport } from './campaign';
import { BrandKit } from './brandKit';
import { PresentationDeck } from './presentation';

export type AIProviderType = 'gemini' | 'mock' | 'auto';
export type ImageProviderType = 'upload' | 'nvidia' | 'bfl' | 'gemini_image' | 'openai_image' | 'mock';

export type AIModelTier = 'high_volume' | 'fallback' | 'premium' | 'intermediate';

export type AIOperationType = 
  | 'campaign_kit'
  | 'campaign_draft'
  | 'campaign_strategy'
  | 'platform_variants'
  | 'final_review'
  | 'copy_critique'
  | 'lead_summary'
  | 'presentation_deck'
  | 'general_generation';

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export type AIErrorCode = 
  | 'invalid_api_key'
  | 'model_unavailable'
  | 'unsupported_model'
  | 'rate_limit_rpm'
  | 'rate_limit_tpm'
  | 'daily_quota_exhausted'
  | 'provider_outage'
  | 'timeout'
  | 'malformed_structured_response'
  | 'safety_refusal'
  | 'generic_api_failure';

export interface GenerationMetadata {
  requestedModel: string;
  actualModel: string;
  fallbackOccurred: boolean;
  fallbackReason?: string;
  latencyMs: number;
  estimatedTokens?: number;
  timestamp: string;
  thinkingLevel?: ThinkingLevel;
}

export interface AIModelDefinition {
  id: string; // Exact API Model ID
  provider: 'gemini' | 'nvidia' | 'mock';
  displayName: string;
  userLabel: string;
  tier: AIModelTier;
  supportsThinking: boolean;
  supportsVision: boolean;
  supportsStructuredOutput: boolean;
  active: boolean;
  recommended: boolean;
  observedRPM: number;
  observedTPM: number;
  observedRPD: number;
  defaultThinkingLevel?: ThinkingLevel;
  description?: string;
}

export interface AIUsageRecord {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  operation: AIOperationType;
  success: boolean;
  latencyMs: number;
  approxTokens?: number;
  errorCode?: AIErrorCode;
  requestedModel?: string;
  fallbackOccurred?: boolean;
  fallbackReason?: string;
}

// ----------------------------------------------------
// Image Provider & Quality Tiers
// ----------------------------------------------------

export type ImageQualityTier = 
  | 'free_dev'          // Free: NVIDIA / Curated Uploads
  | 'paid_standard'      // Paid: server-priced production model
  | 'paid_maximum'       // Paid: server-priced maximum-quality model
  | 'paid_specialized'   // Paid: server-priced fine-control model
  | 'paid_alternate'     // Paid: server-verified alternate model
  | 'auto';              // Auto-routes based on purpose (never exceeds budget)

export type ImagePurpose = 
  | 'hero'
  | 'supporting'
  | 'background'
  | 'editorial'
  | 'renovation_concept'
  | 'neighborhood_lifestyle';

export type ImageStyle = 
  | 'editorial_clean'
  | 'architectural_photography'
  | 'warm_natural_light'
  | 'dusk_luxury'
  | 'aerial_submarket'
  | 'minimalist_luxury';

export interface ImageCreativeBrief {
  purpose: ImagePurpose;
  subject: string;
  composition?: string;
  style?: ImageStyle;
  references?: string[]; // URLs or base64
  brandColors?: string[]; // Hex codes
  aspectRatio: '1:1' | '4:5' | '16:9' | '9:16';
  constraints?: string;
  qualityTier?: ImageQualityTier;
  isConceptual?: boolean;
}

export interface ImageCostMetadata {
  estimatedCostUsd: number;
  provider: string;
  model: string;
  resolution: string;
  isEstimated: boolean;
  providerRequestId?: string;
  timestamp: string;
}

export interface ImageSpendingLimits {
  enablePaidGeneration: boolean;
  preferredPaidProvider: 'bfl' | 'gemini_image' | 'openai_image';
  preferredPaidModel: string;
  maxImagesPerCampaign: number;
  dailySpendingLimitUsd: number;
  monthlySpendingLimitUsd: number;
}

export interface ImageProviderDefinition {
  providerId: ImageProviderType;
  displayName: string;
  tier: ImageQualityTier;
  models: string[];
  supportsTextToImage: boolean;
  supportsEditing: boolean;
  supportsMultipleReferences: boolean;
  supportsHighResolution: boolean;
  supportsBrandColorControl: boolean;
  supportsGrounding: boolean;
  estimatedCostPerImageUsd: number;
  active: boolean;
  configured: boolean;
  description: string;
}

export interface ProviderConfig {
  /** Client execution mode; live providers are backend-only. */
  runtimeMode?: 'demo' | 'live';
  aiProvider: AIProviderType;
  geminiModel: string; // legacy alias for defaultModelId
  defaultModelId: string;
  fallbackModelId: string;
  premiumModelId: string;
  operationOverrides?: Partial<Record<AIOperationType, string>>;
  thinkingLevels?: Partial<Record<AIOperationType, ThinkingLevel>>;
  
  // Image Provider Configurations
  imageProvider: ImageProviderType;
  imageQualityTier: ImageQualityTier;
  geminiImageModel: string;
  geminiImageQuotaAvailable: boolean;
  nvidiaModelId: string;
  bflModelId?: string;
  openaiImageModel?: string;
  imageSpendingLimits: ImageSpendingLimits;

  useMockFallback: boolean;
  customQuotas?: Record<string, { rpm: number; tpm: number; rpd: number }>;
}

export interface GenerationProgressCallback {
  (step: string, progressPercent: number, details?: string): void;
}

export interface GenerationOptions {
  modelId?: string;
  thinkingLevel?: ThinkingLevel;
  operation?: AIOperationType;
  skipFallback?: boolean;
  /** Authenticated tenant context required by live Edge operations. */
  organizationId?: string;
  campaignId?: string;
  runtimeMode?: 'demo' | 'live';
}

export interface FullKitGenerationResult {
  strategy: CampaignStrategy;
  copy: CampaignCopy;
  metadata: GenerationMetadata;
}

export interface IAIProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  
  generateStrategy(
    sourceData: CampaignSourceData,
    brandKit: BrandKit,
    onProgress?: GenerationProgressCallback,
    options?: GenerationOptions
  ): Promise<CampaignStrategy>;

  generateCopy(
    sourceData: CampaignSourceData,
    strategy: CampaignStrategy,
    brandKit: BrandKit,
    onProgress?: GenerationProgressCallback,
    options?: GenerationOptions
  ): Promise<CampaignCopy>;

  generateFullMarketingKit(
    sourceData: CampaignSourceData,
    brandKit: BrandKit,
    onProgress?: GenerationProgressCallback,
    options?: GenerationOptions
  ): Promise<FullKitGenerationResult>;

  reviewCopyQuality(
    copy: CampaignCopy,
    sourceData: CampaignSourceData,
    brandKit: BrandKit,
    options?: GenerationOptions
  ): Promise<CopyQualityReport>;

  generatePresentationDeck(
    campaign: Campaign,
    brandKit?: BrandKit,
    onProgress?: GenerationProgressCallback,
    options?: GenerationOptions
  ): Promise<PresentationDeck>;
}

export interface GeneratedImageResult {
  url: string;
  id: string;
  altText: string;
  isAiIllustrative: boolean;
  provider: string;
  provenance?: 'generated' | 'uploaded' | 'fixture' | 'fallback' | 'failed';
  storageBucket?: string;
  storagePath?: string;
  costMetadata?: ImageCostMetadata;
  metadata?: {
    modelId?: string;
    prompt?: string;
    latencyMs?: number;
    estimatedCostUsd?: number;
  };
}

export interface IImageProvider {
  id: string;
  name: string;
  isConfigured(): boolean;

  generateConceptImage(
    prompt: string,
    aspectRatio: '1:1' | '4:5' | '16:9' | '9:16',
    contextNotes?: string
  ): Promise<GeneratedImageResult>;

  generateFromBrief(
    brief: ImageCreativeBrief,
    onProgress?: (step: string, percent: number) => void
  ): Promise<GeneratedImageResult>;
}
