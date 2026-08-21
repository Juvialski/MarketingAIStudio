import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

// Reference only the two browser-safe Supabase settings explicitly. Reading
// the entire import.meta.env object can accidentally pull unrelated VITE_*
// values into the client bundle.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://csolgywkgummefnwouny.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_ANON_KEY || 'placeholder-anon-key',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }
  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes('your_anon_key_here') &&
    SUPABASE_ANON_KEY !== 'placeholder-anon-key'
  );
}

export const supabase = getSupabaseClient();
