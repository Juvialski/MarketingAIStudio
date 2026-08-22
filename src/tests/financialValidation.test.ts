import { describe, expect, it } from 'vitest';
import { validatePropertyFinancials } from '../services/financials/financialValidation';

describe('deterministic property financial validation', () => {
  it('rejects non-finite, negative, and non-positive calculation inputs', () => {
    const report = validatePropertyFinancials({
      purchasePrice: -1,
      squareFeet: 0,
      explicitCapRatePercent: Number.NaN,
    });

    expect(report.valid).toBe(false);
    expect(report.errors.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'purchasePrice_negative',
      'square_feet_non_positive',
      'explicitCapRatePercent_not_finite',
    ]));
  });

  it('reports suspicious spread assumptions without inventing replacement values', () => {
    const report = validatePropertyFinancials({
      purchasePrice: 500000,
      renovationEstimate: 500000,
      arv: 450000,
      currentRentMonthly: 3000,
      projectedRentMonthly: 2500,
    });

    expect(report.valid).toBe(true);
    expect(report.warnings.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'renovation_exceeds_arv',
      'purchase_exceeds_arv',
      'all_in_basis_exceeds_arv',
      'projected_rent_below_current',
    ]));
  });
});
