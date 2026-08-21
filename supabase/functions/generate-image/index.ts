// Authenticated server-side image generation. Provider output is always
// downloaded and re-hosted in private Storage before it is returned.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.25.76';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AppError, ProviderError, providerAppError } from '../_shared/errors.ts';
import { assertOrganizationAccess, authenticate } from '../_shared/auth.ts';
import { claimGeneration, finishGeneration } from '../_shared/usage.ts';
import {
  GeneratedImage,
  generateBflImage,
  generateNvidiaImage,
  configuredProviderCost,
  persistGeneratedImage,
} from '../_shared/image.ts';
import { assertImageModel, defaultImageModel } from '../_shared/providers.ts';
import { handleOptions, ensurePost, errorResponse, idempotencyKey, jsonResponse } from '../_shared/http.ts';
import { parseBody } from '../_shared/validation.ts';

const boundedText = (max: number) => z.string().trim().min(1).max(max);
const uuid = z.string().uuid();

// This route intentionally owns its request schema because demo_provider_test
// is a server capability, not a normal campaign generation mode. Keeping the
// branch explicit prevents fake demo tenant/campaign IDs from entering the
// normal live authorization path.
const imageRequestSchema = z.object({
  brief: z.object({
    purpose: z.enum(['hero', 'supporting', 'background', 'editorial', 'renovation_concept', 'neighborhood_lifestyle']).optional(),
    subject: boundedText(5000),
    composition: boundedText(3000).optional(),
    style: z.enum(['editorial_clean', 'architectural_photography', 'warm_natural_light', 'dusk_luxury', 'aerial_submarket', 'minimalist_luxury']).optional(),
    references: z.array(boundedText(120_000)).max(3).optional(),
    brandColors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(12).optional(),
    constraints: boundedText(3000).optional(),
    qualityTier: boundedText(80).optional(),
    isConceptual: z.boolean().optional(),
    aspectRatio: z.enum(['1:1', '4:3', '4:5', '16:9', '9:16']).default('1:1'),
    generationMode: z.enum(['fixture', 'demo_provider_test', 'live']).optional(),
  }).strict(),
  provider: z.enum(['bfl', 'nvidia', 'gemini_image', 'openai_image']).default('bfl'),
  model: boundedText(160).optional(),
  // Existing browser code sends demo placeholders in provider-test mode. They
  // are ignored there and replaced by the authenticated user's real org.
  organizationId: z.string().trim().min(1).max(160).optional(),
  campaignId: z.string().trim().min(1).max(160).optional(),
  idempotencyKey: boundedText(128).optional(),
}).strict();

function requireUuid(value: string | undefined, label: string): string {
  const parsed = uuid.safeParse(value);
  if (!parsed.success) {
    throw new AppError('invalid_request', 400, `${label} must be a valid identifier.`);
  }
  return parsed.data;
}

async function resolveProviderTestOrganization(
  admin: SupabaseClient,
  userId: string,
  requestedOrganizationId?: string,
): Promise<string> {
  if (requestedOrganizationId) {
    const parsed = uuid.safeParse(requestedOrganizationId);
    if (parsed.success) {
      const { data: member, error } = await admin
        .from('organization_members')
        .select('organization_id')
        .eq('organization_id', parsed.data)
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && member?.organization_id) return member.organization_id;
    }
  }

  const { data: memberships, error } = await admin
    .from('organization_members')
    .select('organization_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || !memberships?.[0]?.organization_id) {
    throw new AppError('organization_access_denied', 403, 'A workspace membership is required to run a provider test.');
  }
  return memberships[0].organization_id;
}

