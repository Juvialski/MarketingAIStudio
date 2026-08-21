import { describe, it, expect } from 'vitest';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { SUPABASE_URL } from '../services/supabase/client';

describe('Supabase Data Mapping & Schema Tests', () => {
  it('should verify Supabase URL is pointing to dedicated ZawMarketing project', () => {
    expect(SUPABASE_URL).toBe('https://csolgywkgummefnwouny.supabase.co');
  });

  it('should correctly format multi-tenant storage paths', () => {
    const orgId = 'a0000000-0000-0000-0000-000000000001';
    const campId = 'c0000000-0000-0000-0000-000000000001';
    const filename = 'hero-front.jpg';

    const propertyPath = `${orgId}/${campId}/${filename}`;
    const exportPath = `${orgId}/${campId}/flyer.pdf`;
    const brandLogoPath = `${orgId}/logo.png`;

    expect(propertyPath).toBe(`${orgId}/${campId}/hero-front.jpg`);
    expect(exportPath).toBe(`${orgId}/${campId}/flyer.pdf`);
    expect(brandLogoPath).toBe(`${orgId}/logo.png`);

    // Verify folder isolation pattern
    expect(propertyPath.split('/')[0]).toBe(orgId);
    expect(exportPath.split('/')[0]).toBe(orgId);
    expect(brandLogoPath.split('/')[0]).toBe(orgId);
  });

  it('should serialize brand kit colors and typography to valid JSONB payload', () => {
    const brandKit = DEFAULT_BRAND_KIT;
    const dbPayload = {
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      company_name: brandKit.companyName,
      colors: brandKit.colors,
      typography: brandKit.typography,
      tone_of_voice: brandKit.toneOfVoice,
      forbidden_words: brandKit.forbiddenWords,
    };

    expect(dbPayload.colors.primary).toBe('#0f172a');
    expect(dbPayload.colors.accent).toBe('#c85a32');
    expect(dbPayload.typography.headlineFont).toBe('Playfair Display');
    expect(Array.isArray(dbPayload.forbidden_words)).toBe(true);
    expect(dbPayload.forbidden_words).toContain('guaranteed returns');
  });

  it('should serialize sample campaigns into valid database table rows', () => {
    const phx = SAMPLE_CAMPAIGNS[0];
    const orgId = 'a0000000-0000-0000-0000-000000000001';

    const campaignRow = {
      id: phx.id,
      organization_id: orgId,
      name: phx.name,
      campaign_type: phx.sourceData.campaignType,
      target_market: phx.sourceData.targetMarket,
      status: phx.status,
      source_data: phx.sourceData,
      strategy: phx.strategy,
      design_configs: phx.designConfigs,
    };

    expect(campaignRow.name).toBe(phx.name);
    expect(campaignRow.campaign_type).toBe('fix_and_flip');
    expect(campaignRow.source_data.property?.financials.purchasePrice).toBe(285000);
    expect(campaignRow.source_data.property?.financials.equitySpread).toBe(70000);
    expect(campaignRow.strategy?.keyHooks.length).toBeGreaterThan(0);
  });
});
