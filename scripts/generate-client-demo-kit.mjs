import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, 'client-demo-output', 'phoenix-value-add');

function parseEnv(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    values[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return values;
}

function requireShape(kit) {
  if (!kit?.strategy?.coreAngle || !Array.isArray(kit?.copy?.headlines) || kit.copy.headlines.length !== 3) {
    throw new Error('Gemini returned an incomplete marketing-kit structure.');
  }
  for (const platform of ['facebook', 'instagram', 'linkedin']) {
    const item = kit.copy[platform];
    if (!item?.headline || !item?.body || !item?.cta) throw new Error(`Gemini omitted ${platform} copy.`);
    item.characterCount = item.body.length;
  }
  return kit;
}

const secretText = await readFile(path.join(projectRoot, '.server-secrets.env.local'), 'utf8');
const secrets = parseEnv(secretText);
const apiKey = secrets.GEMINI_API_KEY;
if (!apiKey) throw new Error('Server-only GEMINI_API_KEY is not configured.');

const model = 'gemini-3.5-flash-lite';
const prompt = `Create one polished, professional real-estate marketing kit from the fictional demo inputs below.

This is a DEMO / FICTIONAL SAMPLE, not a real listing. State that clearly wherever factual confusion is possible.

Verified fictional inputs only:
- Market: Phoenix, Arizona
- Property: 3-bedroom / 2-bath single-family property
- Positioning: value-add acquisition requiring cosmetic-to-medium renovation
- Purchase price: $285,000
- Estimated renovation: $35,000
- Estimated ARV: $390,000
- Deterministic gross spread before holding, financing, transaction, and disposition costs: $70,000

Rules:
- Do not invent an address, rent, cap rate, ROI, appreciation, comps, days on market, permit status, condition details, timeline, or guaranteed outcome.
- Call the $70,000 figure a gross spread before costs, never profit or return.
- Human, concise, investor-credible writing. No fake urgency and no excessive emojis.
- Never use: unlock the potential, game-changing, nestled in the heart, don't miss this incredible opportunity, rare opportunity.
- CTA should invite the reader to request the fictional demo underwriting brief or discuss the workflow.
- The video script is 60 seconds with four timed scenes and clear on-screen text.
- Return only JSON matching the supplied schema.`;

const platformCopy = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'body', 'cta', 'characterCount'],
  properties: {
    headline: { type: 'string' },
    body: { type: 'string' },
    cta: { type: 'string' },
    characterCount: { type: 'integer', minimum: 0 },
    hashtags: { type: 'array', items: { type: 'string' }, maxItems: 12 },
  },
};

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['strategy', 'copy'],
  properties: {
    strategy: {
      type: 'object', additionalProperties: false,
      required: ['targetAudience', 'primaryObjective', 'coreAngle', 'keyHooks', 'valueProposition', 'supportingEvidence', 'ctaStrategy', 'suggestedPlatforms'],
      properties: {
        targetAudience: {
          type: 'object', additionalProperties: false,
          required: ['name', 'description', 'painPoints', 'motivations'],
          properties: {
            name: { type: 'string' }, description: { type: 'string' },
            painPoints: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
            motivations: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
          },
        },
        primaryObjective: { type: 'string' }, coreAngle: { type: 'string' },
        keyHooks: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
        valueProposition: { type: 'string' },
        supportingEvidence: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
        ctaStrategy: { type: 'string' },
        suggestedPlatforms: { type: 'array', items: { type: 'string', enum: ['facebook', 'instagram', 'linkedin', 'email', 'video_reels'] }, minItems: 5, maxItems: 5 },
      },
    },
    copy: {
      type: 'object', additionalProperties: false,
      required: ['headlines', 'ctas', 'facebook', 'instagram', 'linkedin', 'emailNewsletter', 'videoScript'],
      properties: {
        headlines: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
        ctas: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
        facebook: platformCopy,
        instagram: platformCopy,
        linkedin: platformCopy,
        emailNewsletter: {
          type: 'object', additionalProperties: false,
          required: ['subjectLines', 'previewText', 'bodyMarkdown', 'ctaButtonText'],
          properties: {
            subjectLines: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
            previewText: { type: 'string' }, bodyMarkdown: { type: 'string' }, ctaButtonText: { type: 'string' },
          },
        },
        videoScript: {
          type: 'object', additionalProperties: false,
          required: ['title', 'durationSeconds', 'targetFormat', 'hook', 'callToAction', 'scenes'],
          properties: {
            title: { type: 'string' }, durationSeconds: { type: 'integer', minimum: 60, maximum: 60 },
            targetFormat: { type: 'string', enum: ['9:16 vertical reel'] }, hook: { type: 'string' }, callToAction: { type: 'string' },
            scenes: {
              type: 'array', minItems: 4, maxItems: 4,
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
    },
  },
};

const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema,
      thinkingConfig: { thinkingLevel: 'low' },
    },
  }),
});