async function persistProviderTestImage(
  admin: SupabaseClient,
  organizationId: string,
  userId: string,
  image: GeneratedImage,
): Promise<{ storageBucket: string; storagePath: string; signedUrl: string }> {
  const storageBucket = 'campaign-assets';
  const extension = image.contentType === 'image/jpeg' ? 'jpg' : image.contentType === 'image/webp' ? 'webp' : 'png';
  const storagePath = `${organizationId}/provider-tests/${userId}/${crypto.randomUUID()}.${extension}`;
  const upload = await admin.storage.from(storageBucket).upload(storagePath, image.bytes, {
    contentType: image.contentType,
    upsert: false,
  });
  if (upload.error) throw new ProviderError('asset_persist_failed');

  const { data: signed, error: signedError } = await admin.storage
    .from(storageBucket)
    .createSignedUrl(storagePath, 3600);
  if (signedError || !signed?.signedUrl) {
    await admin.storage.from(storageBucket).remove([storagePath]);
    throw new ProviderError('asset_url_failed');
  }
  return { storageBucket, storagePath, signedUrl: signed.signedUrl };
}

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  let usageId: string | undefined;
  try {
    ensurePost(req);
    const ctx = await authenticate(req);
    const body = await parseBody(req, imageRequestSchema);
    const requestKey = idempotencyKey(req, body);

    if (body.provider !== 'bfl' && body.provider !== 'nvidia') {
      throw new AppError('provider_disabled', 503, 'This image provider is not enabled on the server.');
    }

    const model = body.model ?? defaultImageModel(body.provider);
    if (body.brief.references?.length) {
      throw new AppError('provider_reference_unsupported', 400, 'Reference-image generation is not enabled for this server route.');
    }
    assertImageModel(body.provider, model);

    const generationMode = body.brief.generationMode ?? 'live';

    // Fresh Demo Generation is a real provider smoke path. It is authenticated,
    // rate-limited through the user's real organization, NVIDIA-only, and never
    // pretends a fictional demo campaign is a live tenant row.
    if (generationMode === 'demo_provider_test') {
      if (body.provider !== 'nvidia') {
        throw new AppError('provider_disabled', 400, 'Fresh demo generation is limited to the free NVIDIA provider test path.');
      }

      const organizationId = await resolveProviderTestOrganization(
        ctx.admin,
        ctx.user.id,
        body.organizationId,
      );
      const estimatedCost = configuredProviderCost('nvidia');
      const claim = await claimGeneration(ctx.admin, {
        organizationId,
        userId: ctx.user.id,
        campaignId: null,
        operationType: 'demo-provider-test-image',
        provider: 'nvidia',
        model,
        idempotencyKey: requestKey,
        isPaid: false,
        estimatedCostUsd: estimatedCost,
      });
      usageId = claim.usageId;

      try {
        const image = await generateNvidiaImage(model, body.brief.subject, body.brief.aspectRatio);
        const persisted = await persistProviderTestImage(ctx.admin, organizationId, ctx.user.id, image);
        await finishGeneration(ctx.admin, usageId, 'success', undefined, 0, image.providerRequestId);
        return jsonResponse(req, {
          storageBucket: persisted.storageBucket,
          storagePath: persisted.storagePath,
          signedUrl: persisted.signedUrl,
          provider: 'nvidia',
          model,
          provenance: 'generated',
          isAiIllustrative: true,
          isConceptual: true,
          estimatedCostUsd: 0,
          providerTest: true,
        });
      } catch (error) {
        await finishGeneration(
          ctx.admin,
          usageId,
          'failed',
          error instanceof ProviderError ? error.code : 'asset_persist_failed',
        );
        if (error instanceof ProviderError) throw providerAppError(error);
        throw error;
      }
    }

    const organizationId = requireUuid(body.organizationId, 'Organization ID');
    const campaignId = requireUuid(body.campaignId, 'Campaign ID');
    await assertOrganizationAccess(ctx, organizationId, campaignId);

    const isPaid = body.provider === 'bfl';
    const estimatedCost = isPaid ? configuredProviderCost('bfl') : configuredProviderCost('nvidia');
    const claim = await claimGeneration(ctx.admin, {
      organizationId,
      userId: ctx.user.id,
      campaignId,
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
      const persisted = await persistGeneratedImage(ctx.admin, organizationId, campaignId, body.provider, image);
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
    if (error instanceof ProviderError) return errorResponse(req, providerAppError(error));
    return errorResponse(req, providerAppError(error));
  }
});
