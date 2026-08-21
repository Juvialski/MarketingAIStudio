// Authenticated, server-owned multi-platform copy generation.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AppError, ProviderError, providerAppError } from '../_shared/errors.ts';
import { assertOrganizationAccess, authenticate } from '../_shared/auth.ts';
import { claimGeneration, finishGeneration } from '../_shared/usage.ts';
import { generateGeminiJson } from '../_shared/gemini.ts';
import { assertGeminiTextModel, geminiTextIsPaid, GEMINI_TEXT_MODELS } from '../_shared/providers.ts';
import { handleOptions, ensurePost, errorResponse, idempotencyKey, jsonResponse } from '../_shared/http.ts';
import { copyOutputSchema, copyRequestSchema, fullKitOutputSchema, parseBody } from '../_shared/validation.ts';

const copyPlatform = (withHashtags = false): Record<string, unknown> => ({
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'body', 'cta', 'characterCount'],
  properties: {
    headline: { type: 'string' },
    body: { type: 'string' },
    cta: { type: 'string' },
    characterCount: { type: 'integer', minimum: 0 },
    ...(withHashtags ? { hashtags: { type: 'array', items: { type: 'string' }, maxItems: 30 } } : {}),
  },
});

const copyResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['headlines', 'ctas', 'facebook', 'instagram', 'linkedin', 'emailNewsletter', 'videoScript'],
  properties: {
    headlines: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
    ctas: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
    facebook: copyPlatform(),
    instagram: copyPlatform(true),
    linkedin: copyPlatform(),
    emailNewsletter: {
      type: 'object', additionalProperties: false,
      required: ['subjectLines', 'previewText', 'bodyMarkdown', 'ctaButtonText'],
      properties: {
        subjectLines: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
        previewText: { type: 'string' }, bodyMarkdown: { type: 'string' }, ctaButtonText: { type: 'string' },
      },
    },
    videoScript: {
      type: 'object', additionalProperties: false,
      required: ['title', 'durationSeconds', 'targetFormat', 'hook', 'callToAction', 'scenes'],
      properties: {
        title: { type: 'string' }, durationSeconds: { type: 'number', minimum: 1 },
        targetFormat: { type: 'string', enum: ['9:16 vertical reel'] }, hook: { type: 'string' }, callToAction: { type: 'string' },
        scenes: {
          type: 'array', minItems: 1, maxItems: 20,
          items: {
            type: 'object', additionalProperties: false,
            required: ['timeframe', 'visualDirection', 'spokenAudio', 'onScreenText'],
            properties: {
              timeframe: { type: 'string' }, visualDirection: { type: 'string' },
              spokenAudio: { type: 'string' }, onScreenText: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

const fullKitResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['strategy', 'copy'],
  properties: {
    strategy: {
      type: 'object', additionalProperties: false,
      required: ['targetAudience', 'primaryObjective', 'coreAngle', 'keyHooks', 'valueProposition', 'supportingEvidence', 'ctaStrategy', 'suggestedPlatforms'],
      properties: {
        targetAudience: { type: 'object', required: ['name', 'description'], properties: { name: { type: 'string' }, description: { type: 'string' } } },
        primaryObjective: { type: 'string' }, coreAngle: { type: 'string' },
        keyHooks: { type: 'array', items: { type: 'string' }, minItems: 1 },
        valueProposition: { type: 'string' }, supportingEvidence: { type: 'array', items: { type: 'string' }, minItems: 1 },
        ctaStrategy: { type: 'string' }, suggestedPlatforms: { type: 'array', items: { type: 'string' }, minItems: 1 },
      },
    },
    copy: copyResponseJsonSchema,
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
    const body = await parseBody(req, copyRequestSchema);
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
      operationType: body.isFullKit ? 'generate-full-kit' : 'generate-copy',
      provider: 'gemini',
      model,
      idempotencyKey: requestKey,
      isPaid,
      estimatedCostUsd: estimatedCost,
    });
    usageId = claim.usageId;

    const prompt = `You are a compliance-conscious real-estate marketing copywriter. Return only JSON matching the supplied schema.
Use only the provided facts. Never invent financial performance, comps, legal status, guarantees, or urgency. Avoid "unlock the potential", "game-changer", "nestled", and similar cliches.
The requested mode is ${body.isFullKit ? 'a complete strategy and copy kit' : 'a copy-only package'}.
Input JSON:
${JSON.stringify({ sourceData: body.sourceData, strategy: body.strategy, brandKit: body.brandKit })}`;

    try {
      const parsed = await generateGeminiJson(
        model,
        prompt,
        body.isFullKit ? fullKitResponseJsonSchema : copyResponseJsonSchema,
        body.thinkingLevel,
      );
      if (body.isFullKit) {
        const validated = fullKitOutputSchema.safeParse(parsed);
        if (!validated.success) throw new ProviderError('provider_invalid_output');
        await finishGeneration(ctx.admin, usageId, 'success', undefined, estimatedCost);
        return jsonResponse(req, { strategy: validated.data.strategy, copy: validated.data.copy, model, provenance: 'generated' });
      }
      const validated = copyOutputSchema.safeParse(parsed);
      if (!validated.success) throw new ProviderError('provider_invalid_output');
      await finishGeneration(ctx.admin, usageId, 'success', undefined, estimatedCost);
      return jsonResponse(req, { copy: validated.data, model, provenance: 'generated' });
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
