/**
 * Deterministic Financial Calculation Engine for Real Estate Investments
 * 
 * Rules:
 * 1. AI must NOT perform or invent investment arithmetic in prose.
 * 2. Gross spread is ARV - All-In Basis, and is strictly labeled as gross spread before financing/holding/selling costs.
 * 3. Gross spread on cost is (grossSpread / allInBasis) * 100.
 * 4. Stabilized cap rate on purchase is (stabilizedNOI / purchasePrice) * 100.
 * 5. Stabilized yield on cost is (stabilizedNOI / allInBasis) * 100.
 * 6. Cash-on-cash is ONLY calculated if full debt service and equity outlay inputs exist; never estimated from LTV alone.
 */

export interface FinancingInputs {
  ltvPercent?: number;
  loanAmount?: number;
  interestRatePercent?: number;
  amortizationYears?: number;
  annualDebtService?: number;
  equityInvested?: number;
  closingCosts?: number;
}

export interface PropertyFinancialInputs {
  purchasePrice?: number;
  renovationEstimate?: number;
  arv?: number;
  squareFeet?: number;
  units?: number;
  inPlaceNOI?: number;
  stabilizedNOI?: number;
  currentRentMonthly?: number; // Total monthly or per-unit if specified
  currentRentPerUnitMonthly?: number;
  projectedRentMonthly?: number; // Total monthly or per-unit if specified
  projectedRentPerUnitMonthly?: number;
  financing?: FinancingInputs;
  // Raw explicit overrides if user supplied
  explicitCapRatePercent?: number;
  explicitCashOnCashPercent?: number;
}

export interface CanonicalFinancialMetrics {
  purchasePrice?: number;
  renovationEstimate: number;
  allInBasis: number;
  arv?: number;
  grossSpread?: number;
  grossSpreadPercentOnCost?: number;
  grossSpreadPercentOnExit?: number;
  purchasePricePerSqFt?: number;
  arvPerSqFt?: number;
  allInBasisPerSqFt?: number;
  units?: number;
  purchasePricePerDoor?: number;
  allInBasisPerDoor?: number;
  currentRentPerUnitMonthly?: number;
  currentTotalRentMonthly?: number;
  projectedRentPerUnitMonthly?: number;
  projectedTotalRentMonthly?: number;
  rentUpsidePerUnitMonthly?: number;
  monthlyGrossRentUpside?: number;
  annualGrossRentUpside?: number;
  inPlaceNOI?: number;
  inPlaceCapRateOnPurchase?: number;
  stabilizedNOI?: number;
  stabilizedCapRateOnPurchase?: number;
  stabilizedYieldOnTotalCost?: number;
  cashOnCashPercent?: number;
  hasSufficientFinancingData: boolean;
  spreadDescription: string;
  disclosures: string[];
}

