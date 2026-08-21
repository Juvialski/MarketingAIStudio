/**
 * Core Campaign and Property Type Definitions
 */

export type CampaignType = 
  | 'acquisition'
  | 'fix_and_flip'
  | 'cash_flow_rental'
  | 'wholesale_deal'
  | 'market_update'
  | 'educational'
  | 'company_announcement';

export type CampaignStatus = 'draft' | 'strategy_ready' | 'copy_ready' | 'designs_ready' | 'completed';

export interface FinancingInputs {
  downPaymentPercent?: number;
  interestRatePercent?: number;
  loanTermYears?: number;
  monthlyDebtService?: number;
  annualDebtService?: number;
}

export interface PropertyFinancials {
  purchasePrice?: number;
  renovationEstimate?: number;
  arv?: number; // After Repair Value
  projectedRentMonthly?: number;
  currentRentMonthly?: number;
  inPlaceNOI?: number;
  stabilizedNOI?: number;
  capRatePercent?: number;
  cashOnCashPercent?: number;
  roiPercent?: number;
  projectedProfit?: number;
  equitySpread?: number;
  financing?: FinancingInputs;
}

export interface PropertyDetails {
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  neighborhood?: string;
  propertyType: 'single_family' | 'multi_family' | 'condo' | 'commercial' | 'land' | 'industrial';
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSizeSqFt?: number;
  yearBuilt?: number;
  financials: PropertyFinancials;
  investmentThesis: string;
  renovationScope?: string;
  dealHighlights: string[];
  notes?: string;
}

export interface CampaignSourceData {
  campaignType: CampaignType;
  title: string;
  property?: PropertyDetails;
  topicSummary?: string; // For market updates / educational topics
  targetMarket: string;
  uploadedImages: CampaignImage[];
  selectedHeroImageId?: string;
  customNotes?: string;
}

export interface CampaignImage {
  id: string;
  url: string;
  name: string;
  source: 'upload' | 'ai_generated' | 'sample';
  aspectRatio: number; // width / height
  isHero: boolean;
  altText?: string;
  aiPrompt?: string;
  isAiIllustrative?: boolean;
  isConceptual?: boolean;
  estimatedCostUsd?: number;
  provider?: string;
  model?: string;
  provenance?: 'generated' | 'uploaded' | 'fixture' | 'fallback' | 'failed';
  storageBucket?: string;
  storagePath?: string;
}

import { GenerationMetadata } from './providers';
import { PresentationDeck } from './presentation';

export interface CampaignStrategy {
  targetAudience: {
    name: string;
    description: string;
    painPoints: string[];
    motivations: string[];
  };
  primaryObjective: string;
  coreAngle: string;
  keyHooks: string[];
  valueProposition: string;
  supportingEvidence: string[];
  ctaStrategy: string;
  suggestedPlatforms: ('facebook' | 'instagram' | 'linkedin' | 'email' | 'video_reels')[];
  generationMetadata?: GenerationMetadata;
}

export interface PlatformCopyItem {
  headline: string;
  body: string;
  hook?: string;
  bullets?: string[];
  cta: string;
  hashtags?: string[];
  characterCount: number;
}

export interface VideoScriptScene {
  timeframe: string; // e.g. "0:00 - 0:03"
  visualDirection: string;
  spokenAudio: string;
  onScreenText?: string;
}

export interface VideoScript {
  title: string;
  durationSeconds: number;
  hook: string;
  scenes: VideoScriptScene[];
  callToAction: string;
  targetFormat: '9:16 vertical reel';
}

export interface CopyQualityIssue {
  id: string;
  severity: 'warning' | 'error' | 'suggestion';
  rule: string;
  matchedText: string;
  explanation: string;
  suggestedReplacement?: string;
  platform?: string;
}

export interface CopyQualityReport {
  overallScore: number; // 0-100
  slopIndex: 'clean' | 'mild_cliches' | 'heavy_slop';
  issues: CopyQualityIssue[];
  factualIntegrityVerified: boolean;
  unsupportedClaimsDetected: string[];
}

export interface CampaignCopy {
  headlines: string[];
  ctas: string[];
  facebook: PlatformCopyItem;
  instagram: PlatformCopyItem;
  linkedin: PlatformCopyItem;
  emailNewsletter: {
    subjectLines: string[];
    previewText: string;
    bodyMarkdown: string;
    ctaButtonText: string;
    ctaUrlPlaceholder?: string;
  };
  videoScript: VideoScript;
  qualityReport?: CopyQualityReport;
  generationMetadata?: GenerationMetadata;
}

export type DesignTemplateFamily = 
  | 'editorial' 
  | 'institutional' 
  | 'modern_brokerage' 
  | 'direct_response' 
  | 'market_intelligence';

export type OutputAspectRatio = 
  | 'square'      // 1080x1080 (1:1)
  | 'portrait'    // 1080x1350 (4:5)
  | 'story'       // 1080x1920 (9:16)
  | 'landscape'   // 1200x630 (1.91:1)
  | 'flyer_letter'// US Letter (8.5x11 in)
  | 'flyer_a4';   // A4 (210x297 mm)

export interface MetricBadgeConfig {
  id: string;
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}

export interface GraphicDesignConfig {
  templateFamily: DesignTemplateFamily;
  aspectRatio: OutputAspectRatio;
  headline: string;
  subtitle?: string;
  imageId?: string;
  imageCropY: number; // 0 (top) to 100 (bottom)
  imageZoom: number; // 1.0 to 2.0
  activeMetricIds: string[];
  customBadgeText?: string;
  customCtaText?: string;
  colorSchemeOverride?: {
    primary?: string;
    accent?: string;
    background?: string;
  };
  showDisclaimer: boolean;
}

export interface Campaign {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  status: CampaignStatus;
  sourceData: CampaignSourceData;
  strategy?: CampaignStrategy;
  copy?: CampaignCopy;
  presentation?: PresentationDeck;
  designConfigs: Record<OutputAspectRatio, GraphicDesignConfig>;
  brandKitId?: string;
  tags: string[];
  generationMetadata?: GenerationMetadata;
}
