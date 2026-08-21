// Authenticated, server-owned campaign strategy generation.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AppError, ProviderError, providerAppError } from '../_shared/errors.ts';
import { assertOrganizationAccess, authenticate } from '../_shared/auth.ts';
import { claimGeneration, finishGeneration } from '../_shared/usage.ts';
import { generateGeminiJson } from '../_shared/gemini.ts';
import { assertGeminiTextModel, geminiTextIsPaid, GEMINI_TEXT_MODELS } from '../_shared/providers.ts';
import { handleOptions, ensurePost, errorResponse, idempotencyKey, jsonResponse } from '../_shared/http.ts';
import { parseBody, strategyOutputSchema, strategyRequestSchema } from '../_shared/validation.ts';

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['targetAudience', 'primaryObjective', 'coreAngle', 'valueProposition', 'keyHooks', 'supportingEvidence', 'ctaStrategy', 'suggestedPlatforms'],
  properties: {
    targetAudience: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'description', 'painPoints', 'motivations'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        painPoints: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
        motivations: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
      },
    },
    primaryObjective: { type: 'string' },
    coreAngle: { type: 'string' },
    valueProposition: { type: 'string' },
    keyHooks: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
    supportingEvidence: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
    ctaStrategy: { type: 'string' },
    suggestedPlatforms: { type: 'array', items: { type: 'string', enum: ['facebook', 'instagram', 'linkedin', 'email', 'video_reels'] }, minItems: 1, maxItems: 10 },
  },
};

const fallbackModel = GEMINI_TEXT_MODELS[0];

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  let usageId: string | undefined;
  try {
    ensurePost(req);
    const ctx = await authenticate(req);
    const body = await parseBody(req, strategyRequestSchema);
    const requestKey = idempotencyKey(req, body);
    await assertOrganizationAccess(ctx, body.organizationId, body.campaignId);

    const model = body.modelId ?? fallbackModel;
    assertGeminiTextModel(model);
    const isPaid = geminiTextIsPaid();
    const estimatedCost = isPaid ? Number(Deno.env.get('GEMINI_TEXT_ESTIMATED_COST_USD') ?? NaN) : 0;
    if (isPaid && (!Number.isFinite(estimatedCost) || estimatedCost < 0)) {
      throw new AppError('provider_pricing_unconfigured', 503, 'The server is not configured for this provider.');
    }
    const claim = await claimGeneration(ctx.admin, {
      organizationId: body.organizationId,
      userId: ctx.user.id,
      campaignId: body.campaignId,
      operationType: 'generate-strategy',
      provider: 'gemini',
      model,
      idempotencyKey: requestKey,
      isPaid,
      estimatedCostUsd: estimatedCost,
    });
    usageId = claim.usageId;

    const source = body.sourceData as Record<string, any>;
    const brand = body.brandKit as Record<string, any>;
    const property = (source.property ?? {}) as Record<string, any>;
    const financials = (property.financials ?? {}) as Record<string, any>;
const prompt = `You are an institutional real-estate marketing strategist. Return only JSON matching the supplied schema.
Use only facts present in the source data. Do not invent comps, returns, guarantees, legal claims, or market statistics. Include a target-audience description, a primary objective, and a concrete CTA strategy. Use suggested platform values only from facebook, instagram, linkedin, email, and video_reels.
Avoid generic phrases such as "unlock the potential", "game-changer", and "nestled".
Property: ${String(property.address ?? source.targetMarket ?? 'Unspecified')}
Campaign type: ${String(source.campaignType ?? 'Unspecified')}
Purchase basis: ${String(financials.purchasePrice ?? 'Unspecified')}
Renovation scope: ${String(financials.renovationEstimate ?? 'Unspecified')}
ARV: ${String(financials.arv ?? 'Unspecified')}
Investment thesis: ${String(property.investmentThesis ?? 'Unspecified')}
Brand: ${String(brand.companyName ?? 'Unspecified')}`;

    try {
      const parsed = await generateGeminiJson(model, prompt, responseJsonSchema, body.thinkingLevel);
      const validated = strategyOutputSchema.safeParse(parsed);
      if (!validated.success) throw new ProviderError('provider_invalid_output');
      await finishGeneration(ctx.admin, usageId, 'success', undefined, estimatedCost);
      return jsonResponse(req, { strategy: validated.data, model, provenance: 'generated' });
    } catch (error) {
      await finishGeneration(ctx.admin, usageId, 'failed', error instanceof ProviderError ? error.code : 'provider_error');
      if (error instanceof ProviderError) throw providerAppError(error);
      throw error;
    }
  } catch (error) {
    if (error instanceof AppError) return errorResponse(req, error);
    return errorResponse(req, providerAppError(error));
  }
});
