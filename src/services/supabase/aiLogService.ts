import { supabase, isSupabaseConfigured } from './client';
import { Database } from '../../types/database.types';

export interface AILogEntry {
  organizationId?: string;
  userId?: string;
  campaignId?: string;
  operationType: string;
  provider: string;
  model: string;
  status: 'success' | 'failed';
  latencyMs?: number;
  errorMessage?: string;
}

type AILogInsert = Database['public']['Tables']['ai_generation_logs']['Insert'];

export class AILogService {
  public static async log(entry: AILogEntry): Promise<void> {
    if (!isSupabaseConfigured()) return;
    // Client-side logs without an authenticated tenant context are not useful
    // and must not create rows detached from a user/org/campaign.
    if (!entry.organizationId || !entry.userId) return;

    const payload: AILogInsert = {
      organization_id: entry.organizationId,
      user_id: entry.userId,
      campaign_id: entry.campaignId || null,
      operation_type: entry.operationType,
      provider: entry.provider,
      model: entry.model,
      status: entry.status,
      latency_ms: entry.latencyMs || null,
      error_message: entry.errorMessage || null,
    };

    const { error } = await supabase.from('ai_generation_logs').insert(payload);
    if (error) throw error;
  }
}
