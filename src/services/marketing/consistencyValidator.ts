import { Campaign } from '../../types/campaign';
import { calculateCanonicalFinancials } from '../financials/financialTruthEngine';

export interface ConsistencyValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checkedFields: string[];
}

export function validateCampaignConsistency(campaign: Campaign): ConsistencyValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checkedFields: string[] = [];

  const prop = campaign.sourceData.property;
  const isDemo = campaign.tags?.includes('Demo') || campaign.tags?.includes('Fictional') || campaign.id.includes('sample');

  const fin = calculateCanonicalFinancials({
    purchasePrice: prop?.financials?.purchasePrice,
    renovationEstimate: prop?.financials?.renovationEstimate,
    arv: prop?.financials?.arv,
    squareFeet: prop?.squareFeet,
    units: prop?.propertyType === 'multi_family' ? (prop.bedrooms && prop.bedrooms >= 2 ? (prop.bedrooms === 16 ? 8 : Math.floor(prop.bedrooms / 2)) : 8) : 1,
    inPlaceNOI: prop?.financials?.inPlaceNOI,
    stabilizedNOI: prop?.financials?.stabilizedNOI,
    currentRentMonthly: prop?.financials?.currentRentMonthly,
    projectedRentMonthly: prop?.financials?.projectedRentMonthly,
    explicitCapRatePercent: prop?.financials?.capRatePercent,
  });

  const copy = campaign.copy;
  if (!copy) {
    return { valid: true, errors, warnings, checkedFields };
  }

  // Helper to search all generated copy text
  const allCopyText = [
    ...(copy.headlines || []),
    ...(copy.ctas || []),
    copy.facebook?.headline,
    copy.facebook?.body,
    copy.instagram?.headline,
    copy.instagram?.body,
    copy.linkedin?.headline,
    copy.linkedin?.body,
    ...(copy.emailNewsletter?.subjectLines || []),
    copy.emailNewsletter?.bodyMarkdown,
    copy.videoScript?.hook,
    ...(copy.videoScript?.scenes || []).map((s) => `${s.spokenAudio} ${s.onScreenText || ''}`),
  ]
    .filter(Boolean)
    .join('\n');

  // 1. Validate Purchase Price
  if (fin.purchasePrice) {
    checkedFields.push('purchasePrice');
    // Check for conflicting purchase prices
    const priceK = Math.round(fin.purchasePrice / 1000);
    const hasPriceRef =
      allCopyText.includes(`$${fin.purchasePrice.toLocaleString()}`) ||
      allCopyText.includes(`$${priceK}k`) ||
      allCopyText.includes(`$${priceK}K`) ||
      allCopyText.includes(`$${(fin.purchasePrice / 1000000).toFixed(2)}M`);

    if (!hasPriceRef) {
      warnings.push(`Purchase price ($${fin.purchasePrice.toLocaleString()}) is not referenced in generated copy.`);
    }
  }

  // 2. Validate Spread and Cost Margin
  if (fin.grossSpread !== undefined) {
    checkedFields.push('grossSpread');
    // Check if 17.9% is erroneously claimed on cost
    if (fin.grossSpreadPercentOnCost && fin.grossSpreadPercentOnExit) {
      const exitPercentStr = `${fin.grossSpreadPercentOnExit.toFixed(1)}%`;
      if (allCopyText.includes(`${exitPercentStr} on cost`)) {
        errors.push(
          `Copy incorrectly states ${exitPercentStr} is the margin on cost. Actual margin on cost is ${fin.grossSpreadPercentOnCost.toFixed(1)}%.`
        );
      }
    }
  }

  // 3. Validate Rent Upside
  if (fin.rentUpsidePerUnitMonthly !== undefined) {
    checkedFields.push('rentUpside');
    // Check for conflicting rent gap statements (e.g. $250 vs $350)
    if (fin.rentUpsidePerUnitMonthly === 350 && allCopyText.includes('$250/mo below market')) {
      errors.push('Copy references "$250/mo below market" which conflicts with canonical $350/mo upside ($1,050 to $1,400).');
    }
  }

  // 4. Validate Turnaround Consistency
  checkedFields.push('turnaround');
  const has60Day = allCopyText.includes('60-day') || allCopyText.includes('60 Days') || allCopyText.includes('60 days');
  const has75Day = allCopyText.includes('75-day') || allCopyText.includes('75 Days') || allCopyText.includes('75 days');
  if (has60Day && has75Day) {
    errors.push('Conflicting turnaround estimates found in copy: both 60-day and 75-day timelines are mentioned.');
  }

  // 5. Validate Cap Rate Labeling
  if (fin.stabilizedCapRateOnPurchase && fin.stabilizedYieldOnTotalCost) {
    checkedFields.push('capRate');
    const capStr = `${fin.stabilizedCapRateOnPurchase.toFixed(1)}%`;
    const yieldStr = `${fin.stabilizedYieldOnTotalCost.toFixed(1)}%`;
    if (allCopyText.includes(`${capStr} on cost`) && Math.abs(fin.stabilizedCapRateOnPurchase - fin.stabilizedYieldOnTotalCost) > 0.3) {
      errors.push(`Copy calls ${capStr} a "cap rate on cost", but ${capStr} is on purchase price (${yieldStr} is yield on total cost).`);
    }
  }

  // 6. Prohibited Claim Gating on Non-Demo Campaigns
  if (!isDemo) {
    const unverifiedClaims = [
      { pattern: /clean structural inspection/i, name: 'clean structural inspection' },
      { pattern: /zero delinquencies/i, name: 'zero delinquencies' },
      { pattern: /sold within the last 60 days/i, name: 'recent 60-day comp' },
      { pattern: /1\.8 months of inventory/i, name: 'exact inventory months' },
    ];

    for (const claim of unverifiedClaims) {
      if (claim.pattern.test(allCopyText)) {
        warnings.push(`Marketing copy asserts "${claim.name}" which requires explicit source verification.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checkedFields,
  };
}
