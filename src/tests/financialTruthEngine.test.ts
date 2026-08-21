import { describe, it, expect } from 'vitest';
import { calculateCanonicalFinancials } from '../services/financials/financialTruthEngine';
import { buildCampaignFactLedger } from '../services/financials/campaignFactLedger';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';

describe('Financial Truth Engine', () => {
  describe('Phoenix Single-Family Value-Add Deterministic Arithmetic', () => {
    const phoenixInputs = {
      purchasePrice: 285000,
      renovationEstimate: 35000,
      arv: 390000,
      squareFeet: 1840,
    };

    it('calculates exact basis, gross spread, and spread on cost', () => {
      const fin = calculateCanonicalFinancials(phoenixInputs);

      expect(fin.allInBasis).toBe(320000);
      expect(fin.grossSpread).toBe(70000);
      // 70,000 / 320,000 = 0.21875 (21.875%)
      expect(fin.grossSpreadPercentOnCost).toBeCloseTo(21.875, 3);
      // 70,000 / 390,000 = 0.17948... (17.95% on exit)
      expect(fin.grossSpreadPercentOnExit).toBeCloseTo(17.948, 2);
    });

    it('calculates price per square foot correctly', () => {
      const fin = calculateCanonicalFinancials(phoenixInputs);

      // 285,000 / 1,840 = 154.8913...
      expect(fin.purchasePricePerSqFt).toBeCloseTo(154.89, 1);
      // 390,000 / 1,840 = 211.9565...
      expect(fin.arvPerSqFt).toBeCloseTo(211.96, 1);
    });
  });

  describe('Dallas 8-Unit Multi-Family Deterministic Arithmetic', () => {
    const dallasInputs = {
      purchasePrice: 1150000,
      renovationEstimate: 96000,
      inPlaceNOI: 78200,
      stabilizedNOI: 108100,
      currentRentPerUnitMonthly: 1050,
      projectedRentPerUnitMonthly: 1400,
      units: 8,
      squareFeet: 6400,
    };

    it('distinguishes in-place cap, stabilized cap on purchase, and yield on total cost', () => {
      const fin = calculateCanonicalFinancials(dallasInputs);

      expect(fin.allInBasis).toBe(1246000);
      // 78,200 / 1,150,000 = 0.068 (6.80%)
      expect(fin.inPlaceCapRateOnPurchase).toBeCloseTo(6.80, 2);
      // 108,100 / 1,150,000 = 0.094 (9.40%)
      expect(fin.stabilizedCapRateOnPurchase).toBeCloseTo(9.40, 2);
      // 108,100 / 1,246,000 = 0.086757... (8.68%)
      expect(fin.stabilizedYieldOnTotalCost).toBeCloseTo(8.68, 2);
    });

    it('calculates unit rent upside and annualized gross expansion correctly', () => {
      const fin = calculateCanonicalFinancials(dallasInputs);

      expect(fin.rentUpsidePerUnitMonthly).toBe(350);
      expect(fin.monthlyGrossRentUpside).toBe(2800); // 350 * 8
      expect(fin.annualGrossRentUpside).toBe(33600); // 2800 * 12
      expect(fin.purchasePricePerDoor).toBe(143750); // 1,150,000 / 8
    });
  });

  describe('Cash-on-Cash Return Gating', () => {
    it('omits cash-on-cash when only LTV or incomplete financing is provided', () => {
      const fin = calculateCanonicalFinancials({
        purchasePrice: 1150000,
        stabilizedNOI: 108100,
        financing: {
          ltvPercent: 65, // Incomplete: no interest rate, amortization, or debt service
        },
      });

      expect(fin.cashOnCashPercent).toBeUndefined();
      expect(fin.hasSufficientFinancingData).toBe(false);
    });

    it('computes cash-on-cash when complete financing data is supplied', () => {
      const fin = calculateCanonicalFinancials({
        purchasePrice: 1000000,
        renovationEstimate: 50000,
        stabilizedNOI: 100000,
        financing: {
          loanAmount: 700000,
          annualDebtService: 50000,
          equityInvested: 350000, // 300k down + 50k reno
        },
      });

      // NOI 100k - Debt 50k = 50k net cash flow. 50k / 350k = 14.285%
      expect(fin.hasSufficientFinancingData).toBe(true);
      expect(fin.cashOnCashPercent).toBeCloseTo(14.286, 2);
    });
  });

  describe('Campaign Fact Ledger Integration', () => {
    it('builds a structured ledger for sample campaigns without NaN or undefined labels', () => {
      for (const campaign of SAMPLE_CAMPAIGNS) {
        const ledger = buildCampaignFactLedger(campaign);
        expect(ledger.campaignId).toBe(campaign.id);
        expect(ledger.facts.length).toBeGreaterThan(5);

        for (const fact of ledger.facts) {
          expect(fact.key).toBeTruthy();
          expect(fact.label).toBeTruthy();
          expect(fact.formattedValue).not.toContain('NaN');
          expect(fact.formattedValue).not.toContain('undefined');
        }
      }
    });
  });
});
