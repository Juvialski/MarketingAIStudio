// Authenticated, server-owned property data extraction from unformatted text.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AppError, ProviderError, providerAppError } from '../_shared/errors.ts';
import { assertOrganizationAccess, authenticate } from '../_shared/auth.ts';
import { claimGeneration, finishGeneration } from '../_shared/usage.ts';
import { generateGeminiJson } from '../_shared/gemini.ts';
import { assertGeminiTextModel, geminiTextIsPaid, GEMINI_TEXT_MODELS } from '../_shared/providers.ts';
import { handleOptions, ensurePost, errorResponse, idempotencyKey, jsonResponse } from '../_shared/http.ts';
import { parseBody } from '../_shared/validation.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const extractionRequestSchema = z.object({
  organizationId: z.string().min(1),
  campaignId: z.string().optional(),
  rawText: z.string().min(1).max(50000),
  modelId: z.string().optional(),
});

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

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  let usageId: string | undefined;
  try {
    ensurePost(req);
    const ctx = await authenticate(req);
    const body = await parseBody(req, extractionRequestSchema);
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
      idempotencyKey: requestKey,
      modelId: model,
      provider: 'gemini',
      isPaid,
      estimatedCostUsd: estimatedCost,
    });
    if (claim.cachedResponse) {
      return jsonResponse(claim.cachedResponse);
    }
    usageId = claim.usageId;

    const prompt = `You are a real estate investment property underwriting and data extraction specialist.
Extract factual property attributes, underwriting numbers, location specifics, and investment highlights from the unformatted text provided below.

CRITICAL FACTUAL DIRECTIVES:
1. Extract ONLY facts that are explicitly stated or direct mathematical derivations stated in the text.
2. NEVER hallucinate, guess, or invent numbers (e.g. if ARV or rehab is not stated in the text, DO NOT include that field).
3. If an attribute is absent from the text, omit it entirely from the output object.
4. For monetary numbers (purchasePrice, renovationEstimate, arv, projectedRentMonthly, currentRentMonthly, NOI), extract purely numeric dollar values (e.g., "$350k" -> 350000, "$1.2M" -> 1200000).
5. For percentages (capRatePercent, cashOnCashPercent), extract the numerical percentage (e.g., "7.5%" -> 7.5).
6. Provide an exact 'evidenceSnippet' showing the verbatim segment of the text from which each field was extracted.

UNFORMATTED SOURCE TEXT:
"""
${body.rawText}
"""`;

    const rawData = await generateGeminiJson(model, prompt, responseJsonSchema, 'high');
    const fieldsExtractedCount = Object.keys(rawData as object || {}).length;

    const result = {
      data: rawData,
      fieldsExtractedCount,
      rawInput: body.rawText,
      timestamp: new Date().toISOString(),
      source: 'ai_llm',
      modelUsed: model,
    };

    if (usageId) {
      await finishGeneration(ctx.admin, {
        usageId,
        idempotencyKey: requestKey,
        responsePayload: result,
      });
    }
    return jsonResponse(result);
  } catch (error) {
    if (error instanceof ProviderError) {
      const mapped = providerAppError(error);
      return errorResponse(mapped.code, mapped.status, mapped.message);
    }
    if (error instanceof AppError) {
      return errorResponse(error.code, error.status, error.message);
    }
    console.error('Unhandled error in extract-property-data', error);
    return errorResponse('internal_error', 500, 'Property data extraction failed.');
  }
});
