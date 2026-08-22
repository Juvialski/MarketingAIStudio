// Authenticated, server-owned property data extraction from unformatted text.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.25.76';
import { AppError, ProviderError, providerAppError } from '../_shared/errors.ts';
import { assertOrganizationAccess, authenticate } from '../_shared/auth.ts';
import { claimGeneration, finishGeneration } from '../_shared/usage.ts';
import { generateGeminiJson } from '../_shared/gemini.ts';
import { assertGeminiTextModel, geminiTextIsPaid, GEMINI_TEXT_MODELS } from '../_shared/providers.ts';
import { handleOptions, ensurePost, errorResponse, idempotencyKey, jsonResponse } from '../_shared/http.ts';
import { extractionOutputSchema, parseBody } from '../_shared/validation.ts';

const extractionRequestSchema = z.object({
  organizationId: z.string().uuid(),
  // New-campaign intake currently sends a draft placeholder. We intentionally
  // accept a bounded string here and normalize non-UUID values to null before
  // authorization/usage accounting. Existing campaigns still use their UUID.
  campaignId: z.string().trim().min(1).max(160).optional(),
  rawText: z.string().trim().min(1).max(50_000),
  modelId: z.string().trim().min(1).max(160).optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
}).strict();

const extractedFieldStringSchema = {
  type: 'object',
  properties: {
    value: { type: 'string' },
    confidence: { type: 'number' },
    evidenceSnippet: { type: 'string' },
  },
  required: ['value', 'confidence'],
};

const extractedFieldNumberSchema = {
  type: 'object',
  properties: {
    value: { type: 'number' },
    confidence: { type: 'number' },
    evidenceSnippet: { type: 'string' },
  },
  required: ['value', 'confidence'],
};

const extractedFieldStringArraySchema = {
  type: 'object',
  properties: {
    value: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number' },
    evidenceSnippet: { type: 'string' },
  },
  required: ['value', 'confidence'],
};

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    campaignType: {
      type: 'object',
      properties: {
        value: {
          type: 'string',
          enum: ['acquisition', 'fix_and_flip', 'cash_flow_rental', 'wholesale_deal', 'market_update', 'educational', 'company_announcement'],
        },
        confidence: { type: 'number' },
        evidenceSnippet: { type: 'string' },
      },
      required: ['value', 'confidence'],
    },
    title: extractedFieldStringSchema,
    targetMarket: extractedFieldStringSchema,
    address: extractedFieldStringSchema,
    city: extractedFieldStringSchema,
    state: extractedFieldStringSchema,
    zipCode: extractedFieldStringSchema,
    neighborhood: extractedFieldStringSchema,
    propertyType: {
      type: 'object',
      properties: {
        value: {
          type: 'string',
          enum: ['single_family', 'multi_family', 'condo', 'commercial', 'land', 'industrial'],
        },
        confidence: { type: 'number' },
        evidenceSnippet: { type: 'string' },
      },
      required: ['value', 'confidence'],
    },
    bedrooms: extractedFieldNumberSchema,
    bathrooms: extractedFieldNumberSchema,
    squareFeet: extractedFieldNumberSchema,
    lotSizeSqFt: extractedFieldNumberSchema,
    yearBuilt: extractedFieldNumberSchema,
    purchasePrice: extractedFieldNumberSchema,
    renovationEstimate: extractedFieldNumberSchema,
    arv: extractedFieldNumberSchema,
    projectedRentMonthly: extractedFieldNumberSchema,
    currentRentMonthly: extractedFieldNumberSchema,
    inPlaceNOI: extractedFieldNumberSchema,
    stabilizedNOI: extractedFieldNumberSchema,
    capRatePercent: extractedFieldNumberSchema,
    cashOnCashPercent: extractedFieldNumberSchema,
    investmentThesis: extractedFieldStringSchema,
    dealHighlights: extractedFieldStringArraySchema,
    renovationScope: extractedFieldStringSchema,
    notes: extractedFieldStringSchema,
  },
};

const fallbackModel = GEMINI_TEXT_MODELS[0];
const uuidSchema = z.string().uuid();

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  let usageId: string | undefined;
  let estimatedCost = 0;

  try {
    ensurePost(req);
    const ctx = await authenticate(req);
    const body = await parseBody(req, extractionRequestSchema);
    const requestKey = idempotencyKey(req, body);

    // A draft placeholder is not a persisted campaign and must not be checked
    // as one. Organization membership remains mandatory in every live request.
    const parsedCampaignId = body.campaignId ? uuidSchema.safeParse(body.campaignId) : null;
    const campaignId = parsedCampaignId?.success ? parsedCampaignId.data : null;
    await assertOrganizationAccess(ctx, body.organizationId, campaignId ?? undefined);

    const model = body.modelId ?? fallbackModel;
    assertGeminiTextModel(model);
    const isPaid = geminiTextIsPaid();
    estimatedCost = isPaid ? Number(Deno.env.get('GEMINI_TEXT_ESTIMATED_COST_USD') ?? NaN) : 0;
    if (isPaid && (!Number.isFinite(estimatedCost) || estimatedCost < 0)) {
      throw new AppError('provider_pricing_unconfigured', 503, 'The server is not configured for this provider.');
    }

    const claim = await claimGeneration(ctx.admin, {
      organizationId: body.organizationId,
      userId: ctx.user.id,
      campaignId,
      operationType: 'extract-property-data',
      provider: 'gemini',
      model,
      idempotencyKey: requestKey,
      isPaid,
      estimatedCostUsd: estimatedCost,
    });
    usageId = claim.usageId;

    const prompt = `You are a real estate investment property underwriting and data extraction specialist.
Extract factual property attributes, underwriting numbers, location specifics, and investment highlights from the unformatted text provided below.

CRITICAL FACTUAL DIRECTIVES:
1. Extract ONLY facts explicitly stated in the source text. You may normalize formatting, but do not infer missing facts.
2. NEVER hallucinate, guess, or invent numbers. If ARV, rehab, rent, NOI, cap rate, or another value is absent, omit that field.
3. If an attribute is absent from the text, omit it entirely from the output object.
4. For monetary numbers, return numeric dollar values (for example "$350k" -> 350000 and "$1.2M" -> 1200000).
5. For percentages, return the numeric percentage (for example "7.5%" -> 7.5).
6. For every extracted field, include an evidenceSnippet copied from the supplied source text.

UNFORMATTED SOURCE TEXT:
"""
${body.rawText}
"""`;

    try {
      const rawData = await generateGeminiJson(model, prompt, responseJsonSchema, 'high');
      const validated = extractionOutputSchema.safeParse(rawData);
      if (!validated.success) throw new ProviderError('provider_invalid_output');
      const fieldsExtractedCount = Object.keys(validated.data).length;
      const result = {
        data: validated.data,
        fieldsExtractedCount,
        rawInput: body.rawText,
        timestamp: new Date().toISOString(),
        source: 'ai_llm',
        modelUsed: model,
      };

      await finishGeneration(ctx.admin, usageId, 'success', undefined, estimatedCost);
      return jsonResponse(req, result);
    } catch (error) {
      await finishGeneration(
        ctx.admin,
        usageId,
        'failed',
        error instanceof ProviderError ? error.code : 'provider_error',
      );
      if (error instanceof ProviderError) throw providerAppError(error);
      throw error;
    }
  } catch (error) {
    if (error instanceof AppError) return errorResponse(req, error);
    if (error instanceof ProviderError) return errorResponse(req, providerAppError(error));
    return errorResponse(req, providerAppError(error));
  }
});
