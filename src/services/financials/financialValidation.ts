import { PropertyFinancialInputs } from './financialTruthEngine';

export type FinancialValidationSeverity = 'error' | 'warning';

export interface FinancialValidationIssue {
  code: string;
  severity: FinancialValidationSeverity;
  message: string;
}

export interface FinancialValidationReport {
  valid: boolean;
  errors: FinancialValidationIssue[];
  warnings: FinancialValidationIssue[];
}

const numericFields: Array<[keyof PropertyFinancialInputs, string]> = [
  ['purchasePrice', 'Purchase price'],
  ['renovationEstimate', 'Renovation budget'],
  ['arv', 'ARV'],
  ['squareFeet', 'Square footage'],
  ['units', 'Unit count'],
  ['inPlaceNOI', 'In-place NOI'],
  ['stabilizedNOI', 'Stabilized NOI'],
  ['currentRentMonthly', 'Current rent'],
  ['currentRentPerUnitMonthly', 'Current rent per unit'],
  ['projectedRentMonthly', 'Projected rent'],
  ['projectedRentPerUnitMonthly', 'Projected rent per unit'],
  ['explicitCapRatePercent', 'Cap rate'],
  ['explicitCashOnCashPercent', 'Cash-on-cash return'],
];

export function validatePropertyFinancials(inputs: PropertyFinancialInputs): FinancialValidationReport {
  const errors: FinancialValidationIssue[] = [];
  const warnings: FinancialValidationIssue[] = [];
  const addError = (code: string, message: string) => errors.push({ code, severity: 'error', message });
  const addWarning = (code: string, message: string) => warnings.push({ code, severity: 'warning', message });

  for (const [field, label] of numericFields) {
    const value = inputs[field];
    if (value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      addError(`${String(field)}_not_finite`, `${label} must be a finite number.`);
    } else if (value < 0) {
      addError(`${String(field)}_negative`, `${label} cannot be negative.`);
    }
  }

  if (inputs.squareFeet !== undefined && inputs.squareFeet <= 0) {
    addError('square_feet_non_positive', 'Square footage must be greater than zero before per-square-foot metrics can be calculated.');
  }
  if (inputs.units !== undefined && inputs.units <= 0) {
    addError('units_non_positive', 'Unit count must be greater than zero before per-door metrics can be calculated.');
  }
  if (inputs.explicitCapRatePercent !== undefined && inputs.explicitCapRatePercent > 100) {
    addError('cap_rate_out_of_range', 'Cap rate must be between 0% and 100%.');
  }
  if (inputs.explicitCashOnCashPercent !== undefined && inputs.explicitCashOnCashPercent > 1000) {
    addError('cash_on_cash_out_of_range', 'Cash-on-cash return is outside a plausible percentage range.');
  }

  const allInBasis = (inputs.purchasePrice || 0) + (inputs.renovationEstimate || 0);
  if (inputs.arv !== undefined && inputs.renovationEstimate !== undefined && inputs.renovationEstimate > inputs.arv) {
    addWarning('renovation_exceeds_arv', 'Renovation budget exceeds ARV; confirm the figures and the intended valuation basis.');
  }
  if (inputs.purchasePrice !== undefined && inputs.arv !== undefined && inputs.purchasePrice > inputs.arv) {
    addWarning('purchase_exceeds_arv', 'Purchase price exceeds ARV; messaging that assumes positive spread should be reviewed.');
  }
  if (inputs.arv !== undefined && allInBasis > inputs.arv) {
    addWarning('all_in_basis_exceeds_arv', 'All-in basis exceeds ARV, so the deterministic gross spread is negative.');
  }
  if (inputs.currentRentMonthly !== undefined && inputs.projectedRentMonthly !== undefined && inputs.projectedRentMonthly < inputs.currentRentMonthly) {
    addWarning('projected_rent_below_current', 'Projected rent is below current rent; confirm whether this is an intentional downside scenario.');
  }
  if (inputs.inPlaceNOI !== undefined && inputs.stabilizedNOI !== undefined && inputs.stabilizedNOI < inputs.inPlaceNOI) {
    addWarning('stabilized_noi_below_in_place', 'Stabilized NOI is below in-place NOI; confirm the scenario assumptions.');
  }

  const financing = inputs.financing;
  if (financing) {
    for (const [field, label] of [
      ['ltvPercent', 'LTV'],
      ['loanAmount', 'Loan amount'],
      ['interestRatePercent', 'Interest rate'],
      ['amortizationYears', 'Amortization term'],
      ['annualDebtService', 'Annual debt service'],
      ['equityInvested', 'Equity invested'],
      ['closingCosts', 'Closing costs'],
    ] as const) {
      const value = financing[field];
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        addError(`${field}_invalid`, `${label} must be a non-negative finite number.`);
      }
    }
    if (financing.ltvPercent !== undefined && financing.ltvPercent > 100) {
      addError('ltv_out_of_range', 'LTV must be between 0% and 100%.');
    }
    if (financing.interestRatePercent !== undefined && financing.interestRatePercent > 100) {
      addError('interest_rate_out_of_range', 'Interest rate must be between 0% and 100%.');
    }
    if (financing.amortizationYears !== undefined && financing.amortizationYears <= 0) {
      addError('amortization_non_positive', 'Amortization term must be greater than zero.');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
