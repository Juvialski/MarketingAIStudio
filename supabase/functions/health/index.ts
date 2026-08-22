// Authenticated backend status and provider capability diagnostics.
// Never exposes secret values or raw provider authorization tokens.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AppError, ProviderError, providerAppError } from '../_shared/errors.ts';
import { assertOrganizationAccess, authenticate } from '../_shared/auth.ts';
import { handleOptions, ensurePost, errorResponse, jsonResponse } from '../_shared/http.ts';
import { parseBody, healthRequestSchema } from '../_shared/validation.ts';
import { BFL_IMAGE_MODELS, GEMINI_TEXT_MODELS, NVIDIA_IMAGE_MODELS, defaultImageModel, assertGeminiTextModel, assertImageModel } from '../_shared/providers.ts';
import { generateGeminiJson } from '../_shared/gemini.ts';
import { generateNvidiaImage } from '../_shared/image.ts';
import { claimGeneration, finishGeneration } from '../_shared/usage.ts';
import { idempotencyKey } from '../_shared/http.ts';

const configured = (name: string): boolean => Boolean(Deno.env.get(name));
const configuredPricing = (name: string): boolean => {
  const value = Number(Deno.env.get(name));
  return Number.isFinite(value) && value >= 0;
};

async function assertProviderTestAccess(ctx: Awaited<ReturnType<typeof authenticate>>, organizationId: string): Promise<void> {
  await assertOrganizationAccess(ctx, organizationId);
  const { data: membership, error } = await ctx.admin
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', ctx.user.id)
    .maybeSingle();
  if (error || !membership || !['owner', 'admin'].includes(membership.role)) {
    throw new AppError('organization_access_denied', 403, 'Only organization owners or admins can run provider diagnostics.');
  }
}

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    ensurePost(req);
    const ctx = await authenticate(req);
    const body = await parseBody(req, healthRequestSchema);

    if (body.organizationId) {
      await assertOrganizationAccess(ctx, body.organizationId);
    }

    if (body.operation === 'test_gemini') {
      if (!body.organizationId) throw new AppError('organization_access_denied', 403, 'A workspace is required to run provider diagnostics.');
      await assertProviderTestAccess(ctx, body.organizationId);
      if (!configured('GEMINI_API_KEY')) {
        throw new AppError('provider_not_configured', 503, 'GEMINI_API_KEY is not configured in Edge Function secrets.');
      }
      const model = body.modelId || GEMINI_TEXT_MODELS[0];
      assertGeminiTextModel(model);
      const startTime = Date.now();
      const claim = await claimGeneration(ctx.admin, {
        organizationId: body.organizationId,
        userId: ctx.user.id,
        campaignId: null,
        operationType: 'provider-diagnostic-gemini',
        provider: 'gemini',
        model,
        idempotencyKey: idempotencyKey(req, body),
        isPaid: false,
        estimatedCostUsd: 0,
      });
      const testSchema = {
        type: 'OBJECT',
        properties: { status: { type: 'STRING' } },
        required: ['status'],
      };
      try {
        await generateGeminiJson(model, 'Respond with JSON {"status": "ok"}', testSchema, 'low');
        await finishGeneration(ctx.admin, claim.usageId, 'success', undefined, 0);
      } catch (error) {
        await finishGeneration(ctx.admin, claim.usageId, 'failed', error instanceof ProviderError ? error.code : 'provider_error');
        throw error;
      }
      const latencyMs = Date.now() - startTime;
      return jsonResponse(req, {
        ok: true,
        operation: 'test_gemini',
        provider: 'gemini',
        model,
        usable: true,
        latencyMs,
        testedAt: new Date().toISOString(),
      });
    }

    if (body.operation === 'test_nvidia') {
      if (!body.organizationId) throw new AppError('organization_access_denied', 403, 'A workspace is required to run provider diagnostics.');
      await assertProviderTestAccess(ctx, body.organizationId);
      if (!configured('NVIDIA_API_KEY')) {
        throw new AppError('provider_not_configured', 503, 'NVIDIA_API_KEY is not configured in Edge Function secrets.');
      }
      const model = body.modelId || defaultImageModel('nvidia');
      assertImageModel('nvidia', model);
      const startTime = Date.now();
      const claim = await claimGeneration(ctx.admin, {
        organizationId: body.organizationId,
        userId: ctx.user.id,
        campaignId: null,
        operationType: 'provider-diagnostic-nvidia',
        provider: 'nvidia',
        model,
        idempotencyKey: idempotencyKey(req, body),
        isPaid: false,
        estimatedCostUsd: 0,
      });
      let testImage;
      try {
        testImage = await generateNvidiaImage(model, 'Minimal geometric modern architectural icon symbol', '1:1');
        await finishGeneration(ctx.admin, claim.usageId, 'success', undefined, 0, testImage.providerRequestId);
      } catch (error) {
        await finishGeneration(ctx.admin, claim.usageId, 'failed', error instanceof ProviderError ? error.code : 'provider_error');
        throw error;
      }
      const latencyMs = Date.now() - startTime;
      return jsonResponse(req, {
        ok: true,
        operation: 'test_nvidia',
        provider: 'nvidia',
        model,
        usable: true,
        bytesReceived: testImage.bytes.byteLength,
        contentType: testImage.contentType,
        latencyMs,
        testedAt: new Date().toISOString(),
      });
    }

    let paidGenerationEnabled = false;
    if (body.organizationId) {
      const { data: settings, error } = await ctx.admin
        .from('ai_provider_settings')
        .select('paid_generation_enabled')
        .eq('organization_id', body.organizationId)
        .maybeSingle();
      if (error) throw new AppError('server_control_unavailable', 503, 'Backend status is temporarily unavailable.');
      paidGenerationEnabled = settings?.paid_generation_enabled === true;
    }

    const geminiConfigured = configured('GEMINI_API_KEY');
    const nvidiaConfigured = configured('NVIDIA_API_KEY');
    const bflConfigured = configured('BFL_API_KEY') && configuredPricing('BFL_ESTIMATED_COST_USD');

    return jsonResponse(req, {
      ok: true,
      status: 'healthy',
      text: {
        gemini: {
          configured: geminiConfigured,
          models: GEMINI_TEXT_MODELS,
        },
      },
      images: {
        nvidia: {
          configured: nvidiaConfigured,
          models: NVIDIA_IMAGE_MODELS,
          tier: 'free_dev',
          estimatedCostUsd: 0,
        },
        bfl: {
          configured: bflConfigured,
          models: BFL_IMAGE_MODELS,
          tier: 'paid_standard',
        },
        gemini: {
          configured: false,
          models: [],
          tier: 'disabled',
          reason: 'Not enabled on this deployment',
        },
        openai: {
          configured: false,
          models: [],
          tier: 'disabled',
          reason: 'Not enabled on this deployment',
        },
      },
      providers: {
        text: { provider: 'gemini', configured: geminiConfigured, models: GEMINI_TEXT_MODELS },
        images: {
          bfl: { configured: bflConfigured, models: BFL_IMAGE_MODELS },
          nvidia: { configured: nvidiaConfigured, models: NVIDIA_IMAGE_MODELS },
          gemini: { configured: false, models: [] },
          openai: { configured: false, models: [] },
        },
      },
      paidGenerationEnabled,
    });
  } catch (error) {
    if (error instanceof AppError) return errorResponse(req, error);
    if (error instanceof ProviderError) return errorResponse(req, providerAppError(error));
    return errorResponse(req, new AppError('internal_error', 500, 'Backend status is temporarily unavailable.'));
  }
});
