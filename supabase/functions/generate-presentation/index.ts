// Authenticated, server-owned investment presentation deck generation.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AppError, ProviderError, providerAppError } from '../_shared/errors.ts';
import { assertOrganizationAccess, authenticate } from '../_shared/auth.ts';
import { claimGeneration, finishGeneration } from '../_shared/usage.ts';
import { generateGeminiJson } from '../_shared/gemini.ts';
import { assertGeminiTextModel, geminiTextIsPaid, GEMINI_TEXT_MODELS } from '../_shared/providers.ts';
import { handleOptions, ensurePost, errorResponse, idempotencyKey, jsonResponse } from '../_shared/http.ts';
import { parseBody, presentationDeckOutputSchema, presentationRequestSchema } from '../_shared/validation.ts';

const baseSlideProperties = {
  id: { type: 'string' },
  navLabel: { type: 'string' },
  kicker: { type: 'string' },
  title: { type: 'string' },
  speakerNotes: { type: 'string' },
  isHidden: { type: 'boolean' },
};

const coverSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['cover'] },
    subtitle: { type: 'string' },
    imageId: { type: 'string' },
    imageUrl: { type: 'string' },
    foot: { type: 'string' },
  },
};

const executiveSummarySlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'summary', 'highlights'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['executive_summary'] },
    summary: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 },
  },
};

const propertyOverviewSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'address', 'city', 'state', 'propertyType', 'highlights'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['property_overview'] },
    address: { type: 'string' },
    city: { type: 'string' },
    state: { type: 'string' },
    zipCode: { type: 'string' },
    propertyType: { type: 'string' },
    bedrooms: { type: 'number' },
    bathrooms: { type: 'number' },
    squareFeet: { type: 'number' },
    yearBuilt: { type: 'number' },
    highlights: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 },
    imageId: { type: 'string' },
    imageUrl: { type: 'string' },
  },
};

const investmentThesisSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'thesis', 'pillars'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['investment_thesis'] },
    thesis: { type: 'string' },
    pillars: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
  },
};

const statGridSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'stats'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['stat_grid'] },
    stats: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value'],
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
          factKey: { type: 'string' },
          caption: { type: 'string' },
        },
      },
    },
  },
};

const bigNumberSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'value', 'caption'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['big_number'] },
    value: { type: 'string' },
    factKey: { type: 'string' },
    caption: { type: 'string' },
    foot: { type: 'string' },
  },
};

const financialSnapshotSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'metrics', 'disclosures'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['financial_snapshot'] },
    metrics: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value', 'factKey'],
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
          factKey: { type: 'string' },
          subtext: { type: 'string' },
          highlight: { type: 'boolean' },
        },
      },
    },
    disclosures: { type: 'array', items: { type: 'string' }, maxItems: 5 },
  },
};

const marketContextSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'submarket', 'insights'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['market_context'] },
    submarket: { type: 'string' },
    insights: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
    comps: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['address', 'price'],
        properties: {
          address: { type: 'string' },
          price: { type: 'string' },
          sqft: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  },
};

const timelineSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'items'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['timeline'] },
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['time', 'title'],
        properties: {
          time: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
        },
      },
    },
  },
};

const gallerySlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'layout', 'items'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['gallery'] },
    layout: { type: 'string', enum: ['split', 'bento'] },
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['imageUrl'],
        properties: {
          imageId: { type: 'string' },
          imageUrl: { type: 'string' },
          caption: { type: 'string' },
          title: { type: 'string' },
          span: { type: 'integer' },
        },
      },
    },
  },
};

const targetAudienceSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'audienceName', 'description', 'painPoints', 'motivations'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['target_audience'] },
    audienceName: { type: 'string' },
    description: { type: 'string' },
    painPoints: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
    motivations: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
  },
};

const marketingStrategySlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'coreAngle', 'hooks', 'platforms', 'cta'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['marketing_strategy'] },
    coreAngle: { type: 'string' },
    hooks: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
    platforms: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
    cta: { type: 'string' },
  },
};

const creativeShowcaseSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'previewFormats'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['creative_showcase'] },
    subtitle: { type: 'string' },
    previewFormats: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: { type: 'string', enum: ['square', 'portrait', 'story', 'landscape'] },
    },
  },
};

const videoConceptSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'hook', 'durationSeconds', 'scenes', 'cta'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['video_concept'] },
    hook: { type: 'string' },
    durationSeconds: { type: 'number' },
    scenes: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['timeframe', 'visualDirection', 'spokenAudio'],
        properties: {
          timeframe: { type: 'string' },
          visualDirection: { type: 'string' },
          spokenAudio: { type: 'string' },
          onScreenText: { type: 'string' },
        },
      },
    },
    cta: { type: 'string' },
  },
};

const comparisonSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'headers', 'rows'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['comparison'] },
    headers: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 },
    rows: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'current', 'projected'],
        properties: {
          label: { type: 'string' },
          current: { type: 'string' },
          projected: { type: 'string' },
        },
      },
    },
  },
};

const tableSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'columns', 'rows'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['table'] },
    columns: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
    rows: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    caption: { type: 'string' },
    highlightCol: { type: 'integer' },
    highlightRow: { type: 'integer' },
  },
};

const riskDisclaimerSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'disclaimerText'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['risk_disclaimer'] },
    disclaimerText: { type: 'string' },
    additionalCaveats: { type: 'array', items: { type: 'string' }, maxItems: 6 },
  },
};

const nextStepsSlideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'ctaText', 'contactInfo'],
  properties: {
    ...baseSlideProperties,
    type: { type: 'string', enum: ['next_steps'] },
    ctaText: { type: 'string' },
    contactInfo: {
      type: 'object',
      additionalProperties: false,
      required: ['company', 'email', 'phone', 'website'],
      properties: {
        name: { type: 'string' },
        company: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        website: { type: 'string' },
        licenseNumber: { type: 'string' },
      },
    },
  },
};

const presentationResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'id', 'campaignId', 'title', 'generatedAt', 'theme', 'slides'],
  properties: {
    schemaVersion: { type: 'string', enum: ['1.0.0'] },
    id: { type: 'string' },
    campaignId: { type: 'string' },
    title: { type: 'string' },
    subtitle: { type: 'string' },
    generatedAt: { type: 'string' },
    isDemo: { type: 'boolean' },
    theme: {
      type: 'object',
      additionalProperties: false,
      required: [
        'name', 'bg', 'bgGrad1', 'bgGrad2', 'surface', 'surface2',
        'fg', 'fgMuted', 'fgFaint', 'hair', 'hair2', 'primary',
        'accent', 'accentInk', 'radius', 'radiusSm', 'radiusLg',
        'fontHead', 'fontBody', 'fontMono', 'colorScheme',
      ],
      properties: {
        name: { type: 'string' },
        bg: { type: 'string' },
        bgGrad1: { type: 'string' },
        bgGrad2: { type: 'string' },
        surface: { type: 'string' },
        surface2: { type: 'string' },
        fg: { type: 'string' },
        fgMuted: { type: 'string' },
        fgFaint: { type: 'string' },
        hair: { type: 'string' },
        hair2: { type: 'string' },
        primary: { type: 'string' },
        accent: { type: 'string' },
        accentInk: { type: 'string' },
        radius: { type: 'string' },
        radiusSm: { type: 'string' },
        radiusLg: { type: 'string' },
        fontHead: { type: 'string' },
        fontBody: { type: 'string' },
        fontMono: { type: 'string' },
        colorScheme: { type: 'string', enum: ['dark', 'light'] },
      },
    },
    slides: {
      type: 'array',
      minItems: 4,
      maxItems: 25,
      items: {
        oneOf: [
          coverSlideJsonSchema,
          executiveSummarySlideJsonSchema,
          propertyOverviewSlideJsonSchema,
          investmentThesisSlideJsonSchema,
          statGridSlideJsonSchema,
          bigNumberSlideJsonSchema,
          financialSnapshotSlideJsonSchema,
          marketContextSlideJsonSchema,
          timelineSlideJsonSchema,
          gallerySlideJsonSchema,
          targetAudienceSlideJsonSchema,
          marketingStrategySlideJsonSchema,
          creativeShowcaseSlideJsonSchema,
          videoConceptSlideJsonSchema,
          comparisonSlideJsonSchema,
          tableSlideJsonSchema,
          riskDisclaimerSlideJsonSchema,
          nextStepsSlideJsonSchema,
        ],
      },
    },
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
    const body = await parseBody(req, presentationRequestSchema);
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
      operationType: 'generate-presentation',
      provider: 'gemini',
      model,
      idempotencyKey: requestKey,
      isPaid,
      estimatedCostUsd: estimatedCost,
    });
    usageId = claim.usageId;

    const systemPrompt = `You are the ZawMarketing Institutional Presentation Engine.
Your task is to generate a comprehensive, highly professional, brand-aligned Real Estate Investment Presentation Deck.

CRITICAL RULES:
1. Return ONLY valid structured JSON adhering strictly to the provided JSON Schema.
2. DO NOT return React code, JSX, HTML, CSS, JavaScript, or markdown code fences outside JSON.
3. Quantifiable Financial Claims: Use ONLY the provided numbers from the campaign source data and strategy. DO NOT invent or fabricate numbers.
4. If a factKey is applicable (e.g. purchase_price, renovation_estimate, arv, gross_spread, in_place_cap_rate, stabilized_cap_rate_on_purchase, stabilized_yield_on_cost), attach it so the client truth engine can resolve it dynamically.
5. Anti-Hallucination on Market & Comps: If market or comparable evidence is absent in the input data, OMIT comps and do NOT fabricate comp addresses, closed prices, cap rates, DOM, inventory, or neighborhood performance. Use only high-level marketing strategy context.
6. Create a coherent 8-14 slide investment story covering: Cover, Executive Summary, Property Specifications, Investment Thesis, Financial Snapshot, Execution Timeline, Market Context, Marketing Strategy, Creative Showcase, Video Concept, Risk Disclosures, and Next Steps.
7. Provide concise, professional, actionable speakerNotes on every slide.`;

    const userPrompt = `Generate a complete investment presentation deck for this campaign:
${JSON.stringify({ campaign: body.campaign, brandKit: body.brandKit }, null, 2)}`;

    try {
      const startTime = Date.now();
      const parsed = await generateGeminiJson(
        model,
        `${systemPrompt}\n\n${userPrompt}`,
        presentationResponseJsonSchema,
        body.thinkingLevel,
      );
      const latencyMs = Date.now() - startTime;

      const validated = presentationDeckOutputSchema.safeParse(parsed);
      if (!validated.success) {
        console.error('[edge] presentationDeckOutputSchema validation failed:', validated.error.format());
        throw new ProviderError('provider_invalid_output');
      }

      const deck = validated.data;
      const metadata = {
        requestedModel: model,
        actualModel: model,
        fallbackOccurred: false,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
      deck.generationMetadata = metadata;

      await finishGeneration(ctx.admin, usageId, 'success', undefined, estimatedCost);
      return jsonResponse(req, { presentation: deck, metadata, model, provenance: 'generated' });
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
