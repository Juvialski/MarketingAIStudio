import { z } from 'https://esm.sh/zod@3.25.76';
import { AppError } from './errors.ts';
import { readJsonBody } from './http.ts';

const boundedText = (max: number) => z.string().trim().min(1).max(max);
const jsonObject = z.record(z.string(), z.unknown());
const uuid = z.string().uuid();

export const strategyRequestSchema = z.object({
  sourceData: jsonObject,
  brandKit: jsonObject.default({}),
  organizationId: uuid,
  campaignId: uuid,
  modelId: boundedText(160).optional(),
  thinkingLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  idempotencyKey: boundedText(128).optional(),
}).strict();

export const copyRequestSchema = z.object({
  sourceData: jsonObject,
  strategy: jsonObject.default({}),
  brandKit: jsonObject.default({}),
  organizationId: uuid,
  campaignId: uuid,
  isFullKit: z.boolean().default(false),
  modelId: boundedText(160).optional(),
  thinkingLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  idempotencyKey: boundedText(128).optional(),
}).strict();

export const critiqueRequestSchema = z.object({
  copy: jsonObject,
  sourceData: jsonObject.default({}),
  brandKit: jsonObject.default({}),
  organizationId: uuid,
  campaignId: uuid.optional(),
  modelId: boundedText(160).optional(),
}).strict();

export const presentationRequestSchema = z.object({
  campaign: jsonObject,
  brandKit: jsonObject.default({}),
  organizationId: uuid,
  campaignId: uuid,
  modelId: boundedText(160).optional(),
  thinkingLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  idempotencyKey: boundedText(128).optional(),
}).strict();

export const imageRequestSchema = z.object({
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
  }).strict(),
  provider: z.enum(['bfl', 'nvidia', 'gemini_image', 'openai_image']).default('bfl'),
  model: boundedText(160).optional(),
  organizationId: uuid,
  campaignId: uuid,
  idempotencyKey: boundedText(128).optional(),
}).strict();

export const healthRequestSchema = z.object({
  operation: z.enum(['health', 'test_gemini', 'test_nvidia', 'test_all']).optional(),
  organizationId: uuid.optional(),
  modelId: boundedText(160).optional(),
}).strict();

export async function parseBody<TSchema extends z.ZodTypeAny>(
  req: Request,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const body = await readJsonBody(req);
  const result = schema.safeParse(body);
  if (!result.success) throw new AppError('invalid_request', 400, 'The request did not match the expected schema.');
  return result.data;
}

const stringArray = z.array(boundedText(2000)).min(1).max(20);
const platformCopy = z.object({
  headline: boundedText(500),
  body: boundedText(10000),
  cta: boundedText(500),
  characterCount: z.number().int().nonnegative(),
  hashtags: stringArray.optional(),
}).passthrough();

export const strategyOutputSchema = z.object({
  targetAudience: z.object({
    name: boundedText(500),
    description: boundedText(3000),
    painPoints: stringArray,
    motivations: stringArray,
  }).passthrough(),
  primaryObjective: boundedText(3000),
  coreAngle: boundedText(3000),
  valueProposition: boundedText(3000),
  keyHooks: stringArray,
  supportingEvidence: stringArray,
  ctaStrategy: boundedText(2000),
  suggestedPlatforms: z.array(boundedText(100)).min(1).max(10),
}).passthrough();

export const copyOutputSchema = z.object({
  headlines: stringArray,
  ctas: stringArray,
  facebook: platformCopy,
  instagram: platformCopy,
  linkedin: platformCopy,
  emailNewsletter: z.object({
    subjectLines: stringArray,
    previewText: boundedText(1000),
    bodyMarkdown: boundedText(15000),
    ctaButtonText: boundedText(500),
  }).passthrough(),
  videoScript: z.object({
    title: boundedText(500),
    durationSeconds: z.number().positive().max(900),
    targetFormat: z.literal('9:16 vertical reel'),
    hook: boundedText(2000),
    callToAction: boundedText(1000),
    scenes: z.array(z.object({
      timeframe: boundedText(100),
      visualDirection: boundedText(3000),
      spokenAudio: boundedText(3000),
      onScreenText: boundedText(2000),
    }).passthrough()).min(1).max(20),
  }).passthrough(),
}).passthrough();

export const fullKitOutputSchema = z.object({
  strategy: z.object({
    targetAudience: z.object({ name: boundedText(500), description: boundedText(3000) }).passthrough(),
    primaryObjective: boundedText(3000),
    coreAngle: boundedText(3000),
    keyHooks: stringArray,
    valueProposition: boundedText(3000),
    supportingEvidence: stringArray,
    ctaStrategy: boundedText(2000),
    suggestedPlatforms: z.array(boundedText(100)).min(1).max(10),
  }).passthrough(),
  copy: copyOutputSchema,
}).passthrough();

