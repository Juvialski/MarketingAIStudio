import { Campaign, GraphicDesignConfig, OutputAspectRatio } from '../../types/campaign';
import { SAMPLE_CAMPAIGNS } from '../../data/sampleCampaigns';

const STORAGE_KEY = 'zaw_marketing_campaigns_v1';

export interface LocalStoreOptions {
  /** Fictional fixtures are only allowed when the caller explicitly opts in. */
  allowDemoFixtures?: boolean;
}

const getLocalStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
    return null;
  } catch {
    return null;
  }
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const localId = (): string => {
  const cryptoObject = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObject?.randomUUID) return `demo-${cryptoObject.randomUUID()}`;
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export class CampaignStore {
  private static read(): Campaign[] | null {
    const storage = getLocalStorage();
    if (!storage) return null;
    try {
      const stored = storage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const parsed: unknown = JSON.parse(stored);
      return Array.isArray(parsed) ? (parsed as Campaign[]) : null;
    } catch (error) {
      console.warn('Failed to load local campaign cache', error);
      return null;
    }
  }

  private static saveToStorage(campaigns: Campaign[]): void {
    const storage = getLocalStorage();
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
    } catch (error) {
      console.error('Failed to save local campaign cache', error);
    }
  }

  public static getAll(options: LocalStoreOptions = {}): Campaign[] {
    const campaigns = this.read();
    if (campaigns) return clone(campaigns);
    return options.allowDemoFixtures ? clone(SAMPLE_CAMPAIGNS) : [];
  }

  public static getById(id: string, options: LocalStoreOptions = {}): Campaign | undefined {
    return this.getAll(options).find((campaign) => campaign.id === id);
  }

  public static save(campaign: Campaign, options: LocalStoreOptions = {}): Campaign {
    const campaigns = this.getAll(options);
    const index = campaigns.findIndex((item) => item.id === campaign.id);
    const updated: Campaign = {
      ...clone(campaign),
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) campaigns[index] = updated;
    else campaigns.unshift(updated);
    this.saveToStorage(campaigns);
    return clone(updated);
  }

  public static duplicate(id: string): Campaign | null {
    const campaign = this.getById(id);
    if (!campaign) return null;

    const now = new Date().toISOString();
    const duplicated: Campaign = {
      ...clone(campaign),
      id: localId(),
      name: `${campaign.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    return this.save(duplicated, { allowDemoFixtures: true });
  }

  public static delete(id: string): boolean {
    const campaigns = this.getAll();
    const filtered = campaigns.filter((campaign) => campaign.id !== id);
    if (filtered.length === campaigns.length) return false;
    this.saveToStorage(filtered);
    return true;
  }

  /** Explicit user action to restore the clearly fictional demo workspace. */
  public static resetToSamples(): Campaign[] {
    const samples = clone(SAMPLE_CAMPAIGNS);
    this.saveToStorage(samples);
    return samples;
  }

  public static createDefaultDesignConfigs(): Record<OutputAspectRatio, GraphicDesignConfig> {
    return {
      square: {
        templateFamily: 'editorial',
        aspectRatio: 'square',
        headline: 'Value-Add Real Estate Opportunity',
        subtitle: 'Prime Metropolitan Location',
        imageCropY: 50,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'arv', 'spread'],
        customBadgeText: 'FEATURED OPPORTUNITY',
        customCtaText: 'REQUEST DETAILS',
        showDisclaimer: true,
      },
      portrait: {
        templateFamily: 'institutional',
        aspectRatio: 'portrait',
        headline: 'Investment Memorandum',
        subtitle: 'Value-Add Real Estate Acquisition',
        imageCropY: 50,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'reno', 'arv', 'spread'],
        customBadgeText: 'CONFIDENTIAL',
        customCtaText: 'DOWNLOAD MEMORANDUM',
        showDisclaimer: true,
      },
      story: {
        templateFamily: 'direct_response',
        aspectRatio: 'story',
        headline: 'New Value-Add Opportunity',
        subtitle: 'Direct Underwriting Breakdown',
        imageCropY: 40,
        imageZoom: 1.05,
        activeMetricIds: ['purchase', 'arv'],
        customBadgeText: 'DEAL BRIEF',
        customCtaText: 'TAP FOR DETAILS',
        showDisclaimer: false,
      },
      landscape: {
        templateFamily: 'modern_brokerage',
        aspectRatio: 'landscape',
        headline: 'Acquisition Brief',
        subtitle: 'Institutional Quality Value-Add Property',
        imageCropY: 50,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'arv', 'spread'],
        customBadgeText: 'MARKET BRIEF',
        customCtaText: 'VIEW DEAL ROOM',
        showDisclaimer: true,
      },
      flyer_letter: {
        templateFamily: 'institutional',
        aspectRatio: 'flyer_letter',
        headline: 'Property Investment Memorandum',
        subtitle: 'Underwriting Analysis & Deal Highlights',
        imageCropY: 50,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'reno', 'arv', 'spread', 'sqft', 'roi'],
        customBadgeText: 'INVESTMENT BRIEF',
        customCtaText: 'CONTACT ACQUISITIONS',
        showDisclaimer: true,
      },
      flyer_a4: {
        templateFamily: 'institutional',
        aspectRatio: 'flyer_a4',
        headline: 'Property Investment Memorandum',
        subtitle: 'Underwriting Analysis & Deal Highlights',
        imageCropY: 50,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'reno', 'arv', 'spread', 'sqft', 'roi'],
        customBadgeText: 'INVESTMENT BRIEF',
        customCtaText: 'CONTACT ACQUISITIONS',
        showDisclaimer: true,
      },
    };
  }
}
