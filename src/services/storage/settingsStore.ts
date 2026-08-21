import { ProviderConfig } from '../../types/providers';
import { ModelRegistry } from '../providers/modelRegistry';

/**
 * Settings are deliberately limited to client-safe preferences. Provider
 * credentials and provider endpoints belong to the authenticated backend and
 * are never read from Vite env, rendered, or persisted in this store.
 */
export const SETTINGS_STORAGE_KEY = 'zaw_marketing_provider_settings_v2';
let inMemorySettingsStorage: string | null = null;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Storage can be disabled by browser privacy settings.
  }
  return null;
};

const withoutSecrets = (value: UnknownRecord): UnknownRecord => {
  const {
    geminiApiKey: _geminiApiKey,
    nvidiaApiKey: _nvidiaApiKey,
    bflApiKey: _bflApiKey,
    openaiApiKey: _openaiApiKey,
    ...safe
  } = value;
  return safe;
};

export type SettingsRuntimeMode = 'demo' | 'live';

export class SettingsStore {
  private static getStorageItem(key: string): string | null {
    const storage = getStorage();
    if (storage) {
      try {
        return storage.getItem(key);
      } catch {
        // Fall through to the in-memory fallback.
      }
    }
    return inMemorySettingsStorage;
  }

  private static setStorageItem(key: string, value: string): void {
    const storage = getStorage();
    if (storage) {
      try {
        storage.setItem(key, value);
        return;
      } catch {
        // Fall through to the in-memory fallback.
      }
    }
    inMemorySettingsStorage = value;
  }

  private static removeStorageItem(key: string): void {
    const storage = getStorage();
    if (storage) {
      try {
        storage.removeItem(key);
      } catch {
        // Ignore unavailable storage.
      }
    }
    inMemorySettingsStorage = null;
  }

  public static get(): ProviderConfig {
    // No VITE_* provider credentials are intentionally read here. Vite embeds
    // those values in browser assets, which is not an acceptable secret store.
    const defaultConfig: ProviderConfig = {
      runtimeMode: 'demo',
      aiProvider: 'mock',
      defaultModelId: ModelRegistry.DEFAULT_TEXT_MODEL,
      geminiModel: ModelRegistry.DEFAULT_TEXT_MODEL,
      fallbackModelId: ModelRegistry.FALLBACK_TEXT_MODEL,
      premiumModelId: ModelRegistry.PREFERRED_PREMIUM_MODEL,
      operationOverrides: {},
      thinkingLevels: {
        campaign_kit: 'low',
        campaign_strategy: 'medium',
        final_review: 'high',
        platform_variants: 'low',
      },
      imageProvider: 'upload',
      imageQualityTier: 'free_dev',
      geminiImageModel: '',
      geminiImageQuotaAvailable: false,
      nvidiaModelId: '',
      bflModelId: '',
      openaiImageModel: '',
      imageSpendingLimits: {
        enablePaidGeneration: false,
        preferredPaidProvider: 'bfl',
        preferredPaidModel: '',
        maxImagesPerCampaign: 5,
        dailySpendingLimitUsd: 5,
        monthlySpendingLimitUsd: 50,
      },
      useMockFallback: false,
      customQuotas: {
        // These are local estimates only. Provider project limits are managed
        // by the provider and may change independently of this UI.
        [ModelRegistry.DEFAULT_TEXT_MODEL]: { rpm: 0, tpm: 0, rpd: 0 },
        [ModelRegistry.FALLBACK_TEXT_MODEL]: { rpm: 0, tpm: 0, rpd: 0 },
        [ModelRegistry.PREFERRED_PREMIUM_MODEL]: { rpm: 0, tpm: 0, rpd: 0 },
      },
    };

    const stored = this.getStorageItem(SETTINGS_STORAGE_KEY);
    if (!stored) return defaultConfig;

    try {
      const parsed: unknown = JSON.parse(stored);
      if (!isRecord(parsed)) return defaultConfig;

      // Migrate old key-bearing records by immediately replacing them with a
      // key-free representation. The values themselves are never returned.
      const safeParsed = withoutSecrets(parsed);
      const merged: ProviderConfig = {
        ...defaultConfig,
        ...safeParsed,
        imageSpendingLimits: {
          ...defaultConfig.imageSpendingLimits,
          ...(isRecord(safeParsed.imageSpendingLimits) ? safeParsed.imageSpendingLimits : {}),
        },
        defaultModelId:
          typeof safeParsed.defaultModelId === 'string' && safeParsed.defaultModelId
            ? safeParsed.defaultModelId
            : typeof safeParsed.geminiModel === 'string' && safeParsed.geminiModel
              ? safeParsed.geminiModel
              : defaultConfig.defaultModelId,
      };
      merged.geminiModel = merged.defaultModelId;
      this.setStorageItem(SETTINGS_STORAGE_KEY, JSON.stringify(withoutSecrets(merged as unknown as UnknownRecord)));
      return merged;
    } catch (error) {
      console.warn('Failed to parse stored settings; using safe defaults', error);
      this.removeStorageItem(SETTINGS_STORAGE_KEY);
      return defaultConfig;
    }
  }

  public static save(config: ProviderConfig): ProviderConfig {
    const normalized: ProviderConfig = {
      ...config,
      // Keep the legacy alias consistent for callers that still read it.
      geminiModel: config.defaultModelId,
    };
    const safe = withoutSecrets(normalized as unknown as UnknownRecord);
    this.setStorageItem(SETTINGS_STORAGE_KEY, JSON.stringify(safe));
    return normalized;
  }

  public static clear(): void {
    this.removeStorageItem(SETTINGS_STORAGE_KEY);
  }
}
