import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './client';
import { ServiceError } from './serviceError';

export interface AppProfile {
  id: string;
  displayName: string;
  companyName: string;
  avatarUrl?: string;
}

export interface BackendHealthStatus {
  status: 'live' | 'unconfigured' | 'unauthenticated' | 'unavailable';
  message: string;
  checkedAt: string;
  providers?: {
    text?: { configured: boolean; models: string[] };
    images?: Record<string, { configured: boolean; models: string[] }>;
  };
  text?: {
    gemini?: { configured: boolean; models: string[] };
  };
  images?: {
    nvidia?: { configured: boolean; models: string[]; tier?: string; estimatedCostUsd?: number };
    bfl?: { configured: boolean; models: string[]; tier?: string };
    gemini?: { configured: boolean; models: string[]; tier?: string; reason?: string };
    openai?: { configured: boolean; models: string[]; tier?: string; reason?: string };
  };
  paidGenerationEnabled?: boolean;
}

export interface ProviderSmokeTestResult {
  ok: boolean;
  operation: 'test_gemini' | 'test_nvidia';
  provider: 'gemini' | 'nvidia';
  model?: string;
  usable?: boolean;
  latencyMs?: number;
  testedAt: string;
  message?: string;
  error?: string;
  bytesReceived?: number;
  signedUrl?: string;
  storageBucket?: string;
  storagePath?: string;
  storagePersisted?: boolean;
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
}

export class AuthService {
  public static getRuntimeMode(): 'demo' | 'live' {
    return isSupabaseConfigured() ? 'live' : 'demo';
  }

