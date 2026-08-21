import { Campaign, MetricBadgeConfig } from '../types/campaign';
import { calculateCanonicalFinancials } from '../services/financials/financialTruthEngine';

export function formatCurrency(value?: number): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value?: number): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatPercent(value?: number): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return `${value.toFixed(1)}%`;
}

export function formatEnumValue(value?: string): string {
  if (!value) return 'Not Provided';
  const clean = value.replace(/_/g, ' ');
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatPropertyType(type?: string): string {
  if (!type) return 'Single-Family';
  switch (type.toLowerCase()) {
    case 'single_family':
    case 'single family':
      return 'Single-Family';
    case 'multi_family':
    case 'multi family':
      return 'Multi-Family';
    case 'commercial':
      return 'Commercial';
    case 'land':
      return 'Land / Development';
    default:
      return formatEnumValue(type);
  }
}

export function getAvailableMetrics(campaign: Campaign): MetricBadgeConfig[] {
  const prop = campaign.sourceData.property;
  const metrics: MetricBadgeConfig[] = [];

  const units = prop?.propertyType === 'multi_family'
    ? (prop.bedrooms && prop.bedrooms >= 2 ? (prop.bedrooms === 16 ? 8 : Math.floor(prop.bedrooms / 2)) : 8)
    : 1;

  const fin = calculateCanonicalFinancials({
    purchasePrice: prop?.financials?.purchasePrice,
    renovationEstimate: prop?.financials?.renovationEstimate,
    arv: prop?.financials?.arv,
    squareFeet: prop?.squareFeet,
    units,
    inPlaceNOI: prop?.financials?.inPlaceNOI,
    stabilizedNOI: prop?.financials?.stabilizedNOI,
    currentRentMonthly: prop?.financials?.currentRentMonthly,
    projectedRentMonthly: prop?.financials?.projectedRentMonthly,
    explicitCapRatePercent: prop?.financials?.capRatePercent,
    explicitCashOnCashPercent: prop?.financials?.cashOnCashPercent,
    financing: prop?.financials?.financing,
  });

  if (fin.purchasePrice) {
    metrics.push({
      id: 'purchase',
      label: 'PURCHASE PRICE',
      value: formatCurrency(fin.purchasePrice),
      subtext: fin.purchasePricePerSqFt ? `$${Math.round(fin.purchasePricePerSqFt)}/SF` : undefined,
    });
  }

  if (fin.renovationEstimate > 0) {
    metrics.push({
      id: 'reno',
      label: 'EST. RENOVATION',
      value: formatCurrency(fin.renovationEstimate),
      subtext: 'Cosmetic Scope',
    });
  }

  if (fin.allInBasis > 0 && fin.renovationEstimate > 0) {
    metrics.push({
      id: 'all_in',
      label: 'ALL-IN BASIS',
      value: formatCurrency(fin.allInBasis),
      subtext: fin.allInBasisPerSqFt ? `$${Math.round(fin.allInBasisPerSqFt)}/SF` : undefined,
    });
  }

  if (fin.arv) {
    metrics.push({
      id: 'arv',
      label: 'UNDERWRITTEN ARV',
      value: formatCurrency(fin.arv),
      subtext: fin.arvPerSqFt ? `$${Math.round(fin.arvPerSqFt)}/SF` : undefined,
      highlight: true,
    });
  }

  if (fin.grossSpread !== undefined) {
    metrics.push({
      id: 'spread',
      label: 'GROSS SPREAD',
      value: formatCurrency(fin.grossSpread),
      subtext: fin.grossSpreadPercentOnCost ? `${fin.grossSpreadPercentOnCost.toFixed(1)}% on cost` : undefined,
      highlight: true,
    });
  }

  if (fin.stabilizedCapRateOnPurchase !== undefined) {
    metrics.push({
      id: 'cap_rate',
      label: 'STABILIZED CAP',
      value: formatPercent(fin.stabilizedCapRateOnPurchase),
      subtext: fin.stabilizedYieldOnTotalCost ? `${fin.stabilizedYieldOnTotalCost.toFixed(1)}% yield on cost` : undefined,
      highlight: true,
    });
  }

  if (fin.inPlaceCapRateOnPurchase !== undefined) {
    metrics.push({
      id: 'in_place_cap',
      label: 'IN-PLACE CAP',
      value: formatPercent(fin.inPlaceCapRateOnPurchase),
    });
  }

  if (fin.rentUpsidePerUnitMonthly !== undefined) {
    metrics.push({
      id: 'rent_upside',
      label: 'RENT UPSIDE',
      value: `+${formatCurrency(fin.rentUpsidePerUnitMonthly)}/mo`,
      subtext: fin.annualGrossRentUpside ? `+${formatCurrency(fin.annualGrossRentUpside)}/yr total` : undefined,
      highlight: true,
    });
  }

  if (fin.cashOnCashPercent !== undefined && fin.hasSufficientFinancingData) {
    metrics.push({
      id: 'cash_on_cash',
      label: 'CASH-ON-CASH',
      value: formatPercent(fin.cashOnCashPercent),
    });
  }

  if (prop?.bedrooms && prop?.bathrooms) {
    metrics.push({
      id: 'specs',
      label: 'CONFIGURATION',
      value: `${prop.bedrooms} Bed / ${prop.bathrooms} Bath`,
      subtext: prop.squareFeet ? `${formatNumber(prop.squareFeet)} Sq Ft` : undefined,
    });
  }

  if (prop?.squareFeet) {
    metrics.push({
      id: 'sqft',
      label: 'TOTAL AREA',
      value: `${formatNumber(prop.squareFeet)} SF`,
    });
  }

  if (prop?.propertyType === 'multi_family' && units > 1) {
    metrics.push({
      id: 'doors',
      label: 'TOTAL DOORS',
      value: `${units} Units`,
      subtext: fin.purchasePricePerDoor ? `${formatCurrency(fin.purchasePricePerDoor)}/door` : undefined,
    });
  }

  return metrics;
}
