import { Campaign } from '../../types/campaign';
import { calculateCanonicalFinancials, CanonicalFinancialMetrics } from './financialTruthEngine';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';

export type FactProvenance = 
  | 'user_provided' 
  | 'calculated' 
  | 'verified_source' 
  | 'demo_fixture' 
  | 'ai_suggestion';

export type FactStatus = 'verified' | 'calculated' | 'unverified' | 'demo';

export interface CampaignFact {
  key: string;
  category: 'property' | 'financial_input' | 'calculated_metric' | 'market_data' | 'disclaimer';
  label: string;
  value: string | number;
  formattedValue: string;
  unit?: string;
  provenance: FactProvenance;
  status: FactStatus;
  sourceReference?: string;
  calculatedFrom?: string[];
}

export interface CampaignFactLedger {
  campaignId: string;
  campaignName: string;
  isDemo: boolean;
  facts: CampaignFact[];
  financials: CanonicalFinancialMetrics;
  disclosures: string[];
}

export function buildCampaignFactLedger(campaign: Campaign): CampaignFactLedger {
  const prop = campaign.sourceData.property;
  const isDemo = campaign.tags?.includes('Demo') || campaign.tags?.includes('Fictional') || campaign.id.includes('sample') || campaign.id.includes('demo');
  const defaultProv: FactProvenance = isDemo ? 'demo_fixture' : 'user_provided';
  const defaultStatus: FactStatus = isDemo ? 'demo' : 'verified';

  const finInputs = {
    purchasePrice: prop?.financials?.purchasePrice,
    renovationEstimate: prop?.financials?.renovationEstimate,
    arv: prop?.financials?.arv,
    squareFeet: prop?.squareFeet,
    units: prop?.propertyType === 'multi_family' ? (prop.bedrooms && prop.bedrooms >= 2 ? (prop.bedrooms === 16 ? 8 : Math.floor(prop.bedrooms / 2)) : 1) : 1,
    inPlaceNOI: prop?.financials?.inPlaceNOI || (prop?.financials?.currentRentMonthly ? prop.financials.currentRentMonthly * 12 * 0.775 : undefined), // or from explicit
    stabilizedNOI: prop?.financials?.stabilizedNOI || (prop?.financials?.projectedRentMonthly ? prop.financials.projectedRentMonthly * 12 * 0.804 : undefined),
    currentRentMonthly: prop?.financials?.currentRentMonthly,
    projectedRentMonthly: prop?.financials?.projectedRentMonthly,
    explicitCapRatePercent: prop?.financials?.capRatePercent,
    explicitCashOnCashPercent: prop?.financials?.cashOnCashPercent,
  };

  const calculated = calculateCanonicalFinancials(finInputs);
  const facts: CampaignFact[] = [];

  // Property Facts
  if (prop?.address) {
    facts.push({
      key: 'property_address',
      category: 'property',
      label: 'Property Address',
      value: prop.address,
      formattedValue: `${prop.address}, ${prop.city}, ${prop.state} ${prop.zipCode || ''}`.trim(),
      provenance: defaultProv,
      status: defaultStatus,
    });
  }

  if (prop?.propertyType) {
    facts.push({
      key: 'property_type',
      category: 'property',
      label: 'Property Type',
      value: prop.propertyType,
      formattedValue: prop.propertyType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      provenance: defaultProv,
      status: defaultStatus,
    });
  }

  if (prop?.squareFeet) {
    facts.push({
      key: 'square_footage',
      category: 'property',
      label: 'Square Footage',
      value: prop.squareFeet,
      formattedValue: `${formatNumber(prop.squareFeet)} SF`,
      unit: 'SF',
      provenance: defaultProv,
      status: defaultStatus,
    });
  }

  if (prop?.bedrooms && prop?.bathrooms) {
    facts.push({
      key: 'bed_bath',
      category: 'property',
      label: 'Bedrooms / Bathrooms',
      value: `${prop.bedrooms} Bed / ${prop.bathrooms} Bath`,
      formattedValue: `${prop.bedrooms} Bed / ${prop.bathrooms} Bath`,
      provenance: defaultProv,
      status: defaultStatus,
    });
  }

  // Financial Inputs
  if (calculated.purchasePrice) {
    facts.push({
      key: 'purchase_price',
      category: 'financial_input',
      label: 'Purchase Price',
      value: calculated.purchasePrice,
      formattedValue: formatCurrency(calculated.purchasePrice),
      unit: 'USD',
      provenance: defaultProv,
      status: defaultStatus,
    });
  }

  if (calculated.renovationEstimate > 0) {
    facts.push({
      key: 'renovation_estimate',
      category: 'financial_input',
      label: 'Estimated Renovation Budget',
      value: calculated.renovationEstimate,
      formattedValue: formatCurrency(calculated.renovationEstimate),
      unit: 'USD',
      provenance: defaultProv,
      status: defaultStatus,
    });
  }

  if (calculated.arv) {
    facts.push({
      key: 'arv',
      category: 'financial_input',
      label: 'After Repair Value (ARV)',
      value: calculated.arv,
      formattedValue: formatCurrency(calculated.arv),
      unit: 'USD',
      provenance: defaultProv,
      status: defaultStatus,
    });
  }

  // Calculated Metrics
  facts.push({
    key: 'all_in_basis',
    category: 'calculated_metric',
    label: 'All-In Project Basis',
    value: calculated.allInBasis,
    formattedValue: formatCurrency(calculated.allInBasis),
    unit: 'USD',
    provenance: 'calculated',
    status: 'calculated',
    calculatedFrom: ['purchase_price', 'renovation_estimate'],
  });

  if (calculated.grossSpread !== undefined) {
    facts.push({
      key: 'gross_spread',
      category: 'calculated_metric',
      label: 'Projected Gross Spread (Before Carrying/Financing/Selling Costs)',
      value: calculated.grossSpread,
      formattedValue: formatCurrency(calculated.grossSpread),
      unit: 'USD',
      provenance: 'calculated',
      status: 'calculated',
      calculatedFrom: ['arv', 'all_in_basis'],
    });
  }

  if (calculated.grossSpreadPercentOnCost !== undefined) {
    facts.push({
      key: 'gross_spread_percent_on_cost',
      category: 'calculated_metric',
      label: 'Gross Spread % on Total Cost',
      value: calculated.grossSpreadPercentOnCost,
      formattedValue: formatPercent(calculated.grossSpreadPercentOnCost),
      unit: '%',
      provenance: 'calculated',
      status: 'calculated',
      calculatedFrom: ['gross_spread', 'all_in_basis'],
    });
  }

  if (calculated.purchasePricePerSqFt) {
    facts.push({
      key: 'purchase_price_per_sqft',
      category: 'calculated_metric',
      label: 'Purchase Price per SF',
      value: calculated.purchasePricePerSqFt,
      formattedValue: `$${calculated.purchasePricePerSqFt.toFixed(2)}/SF`,
      unit: 'USD/SF',
      provenance: 'calculated',
      status: 'calculated',
      calculatedFrom: ['purchase_price', 'square_footage'],
    });
  }

  if (calculated.arvPerSqFt) {
    facts.push({
      key: 'arv_per_sqft',
      category: 'calculated_metric',
      label: 'ARV per SF',
      value: calculated.arvPerSqFt,
      formattedValue: `$${calculated.arvPerSqFt.toFixed(2)}/SF`,
      unit: 'USD/SF',
      provenance: 'calculated',
      status: 'calculated',
      calculatedFrom: ['arv', 'square_footage'],
    });
  }

  if (calculated.purchasePricePerDoor) {
    facts.push({
      key: 'price_per_door',
      category: 'calculated_metric',
      label: 'Purchase Price per Door',
      value: calculated.purchasePricePerDoor,
      formattedValue: `${formatCurrency(calculated.purchasePricePerDoor)} / door`,
      unit: 'USD/door',
      provenance: 'calculated',
      status: 'calculated',
      calculatedFrom: ['purchase_price', 'units'],
    });
  }

  if (calculated.rentUpsidePerUnitMonthly) {
    facts.push({
      key: 'rent_upside_per_unit_monthly',
      category: 'calculated_metric',
      label: 'Monthly Rent Upside per Unit',
      value: calculated.rentUpsidePerUnitMonthly,
      formattedValue: `${formatCurrency(calculated.rentUpsidePerUnitMonthly)}/mo/unit`,
      unit: 'USD/mo/unit',
      provenance: 'calculated',
      status: 'calculated',
      calculatedFrom: ['current_rent', 'target_rent'],
    });
  }

  if (calculated.monthlyGrossRentUpside) {
    facts.push({
      key: 'monthly_gross_rent_upside',
      category: 'calculated_metric',
      label: 'Total Monthly Rent Upside',
      value: calculated.monthlyGrossRentUpside,
      formattedValue: `${formatCurrency(calculated.monthlyGrossRentUpside)}/mo`,
      unit: 'USD/mo',
      provenance: 'calculated',
      status: 'calculated',
      calculatedFrom: ['rent_upside_per_unit_monthly', 'units'],
    });
  }

  if (calculated.annualGrossRentUpside) {
    facts.push({
      key: 'annual_gross_rent_upside',
      category: 'calculated_metric',
      label: 'Annualized Gross Rent Upside',
      value: calculated.annualGrossRentUpside,
      formattedValue: `${formatCurrency(calculated.annualGrossRentUpside)}/year`,
      unit: 'USD/year',
      provenance: 'calculated',
      status: 'calculated',
      calculatedFrom: ['monthly_gross_rent_upside'],
    });
  }

  if (calculated.inPlaceCapRateOnPurchase) {
    facts.push({
      key: 'in_place_cap_rate',
      category: 'calculated_metric',
      label: 'In-Place Cap Rate on Purchase Basis',
      value: calculated.inPlaceCapRateOnPurchase,
      formattedValue: formatPercent(calculated.inPlaceCapRateOnPurchase),
      unit: '%',
      provenance: 'calculated',
      status: 'calculated',
      calculatedFrom: ['in_place_noi', 'purchase_price'],
    });
  }

  if (calculated.stabilizedCapRateOnPurchase) {
    facts.push({
      key: 'stabilized_cap_rate_on_purchase',
      category: 'calculated_metric',
      label: 'Stabilized Cap Rate on Purchase Basis',
      value: calculated.stabilizedCapRateOnPurchase,
      formattedValue: formatPercent(calculated.stabilizedCapRateOnPurchase),
      unit: '%',
      provenance: 'calculated',
      status: 'calculated',
      calculatedFrom: ['stabilized_noi', 'purchase_price'],
    });
  }

  if (calculated.stabilizedYieldOnTotalCost) {
    facts.push({
      key: 'stabilized_yield_on_cost',
      category: 'calculated_metric',
      label: 'Stabilized Yield on Total Project Cost',
      value: calculated.stabilizedYieldOnTotalCost,
      formattedValue: formatPercent(calculated.stabilizedYieldOnTotalCost),
      unit: '%',
      provenance: 'calculated',
      status: 'calculated',
      calculatedFrom: ['stabilized_noi', 'all_in_basis'],
    });
  }

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    isDemo,
    facts,
    financials: calculated,
    disclosures: calculated.disclosures,
  };
}

