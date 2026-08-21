// Authenticated server-side image generation. Provider output is always
// downloaded and re-hosted in private Storage before it is returned.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AppError, ProviderError, providerAppError } from '../_shared/errors.ts';
import { assertOrganizationAccess, authenticate } from '../_shared/auth.ts';
import { claimGeneration, finishGeneration } from '../_shared/usage.ts';
import { generateBflImage, generateNvidiaImage, configuredProviderCost, persistGeneratedImage } from '../_shared/image.ts';
import { assertImageModel, defaultImageModel } from '../_shared/providers.ts';
import { handleOptions, ensurePost, errorResponse, idempotencyKey, jsonResponse } from '../_shared/http.ts';
import { imageRequestSchema, parseBody } from '../_shared/validation.ts';

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  let usageId: string | undefined;
  try {
    ensurePost(req);
    const ctx = await authenticate(req);
    const body = await parseBody(req, imageRequestSchema);
    const requestKey = idempotencyKey(req, body);
    await assertOrganizationAccess(ctx, body.organizationId, body.campaignId);

    // Gemini and OpenAI image contracts are intentionally disabled here until
    // their exact server-side output/storage adapters are separately verified.
    if (body.provider !== 'bfl' && body.provider !== 'nvidia') {
      throw new AppError('provider_disabled', 503, 'This image provider is not enabled on the server.');
    }
    const model = body.model ?? defaultImageModel(body.provider);
    if (body.brief.references?.length) {
      throw new AppError('provider_reference_unsupported', 400, 'Reference-image generation is not enabled for this server route.');
    }
    assertImageModel(body.provider, model);
    const isPaid = body.provider === 'bfl';
    const estimatedCost = isPaid ? configuredProviderCost('bfl') : configuredProviderCost('nvidia');
    const claim = await claimGeneration(ctx.admin, {
      organizationId: body.organizationId,
      userId: ctx.user.id,
      campaignId: body.campaignId,
      operationType: 'generate-image',
      provider: body.provider,
      model,
      idempotencyKey: requestKey,
      isPaid,
      estimatedCostUsd: estimatedCost,
    });
    usageId = claim.usageId;

    try {
      const image = body.provider === 'bfl'
        ? await generateBflImage(model, body.brief.subject, body.brief.aspectRatio)
        : await generateNvidiaImage(model, body.brief.subject, body.brief.aspectRatio);
      const persisted = await persistGeneratedImage(ctx.admin, body.organizationId, body.campaignId, body.provider, image);
      await finishGeneration(ctx.admin, usageId, 'success', undefined, image.actualCostUsd ?? estimatedCost, image.providerRequestId);
      return jsonResponse(req, {
        assetId: persisted.assetId,
        storageBucket: persisted.storageBucket,
        storagePath: persisted.storagePath,
        signedUrl: persisted.signedUrl,
        provider: body.provider,
        model,
        provenance: 'generated',
        isAiIllustrative: true,
        isConceptual: true,
        estimatedCostUsd: isPaid ? (image.actualCostUsd ?? estimatedCost) : 0,
      });
    } catch (error) {
      await finishGeneration(ctx.admin, usageId, 'failed', error instanceof ProviderError ? error.code : 'asset_persist_failed');
      if (error instanceof ProviderError) throw providerAppError(error);
      throw error;
    }
  } catch (error) {
    if (error instanceof AppError) return errorResponse(req, error);
    return errorResponse(req, providerAppError(error));
  }
});