// Presentation Deck Validation Schemas
const safeString = (min: number, max: number) =>
  z.string()
    .trim()
    .min(min)
    .max(max)
    .refine((val) => !/<(?:script|style|iframe|object|embed|applet|meta|link|svg\s+onload)/i.test(val), {
      message: 'HTML tags or script injection patterns are forbidden.',
    });

const optionalSafeString = (max: number) =>
  z.string()
    .trim()
    .max(max)
    .refine((val) => !/<(?:script|style|iframe|object|embed|applet|meta|link|svg\s+onload)/i.test(val), {
      message: 'HTML tags or script injection patterns are forbidden.',
    })
    .optional();

export const presentationThemeOutputSchema = z.object({
  name: safeString(1, 100),
  bg: safeString(1, 100),
  bgGrad1: safeString(1, 100),
  bgGrad2: safeString(1, 100),
  surface: safeString(1, 100),
  surface2: safeString(1, 100),
  fg: safeString(1, 100),
  fgMuted: safeString(1, 100),
  fgFaint: safeString(1, 100),
  hair: safeString(1, 100),
  hair2: safeString(1, 100),
  primary: safeString(1, 100),
  accent: safeString(1, 300),
  accentInk: safeString(1, 100),
  radius: safeString(1, 50),
  radiusSm: safeString(1, 50),
  radiusLg: safeString(1, 50),
  fontHead: safeString(1, 200),
  fontBody: safeString(1, 200),
  fontMono: safeString(1, 200),
  colorScheme: z.enum(['dark', 'light']),
});

const baseSlideSchema = {
  id: safeString(1, 100),
  navLabel: optionalSafeString(100),
  kicker: optionalSafeString(150),
  title: safeString(1, 300),
  speakerNotes: optionalSafeString(3000),
  isHidden: z.boolean().optional(),
};

export const coverSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('cover'),
  subtitle: optionalSafeString(500),
  imageId: optionalSafeString(100),
  imageUrl: optionalSafeString(2000),
  foot: optionalSafeString(200),
});

export const executiveSummarySlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('executive_summary'),
  summary: safeString(1, 2000),
  highlights: z.array(safeString(1, 500)).min(1).max(8),
});

export const propertyOverviewSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('property_overview'),
  address: safeString(1, 300),
  city: safeString(1, 150),
  state: safeString(1, 50),
  zipCode: optionalSafeString(30),
  propertyType: safeString(1, 100),
  bedrooms: z.number().nonnegative().optional(),
  bathrooms: z.number().nonnegative().optional(),
  squareFeet: z.number().nonnegative().optional(),
  yearBuilt: z.number().nonnegative().optional(),
  highlights: z.array(safeString(1, 300)).min(1).max(8),
  imageId: optionalSafeString(100),
  imageUrl: optionalSafeString(2000),
});

export const investmentThesisSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('investment_thesis'),
  thesis: safeString(1, 2000),
  pillars: z.array(safeString(1, 500)).min(1).max(6),
});

export const statGridSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('stat_grid'),
  stats: z.array(
    z.object({
      label: safeString(1, 100),
      value: safeString(1, 100),
      factKey: optionalSafeString(100),
      caption: optionalSafeString(200),
    })
  ).min(1).max(8),
});

export const bigNumberSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('big_number'),
  value: safeString(1, 100),
  factKey: optionalSafeString(100),
  caption: safeString(1, 300),
  foot: optionalSafeString(200),
});

export const financialSnapshotSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('financial_snapshot'),
  metrics: z.array(
    z.object({
      label: safeString(1, 100),
      value: safeString(1, 100),
      factKey: safeString(1, 100),
      subtext: optionalSafeString(200),
      highlight: z.boolean().optional(),
    })
  ).min(1).max(8),
  disclosures: z.array(safeString(1, 500)).max(5),
});

export const marketContextSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('market_context'),
  submarket: safeString(1, 200),
  insights: z.array(safeString(1, 500)).min(1).max(6),
  comps: z.array(
    z.object({
      address: safeString(1, 200),
      price: safeString(1, 100),
      sqft: optionalSafeString(50),
      notes: optionalSafeString(300),
    })
  ).max(5).optional(),
});

export const timelineSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('timeline'),
  items: z.array(
    z.object({
      time: safeString(1, 50),
      title: safeString(1, 200),
      body: optionalSafeString(500),
    })
  ).min(1).max(6),
});

