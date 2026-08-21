/**
 * Presentation Engine Type Definitions
 * 
 * Versioned, strictly-typed schemas for responsive, interactive real-estate investment decks.
 * AI produces only structured PresentationDeck JSON matching these interfaces.
 */

import { GenerationMetadata } from './providers';

export interface PresentationTheme {
  name: string;
  bg: string;
  bgGrad1: string;
  bgGrad2: string;
  surface: string;
  surface2: string;
  fg: string;
  fgMuted: string;
  fgFaint: string;
  hair: string;
  hair2: string;
  primary: string;
  accent: string; // Gradient or solid accent CSS
  accentInk: string;
  radius: string;
  radiusSm: string;
  radiusLg: string;
  fontHead: string;
  fontBody: string;
  fontMono: string;
  colorScheme: 'dark' | 'light';
}

export type PresentationSlideType =
  | 'cover'
  | 'executive_summary'
  | 'property_overview'
  | 'investment_thesis'
  | 'stat_grid'
  | 'big_number'
  | 'financial_snapshot'
  | 'market_context'
  | 'timeline'
  | 'gallery'
  | 'target_audience'
  | 'marketing_strategy'
  | 'creative_showcase'
  | 'video_concept'
  | 'comparison'
  | 'table'
  | 'risk_disclaimer'
  | 'next_steps';

export interface BaseSlide {
  id: string;
  type: PresentationSlideType;
  navLabel?: string;
  kicker?: string;
  title: string;
  speakerNotes?: string;
  isHidden?: boolean;
}

export interface CoverSlide extends BaseSlide {
  type: 'cover';
  subtitle?: string;
  imageId?: string;
  imageUrl?: string;
  foot?: string;
}

export interface ExecutiveSummarySlide extends BaseSlide {
  type: 'executive_summary';
  summary: string;
  highlights: string[];
}

export interface PropertyOverviewSlide extends BaseSlide {
  type: 'property_overview';
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  yearBuilt?: number;
  highlights: string[];
  imageId?: string;
  imageUrl?: string;
}

export interface InvestmentThesisSlide extends BaseSlide {
  type: 'investment_thesis';
  thesis: string;
  pillars: string[];
}

export interface StatGridSlideItem {
  label: string;
  value: string;
  factKey?: string;
  caption?: string;
}

export interface StatGridSlide extends BaseSlide {
  type: 'stat_grid';
  stats: StatGridSlideItem[];
}

export interface BigNumberSlide extends BaseSlide {
  type: 'big_number';
  value: string;
  factKey?: string;
  caption: string;
  foot?: string;
}

export interface FinancialSnapshotMetric {
  label: string;
  value: string;
  factKey: string;
  subtext?: string;
  highlight?: boolean;
}

export interface FinancialSnapshotSlide extends BaseSlide {
  type: 'financial_snapshot';
  metrics: FinancialSnapshotMetric[];
  disclosures: string[];
}

export interface MarketComp {
  address: string;
  price: string;
  sqft?: string;
  notes?: string;
}

export interface MarketContextSlide extends BaseSlide {
  type: 'market_context';
  submarket: string;
  insights: string[];
  comps?: MarketComp[];
}

export interface TimelineSlideItem {
  time: string;
  title: string;
  body?: string;
}

export interface TimelineSlide extends BaseSlide {
  type: 'timeline';
  items: TimelineSlideItem[];
}

export interface GallerySlideItem {
  imageId?: string;
  imageUrl: string;
  caption?: string;
  title?: string;
  span?: number; // 4, 6, 8, 12 in 12-col bento
}

export interface GallerySlide extends BaseSlide {
  type: 'gallery';
  layout: 'split' | 'bento';
  items: GallerySlideItem[];
}

export interface TargetAudienceSlide extends BaseSlide {
  type: 'target_audience';
  audienceName: string;
  description: string;
  painPoints: string[];
  motivations: string[];
}

export interface MarketingStrategySlide extends BaseSlide {
  type: 'marketing_strategy';
  coreAngle: string;
  hooks: string[];
  platforms: string[];
  cta: string;
}

export interface CreativeShowcaseSlide extends BaseSlide {
  type: 'creative_showcase';
  subtitle?: string;
  previewFormats: Array<'square' | 'portrait' | 'story' | 'landscape'>;
}

export interface VideoConceptScene {
  timeframe: string;
  visualDirection: string;
  spokenAudio: string;
  onScreenText?: string;
}

export interface VideoConceptSlide extends BaseSlide {
  type: 'video_concept';
  hook: string;
  durationSeconds: number;
  scenes: VideoConceptScene[];
  cta: string;
}

export interface ComparisonSlideRow {
  label: string;
  current: string;
  projected: string;
}

export interface ComparisonSlide extends BaseSlide {
  type: 'comparison';
  headers: [string, string];
  rows: ComparisonSlideRow[];
}

export interface TableSlide extends BaseSlide {
  type: 'table';
  columns: string[];
  rows: (string | number)[][];
  caption?: string;
  highlightCol?: number;
  highlightRow?: number;
}

export interface RiskDisclaimerSlide extends BaseSlide {
  type: 'risk_disclaimer';
  disclaimerText: string;
  additionalCaveats?: string[];
}

export interface NextStepsContactInfo {
  name?: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  licenseNumber?: string;
}

export interface NextStepsSlide extends BaseSlide {
  type: 'next_steps';
  ctaText: string;
  contactInfo: NextStepsContactInfo;
}

export type PresentationSlide =
  | CoverSlide
  | ExecutiveSummarySlide
  | PropertyOverviewSlide
  | InvestmentThesisSlide
  | StatGridSlide
  | BigNumberSlide
  | FinancialSnapshotSlide
  | MarketContextSlide
  | TimelineSlide
  | GallerySlide
  | TargetAudienceSlide
  | MarketingStrategySlide
  | CreativeShowcaseSlide
  | VideoConceptSlide
  | ComparisonSlide
  | TableSlide
  | RiskDisclaimerSlide
  | NextStepsSlide;

export interface PresentationDeck {
  schemaVersion: '1.0.0';
  id: string;
  campaignId: string;
  title: string;
  subtitle?: string;
  generatedAt: string;
  isDemo?: boolean;
  theme: PresentationTheme;
  slides: PresentationSlide[];
  generationMetadata?: GenerationMetadata;
}
