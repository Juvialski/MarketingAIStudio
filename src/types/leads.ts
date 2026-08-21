/**
 * Lead Finder and Public Business Research Definitions
 */

export interface LeadSearchParams {
  metroArea: string; // e.g. "Phoenix, AZ" or "Dallas-Fort Worth, TX"
  targetCategory: 
    | 'real_estate_investors' 
    | 'fix_and_flip_operators' 
    | 'commercial_brokers' 
    | 'property_managers' 
    | 'hard_money_lenders' 
    | 'wholesalers';
  minEstimatedDealVolume?: string;
  focusKeywords?: string;
}

export interface OutreachAngle {
  headline: string;
  hook: string;
  suggestedAngle: string;
  recommendedAssetToSend: 'pro_forma_flyer' | 'case_study' | 'market_report' | 'deal_teaser';
  emailStarterDraft: string;
}

export interface Lead {
  id: string;
  companyName: string;
  category: string;
  website: string;
  metroArea: string;
  publicContactEmail?: string;
  publicPhone?: string;
  addressSummary?: string;
  estimatedPortfolioType: string;
  leadScore: number; // 0 - 100
  relevanceReason: string;
  sourceUrl: string;
  outreachAngle: OutreachAngle;
  status: 'new' | 'reviewed' | 'saved' | 'contacted' | 'archived';
  notes?: string;
}
