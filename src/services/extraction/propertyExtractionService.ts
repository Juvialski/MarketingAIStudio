/**
 * Property Data Extraction Service
 * Implements "Paste Everything" structured data extraction from raw notes,
 * MLS sheets, emails, or underwriting summaries.
 * 
 * Directives:
 * 1. ZERO Hallucinations: If a number or field is absent, it remains undefined.
 * 2. High-precision parsing: Handles currency formats ($350k, $1.2M, $450,000),
 *    beds/baths, square footage, addresses, and cap rates.
 * 3. Offline/Demo safe with Edge Function enhancement.
 */

import { ExtractedPropertyData, ExtractionResult, ExtractedFieldValue } from '../../types/extraction';
import { CampaignType } from '../../types/campaign';
import { isSupabaseConfigured, supabase } from '../supabase/client';

export class PropertyExtractionService {
  /**
   * Main entry point to extract property data from unformatted text.
   */
  public static async extractPropertyData(
    rawText: string,
    options: {
      organizationId?: string;
      campaignId?: string;
      runtimeMode?: 'demo' | 'live';
    } = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const cleanText = rawText.trim();
    if (!cleanText) {
      return {
        data: {},
        fieldsExtractedCount: 0,
        rawInput: rawText,
        timestamp: new Date().toISOString(),
        source: 'deterministic_fallback',
        latencyMs: 0,
      };
    }

    // Try live AI Edge Function if configured and in live mode or with organizationId
    if (isSupabaseConfigured() && options.organizationId) {
      try {
        const { data, error } = await supabase.functions.invoke('extract-property-data', {
          body: {
            organizationId: options.organizationId,
            campaignId: options.campaignId,
            rawText: cleanText,
          },
        });

        if (!error && data && data.data) {
          return {
            ...data,
            latencyMs: Date.now() - startTime,
          };
        }
      } catch (err) {
        console.warn('[PropertyExtractionService] Edge function extraction failed, falling back to deterministic parser', err);
      }
    }

    // Deterministic Rule-Based Extraction Engine
    const data = this.parseDeterministically(cleanText);
    const fieldsExtractedCount = Object.keys(data).length;

    return {
      data,
      fieldsExtractedCount,
      rawInput: rawText,
      timestamp: new Date().toISOString(),
      source: 'deterministic_fallback',
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Deterministic pattern matcher with strict factual bounds.
   */
  public static parseDeterministically(text: string): ExtractedPropertyData {
    const extracted: ExtractedPropertyData = {};

    // 1. Campaign Type & Strategy
    const campaignType = this.extractCampaignType(text);
    if (campaignType) extracted.campaignType = campaignType;

    // 2. Property Type
    const propertyType = this.extractPropertyType(text);
    if (propertyType) extracted.propertyType = propertyType;

    // 3. Address and Location
    const location = this.extractLocation(text);
    if (location.address) extracted.address = location.address;
    if (location.city) extracted.city = location.city;
    if (location.state) extracted.state = location.state;
    if (location.zipCode) extracted.zipCode = location.zipCode;
    if (location.neighborhood) extracted.neighborhood = location.neighborhood;
    if (location.targetMarket) extracted.targetMarket = location.targetMarket;

    // 4. Physical Specs
    const beds = this.extractBedrooms(text);
    if (beds) extracted.bedrooms = beds;

    const baths = this.extractBathrooms(text);
    if (baths) extracted.bathrooms = baths;

    const sqft = this.extractSquareFeet(text);
    if (sqft) extracted.squareFeet = sqft;

    const lot = this.extractLotSize(text);
    if (lot) extracted.lotSizeSqFt = lot;

    const yearBuilt = this.extractYearBuilt(text);
    if (yearBuilt) extracted.yearBuilt = yearBuilt;

    // 5. Underwriting Financials
    const purchasePrice = this.extractPurchasePrice(text);
    if (purchasePrice) extracted.purchasePrice = purchasePrice;

    const renovation = this.extractRenovationEstimate(text);
    if (renovation) extracted.renovationEstimate = renovation;

    const arv = this.extractARV(text);
    if (arv) extracted.arv = arv;

    const projectedRent = this.extractProjectedRent(text);
    if (projectedRent) extracted.projectedRentMonthly = projectedRent;

    const currentRent = this.extractCurrentRent(text);
    if (currentRent) extracted.currentRentMonthly = currentRent;

    const capRate = this.extractCapRate(text);
    if (capRate) extracted.capRatePercent = capRate;

    const cashOnCash = this.extractCashOnCash(text);
    if (cashOnCash) extracted.cashOnCashPercent = cashOnCash;

    const inPlaceNOI = this.extractInPlaceNOI(text);
    if (inPlaceNOI) extracted.inPlaceNOI = inPlaceNOI;

    const stabilizedNOI = this.extractStabilizedNOI(text);
    if (stabilizedNOI) extracted.stabilizedNOI = stabilizedNOI;

    // 6. Thesis, Highlights & Scope
    const thesis = this.extractInvestmentThesis(text);
    if (thesis) extracted.investmentThesis = thesis;

    const highlights = this.extractDealHighlights(text);
    if (highlights && highlights.value.length > 0) extracted.dealHighlights = highlights;

    const scope = this.extractRenovationScope(text);
    if (scope) extracted.renovationScope = scope;

    // 7. Title derivation if not explicitly named
    const title = this.extractTitle(text, extracted);
    if (title) extracted.title = title;

    return extracted;
  }

  // --- Helper Parsers ---

  private static parseCurrencyNumber(str: string): number | null {
    if (!str) return null;
    const clean = str.replace(/,/g, '').trim().toLowerCase();
    const match = clean.match(/^\$?([\d.]+)\s*(k|m|million|thousand)?$/);
    if (!match) return null;
    const num = parseFloat(match[1]);
    if (isNaN(num)) return null;
    const suffix = match[2];
    if (suffix === 'k' || suffix === 'thousand') return Math.round(num * 1000);
    if (suffix === 'm' || suffix === 'million') return Math.round(num * 1000000);
    return Math.round(num);
  }

  private static extractCampaignType(text: string): ExtractedFieldValue<CampaignType> | null {
    if (/\b(fix\s*(?:and|&|\/)\s*flip|flip deal|rehab flip)\b/i.test(text)) {
      const match = text.match(/\b(fix\s*(?:and|&|\/)\s*flip|flip deal|rehab flip)\b/i);
      return { value: 'fix_and_flip', confidence: 0.95, evidenceSnippet: match?.[0] };
    }
    if (/\b(brrrr|cash\s*flow|rental|buy\s*(?:and|&)\s*hold|turnkey\s*rental|multifamily\s*hold)\b/i.test(text)) {
      const match = text.match(/\b(brrrr|cash\s*flow|rental|buy\s*(?:and|&)\s*hold|turnkey\s*rental|multifamily\s*hold)\b/i);
      return { value: 'cash_flow_rental', confidence: 0.9, evidenceSnippet: match?.[0] };
    }
    if (/\b(wholesale|assignable|assignment\s*fee|off-market\s*wholesale)\b/i.test(text)) {
      const match = text.match(/\b(wholesale|assignable|assignment\s*fee|off-market\s*wholesale)\b/i);
      return { value: 'wholesale_deal', confidence: 0.95, evidenceSnippet: match?.[0] };
    }
    if (/\b(acquisition|value-add\s*acquisition|syndication|core\s*plus)\b/i.test(text)) {
      const match = text.match(/\b(acquisition|value-add\s*acquisition|syndication|core\s*plus)\b/i);
      return { value: 'acquisition', confidence: 0.85, evidenceSnippet: match?.[0] };
    }
    if (/\b(market\s*update|market\s*report|q[1-4]\s*market)\b/i.test(text)) {
      const match = text.match(/\b(market\s*update|market\s*report|q[1-4]\s*market)\b/i);
      return { value: 'market_update', confidence: 0.9, evidenceSnippet: match?.[0] };
    }
    return null;
  }

  private static extractPropertyType(text: string): ExtractedFieldValue<'single_family' | 'multi_family' | 'condo' | 'commercial' | 'land' | 'industrial'> | null {
    if (/\b(sfr|single\s*family|single-family|detached)\b/i.test(text)) {
      const match = text.match(/\b(sfr|single\s*family|single-family|detached)\b/i);
      return { value: 'single_family', confidence: 0.95, evidenceSnippet: match?.[0] };
    }
    if (/\b(multi[- ]?family|duplex|triplex|fourplex|4-plex|quadplex|apartment\s*building|units\b)/i.test(text)) {
      const match = text.match(/\b(multi[- ]?family|duplex|triplex|fourplex|4-plex|quadplex|apartment\s*building|\d+\s*units)\b/i);
      return { value: 'multi_family', confidence: 0.95, evidenceSnippet: match?.[0] };
    }
    if (/\b(condo|condominium|townhouse|townhome)\b/i.test(text)) {
      const match = text.match(/\b(condo|condominium|townhouse|townhome)\b/i);
      return { value: 'condo', confidence: 0.95, evidenceSnippet: match?.[0] };
    }
    if (/\b(commercial|retail|office\s*building|strip\s*mall)\b/i.test(text)) {
      const match = text.match(/\b(commercial|retail|office\s*building|strip\s*mall)\b/i);
      return { value: 'commercial', confidence: 0.9, evidenceSnippet: match?.[0] };
    }
    if (/\b(industrial|warehouse|distribution\s*center|flex\s*space)\b/i.test(text)) {
      const match = text.match(/\b(industrial|warehouse|distribution\s*center|flex\s*space)\b/i);
      return { value: 'industrial', confidence: 0.9, evidenceSnippet: match?.[0] };
    }
    if (/\b(land|vacant\s*lot|acreage|parcels?)\b/i.test(text)) {
      const match = text.match(/\b(land|vacant\s*lot|acreage|parcels?)\b/i);
      return { value: 'land', confidence: 0.9, evidenceSnippet: match?.[0] };
    }
    return null;
  }

  private static extractLocation(text: string) {
    const result: {
      address?: ExtractedFieldValue<string>;
      city?: ExtractedFieldValue<string>;
      state?: ExtractedFieldValue<string>;
      zipCode?: ExtractedFieldValue<string>;
      neighborhood?: ExtractedFieldValue<string>;
      targetMarket?: ExtractedFieldValue<string>;
    } = {};

    // Standard US Address match: e.g. "4421 E Cambridge Ave, Phoenix, AZ 85008" or "123 Main St, Austin, TX"
    const fullAddressRegex = /(?:Address\s*:\s*)?([0-9]+\s+[A-Za-z0-9\s.,#-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Terrace|Ter|Circle|Cir)\b(?:[,\s]+(?:Apt|Unit|Suite|#)\s*[A-Za-z0-9-]+)?)[,\s]+([A-Za-z\s]+)[,\s]+([A-Z]{2})\b(?:[,\s]+(\d{5}(?:-\d{4})?))?/i;
    const fullMatch = text.match(fullAddressRegex);

    if (fullMatch) {
      result.address = { value: fullMatch[1].trim(), confidence: 0.95, evidenceSnippet: fullMatch[0] };
      result.city = { value: fullMatch[2].trim(), confidence: 0.95, evidenceSnippet: fullMatch[2] };
      result.state = { value: fullMatch[3].toUpperCase().trim(), confidence: 0.95, evidenceSnippet: fullMatch[3] };
      if (fullMatch[4]) {
        result.zipCode = { value: fullMatch[4].trim(), confidence: 0.95, evidenceSnippet: fullMatch[4] };
      }
      result.targetMarket = {
        value: `${fullMatch[2].trim()}, ${fullMatch[3].toUpperCase().trim()}`,
        confidence: 0.9,
        evidenceSnippet: fullMatch[0],
      };
    } else {
      // Fallback address match
      const streetMatch = text.match(/(?:Address\s*:\s*|^)([0-9]+\s+[A-Za-z0-9\s.,#-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl)\b)/im);
      if (streetMatch) {
        result.address = { value: streetMatch[1].trim(), confidence: 0.85, evidenceSnippet: streetMatch[0] };
      }

      // City / State / Market match
      const marketMatch = text.match(/(?:Market|City|Location|Metro)\s*:\s*([A-Za-z\s]+)(?:,\s*([A-Z]{2}))?/i);
      if (marketMatch) {
        const city = marketMatch[1].trim();
        const state = marketMatch[2]?.toUpperCase().trim();
        result.city = { value: city, confidence: 0.85, evidenceSnippet: marketMatch[0] };
        if (state) result.state = { value: state, confidence: 0.9, evidenceSnippet: state };
        result.targetMarket = {
          value: state ? `${city}, ${state}` : city,
          confidence: 0.85,
          evidenceSnippet: marketMatch[0],
        };
      }
    }

    // Neighborhood match: e.g. "Arcadia Lite neighborhood" or "(Arcadia Lite)" or "Neighborhood: Arcadia Lite"
    const neighborhoodParenMatch = text.match(/\(\s*([A-Za-z0-9\s'-]+?)\s*(?:neighborhood|subdivision|submarket|area)?\s*\)/i);
    if (neighborhoodParenMatch && !/^\d+$/.test(neighborhoodParenMatch[1].trim())) {
      result.neighborhood = { value: neighborhoodParenMatch[1].replace(/(?:neighborhood|subdivision|submarket|area)$/i, '').trim(), confidence: 0.85, evidenceSnippet: neighborhoodParenMatch[0] };
    } else {
      const neighborhoodMatch = text.match(/(?:Neighborhood|Subdivision|Area|Submarket)\s*[:=]?\s*([A-Za-z0-9\s'-]+?)(?=[,\n;()]|$)/i);
      if (neighborhoodMatch) {
        result.neighborhood = { value: neighborhoodMatch[1].trim(), confidence: 0.85, evidenceSnippet: neighborhoodMatch[0] };
      }
    }

    return result;
  }

  private static extractBedrooms(text: string): ExtractedFieldValue<number> | null {
    const match = text.match(/(?:(\d+)\s*(?:bed|beds|bedroom|bedrooms|br\b)|\b(?:bed|beds|bedrooms)\s*[:=]?\s*(\d+))/i);
    if (match) {
      const val = parseInt(match[1] || match[2], 10);
      if (!isNaN(val)) {
        return { value: val, confidence: 0.95, evidenceSnippet: match[0] };
      }
    }
    // "3/2" pattern (3 bed / 2 bath)
    const slashMatch = text.match(/\b(\d+)\s*\/\s*(\d+(?:\.\d+)?)\s*(?:bed|bath|br|ba|house|property)?\b/i);
    if (slashMatch) {
      const val = parseInt(slashMatch[1], 10);
      if (!isNaN(val)) return { value: val, confidence: 0.85, evidenceSnippet: slashMatch[0] };
    }
    return null;
  }

  private static extractBathrooms(text: string): ExtractedFieldValue<number> | null {
    const match = text.match(/(?:(\d+(?:\.\d+)?)\s*(?:bath|baths|bathroom|bathrooms|ba\b)|\b(?:bath|baths|bathrooms)\s*[:=]?\s*(\d+(?:\.\d+)?))/i);
    if (match) {
      const val = parseFloat(match[1] || match[2]);
      if (!isNaN(val)) {
        return { value: val, confidence: 0.95, evidenceSnippet: match[0] };
      }
    }
    const slashMatch = text.match(/\b(\d+)\s*\/\s*(\d+(?:\.\d+)?)\s*(?:bed|bath|br|ba|house|property)?\b/i);
    if (slashMatch) {
      const val = parseFloat(slashMatch[2]);
      if (!isNaN(val)) return { value: val, confidence: 0.85, evidenceSnippet: slashMatch[0] };
    }
    return null;
  }

  private static extractSquareFeet(text: string): ExtractedFieldValue<number> | null {
    const match = text.match(/(?:([\d,]+)\s*(?:sq\s*ft|sqft|square\s*feet|sf\b)|\b(?:sqft|square\s*feet|size|building\s*size)\s*[:=]?\s*([\d,]+))/i);
    if (match) {
      const raw = (match[1] || match[2]).replace(/,/g, '');
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val > 100 && val < 500000) {
        return { value: val, confidence: 0.95, evidenceSnippet: match[0] };
      }
    }
    return null;
  }

  private static extractLotSize(text: string): ExtractedFieldValue<number> | null {
    const match = text.match(/(?:lot\s*(?:size)?\s*[:=]?\s*([\d,]+)\s*(?:sq\s*ft|sqft|sf)?|([\d,]+)\s*sq\s*ft\s*lot)/i);
    if (match) {
      const raw = (match[1] || match[2]).replace(/,/g, '');
      const val = parseInt(raw, 10);
      if (!isNaN(val)) return { value: val, confidence: 0.9, evidenceSnippet: match[0] };
    }
    const acreMatch = text.match(/([\d.]+)\s*(?:acres?|ac\b)/i);
    if (acreMatch) {
      const acres = parseFloat(acreMatch[1]);
      if (!isNaN(acres)) {
        return { value: Math.round(acres * 43560), confidence: 0.85, evidenceSnippet: acreMatch[0] };
      }
    }
    return null;
  }

  private static extractYearBuilt(text: string): ExtractedFieldValue<number> | null {
    const match = text.match(/(?:built\s*in\s*(\d{4})|year\s*built\s*[:=]?\s*(\d{4})|\b(?:built|vintage)\s*(\d{4})\b)/i);
    if (match) {
      const val = parseInt(match[1] || match[2] || match[3], 10);
      if (!isNaN(val) && val >= 1800 && val <= new Date().getFullYear() + 2) {
        return { value: val, confidence: 0.95, evidenceSnippet: match[0] };
      }
    }
    return null;
  }

  private static extractPurchasePrice(text: string): ExtractedFieldValue<number> | null {
    // 1. Keyword before price: "purchase price: $350k", "asking 350k", "price is $400,000"
    const prefixMatch = text.match(/(?:(?:purchase\s*price|asking\s*(?:price)?|contract\s*price|list\s*price|buy\s*price|price)\s*(?:is|:|=)?\s*(\$[\d,.]+[kmKM]?|\b\d{2,4}(?:\.\d+)?[kKmM]\b|\$[\d,]+))/i);
    if (prefixMatch) {
      const val = this.parseCurrencyNumber(prefixMatch[1]);
      if (val && val >= 1000) {
        return { value: val, confidence: 0.95, evidenceSnippet: prefixMatch[0] };
      }
    }
    return null;
  }

  private static extractRenovationEstimate(text: string): ExtractedFieldValue<number> | null {
    // 1. Prefix: "rehab budget: $35,000", "reno: 45k"
    const prefixMatch = text.match(/(?:(?:rehab(?:\s*budget)?|renovation(?:\s*budget)?|repair(?:\s*costs?)?|estimated\s*rehab|reno)\s*(?:is|:|=)?\s*(\$[\d,.]+[kmKM]?|\b\d{1,4}(?:\.\d+)?[kKmM]\b|\$[\d,]+))/i);
    if (prefixMatch) {
      const val = this.parseCurrencyNumber(prefixMatch[1]);
      if (val !== null && val >= 0) {
        return { value: val, confidence: 0.95, evidenceSnippet: prefixMatch[0] };
      }
    }
    // 2. Postfix: "45k reno", "$35k rehab" (same line)
    const postfixMatch = text.match(/(\$[\d,.]+[kmKM]?|\b\d{1,4}(?:\.\d+)?[kKmM]\b)[ \t]+(?:reno|rehab|renovation|repairs?)/i);
    if (postfixMatch) {
      const val = this.parseCurrencyNumber(postfixMatch[1]);
      if (val !== null && val >= 0) {
        return { value: val, confidence: 0.9, evidenceSnippet: postfixMatch[0] };
      }
    }
    return null;
  }

  private static extractARV(text: string): ExtractedFieldValue<number> | null {
    // 1. Prefix: "ARV: $390,000", "After repair value: $500k"
    const prefixMatch = text.match(/(?:(?:arv|after\s*repair\s*value|resale\s*value|projected\s*arv)\s*(?:\(arv\))?\s*(?:is|:|=)?\s*(\$[\d,.]+[kmKM]?|\b\d{2,4}(?:\.\d+)?[kKmM]\b|\$[\d,]+))/i);
    if (prefixMatch) {
      const val = this.parseCurrencyNumber(prefixMatch[1]);
      if (val && val >= 1000) {
        return { value: val, confidence: 0.95, evidenceSnippet: prefixMatch[0] };
      }
    }
    // 2. Postfix: "520k ARV", "$450k ARV" (same line)
    const postfixMatch = text.match(/(\$[\d,.]+[kmKM]?|\b\d{2,4}(?:\.\d+)?[kKmM]\b)[ \t]+(?:arv|after\s*repair\s*value)/i);
    if (postfixMatch) {
      const val = this.parseCurrencyNumber(postfixMatch[1]);
      if (val && val >= 1000) {
        return { value: val, confidence: 0.9, evidenceSnippet: postfixMatch[0] };
      }
    }
    return null;
  }

  private static extractProjectedRent(text: string): ExtractedFieldValue<number> | null {
    const match = text.match(/(?:(?:projected\s*rent|market\s*rent|target\s*rent|pro\s*forma\s*rent|rent\s*potential|rent)\s*(?:is|:|=)?\s*(\$[\d,.]+[kmKM]?|\b\d{3,5}\b)(?:\s*\/\s*(?:mo|month))?)/i);
    if (match) {
      const val = this.parseCurrencyNumber(match[1]);
      if (val && val >= 200 && val <= 50000) {
        return { value: val, confidence: 0.9, evidenceSnippet: match[0] };
      }
    }
    return null;
  }

  private static extractCurrentRent(text: string): ExtractedFieldValue<number> | null {
    const match = text.match(/(?:(?:current\s*rent|in-place\s*rent|actual\s*rent)\s*[:=]?\s*(\$[\d,.]+[kmKM]?|\b\d{3,5}\b)(?:\s*\/\s*(?:mo|month))?)/i);
    if (match) {
      const val = this.parseCurrencyNumber(match[1]);
      if (val && val >= 200 && val <= 50000) {
        return { value: val, confidence: 0.9, evidenceSnippet: match[0] };
      }
    }
    return null;
  }

  private static extractCapRate(text: string): ExtractedFieldValue<number> | null {
    const match = text.match(/(?:(?:cap\s*rate|capitalization\s*rate)\s*[:=]?\s*([\d.]+)\s*%)/i);
    if (match) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0 && val < 50) {
        return { value: val, confidence: 0.95, evidenceSnippet: match[0] };
      }
    }
    return null;
  }

  private static extractCashOnCash(text: string): ExtractedFieldValue<number> | null {
    const match = text.match(/(?:(?:cash\s*on\s*cash|coc|c-on-c)\s*(?:return)?\s*[:=]?\s*([\d.]+)\s*%)/i);
    if (match) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0 && val < 100) {
        return { value: val, confidence: 0.95, evidenceSnippet: match[0] };
      }
    }
    return null;
  }

  private static extractInPlaceNOI(text: string): ExtractedFieldValue<number> | null {
    const match = text.match(/(?:(?:in-place\s*noi|current\s*noi|actual\s*noi)\s*[:=]?\s*(\$[\d,.]+[kmKM]?))/i);
    if (match) {
      const val = this.parseCurrencyNumber(match[1]);
      if (val && val > 0) return { value: val, confidence: 0.9, evidenceSnippet: match[0] };
    }
    return null;
  }

  private static extractStabilizedNOI(text: string): ExtractedFieldValue<number> | null {
    const match = text.match(/(?:(?:stabilized\s*noi|pro\s*forma\s*noi|target\s*noi|noi)\s*[:=]?\s*(\$[\d,.]+[kmKM]?))/i);
    if (match) {
      const val = this.parseCurrencyNumber(match[1]);
      if (val && val > 0) return { value: val, confidence: 0.9, evidenceSnippet: match[0] };
    }
    return null;
  }

  private static extractInvestmentThesis(text: string): ExtractedFieldValue<string> | null {
    const match = text.match(/(?:(?:thesis|investment\s*thesis|summary|executive\s*summary|overview)\s*:\s*)([^\n]+(?:\n[^\n]+){0,3})/i);
    if (match) {
      const val = match[1].trim();
      if (val.length > 15) {
        return { value: val, confidence: 0.85, evidenceSnippet: match[0] };
      }
    }
    return null;
  }

  private static extractDealHighlights(text: string): ExtractedFieldValue<string[]> | null {
    const bulletMatches = text.match(/(?:^|\n)\s*[-*•]\s+([^\n]+)/g);
    if (bulletMatches && bulletMatches.length > 0) {
      const cleaned = bulletMatches.map((b) => b.replace(/^\s*[-*•]\s+/, '').trim()).filter((b) => b.length > 5);
      if (cleaned.length > 0) {
        return { value: cleaned.slice(0, 6), confidence: 0.8, evidenceSnippet: bulletMatches.join('\n') };
      }
    }
    return null;
  }

  private static extractRenovationScope(text: string): ExtractedFieldValue<string> | null {
    const match = text.match(/(?:(?:scope\s*of\s*work|renovation\s*scope|rehab\s*details|work\s*needed)\s*:\s*)([^\n]+(?:\n[^\n]+){0,2})/i);
    if (match) {
      const val = match[1].trim();
      if (val.length > 10) {
        return { value: val, confidence: 0.85, evidenceSnippet: match[0] };
      }
    }
    return null;
  }

  private static extractTitle(text: string, currentExtracted: ExtractedPropertyData): ExtractedFieldValue<string> | null {
    const explicitTitleMatch = text.match(/(?:Title|Project\s*Name|Campaign\s*Title)\s*:\s*([^\n]+)/i);
    if (explicitTitleMatch) {
      const val = explicitTitleMatch[1].trim();
      if (val.length > 3) {
        return { value: val, confidence: 0.95, evidenceSnippet: explicitTitleMatch[0] };
      }
    }

    // Derive cleanly from address or market
    if (currentExtracted.address?.value) {
      return {
        value: `${currentExtracted.address.value} Opportunity`,
        confidence: 0.8,
        evidenceSnippet: currentExtracted.address.evidenceSnippet,
      };
    }

    if (currentExtracted.targetMarket?.value) {
      return {
        value: `${currentExtracted.targetMarket.value} Investment Opportunity`,
        confidence: 0.7,
        evidenceSnippet: currentExtracted.targetMarket.evidenceSnippet,
      };
    }

    return null;
  }
}
