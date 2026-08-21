import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatPercent, getAvailableMetrics } from '../utils/formatters';
import { FORMAT_DIMENSIONS, TEMPLATE_FAMILIES } from '../types/designs';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { Campaign } from '../types/campaign';

describe('Design Layout & Formatter Stress Tests', () => {
  it('should format currency correctly with large numbers and missing values', () => {
    expect(formatCurrency(285000)).toBe('$285,000');
    expect(formatCurrency(14500000)).toBe('$14,500,000');
    expect(formatCurrency(undefined)).toBe('N/A');
    expect(formatCurrency(0)).toBe('$0');
  });

  it('should format numbers and percentages cleanly', () => {
    expect(formatNumber(1840)).toBe('1,840');
    expect(formatPercent(9.4)).toBe('9.4%');
    expect(formatPercent(undefined)).toBe('N/A');
  });

  it('should extract available metric badges for fix and flip campaigns', () => {
    const phxCampaign = SAMPLE_CAMPAIGNS[0];
    const metrics = getAvailableMetrics(phxCampaign);

    expect(metrics.some((m) => m.id === 'purchase' && m.value === '$285,000')).toBe(true);
    expect(metrics.some((m) => m.id === 'arv' && m.value === '$390,000')).toBe(true);
    expect(metrics.some((m) => m.id === 'spread' && m.value === '$70,000')).toBe(true);
  });

  it('should extract available metric badges for multi-family campaigns', () => {
    const dalCampaign = SAMPLE_CAMPAIGNS[1];
    const metrics = getAvailableMetrics(dalCampaign);

    expect(metrics.some((m) => m.id === 'purchase' && m.value === '$1,150,000')).toBe(true);
    expect(metrics.some((m) => m.id === 'cap_rate' && m.value === '9.4%')).toBe(true);
  });

  it('should gracefully handle campaigns with zero metrics or missing financials', () => {
    const emptyCampaign: Campaign = {
      id: 'empty-test',
      createdAt: '2026-08-20',
      updatedAt: '2026-08-20',
      name: 'Empty Test Campaign',
      status: 'draft',
      sourceData: {
        campaignType: 'market_update',
        title: 'Market Update Only',
        targetMarket: 'National',
        uploadedImages: [],
      },
      designConfigs: {} as any,
      tags: [],
    };

    const metrics = getAvailableMetrics(emptyCampaign);
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics.length).toBe(0);
  });

  it('should verify all format dimensions match pixel-perfect specifications', () => {
    expect(FORMAT_DIMENSIONS.square.width).toBe(1080);
    expect(FORMAT_DIMENSIONS.square.height).toBe(1080);

    expect(FORMAT_DIMENSIONS.portrait.width).toBe(1080);
    expect(FORMAT_DIMENSIONS.portrait.height).toBe(1350);

    expect(FORMAT_DIMENSIONS.story.width).toBe(1080);
    expect(FORMAT_DIMENSIONS.story.height).toBe(1920);

    expect(FORMAT_DIMENSIONS.landscape.width).toBe(1200);
    expect(FORMAT_DIMENSIONS.landscape.height).toBe(630);

    expect(FORMAT_DIMENSIONS.flyer_letter.width).toBe(2550);
    expect(FORMAT_DIMENSIONS.flyer_letter.height).toBe(3300);

    expect(FORMAT_DIMENSIONS.flyer_a4.width).toBe(2480);
    expect(FORMAT_DIMENSIONS.flyer_a4.height).toBe(3508);
  });

  it('should provide 5 distinct professional template families', () => {
    expect(TEMPLATE_FAMILIES.length).toBe(5);
    const ids = TEMPLATE_FAMILIES.map((t) => t.id);
    expect(ids).toContain('editorial');
    expect(ids).toContain('institutional');
    expect(ids).toContain('modern_brokerage');
    expect(ids).toContain('direct_response');
    expect(ids).toContain('market_intelligence');
  });
});
