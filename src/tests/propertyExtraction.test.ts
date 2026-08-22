import { describe, it, expect, vi } from 'vitest';
import { PropertyExtractionService } from '../services/extraction/propertyExtractionService';
import { supabase } from '../services/supabase/client';

describe('PropertyExtractionService ("Paste Everything" Intake)', () => {
  it('extracts complete property facts from raw MLS remarks without hallucinating', async () => {
    const rawMLS = `
      OFF MARKET FIX & FLIP OPPORTUNITY!
      4421 E Cambridge Ave, Phoenix, AZ 85008 (Arcadia Lite neighborhood)
      3 Beds, 2 Baths | 1,840 sqft | Built in 1958 | Lot size: 7,500 sqft
      Purchase Price: $285,000
      Estimated Rehab Budget: $35,000
      After Repair Value (ARV): $390,000
      Projected Monthly Rent: $2,400/mo
      Cap Rate: 9.4%
      
      Investment Highlights:
      - Cosmetic value-add opportunity with high upside
      - Strong rental demand near Biltmore corridor
      - Brand new roof installed in 2022
    `;

    const result = await PropertyExtractionService.extractPropertyData(rawMLS);
    const data = result.data;

    expect(data.campaignType?.value).toBe('fix_and_flip');
    expect(data.address?.value).toBe('4421 E Cambridge Ave');
    expect(data.city?.value).toBe('Phoenix');
    expect(data.state?.value).toBe('AZ');
    expect(data.zipCode?.value).toBe('85008');
    expect(data.neighborhood?.value).toBe('Arcadia Lite');
    expect(data.bedrooms?.value).toBe(3);
    expect(data.bathrooms?.value).toBe(2);
    expect(data.squareFeet?.value).toBe(1840);
    expect(data.lotSizeSqFt?.value).toBe(7500);
    expect(data.yearBuilt?.value).toBe(1958);
    expect(data.purchasePrice?.value).toBe(285000);
    expect(data.renovationEstimate?.value).toBe(35000);
    expect(data.arv?.value).toBe(390000);
    expect(data.projectedRentMonthly?.value).toBe(2400);
    expect(data.capRatePercent?.value).toBe(9.4);
    expect(data.dealHighlights?.value?.length).toBeGreaterThan(0);
    expect(result.fieldsExtractedCount).toBeGreaterThan(10);
  });

  it('handles shorthands like $350k and $1.2M accurately', () => {
    const text = 'Asking 350k with 45k reno and 520k ARV. Projected rent is $2.8k/mo.';
    const data = PropertyExtractionService.parseDeterministically(text);

    expect(data.purchasePrice?.value).toBe(350000);
    expect(data.renovationEstimate?.value).toBe(45000);
    expect(data.arv?.value).toBe(520000);
    expect(data.projectedRentMonthly?.value).toBe(2800);
  });

  it('preserves zero-hallucination directive when fields are absent', () => {
    const sparseText = 'Just an address: 123 Main St, Austin, TX. Needs work.';
    const data = PropertyExtractionService.parseDeterministically(sparseText);

    expect(data.address?.value).toBe('123 Main St');
    expect(data.city?.value).toBe('Austin');
    expect(data.state?.value).toBe('TX');
    expect(data.purchasePrice).toBeUndefined();
    expect(data.arv).toBeUndefined();
    expect(data.bedrooms).toBeUndefined();
    expect(data.squareFeet).toBeUndefined();
  });

  it('does not call the live Edge Function from an explicit demo workspace', async () => {
    const invoke = vi.spyOn(supabase.functions, 'invoke');
    const result = await PropertyExtractionService.extractPropertyData(
      'Market: Phoenix, AZ. Asking $350k.',
      { organizationId: 'org-shaped-demo-value', runtimeMode: 'demo' }
    );

    expect(result.source).toBe('deterministic_fallback');
    expect(invoke).not.toHaveBeenCalled();
  });
});