export const gallerySlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('gallery'),
  layout: z.enum(['split', 'bento']),
  items: z.array(
    z.object({
      imageId: optionalSafeString(100),
      imageUrl: safeString(1, 2000),
      caption: optionalSafeString(200),
      title: optionalSafeString(200),
      span: z.number().int().min(1).max(12).optional(),
    })
  ).min(1).max(6),
});

export const targetAudienceSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('target_audience'),
  audienceName: safeString(1, 200),
  description: safeString(1, 1000),
  painPoints: z.array(safeString(1, 300)).min(1).max(6),
  motivations: z.array(safeString(1, 300)).min(1).max(6),
});

export const marketingStrategySlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('marketing_strategy'),
  coreAngle: safeString(1, 500),
  hooks: z.array(safeString(1, 300)).min(1).max(6),
  platforms: z.array(safeString(1, 100)).min(1).max(6),
  cta: safeString(1, 300),
});

export const creativeShowcaseSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('creative_showcase'),
  subtitle: optionalSafeString(300),
  previewFormats: z.array(z.enum(['square', 'portrait', 'story', 'landscape'])).min(1).max(4),
});

export const videoConceptSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('video_concept'),
  hook: safeString(1, 500),
  durationSeconds: z.number().positive().max(600),
  scenes: z.array(
    z.object({
      timeframe: safeString(1, 50),
      visualDirection: safeString(1, 500),
      spokenAudio: safeString(1, 500),
      onScreenText: optionalSafeString(300),
    })
  ).min(1).max(8),
  cta: safeString(1, 300),
});

export const comparisonSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('comparison'),
  headers: z.tuple([safeString(1, 100), safeString(1, 100)]),
  rows: z.array(
    z.object({
      label: safeString(1, 200),
      current: safeString(1, 200),
      projected: safeString(1, 200),
    })
  ).min(1).max(8),
});

export const tableSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('table'),
  columns: z.array(safeString(1, 100)).min(1).max(6),
  rows: z.array(z.array(z.union([z.string().max(200), z.number()]))).min(1).max(8),
  caption: optionalSafeString(300),
  highlightCol: z.number().int().nonnegative().optional(),
  highlightRow: z.number().int().nonnegative().optional(),
});

export const riskDisclaimerSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('risk_disclaimer'),
  disclaimerText: safeString(1, 3000),
  additionalCaveats: z.array(safeString(1, 500)).max(6).optional(),
});

export const nextStepsSlideOutputSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('next_steps'),
  ctaText: safeString(1, 500),
  contactInfo: z.object({
    name: optionalSafeString(150),
    company: safeString(1, 200),
    email: safeString(1, 150),
    phone: safeString(1, 50),
    website: safeString(1, 200),
    licenseNumber: optionalSafeString(100),
  }),
});

export const presentationSlideOutputSchema = z.discriminatedUnion('type', [
  coverSlideOutputSchema,
  executiveSummarySlideOutputSchema,
  propertyOverviewSlideOutputSchema,
  investmentThesisSlideOutputSchema,
  statGridSlideOutputSchema,
  bigNumberSlideOutputSchema,
  financialSnapshotSlideOutputSchema,
  marketContextSlideOutputSchema,
  timelineSlideOutputSchema,
  gallerySlideOutputSchema,
  targetAudienceSlideOutputSchema,
  marketingStrategySlideOutputSchema,
  creativeShowcaseSlideOutputSchema,
  videoConceptSlideOutputSchema,
  comparisonSlideOutputSchema,
  tableSlideOutputSchema,
  riskDisclaimerSlideOutputSchema,
  nextStepsSlideOutputSchema,
]);

export const presentationDeckOutputSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  id: safeString(1, 100),
  campaignId: safeString(1, 100),
  title: safeString(1, 300),
  subtitle: optionalSafeString(500),
  generatedAt: safeString(1, 100),
  isDemo: z.boolean().optional(),
  theme: presentationThemeOutputSchema,
  slides: z.array(presentationSlideOutputSchema).min(1).max(30).refine((slides) => {
    const ids = new Set<string>();
    for (const slide of slides) {
      if (ids.has(slide.id)) return false;
      ids.add(slide.id);
    }
    return true;
  }, {
    message: 'All slide IDs in a deck must be unique.',
  }),
  generationMetadata: z.object({
    requestedModel: z.string().min(1),
    actualModel: z.string().min(1),
    fallbackOccurred: z.boolean(),
    fallbackReason: z.string().optional(),
    latencyMs: z.number().nonnegative(),
    timestamp: z.string().min(1),
  }).passthrough().optional(),
});