if (!response.ok) {
  throw new Error(`Gemini request failed with HTTP ${response.status}.`);
}

const payload = await response.json();
const text = payload?.candidates?.[0]?.content?.parts?.find((part) => typeof part?.text === 'string')?.text;
if (!text) throw new Error('Gemini returned no structured text.');
const kit = requireShape(JSON.parse(text));

const now = new Date().toISOString();
const designConfigs = {
  square: { templateFamily: 'editorial', aspectRatio: 'square', headline: 'Phoenix Value-Add Demo', subtitle: 'DEMO / FICTIONAL SAMPLE · PHOENIX, ARIZONA', imageCropY: 50, imageZoom: 1, activeMetricIds: ['purchase', 'arv', 'spread'], customBadgeText: 'FICTIONAL DEMO', customCtaText: 'REQUEST DEMO BRIEF', showDisclaimer: true },
  portrait: { templateFamily: 'institutional', aspectRatio: 'portrait', headline: kit.copy.headlines[1], subtitle: 'Illustrative value-add underwriting scenario', imageCropY: 50, imageZoom: 1, activeMetricIds: ['purchase', 'reno', 'arv', 'spread'], customBadgeText: 'DEMO UNDERWRITING', customCtaText: 'VIEW FICTIONAL BRIEF', showDisclaimer: true },
  story: { templateFamily: 'direct_response', aspectRatio: 'story', headline: '$70K Illustrative Gross Spread', subtitle: 'Before financing, holding, transaction & disposition costs', imageCropY: 48, imageZoom: 1, activeMetricIds: ['purchase', 'arv', 'spread'], customBadgeText: 'FICTIONAL SCENARIO', customCtaText: 'REQUEST DEMO DETAILS', showDisclaimer: true },
  landscape: { templateFamily: 'modern_brokerage', aspectRatio: 'landscape', headline: 'Phoenix Value-Add Demo', subtitle: 'Phoenix value-add workflow demonstration', imageCropY: 52, imageZoom: 1, activeMetricIds: ['purchase', 'arv', 'spread'], customBadgeText: 'DEMO / FICTIONAL', customCtaText: 'EXPLORE DEMO', showDisclaimer: true },
  flyer_letter: { templateFamily: 'institutional', aspectRatio: 'flyer_letter', headline: 'Phoenix Value-Add Demo Investment Brief', subtitle: 'Fictional underwriting and marketing automation sample', imageCropY: 50, imageZoom: 1, activeMetricIds: ['purchase', 'reno', 'arv', 'spread'], customBadgeText: 'DEMO / FICTIONAL', customCtaText: 'REQUEST WORKFLOW DEMO', showDisclaimer: true },
  flyer_a4: { templateFamily: 'institutional', aspectRatio: 'flyer_a4', headline: 'Phoenix Value-Add Demo Investment Brief', subtitle: 'Fictional underwriting and marketing automation sample', imageCropY: 50, imageZoom: 1, activeMetricIds: ['purchase', 'reno', 'arv', 'spread'], customBadgeText: 'DEMO / FICTIONAL', customCtaText: 'REQUEST WORKFLOW DEMO', showDisclaimer: true },
};

