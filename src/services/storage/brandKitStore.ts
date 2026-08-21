import { BrandKit, DEFAULT_BRAND_KIT } from '../../types/brandKit';

const BRAND_STORAGE_KEY = 'zaw_marketing_brand_kit_v1';

export interface BrandKitStoreOptions {
  /** Fictional Apex values are only returned when explicitly requested. */
  allowDemoFixtures?: boolean;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getLocalStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
    return null;
  } catch {
    return null;
  }
};

/** Neutral, empty workspace values for unauthenticated live mode. */
export const createNeutralBrandKit = (): BrandKit => ({
  ...clone(DEFAULT_BRAND_KIT),
  id: 'local-draft-brand-kit',
  isDefault: true,
  companyName: '',
  tagline: '',
  logoUrl: '',
  logoDarkUrl: '',
  website: '',
  phone: '',
  email: '',
  licenseNumber: undefined,
  toneOfVoice: 'institutional',
  targetAudienceDefault: '',
  preferredCta: '',
  requiredDisclaimer: '',
  forbiddenWords: [],
});

export class BrandKitStore {
  public static get(options: BrandKitStoreOptions = {}): BrandKit {
    const storage = getLocalStorage();
    if (storage) {
      try {
        const stored = storage.getItem(BRAND_STORAGE_KEY);
        if (stored) return JSON.parse(stored) as BrandKit;
      } catch (error) {
        console.warn('Failed to load local brand kit cache', error);
      }
    }

    return options.allowDemoFixtures ? clone(DEFAULT_BRAND_KIT) : createNeutralBrandKit();
  }

  public static save(brandKit: BrandKit): BrandKit {
    const saved = clone(brandKit);
    const storage = getLocalStorage();
    if (storage) {
      try {
        storage.setItem(BRAND_STORAGE_KEY, JSON.stringify(saved));
      } catch (error) {
        console.error('Failed to save local brand kit cache', error);
      }
    }
    return saved;
  }

  /** Explicit user action to restore the clearly fictional demo brand kit. */
  public static resetToDefault(): BrandKit {
    return this.save(DEFAULT_BRAND_KIT);
  }

  public static clear(): void {
    const storage = getLocalStorage();
    if (storage) {
      try {
        storage.removeItem(BRAND_STORAGE_KEY);
      } catch {
        // Ignore unavailable storage.
      }
    }
  }
}