export function calculateCanonicalFinancials(
  inputs: PropertyFinancialInputs
): CanonicalFinancialMetrics {
  const purchasePrice = inputs.purchasePrice && inputs.purchasePrice > 0 ? inputs.purchasePrice : undefined;
  const renovationEstimate = inputs.renovationEstimate && inputs.renovationEstimate > 0 ? inputs.renovationEstimate : 0;
  const allInBasis = (purchasePrice || 0) + renovationEstimate;
  const arv = inputs.arv && inputs.arv > 0 ? inputs.arv : undefined;
  const squareFeet = inputs.squareFeet && inputs.squareFeet > 0 ? inputs.squareFeet : undefined;
  const units = inputs.units && inputs.units > 0 ? inputs.units : undefined;

  // Gross spread calculations
  let grossSpread: number | undefined;
  let grossSpreadPercentOnCost: number | undefined;
  let grossSpreadPercentOnExit: number | undefined;

  if (arv !== undefined && allInBasis > 0) {
    grossSpread = arv - allInBasis;
    grossSpreadPercentOnCost = (grossSpread / allInBasis) * 100;
    grossSpreadPercentOnExit = (grossSpread / arv) * 100;
  }

  // Price per square foot
  const purchasePricePerSqFt = purchasePrice && squareFeet ? purchasePrice / squareFeet : undefined;
  const arvPerSqFt = arv && squareFeet ? arv / squareFeet : undefined;
  const allInBasisPerSqFt = allInBasis > 0 && squareFeet ? allInBasis / squareFeet : undefined;

  // Price per door (multi-family)
  const purchasePricePerDoor = purchasePrice && units ? purchasePrice / units : undefined;
  const allInBasisPerDoor = allInBasis > 0 && units ? allInBasis / units : undefined;

  // Rent upside calculations
  let currentRentPerUnitMonthly = inputs.currentRentPerUnitMonthly;
  let currentTotalRentMonthly = inputs.currentRentMonthly;
  let projectedRentPerUnitMonthly = inputs.projectedRentPerUnitMonthly;
  let projectedTotalRentMonthly = inputs.projectedRentMonthly;

  if (units) {
    if (currentTotalRentMonthly && !currentRentPerUnitMonthly) {
      currentRentPerUnitMonthly = currentTotalRentMonthly / units;
    } else if (currentRentPerUnitMonthly && !currentTotalRentMonthly) {
      currentTotalRentMonthly = currentRentPerUnitMonthly * units;
    }

    if (projectedTotalRentMonthly && !projectedRentPerUnitMonthly) {
      projectedRentPerUnitMonthly = projectedTotalRentMonthly / units;
    } else if (projectedRentPerUnitMonthly && !projectedTotalRentMonthly) {
      projectedTotalRentMonthly = projectedRentPerUnitMonthly * units;
    }
  }

  let rentUpsidePerUnitMonthly: number | undefined;
  let monthlyGrossRentUpside: number | undefined;
  let annualGrossRentUpside: number | undefined;

  if (projectedTotalRentMonthly !== undefined && currentTotalRentMonthly !== undefined) {
    monthlyGrossRentUpside = projectedTotalRentMonthly - currentTotalRentMonthly;
    annualGrossRentUpside = monthlyGrossRentUpside * 12;
    if (units) {
      rentUpsidePerUnitMonthly = monthlyGrossRentUpside / units;
    }
  } else if (projectedRentPerUnitMonthly !== undefined && currentRentPerUnitMonthly !== undefined) {
    rentUpsidePerUnitMonthly = projectedRentPerUnitMonthly - currentRentPerUnitMonthly;
    if (units) {
      monthlyGrossRentUpside = rentUpsidePerUnitMonthly * units;
      annualGrossRentUpside = monthlyGrossRentUpside * 12;
    }
  }

  // Cap rate & yield calculations
  const inPlaceNOI = inputs.inPlaceNOI && inputs.inPlaceNOI > 0 ? inputs.inPlaceNOI : undefined;
  const stabilizedNOI = inputs.stabilizedNOI && inputs.stabilizedNOI > 0 ? inputs.stabilizedNOI : undefined;

  let inPlaceCapRateOnPurchase: number | undefined;
  let stabilizedCapRateOnPurchase: number | undefined;
  let stabilizedYieldOnTotalCost: number | undefined;

  if (inPlaceNOI && purchasePrice) {
    inPlaceCapRateOnPurchase = (inPlaceNOI / purchasePrice) * 100;
  }

  if (stabilizedNOI && purchasePrice) {
    stabilizedCapRateOnPurchase = (stabilizedNOI / purchasePrice) * 100;
  } else if (inputs.explicitCapRatePercent && purchasePrice) {
    // If explicitly specified in legacy format
    stabilizedCapRateOnPurchase = inputs.explicitCapRatePercent;
  }

  if (stabilizedNOI && allInBasis > 0) {
    stabilizedYieldOnTotalCost = (stabilizedNOI / allInBasis) * 100;
  } else if (stabilizedCapRateOnPurchase && purchasePrice && allInBasis > 0) {
    // Implied NOI = stabilizedCapRateOnPurchase * purchasePrice
    const impliedNOI = (stabilizedCapRateOnPurchase / 100) * purchasePrice;
    stabilizedYieldOnTotalCost = (impliedNOI / allInBasis) * 100;
  }

  // Cash-on-cash verification
  // Requires: annualDebtService (or full loan terms) AND equityInvested (or purchase price + closing costs - loan)
  let cashOnCashPercent: number | undefined;
  let hasSufficientFinancingData = false;

  const fin = inputs.financing;
  if (fin) {
    const loanAmt = fin.loanAmount || (fin.ltvPercent && purchasePrice ? (fin.ltvPercent / 100) * purchasePrice : undefined);
    let debtService = fin.annualDebtService;

    // If debt service not provided directly, check if we have interest rate and amortization
    if (!debtService && loanAmt && fin.interestRatePercent && fin.amortizationYears) {
      const r = (fin.interestRatePercent / 100) / 12;
      const n = fin.amortizationYears * 12;
      const monthlyPayment = loanAmt * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      debtService = monthlyPayment * 12;
    }

    const equity = fin.equityInvested || (purchasePrice && loanAmt ? (purchasePrice - loanAmt) + renovationEstimate + (fin.closingCosts || 0) : undefined);

    if (stabilizedNOI && debtService && equity && equity > 0) {
      const netCashFlow = stabilizedNOI - debtService;
      cashOnCashPercent = (netCashFlow / equity) * 100;
      hasSufficientFinancingData = true;
    }
  }

  const disclosures: string[] = [];
  if (grossSpread !== undefined) {
    disclosures.push(
      'Projected gross spread represents the difference between estimated ARV and all-in acquisition/renovation basis before financing, carrying, transaction, and selling costs.'
    );
  }
  if (stabilizedCapRateOnPurchase !== undefined && stabilizedYieldOnTotalCost !== undefined) {
    disclosures.push(
      `Stabilized cap rate (${stabilizedCapRateOnPurchase.toFixed(1)}%) is based on acquisition price; stabilized yield on total project cost is ${stabilizedYieldOnTotalCost.toFixed(1)}%.`
    );
  }

  return {
    purchasePrice,
    renovationEstimate,
    allInBasis,
    arv,
    grossSpread,
    grossSpreadPercentOnCost,
    grossSpreadPercentOnExit,
    purchasePricePerSqFt,
    arvPerSqFt,
    allInBasisPerSqFt,
    units,
    purchasePricePerDoor,
    allInBasisPerDoor,
    currentRentPerUnitMonthly,
    currentTotalRentMonthly,
    projectedRentPerUnitMonthly,
    projectedTotalRentMonthly,
    rentUpsidePerUnitMonthly,
    monthlyGrossRentUpside,
    annualGrossRentUpside,
    inPlaceNOI,
    inPlaceCapRateOnPurchase,
    stabilizedNOI,
    stabilizedCapRateOnPurchase,
    stabilizedYieldOnTotalCost,
    cashOnCashPercent,
    hasSufficientFinancingData,
    spreadDescription: 'Projected Gross Spread Before Financing, Carrying, Transaction and Selling Costs',
    disclosures,
  };
}
