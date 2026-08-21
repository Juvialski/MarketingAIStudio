import { z } from 'zod';
import { PresentationDeck } from '../../../types/presentation';

// Rejection of arbitrary HTML/script tags in strings
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

export const presentationThemeSchema = z.object({
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

export const coverSlideSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('cover'),
  subtitle: optionalSafeString(500),
  imageId: optionalSafeString(100),
  imageUrl: optionalSafeString(2000),
  foot: optionalSafeString(200),
});

export const executiveSummarySlideSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('executive_summary'),
  summary: safeString(1, 2000),
  highlights: z.array(safeString(1, 500)).min(1).max(8),
});

export const propertyOverviewSlideSchema = z.object({
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

export const investmentThesisSlideSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('investment_thesis'),
  thesis: safeString(1, 2000),
  pillars: z.array(safeString(1, 500)).min(1).max(6),
});

export const statGridSlideSchema = z.object({
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

export const bigNumberSlideSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('big_number'),
  value: safeString(1, 100),
  factKey: optionalSafeString(100),
  caption: safeString(1, 300),
  foot: optionalSafeString(200),
});

export const financialSnapshotSlideSchema = z.object({
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

export const marketContextSlideSchema = z.object({
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

export const timelineSlideSchema = z.object({
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

export const gallerySlideSchema = z.object({
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

export const targetAudienceSlideSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('target_audience'),
  audienceName: safeString(1, 200),
  description: safeString(1, 1000),
  painPoints: z.array(safeString(1, 300)).min(1).max(6),
  motivations: z.array(safeString(1, 300)).min(1).max(6),
});

export const marketingStrategySlideSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('marketing_strategy'),
  coreAngle: safeString(1, 500),
  hooks: z.array(safeString(1, 300)).min(1).max(6),
  platforms: z.array(safeString(1, 100)).min(1).max(6),
  cta: safeString(1, 300),
});

export const creativeShowcaseSlideSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('creative_showcase'),
  subtitle: optionalSafeString(300),
  previewFormats: z.array(z.enum(['square', 'portrait', 'story', 'landscape'])).min(1).max(4),
});

export const videoConceptSlideSchema = z.object({
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

export const comparisonSlideSchema = z.object({
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

export const tableSlideSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('table'),
  columns: z.array(safeString(1, 100)).min(1).max(6),
  rows: z.array(z.array(z.union([z.string().max(200), z.number()]))).min(1).max(8),
  caption: optionalSafeString(300),
  highlightCol: z.number().int().nonnegative().optional(),
  highlightRow: z.number().int().nonnegative().optional(),
});

export const riskDisclaimerSlideSchema = z.object({
  ...baseSlideSchema,
  type: z.literal('risk_disclaimer'),
  disclaimerText: safeString(1, 3000),
  additionalCaveats: z.array(safeString(1, 500)).max(6).optional(),
});

export const nextStepsSlideSchema = z.object({
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

export const presentationSlideSchema = z.discriminatedUnion('type', [
  coverSlideSchema,
  executiveSummarySlideSchema,
  propertyOverviewSlideSchema,
  investmentThesisSlideSchema,
  statGridSlideSchema,
  bigNumberSlideSchema,
  financialSnapshotSlideSchema,
  marketContextSlideSchema,
  timelineSlideSchema,
  gallerySlideSchema,
  targetAudienceSlideSchema,
  marketingStrategySlideSchema,
  creativeShowcaseSlideSchema,
  videoConceptSlideSchema,
  comparisonSlideSchema,
  tableSlideSchema,
  riskDisclaimerSlideSchema,
  nextStepsSlideSchema,
]);

export const presentationDeckSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  id: safeString(1, 100),
  campaignId: safeString(1, 100),
  title: safeString(1, 300),
  subtitle: optionalSafeString(500),
  generatedAt: safeString(1, 100),
  isDemo: z.boolean().optional(),
  theme: presentationThemeSchema,
  slides: z.array(presentationSlideSchema).min(1).max(30).refine((slides) => {
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

export function parsePresentationDeck(data: unknown): PresentationDeck {
  return presentationDeckSchema.parse(data) as PresentationDeck;
}

export function safeParsePresentationDeck(data: unknown) {
  return presentationDeckSchema.safeParse(data);
}
