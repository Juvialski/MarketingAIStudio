/**
 * Property Data Extraction Types & Schema
 * For "Paste Everything" intake extraction and non-destructive merge.
 */

import { CampaignType } from './campaign';

export interface ExtractedFieldValue<T> {
  value: T;
  confidence: number; // 0.0 to 1.0
  evidenceSnippet?: string; // Verbatim text segment supporting the extraction
}

export interface ExtractedPropertyData {
  campaignType?: ExtractedFieldValue<CampaignType>;
  title?: ExtractedFieldValue<string>;
  targetMarket?: ExtractedFieldValue<string>;
  address?: ExtractedFieldValue<string>;
  city?: ExtractedFieldValue<string>;
  state?: ExtractedFieldValue<string>;
  zipCode?: ExtractedFieldValue<string>;
  neighborhood?: ExtractedFieldValue<string>;
  propertyType?: ExtractedFieldValue<'single_family' | 'multi_family' | 'condo' | 'commercial' | 'land' | 'industrial'>;
  bedrooms?: ExtractedFieldValue<number>;
  bathrooms?: ExtractedFieldValue<number>;
  squareFeet?: ExtractedFieldValue<number>;
  lotSizeSqFt?: ExtractedFieldValue<number>;
  yearBuilt?: ExtractedFieldValue<number>;
  purchasePrice?: ExtractedFieldValue<number>;
  renovationEstimate?: ExtractedFieldValue<number>;
  arv?: ExtractedFieldValue<number>;
  projectedRentMonthly?: ExtractedFieldValue<number>;
  currentRentMonthly?: ExtractedFieldValue<number>;
  inPlaceNOI?: ExtractedFieldValue<number>;
  stabilizedNOI?: ExtractedFieldValue<number>;
  capRatePercent?: ExtractedFieldValue<number>;
  cashOnCashPercent?: ExtractedFieldValue<number>;
  investmentThesis?: ExtractedFieldValue<string>;
  dealHighlights?: ExtractedFieldValue<string[]>;
  renovationScope?: ExtractedFieldValue<string>;
  notes?: ExtractedFieldValue<string>;
}

export interface ExtractionResult {
  data: ExtractedPropertyData;
  fieldsExtractedCount: number;
  rawInput: string;
  timestamp: string;
  source: 'ai_llm' | 'deterministic_fallback';
  modelUsed?: string;
  latencyMs?: number;
}