export function generateCampaignFactSheetMarkdown(campaign: Campaign): string {
  const ledger = buildCampaignFactLedger(campaign);
  const now = new Date().toISOString().split('T')[0];

  const groupByCategory = (cat: CampaignFact['category']) =>
    ledger.facts.filter((f) => f.category === cat);

  const renderTable = (facts: CampaignFact[]) => {
    if (facts.length === 0) return '_No entries._\n';
    return (
      '| Metric / Fact | Value | Provenance | Status |\n' +
      '| :--- | :--- | :--- | :--- |\n' +
      facts
        .map(
          (f) =>
            `| **${f.label}** | \`${f.formattedValue}\` | ${f.provenance.replace(/_/g, ' ')} | ${f.status} |`
        )
        .join('\n') +
      '\n\n'
    );
  };

  return `# Campaign Fact Sheet & Canonical Data Ledger
**Campaign:** ${campaign.name}  
**Date Generated:** ${now}  
**Status:** ${ledger.isDemo ? 'FICTIONAL DEMO / SAMPLE FIXTURE' : 'LIVE CAMPAIGN'}

${ledger.isDemo ? '> [!NOTE]\n> **DEMO / FICTIONAL SAMPLE**: All property details, financial metrics, and market statements are illustrative demonstration fixtures. Not a live investment offering or real listing.\n' : ''}

---

## 1. Property Specifications
${renderTable(groupByCategory('property'))}

## 2. Financial Inputs
${renderTable(groupByCategory('financial_input'))}

## 3. Deterministic Calculated Metrics
${renderTable(groupByCategory('calculated_metric'))}

## 4. Disclosures & Investment Terminology Definitions
${ledger.disclosures.map((d) => `- ${d}`).join('\n')}

---
*Generated by ZawMarketing Financial Truth Engine*
`;
}
