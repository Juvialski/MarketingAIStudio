import { describe, it, expect } from 'vitest';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { generateDeterministicPresentationDeck } from '../features/presentations/services/demoDeckGenerator';
import { presentationDeckSchema } from '../features/presentations/schemas/presentationSchema';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('demoDeckGenerator (Deterministic Fixture Generation)', () => {
  const phoenixCampaign = SAMPLE_CAMPAIGNS.find((c) => c.id === 'campaign-phoenix-fix-flip')!;
  const dallasCampaign = SAMPLE_CAMPAIGNS.find((c) => c.id === 'campaign-dallas-multifamily')!;

  it('generates a 12-slide Phoenix value-add demo deck that passes schema validation', () => {
    const deck = generateDeterministicPresentationDeck(phoenixCampaign, DEFAULT_BRAND_KIT);

    const parseResult = presentationDeckSchema.safeParse(deck);
    expect(parseResult.success).toBe(true);

    expect(deck.isDemo).toBe(true);
    expect(deck.slides.length).toBeGreaterThanOrEqual(10);
    expect(deck.slides[0].type).toBe('cover');
    expect(deck.slides[deck.slides.length - 1].type).toBe('next_steps');

    // Verify financial snapshot has verified numbers
    const finSlide = deck.slides.find((s) => s.type === 'financial_snapshot');
    expect(finSlide).toBeDefined();
    if (finSlide && finSlide.type === 'financial_snapshot') {
      const purchaseMetric = finSlide.metrics.find((m) => m.factKey === 'purchase_price');
      expect(purchaseMetric?.value).toBe('$285,000');
    }
  });

  it('generates a Dallas multi-family demo deck with commercial cap rate metrics', () => {
    const deck = generateDeterministicPresentationDeck(dallasCampaign, DEFAULT_BRAND_KIT);

    const parseResult = presentationDeckSchema.safeParse(deck);
    expect(parseResult.success).toBe(true);

    expect(deck.isDemo).toBe(true);

    const finSlide = deck.slides.find((s) => s.type === 'financial_snapshot');
    expect(finSlide).toBeDefined();
    if (finSlide && finSlide.type === 'financial_snapshot') {
      const capMetric = finSlide.metrics.find((m) => m.factKey === 'stabilized_cap_rate_on_purchase');
      expect(capMetric?.value).toBe('9.4%');
    }
  });

  it('generates safe neutral placeholders for generic campaigns without fabricated Phoenix/Dallas facts', () => {
    const genericCampaign: typeof phoenixCampaign = {
      id: 'campaign-arbitrary-123',
      name: 'Custom Acquisition Deal',
      createdAt: '2026-08-20T10:00:00Z',
      updatedAt: '2026-08-20T10:00:00Z',
      status: 'draft',
      tags: ['Live', 'Custom'],
      brandKitId: 'brand-default',
      sourceData: {
        campaignType: 'fix_and_flip',
        title: 'Custom Live Deal',
        targetMarket: 'Seattle, WA',
        uploadedImages: [],
        property: {
          address: '100 Main St',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
          propertyType: 'single_family',
          squareFeet: 1500,
          bedrooms: 3,
          bathrooms: 2,
          investmentThesis: 'Live deal investment thesis',
          dealHighlights: ['Strong location', 'Good schools'],
          financials: {},
        },
      },
      designConfigs: phoenixCampaign.designConfigs,
    };

    const deck = generateDeterministicPresentationDeck(genericCampaign, DEFAULT_BRAND_KIT);
    const parseResult = presentationDeckSchema.safeParse(deck);
    expect(parseResult.success).toBe(true);

    // Property overview should not contain Phoenix address
    const propSlide = deck.slides.find((s) => s.type === 'property_overview');
    expect(propSlide).toBeDefined();
    if (propSlide && propSlide.type === 'property_overview') {
      expect(propSlide.address).not.toContain('4421 E Cambridge');
      expect(propSlide.address).toBe('100 Main St');
      expect(propSlide.city).toBe('Seattle');
    }

    // Financials should not contain Phoenix $285,000 / $390,000 values
    const finSlide = deck.slides.find((s) => s.type === 'financial_snapshot');
    expect(finSlide).toBeDefined();
    if (finSlide && finSlide.type === 'financial_snapshot') {
      const purchaseMetric = finSlide.metrics.find((m) => m.factKey === 'purchase_price');
      expect(purchaseMetric?.value).toBe('Not provided');
      const arvMetric = finSlide.metrics.find((m) => m.factKey === 'arv');
      expect(arvMetric?.value).toBe('Not provided');
    }

    // Market slide should not contain Phoenix comps
    const marketSlide = deck.slides.find((s) => s.type === 'market_context');
    expect(marketSlide).toBeDefined();
    if (marketSlide && marketSlide.type === 'market_context') {
      expect(marketSlide.comps).toBeUndefined();
    }
  });
});