  public static async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new ServiceError('query_failed', 'Unable to read the authentication session.', error);
    }
    return data.session;
  }

  public static async getUser(): Promise<User | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // An expired/missing JWT is an unauthenticated state, not a fictional
      // user and not a reason to load demo records.
      if (error.status === 401 || /not authenticated|session missing/i.test(error.message)) return null;
      throw new ServiceError('query_failed', 'Unable to read the authenticated user.', error);
    }
    return data.user;
  }

  public static async signIn(
    email: string,
    password: string
  ): Promise<{ user: User | null; error: Error | null }> {
    if (!isSupabaseConfigured()) {
      return { user: null, error: new ServiceError('not_configured', 'Live sign-in is not configured.') };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data.user, error };
  }

  public static async signUp(
    email: string,
    password: string,
    displayName: string,
    companyName: string
  ): Promise<{ user: User | null; error: Error | null }> {
    if (!isSupabaseConfigured()) {
      return { user: null, error: new ServiceError('not_configured', 'Live sign-up is not configured.') };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // Optional profile values remain user-supplied. No fictional Apex
          // identity is provisioned when fields are blank.
          display_name: displayName.trim() || null,
          company_name: companyName.trim() || null,
        },
      },
    });
    return { user: data.user, error };
  }

  public static async signOut(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new ServiceError('write_failed', 'Unable to sign out.', error);
  }

  public static onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    if (!isSupabaseConfigured()) {
      return { data: { subscription: { unsubscribe: () => undefined } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  }

  public static async getProfile(userId: string): Promise<AppProfile | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, company_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new ServiceError('query_failed', 'Unable to load the workspace profile.', error);
    }
    // A newly authenticated user may not have a profile row yet. Keep a
    // neutral, user-bound profile instead of fabricating a company identity.
    if (!data) return { id: userId, displayName: '', companyName: '' };

    const row = data as ProfileRow;
    return {
      id: row.id,
      displayName: row.display_name || '',
      companyName: row.company_name || '',
      avatarUrl: row.avatar_url || undefined,
    };
  }

  /**
   * Performs an authenticated backend health operation. It intentionally does
   * not call a provider directly from the browser.
   */
  public static async checkBackendHealth(organizationId?: string): Promise<BackendHealthStatus> {
    const checkedAt = new Date().toISOString();
    if (!isSupabaseConfigured()) {
      return { status: 'unconfigured', message: 'Backend is not configured; demo mode is active.', checkedAt };
    }

    const user = await this.getUser();
    if (!user) {
      return { status: 'unauthenticated', message: 'Sign in to check the live backend.', checkedAt };
    }

    const { data, error } = await supabase.functions.invoke('health', {
      body: { operation: 'health', ...(organizationId ? { organizationId } : {}) },
    });
    if (error) {
      return {
        status: 'unavailable',
        message: 'The authenticated backend health operation is unavailable.',
        checkedAt,
      };
    }

    const response = typeof data === 'object' && data !== null ? data as {
      ok?: unknown;
      providers?: BackendHealthStatus['providers'];
      text?: BackendHealthStatus['text'];
      images?: BackendHealthStatus['images'];
      paidGenerationEnabled?: unknown;
    } : {};
    if (response.ok === false) {
      return { status: 'unavailable', message: 'The live backend reported an unhealthy status.', checkedAt };
    }
    return {
      status: 'live',
      message: 'Authenticated backend is available.',
      checkedAt,
      providers: response.providers,
      text: response.text,
      images: response.images,
      paidGenerationEnabled: response.paidGenerationEnabled === true,
    };
  }

  /**
   * Performs an authenticated, deliberate smoke test for Gemini text or NVIDIA image generation.
   * Tests real backend execution and private Storage persistence without revealing secret keys.
   */
  public static async testProvider(
    provider: 'gemini' | 'nvidia',
    organizationId?: string,
    modelId?: string
  ): Promise<ProviderSmokeTestResult> {
    const testedAt = new Date().toISOString();
    const op = provider === 'gemini' ? 'test_gemini' : 'test_nvidia';

    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        operation: op,
        provider,
        testedAt,
        error: 'provider_not_configured',
        message: 'Backend is not configured. Live smoke tests require a live Supabase backend.',
      };
    }

    const user = await this.getUser();
    if (!user) {
      return {
        ok: false,
        operation: op,
        provider,
        testedAt,
        error: 'unauthorized',
        message: 'Sign in to run authenticated provider smoke tests.',
      };
    }

    if (provider === 'gemini') {
      const { data, error } = await supabase.functions.invoke('health', {
        body: {
          operation: 'test_gemini',
          ...(organizationId ? { organizationId } : {}),
          ...(modelId ? { modelId } : {}),
          idempotencyKey: crypto.randomUUID(),
        },
      });

      if (error) {
        let code = 'provider_unavailable';
        let message = 'Gemini smoke test failed.';
        if (error && typeof error === 'object' && (error as any).context && typeof (error as any).context.json === 'function') {
          try {
            const body = await (error as any).context.json();
            if (body && typeof body === 'object') {
              code = typeof body.error === 'string' ? body.error : code;
              message = typeof body.message === 'string' ? body.message : message;
            }
          } catch {
            // ignore
          }
        } else if (error.message) {
          message = error.message;
        }
        return {
          ok: false,
          operation: 'test_gemini',
          provider: 'gemini',
          testedAt,
          error: code,
          message,
        };
      }

      const res = data as any;
      return {
        ok: res?.ok === true,
        operation: 'test_gemini',
        provider: 'gemini',
        model: res?.model || modelId || 'gemini-3.5-flash-lite',
        usable: res?.usable ?? true,
        latencyMs: res?.latencyMs,
        testedAt: res?.testedAt || testedAt,
        message: res?.ok
          ? `Gemini Text verified in ${res?.latencyMs ?? 0}ms (${res?.model || 'default'})`
          : 'Gemini smoke test failed.',
      };
    }

    // NVIDIA Image Provider Smoke Test via demo_provider_test
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: {
        brief: {
          purpose: 'hero',
          subject: 'Clean editorial architectural photograph of a fictional modern single-family home in Arizona, daylight, no people, no text, marketing test image.',
          aspectRatio: '1:1',
          generationMode: 'demo_provider_test',
        },
        provider: 'nvidia',
        model: modelId,
        organizationId,
        idempotencyKey: crypto.randomUUID(),
      },
    });

    const latencyMs = Date.now() - startTime;

    if (error) {
      let code = 'provider_unavailable';
      let message = 'NVIDIA image smoke test failed.';
      if (error && typeof error === 'object' && (error as any).context && typeof (error as any).context.json === 'function') {
        try {
          const body = await (error as any).context.json();
          if (body && typeof body === 'object') {
            code = typeof body.error === 'string' ? body.error : code;
            message = typeof body.message === 'string' ? body.message : message;
          }
        } catch {
          // ignore
        }
      } else if (error.message) {
        message = error.message;
      }
      return {
        ok: false,
        operation: 'test_nvidia',
        provider: 'nvidia',
        testedAt,
        error: code,
        message,
      };
    }

    const res = data as any;
    const hasSignedUrl = Boolean(res?.signedUrl);
    const hasStorage = Boolean(res?.storageBucket && res?.storagePath);

    return {
      ok: hasSignedUrl,
      operation: 'test_nvidia',
      provider: 'nvidia',
      model: res?.model || modelId || 'default',
      usable: true,
      latencyMs: res?.latencyMs ?? latencyMs,
      signedUrl: res?.signedUrl,
      storageBucket: res?.storageBucket,
      storagePath: res?.storagePath,
      storagePersisted: hasStorage,
      testedAt,
      message: hasSignedUrl
        ? `NVIDIA NIM image generated and persisted in ${((res?.latencyMs ?? latencyMs) / 1000).toFixed(1)}s (${res?.model || 'default'})`
        : 'NVIDIA smoke test failed.',
    };
  }
}
