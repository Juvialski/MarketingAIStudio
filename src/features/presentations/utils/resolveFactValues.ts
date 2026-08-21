import { Campaign } from '../../../types/campaign';
import { buildCampaignFactLedger, CampaignFactLedger } from '../../../services/financials/campaignFactLedger';

const FACT_KEY_ALIASES: Record<string, string> = {
  price_per_square_foot: 'purchase_price_per_sqft',
  purchase_price_per_square_foot: 'purchase_price_per_sqft',
  arv_per_square_foot: 'arv_per_sqft',
  doors: 'units',
  unit_count: 'units',
  cap_rate: 'stabilized_cap_rate_on_purchase',
  stabilized_cap_rate: 'stabilized_cap_rate_on_purchase',
  yield_on_cost: 'stabilized_yield_on_cost',
  spread: 'gross_spread',
  spread_percent: 'gross_spread_percent_on_cost',
  reno_estimate: 'renovation_estimate',
  purchase: 'purchase_price',
  all_in: 'all_in_basis',
  sqft: 'square_footage',
  square_feet: 'square_footage',
  rent_upside: 'monthly_gross_rent_upside',
};

/**
 * Resolves a quantitative fact key to its verified formatted value from the canonical ledger.
 * If the fact is missing or unsupported, returns fallback or null.
 */
export function resolveFactValue(
  factKey: string,
  ledgerOrCampaign: CampaignFactLedger | Campaign,
  fallback?: string
): string | null {
  const ledger = 'facts' in ledgerOrCampaign
    ? ledgerOrCampaign
    : buildCampaignFactLedger(ledgerOrCampaign);

  const normalizedKey = FACT_KEY_ALIASES[factKey] || factKey;

  // 1. Direct match in facts list
  const matched = ledger.facts.find((f) => f.key === normalizedKey || f.key === factKey);
  if (matched && matched.formattedValue) {
    return matched.formattedValue;
  }

  // 2. Direct financial metric fallback checks
  const fin = ledger.financials;
  if (normalizedKey === 'purchase_price' && fin.purchasePrice) {
    return `$${fin.purchasePrice.toLocaleString()}`;
  }
  if (normalizedKey === 'renovation_estimate' && fin.renovationEstimate !== undefined) {
    return `$${fin.renovationEstimate.toLocaleString()}`;
  }
  if (normalizedKey === 'all_in_basis' && fin.allInBasis !== undefined) {
    return `$${fin.allInBasis.toLocaleString()}`;
  }
  if (normalizedKey === 'arv' && fin.arv) {
    return `$${fin.arv.toLocaleString()}`;
  }
  if (normalizedKey === 'gross_spread' && fin.grossSpread !== undefined) {
    return `$${fin.grossSpread.toLocaleString()}`;
  }
  if (normalizedKey === 'gross_spread_percent_on_cost' && fin.grossSpreadPercentOnCost !== undefined) {
    return `${fin.grossSpreadPercentOnCost.toFixed(1)}%`;
  }
  if (normalizedKey === 'purchase_price_per_sqft' && fin.purchasePricePerSqFt) {
    return `$${fin.purchasePricePerSqFt.toFixed(2)}/SF`;
  }
  if (normalizedKey === 'arv_per_sqft' && fin.arvPerSqFt) {
    return `$${fin.arvPerSqFt.toFixed(2)}/SF`;
  }
  if (normalizedKey === 'units' && fin.units) {
    return `${fin.units}`;
  }
  if (normalizedKey === 'in_place_cap_rate' && fin.inPlaceCapRateOnPurchase) {
    return `${fin.inPlaceCapRateOnPurchase.toFixed(1)}%`;
  }
  if (normalizedKey === 'stabilized_cap_rate_on_purchase' && fin.stabilizedCapRateOnPurchase) {
    return `${fin.stabilizedCapRateOnPurchase.toFixed(1)}%`;
  }
  if (normalizedKey === 'stabilized_yield_on_cost' && fin.stabilizedYieldOnTotalCost) {
    return `${fin.stabilizedYieldOnTotalCost.toFixed(1)}%`;
  }

  return fallback ?? null;
}

/**
 * Enriches a presentation metric item with verified facts from the campaign ledger.
 * If a factKey is provided, resolves the canonical formatted value so AI never invents numbers.
 */
export function resolveMetricItem<T extends { label: string; value: string; factKey?: string; caption?: string; subtext?: string }>(
  item: T,
  ledgerOrCampaign: CampaignFactLedger | Campaign
): T {
  if (!item.factKey) return item;

  const verifiedValue = resolveFactValue(item.factKey, ledgerOrCampaign);
  if (verifiedValue) {
    return {
      ...item,
      value: verifiedValue,
    };
  }

  return item;
}
