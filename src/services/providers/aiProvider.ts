import { IAIProvider, IImageProvider } from '../../types/providers';
import { MockAIProvider } from './mockProvider';
import { SupabaseFunctionsProvider } from './supabaseFunctionsProvider';
import { ImageProviderRouter } from './imageProvider';
import { SettingsStore } from '../storage/settingsStore';
import { isSupabaseConfigured } from '../supabase/client';
import { ServiceError } from '../supabase/serviceError';
import { RuntimeMode } from '../../types/runtime';

export class ProviderManager {
  /**
   * Resolves the active AI Strategy & Copy provider.
   * Priority:
   * 1. Supabase Edge Functions (when backend is live)
   * 2. Explicit high-fidelity demo fixture when no backend is configured
  */
  public static getAIProvider(runtimeMode: RuntimeMode = 'live'): IAIProvider {
    if (runtimeMode === 'live' && isSupabaseConfigured()) {
      return new SupabaseFunctionsProvider();
    }

    if (runtimeMode === 'demo') return new MockAIProvider();

    throw new ServiceError(
      'not_configured',
      'Live AI generation is unavailable because the secure backend is not configured. Switch to the explicitly labeled demo workspace or configure Supabase.'
    );
  }

  /**
   * Resolves to the authenticated Edge Function in live mode or the bundled,
   * explicitly fictional fixture provider in demo mode. Provider credentials
   * and paid-generation authorization never live in this browser bundle.
   */
  public static getImageProvider(runtimeMode: RuntimeMode = 'live'): IImageProvider {
    const config = SettingsStore.get();
    return ImageProviderRouter.getAdapterForConfig(config, { runtimeMode });
  }
}
