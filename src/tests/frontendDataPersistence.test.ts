import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsStore, SETTINGS_STORAGE_KEY } from '../services/storage/settingsStore';
import { CampaignStore } from '../services/storage/campaignStore';
import { CampaignService } from '../services/supabase/campaignService';
import { StorageService } from '../services/supabase/storageService';
import { AuthService } from '../services/supabase/authService';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';
import { Campaign } from '../types/campaign';

const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() { return values.size; },
  } as Storage;
};

const draftCampaign = (): Campaign => ({
  id: '',
  name: 'Local draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'draft',
  sourceData: {
    campaignType: 'fix_and_flip',
    title: 'Local draft',
    targetMarket: 'Test market',
    uploadedImages: [],
  },
  designConfigs: CampaignStore.createDefaultDesignConfigs(),
  tags: ['test'],
});

describe('frontend live/demo data boundaries', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    SettingsStore.clear();
  });

  it('never persists provider secrets in settings storage', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      ...SettingsStore.get(),
      geminiApiKey: 'secret-gemini',
      nvidiaApiKey: 'secret-nvidia',
      bflApiKey: 'secret-bfl',
      openaiApiKey: 'secret-openai',
    }));

    const migrated = SettingsStore.get();

    const serialized = localStorage.getItem(SETTINGS_STORAGE_KEY) || '';
    expect(serialized).not.toContain('secret-gemini');
    expect(serialized).not.toContain('secret-nvidia');
    expect(serialized).not.toContain('secret-bfl');
    expect(serialized).not.toContain('secret-openai');
    expect('geminiApiKey' in migrated).toBe(false);
  });

  it('keeps live/local cache empty unless a demo fixture is explicitly requested', () => {
    localStorage.setItem('zaw_marketing_campaigns_v1', JSON.stringify([]));
    expect(CampaignStore.getAll()).toEqual([]);
    expect(CampaignStore.getAll({ allowDemoFixtures: true })).toEqual([]);

    localStorage.removeItem('zaw_marketing_campaigns_v1');
    expect(CampaignStore.getAll()).toEqual([]);
    expect(CampaignStore.getAll({ allowDemoFixtures: true }).length).toBeGreaterThan(0);
  });

  it('uses a local demo ID and preserves create/update/delete semantics', async () => {
    const created = await CampaignService.createCampaign('', draftCampaign());
    expect(created.id).toMatch(/^demo-/);
    expect(CampaignStore.getById(created.id)).toBeDefined();

    const updated = await CampaignService.updateCampaign('', { ...created, name: 'Updated draft' });
    expect(updated.name).toBe('Updated draft');
    expect(CampaignStore.getById(created.id)?.name).toBe('Updated draft');

    await CampaignService.deleteCampaign(created.id);
    expect(CampaignStore.getById(created.id)).toBeUndefined();
  });

  it('uses tenant-scoped canonical paths and does not claim public URLs', () => {
    const propertyPath = StorageService.canonicalPropertyPath('org_1', 'campaign_1', 'front.jpg');
    const logoPath = StorageService.canonicalBrandLogoPath('org_1', 'logo.png');
    const exportPath = StorageService.canonicalExportPath('org_1', 'campaign_1', 'flyer.pdf');
    expect(propertyPath).toMatch(/^org_1\/campaign_1\/[0-9a-f-]+\.jpg$/);
    expect(logoPath).toMatch(/^org_1\/logos\/[0-9a-f-]+\.png$/);
    expect(exportPath).toMatch(/^org_1\/campaign_1\/exports\/[0-9a-f-]+\.pdf$/);
    expect(() => StorageService.canonicalPropertyPath('org/other', 'campaign_1', 'x.jpg')).toThrow();
  });

  it('does not synthesize a user when live auth is unconfigured', async () => {
    expect(await AuthService.getUser()).toBeNull();
    expect(DEFAULT_BRAND_KIT.companyName).toBeTruthy(); // Demo fixture remains available by explicit opt-in.
  });
});
