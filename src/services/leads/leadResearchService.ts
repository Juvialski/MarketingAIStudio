import { Lead, LeadSearchParams } from '../../types/leads';

export const SAMPLE_LEADS: Lead[] = [
  {
    id: 'lead-1',
    companyName: 'Lone Star Capital Acquisitions',
    category: 'Multi-Family Investment Operator',
    website: 'https://lonestarcapgroup.com',
    metroArea: 'Dallas-Fort Worth, TX',
    publicContactEmail: 'deals@lonestarcapgroup.com',
    publicPhone: '(214) 555-0182',
    addressSummary: 'Dallas Arts District, TX',
    estimatedPortfolioType: '1,200+ Value-Add Multi-Family Units across DFW',
    leadScore: 94,
    relevanceReason: 'Actively acquiring 50–200 unit value-add apartment communities with in-place rent expansion potential in North Texas.',
    sourceUrl: 'https://lonestarcapgroup.com/acquisitions-criteria',
    status: 'new',
    outreachAngle: {
      headline: 'Off-Market 8-Unit Value-Add Multi-Family in East Dallas (9.4% Stabilized Cap)',
      hook: 'Direct-to-operator opportunity with $2,800/mo in-place rent upside and $143k/door basis.',
      suggestedAngle: 'Lead with the clean 2-bed floorplans and verifiable $350/mo rent spread to renovated neighborhood comps.',
      recommendedAssetToSend: 'pro_forma_flyer',
      emailStarterDraft: `Hi Acquisitions Team,\n\nI reviewed Lone Star Capital's focus on value-add multi-family in the DFW submarkets and wanted to share underwriting on an off-market 8-unit boutique property in East Dallas (1824 Skillman St).\n\nKey Metrics:\n• Basis: $143,750 / door ($1.15M total)\n• Current Rents: $1,050/mo vs. $1,400/mo submarket comps\n• Projected Stabilized Cap: 9.4% upon $12k/unit cosmetic turn\n\nI have attached the full investment memorandum and trailing rent roll for your review. Let me know if you would like access to the deal room.`,
    },
  },
  {
    id: 'lead-2',
    companyName: 'Desert Sun Property Ventures',
    category: 'Fix & Flip / Single Family Fund',
    website: 'https://desertsunpropertiesaz.com',
    metroArea: 'Phoenix, AZ',
    publicContactEmail: 'invest@desertsunpropertiesaz.com',
    publicPhone: '(480) 555-0144',
    addressSummary: 'Scottsdale Airpark Corridor, AZ',
    estimatedPortfolioType: 'Active fix & flip operator executing 40+ annual residential turns',
    leadScore: 91,
    relevanceReason: 'Purchases residential value-add assets with $50k+ spread and cosmetic scopes in central Phoenix / Arcadia corridor.',
    sourceUrl: 'https://desertsunpropertiesaz.com/criteria',
    status: 'new',
    outreachAngle: {
      headline: 'Phoenix 3-Bed Value-Add with $70k Spread ($285k Basis / $390k ARV)',
      hook: '$155/SF entry with cosmetic-only scope and 24-day submarket average absorption.',
      suggestedAngle: 'Emphasize the light $35k renovation scope (no structural work) and recent comp at 4318 E Cambridge closing at $405k.',
      recommendedAssetToSend: 'deal_teaser',
      emailStarterDraft: `Hi Desert Sun Acquisitions,\n\nWe underwrote an off-market single-family opportunity in the Arcadia Lite corridor (4421 E Cambridge Ave) that aligns with your criteria:\n\n• Purchase Price: $285,000 ($155/SF)\n• Estimated Renovation: $35,000 (Cosmetic only)\n• Conservative ARV: $390,000 ($212/SF)\n• Gross Spread: $70,000\n\nComps on the street support $215–$225/SF. Inspection report and contractor bid sheet are ready. Can I send the pro forma package over?`,
    },
  },
  {
    id: 'lead-3',
    companyName: 'Canyon Ridge Private Lending & Equity',
    category: 'Private Money & Debt Fund',
    website: 'https://canyonridgecapital.com',
    metroArea: 'Phoenix, AZ',
    publicContactEmail: 'originations@canyonridgecapital.com',
    publicPhone: '(602) 555-0199',
    addressSummary: 'Biltmore Financial District, Phoenix, AZ',
    estimatedPortfolioType: '$45M+ AUM in bridge & construction debt',
    leadScore: 86,
    relevanceReason: 'Provides 1st lien bridge financing and gap capital for experienced residential and commercial value-add sponsors.',
    sourceUrl: 'https://canyonridgecapital.com/programs',
    status: 'new',
    outreachAngle: {
      headline: 'Low-LTV 1st Lien Opportunity on Phoenix Residential Value-Add',
      hook: 'Total all-in basis at 82% of conservative ARV with documented sponsor liquidity.',
      suggestedAngle: 'Pitch bridge loan funding or joint equity participation on short 75-day turnaround projects.',
      recommendedAssetToSend: 'pro_forma_flyer',
      emailStarterDraft: `Hi Originations Team,\n\nWe have secured a clean value-add residential asset in Phoenix with a total project cost of $320,000 against a $390,000 conservative ARV (82% LTC). We are reviewing senior bridge debt options for a 90-day term. Please let me know where to send the underwriting file.`,
    },
  },
  {
    id: 'lead-4',
    companyName: 'Trinity River Multi-Family Partners',
    category: 'Institutional Multi-Family Syndicator',
    website: 'https://trinityrivermf.com',
    metroArea: 'Dallas-Fort Worth, TX',
    publicContactEmail: 'acquisitions@trinityrivermf.com',
    publicPhone: '(817) 555-0177',
    addressSummary: 'Fort Worth & Dallas, TX',
    estimatedPortfolioType: 'Boutique apartment portfolios throughout North Texas',
    leadScore: 89,
    relevanceReason: 'Seeking small-bay and garden-style apartment communities in infill submarkets with organic rent growth.',
    sourceUrl: 'https://trinityrivermf.com/criteria',
    status: 'new',
    outreachAngle: {
      headline: 'East Dallas 8-Plex Underwriting with 9.4% Stabilized Yield',
      hook: 'Infill location with individually metered electric and $33k/yr in rent expansion.',
      suggestedAngle: 'Focus on low-maintenance architectural profile and rapid cosmetic turnaround.',
      recommendedAssetToSend: 'pro_forma_flyer',
      emailStarterDraft: `Hi Trinity River Team,\n\nSharing an off-market 8-unit multi-family asset at 1824 Skillman St in East Dallas. Acquisition basis is $143,750/door ($1.15M) with a clear path from a 6.8% in-place cap to 9.4% stabilized cap. Rent roll and full pro forma are available upon request.`,
    },
  },
];

export class LeadResearchService {
  public static async searchLeads(params: LeadSearchParams): Promise<Lead[]> {
    // Simulate research delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    const metroLower = params.metroArea.toLowerCase();
    const filtered = SAMPLE_LEADS.filter(
      (l) =>
        l.metroArea.toLowerCase().includes(metroLower) ||
        metroLower.includes(l.metroArea.split(',')[0].toLowerCase())
    );

    return filtered.length > 0 ? filtered : SAMPLE_LEADS;
  }
}
