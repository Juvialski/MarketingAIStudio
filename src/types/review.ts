/**
 * Review Portal & Share Link Type Definitions
 */

import { OutputAspectRatio, DesignTemplateFamily, GraphicDesignConfig, VideoScript, CampaignType } from './campaign';
import { PresentationDeck } from './presentation';

export type ReviewStatus = 'not_reviewed' | 'preferred' | 'approved' | 'needs_changes';

export interface ReviewLinkPermissions {
  allowComments: boolean;
  allowSelection: boolean;
  allowApproval: boolean;
  allowDownloads: boolean;
}

export interface ReviewLink {
  id: string;
  organizationId: string;
  campaignId: string;
  tokenHash: string;
  rawToken?: string; // Only present when newly created or rotated
  isActive: boolean;
  expiresAt: string | null;
  permissions: ReviewLinkPermissions;
  /** @deprecated Passcode protection is disabled; public links use secure URL tokens */
  passcodeHash?: string | null;
  currentVersionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewFeedback {
  id: string;
  reviewLinkId: string;
  reviewVersionId?: string;
  materialKey: string;
  variantKey?: string;
  reviewerName: string;
  status: ReviewStatus;
  comment?: string;
  updatedAt: string;
}

export interface SanitizedGraphicVariant {
  id: string; // e.g. 'editorial', 'institutional', 'modern_brokerage', 'direct_response', 'market_intelligence'
  name: string;
  templateFamily: DesignTemplateFamily;
  description: string;
  config: GraphicDesignConfig;
  previewImageUrl?: string;
}

export interface SanitizedGraphicMaterial {
  id: string;
  format: OutputAspectRatio;
  category: 'social' | 'advertising' | 'web' | 'print';
  label: string;
  sublabel: string;
  dimensions: {
    width: number;
    height: number;
  };
  activeVariantId: string;
  variants: SanitizedGraphicVariant[];
}

export interface SanitizedCopyChannel {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'email' | 'video_reels';
  channelName: string;
  headline: string;
  body: string;
  hook?: string;
  cta: string;
  bullets?: string[];
  hashtags?: string[];
  characterCount?: number;
}

export interface ReviewSnapshot {
  campaignId?: string;
  campaignTitle: string;
  campaignType: CampaignType;
  targetMarket: string;
  heroImageUrl: string;
  property?: {
    address: string;
    city: string;
    state: string;
    zipCode?: string;
    neighborhood?: string;
    propertyType: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    yearBuilt?: number;
    financials: {
      purchasePrice?: number;
      renovationEstimate?: number;
      arv?: number;
      projectedProfit?: number;
      equitySpread?: number;
      roiPercent?: number;
      capRatePercent?: number;
      cashOnCashPercent?: number;
    };
    investmentThesis: string;
    dealHighlights: string[];
    renovationScope?: string;
  };
  brandKit: {
    companyName: string;
    tagline?: string;
    logoUrl?: string;
    logoDarkUrl?: string;
    website?: string;
    phone?: string;
    email?: string;
    licenseNumber?: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      backgroundLight: string;
      backgroundDark: string;
      textPrimary: string;
      textMuted: string;
    };
    typography: {
      headlineFont: string;
      bodyFont: string;
      monoFont: string;
      familyPairing?: string;
    };
    disclaimer: string;
  };
  strategy?: {
    primaryObjective: string;
    coreAngle: string;
    keyHooks: string[];
    valueProposition: string;
    targetAudience: {
      name: string;
      description: string;
      painPoints?: string[];
      motivations?: string[];
    };
    supportingEvidence?: string[];
  };
  presentation?: PresentationDeck;
  graphicMaterials: SanitizedGraphicMaterial[];
  copyChannels: SanitizedCopyChannel[];
  videoScript?: VideoScript;
  emailNewsletter?: {
    subjectLines: string[];
    previewText: string;
    bodyMarkdown: string;
    ctaButtonText: string;
  };
}

export interface ReviewVersion {
  id: string;
  reviewLinkId: string;
  versionNumber: number;
  title: string;
  notes?: string;
  publishedAt: string;
  snapshot: ReviewSnapshot;
}

export interface PublicReviewPortalResponse {
  status: 'active' | 'not_found' | 'revoked' | 'expired' | 'no_version';
  error?: string;
  versionNumber?: number;
  versionTitle?: string;
  publishedAt?: string;
  snapshot?: ReviewSnapshot;
  permissions?: ReviewLinkPermissions;
  feedback?: ReviewFeedback[];
}