const campaign = {
  id: 'demo-phoenix-client-sample',
  createdAt: now,
  updatedAt: now,
  name: 'DEMO / FICTIONAL SAMPLE — Phoenix Value-Add Investment Opportunity',
  status: 'completed',
  tags: ['Demo', 'Fictional', 'Phoenix', 'Value-Add'],
  sourceData: {
    campaignType: 'fix_and_flip',
    title: 'Phoenix Value-Add Investment Opportunity — Fictional Demo',
    targetMarket: 'Phoenix, Arizona · Fictional Demo',
    uploadedImages: [
      { id: 'demo-exterior', url: '/demo/fictional-property-exterior.png', name: 'Fictional Demo Exterior', source: 'sample', provenance: 'fixture', aspectRatio: 1.5, isHero: true, altText: 'AI-created fictional demonstration property exterior; not a real listing' },
      { id: 'demo-interior', url: '/demo/fictional-property-interior.png', name: 'Fictional Demo Interior', source: 'sample', provenance: 'fixture', aspectRatio: 1.5, isHero: false, altText: 'AI-created fictional demonstration property interior; not a real listing' },
    ],
    selectedHeroImageId: 'demo-exterior',
    property: {
      address: 'Fictional demonstration property', city: 'Phoenix', state: 'AZ', propertyType: 'single_family', bedrooms: 3, bathrooms: 2,
      financials: { purchasePrice: 285000, renovationEstimate: 35000, arv: 390000, equitySpread: 70000 },
      investmentThesis: 'Fictional value-add acquisition scenario requiring cosmetic-to-medium renovation. All values are illustrative demo inputs.',
      renovationScope: 'Illustrative cosmetic-to-medium renovation allowance; exact scope is intentionally unspecified.',
      dealHighlights: ['$285,000 fictional purchase input', '$35,000 fictional renovation allowance', '$390,000 fictional estimated ARV', '$70,000 deterministic gross spread before all additional costs'],
      notes: 'DEMO / FICTIONAL SAMPLE. Not a real listing or investment offering.',
    },
  },
  strategy: kit.strategy,
  copy: kit.copy,
  designConfigs,
  generationMetadata: { requestedModel: model, actualModel: model, fallbackOccurred: false, latencyMs: 0, timestamp: now, thinkingLevel: 'low' },
};
campaign.strategy.generationMetadata = campaign.generationMetadata;
campaign.copy.generationMetadata = campaign.generationMetadata;

await mkdir(path.join(outputRoot, 'graphics'), { recursive: true });
await mkdir(path.join(outputRoot, 'print'), { recursive: true });
await writeFile(path.join(outputRoot, 'campaign-fixture.json'), JSON.stringify(campaign, null, 2));
await writeFile(path.join(outputRoot, 'generation-metadata.json'), JSON.stringify({ model, liveCalls: 1, generatedAt: now, fictional: true }, null, 2));
await writeFile(path.join(outputRoot, 'strategy.md'), `# Phoenix Value-Add Investment Opportunity\n\n> DEMO / FICTIONAL SAMPLE — not a real listing or investment offering.\n\n## Primary objective\n${kit.strategy.primaryObjective}\n\n## Target audience\n**${kit.strategy.targetAudience.name}**\n\n${kit.strategy.targetAudience.description}\n\n## Core angle\n${kit.strategy.coreAngle}\n\n## Key hooks\n${kit.strategy.keyHooks.map((item) => `- ${item}`).join('\n')}\n\n## Value proposition\n${kit.strategy.valueProposition}\n\n## Supporting evidence\n${kit.strategy.supportingEvidence.map((item) => `- ${item}`).join('\n')}\n\n## CTA strategy\n${kit.strategy.ctaStrategy}\n`);
await writeFile(path.join(outputRoot, 'facebook-post.txt'), `DEMO / FICTIONAL SAMPLE\n\n${kit.copy.facebook.headline}\n\n${kit.copy.facebook.body}\n\n${kit.copy.facebook.cta}\n`);
await writeFile(path.join(outputRoot, 'instagram-post.txt'), `DEMO / FICTIONAL SAMPLE\n\n${kit.copy.instagram.headline}\n\n${kit.copy.instagram.body}\n\n${kit.copy.instagram.cta}\n\n${(kit.copy.instagram.hashtags || []).join(' ')}\n`);
await writeFile(path.join(outputRoot, 'linkedin-post.txt'), `DEMO / FICTIONAL SAMPLE\n\n${kit.copy.linkedin.headline}\n\n${kit.copy.linkedin.body}\n\n${kit.copy.linkedin.cta}\n`);
await writeFile(path.join(outputRoot, 'email-newsletter.md'), `# DEMO / FICTIONAL SAMPLE\n\n## Subject line options\n${kit.copy.emailNewsletter.subjectLines.map((item) => `- ${item}`).join('\n')}\n\n**Preview:** ${kit.copy.emailNewsletter.previewText}\n\n${kit.copy.emailNewsletter.bodyMarkdown}\n\n**CTA:** ${kit.copy.emailNewsletter.ctaButtonText}\n`);
await writeFile(path.join(outputRoot, 'reel-script.md'), `# 60-Second Reel Script\n\n> DEMO / FICTIONAL SAMPLE\n\n**Hook:** ${kit.copy.videoScript.hook}\n\n${kit.copy.videoScript.scenes.map((scene) => `## ${scene.timeframe}\n\n**Visual:** ${scene.visualDirection}\n\n**Voiceover:** ${scene.spokenAudio}\n\n**On-screen text:** ${scene.onScreenText}`).join('\n\n')}\n\n**CTA:** ${kit.copy.videoScript.callToAction}\n`);

process.stdout.write(JSON.stringify({ ok: true, model, liveCalls: 1, outputRoot }));
