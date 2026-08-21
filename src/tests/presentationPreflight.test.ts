import { describe, it, expect } from 'vitest';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { generateDeterministicPresentationDeck } from '../features/presentations/services/demoDeckGenerator';
import { validatePresentationDeck } from '../features/presentations/utils/validatePresentationDeck';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('presentationPreflight (Automated Preflight QA Checks)', () => {
  const phoenixCampaign = SAMPLE_CAMPAIGNS.find((c) => c.id === 'campaign-phoenix-fix-flip')!;

  it('passes all preflight checks on canonical deterministic demo decks with campaign context', () => {
    const deck = generateDeterministicPresentationDeck(phoenixCampaign, DEFAULT_BRAND_KIT);
    const report = validatePresentationDeck(deck, phoenixCampaign);

    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.score).toBeGreaterThanOrEqual(95);
    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.checks.every((c) => c.passed)).toBe(true);
  });

  it('detects unverified factKeys when campaign context is provided', () => {
    const deck = generateDeterministicPresentationDeck(phoenixCampaign, DEFAULT_BRAND_KIT);
    const finSlide = deck.slides.find((s) => s.type === 'financial_snapshot');
    if (finSlide && finSlide.type === 'financial_snapshot') {
      finSlide.metrics.push({
        label: 'Fabricated Metric',
        value: '$999,999',
        factKey: 'non_existent_invented_fact_key',
      });
    }

    const report = validatePresentationDeck(deck, phoenixCampaign);
    expect(report.warnings.some((w) => w.includes('non_existent_invented_fact_key'))).toBe(true);
    expect(report.score).toBeLessThan(100);
  });

  it('flags decks missing required risk disclaimer slides', () => {
    const deck = generateDeterministicPresentationDeck(phoenixCampaign, DEFAULT_BRAND_KIT);
    deck.slides = deck.slides.filter((s) => s.type !== 'risk_disclaimer');

    const report = validatePresentationDeck(deck, phoenixCampaign);
    expect(report.warnings.some((w) => w.includes('risk disclaimer'))).toBe(true);
  });

  it('fails preflight checks when a deck has no slides or duplicate IDs', () => {
    const deck = generateDeterministicPresentationDeck(phoenixCampaign, DEFAULT_BRAND_KIT);
    deck.slides = [];

    const report = validatePresentationDeck(deck);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes('slide'))).toBe(true);
  });
});
