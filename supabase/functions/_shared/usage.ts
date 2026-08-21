import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AppError } from './errors.ts';

export type UsageClaim = { usageId: string; duplicate: boolean };

function firstRow(data: unknown): any {
  return Array.isArray(data) ? data[0] : data;
}

export async function claimGeneration(
  admin: SupabaseClient,
  args: {
    organizationId: string;
    userId: string;
    campaignId: string;
    operationType: string;
    provider: string;
    model: string;
    idempotencyKey: string;
    isPaid: boolean;
    estimatedCostUsd: number;
  },
): Promise<UsageClaim> {
  const { data, error } = await admin.rpc('claim_ai_generation', {
    p_organization_id: args.organizationId,
    p_user_id: args.userId,
    p_campaign_id: args.campaignId,
    p_operation_type: args.operationType,
    p_provider: args.provider,
    p_model: args.model,
    p_idempotency_key: args.idempotencyKey,
    p_is_paid: args.isPaid,
    p_estimated_cost_usd: args.estimatedCostUsd,
  });
  if (error) {
    console.error('[edge] usage claim failed', error.code);
    throw new AppError('server_control_unavailable', 503, 'Generation controls are temporarily unavailable.');
  }
  const row = firstRow(data);
  if (!row?.allowed || typeof row.usage_id !== 'string') {
    const reason = String(row?.reason ?? 'generation_not_allowed');
    const status = reason === 'rate_limit_exceeded' || reason === 'daily_request_limit_exceeded' ? 429
      : reason === 'duplicate_request' ? 409
      : reason === 'paid_generation_disabled' || reason === 'daily_spend_limit_exceeded' ? 402
      : 403;
    throw new AppError(reason, status, reason === 'duplicate_request'
      ? 'This generation request has already been submitted.'
      : 'This generation request is not currently allowed.');
  }
  return { usageId: row.usage_id, duplicate: false };
}

export async function finishGeneration(
  admin: SupabaseClient,
  usageId: string,
  status: 'success' | 'failed',
  errorCode?: string,
  actualCostUsd?: number,
  providerRequestId?: string,
): Promise<void> {
  const { error } = await admin.rpc('finish_ai_generation', {
    p_usage_id: usageId,
    p_status: status,
    p_actual_cost_usd: actualCostUsd ?? null,
    p_provider_request_id: providerRequestId ?? null,
    p_error_code: errorCode ?? null,
  });
  if (error) console.error('[edge] usage finish failed', error.code);
}
