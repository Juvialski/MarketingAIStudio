import { IAIProvider, IImageProvider } from '../../types/providers';
import { MockAIProvider } from './mockProvider';
import { SupabaseFunctionsProvider } from './supabaseFunctionsProvider';
import { ImageProviderRouter } from './imageProvider';
import { SettingsStore } from '../storage/settingsStore';
import { isSupabaseConfigured } from '../supabase/client';

export class ProviderManager {
  /**
   * Resolves the active AI Strategy & Copy provider.
   * Priority:
   * 1. Supabase Edge Functions (when backend is live)
   * 2. Explicit high-fidelity demo fixture when no backend is configured
  */
  public static getAIProvider(runtimeMode: 'demo' | 'live' = 'live'): IAIProvider {
    if (runtimeMode !== 'demo' && isSupabaseConfigured()) {
      return new SupabaseFunctionsProvider();
    }

    return new MockAIProvider();
  }

  /**
   * Resolves to the authenticated Edge Function in live mode or the bundled,
   * explicitly fictional fixture provider in demo mode. Provider credentials
   * and paid-generation authorization never live in this browser bundle.
   */
  public static getImageProvider(): IImageProvider {
    const config = SettingsStore.get();
    return ImageProviderRouter.getAdapterForConfig(config);
  }
}
