import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.join(process.cwd(), 'client-demo-output');
const baseURL = process.env.DEMO_BASE_URL || 'http://127.0.0.1:4174';
const now = new Date().toISOString();
const brandKit = {
  id: 'zawmarketing-demo-brand', isDefault: true, companyName: 'ZawMarketing Demo Studio', tagline: 'Fictional marketing automation sample',
  logoUrl: '', logoDarkUrl: '', website: 'zawmarketing.example', phone: 'Demo only', email: 'demo@zawmarketing.example',
  colors: { primary: '#0f172a', secondary: '#1b3b2b', accent: '#c85a32', backgroundLight: '#fdfbf7', backgroundDark: '#0a1128', textPrimary: '#0f172a', textMuted: '#64748b' },
  typography: { headlineFont: 'Playfair Display', bodyFont: 'Inter', monoFont: 'JetBrains Mono', familyPairing: 'editorial_serif' },
  toneOfVoice: 'educational', targetAudienceDefault: 'Property owners and real-estate investment teams', preferredCta: 'Request a workflow demonstration',
  requiredDisclaimer: 'DEMO / FICTIONAL SAMPLE. Educational content only; verify all property and market facts independently.',
  forbiddenWords: ['guaranteed returns', 'game-changing', 'unlock the potential'], imageStylePreference: 'authentic_photos_first',
};

const baseConfigs = (square) => ({
  square,
  portrait: { ...square, aspectRatio: 'portrait' }, story: { ...square, aspectRatio: 'story' }, landscape: { ...square, aspectRatio: 'landscape' },
  flyer_letter: { ...square, aspectRatio: 'flyer_letter' }, flyer_a4: { ...square, aspectRatio: 'flyer_a4' },
});

const samples = [
  {
    directory: 'seller-education',
    graphic: 'seller-education-square.png',
    campaign: {
      id: 'demo-seller-education', createdAt: now, updatedAt: now, status: 'copy_ready',
      name: 'DEMO / FICTIONAL — Sell Without Major Renovations', tags: ['Demo', 'Fictional', 'Seller education'],
      sourceData: { campaignType: 'educational', title: 'Sell Without Major Renovations', targetMarket: 'Seller Education · Fictional Demo', topicSummary: 'A neutral educational framework for owners comparing an as-is sale with pre-sale renovation.', uploadedImages: [{ id: 'seller-demo', url: '/demo/fictional-property-interior.png', name: 'Fictional demo interior', source: 'sample', provenance: 'fixture', aspectRatio: 1.5, isHero: true }] },
      strategy: { targetAudience: { name: 'Property owners', description: 'Owners deciding whether to renovate before a sale.', painPoints: [], motivations: [] }, primaryObjective: 'Explain options without pressure.', coreAngle: 'Renovation is one path, not a requirement for every seller.', keyHooks: [], valueProposition: 'A clear comparison based on time, scope, and certainty.', supportingEvidence: [], ctaStrategy: 'Offer a no-pressure comparison.', suggestedPlatforms: ['facebook', 'instagram'] },
      designConfigs: baseConfigs({ templateFamily: 'editorial', aspectRatio: 'square', headline: 'Selling As-Is Can Be a Deliberate Choice', subtitle: 'DEMO / FICTIONAL SELLER EDUCATION', imageCropY: 48, imageZoom: 1, activeMetricIds: [], customBadgeText: 'SELLER EDUCATION', customCtaText: 'COMPARE YOUR OPTIONS', showDisclaimer: true }),
    },
    files: {
      'instagram-caption.txt': `DEMO / FICTIONAL SAMPLE\n\nSelling a property does not automatically require a major renovation first. The right path depends on the work involved, the time available, and how much uncertainty you want to carry.\n\nBefore committing to a remodel, compare three things:\n• the true scope and contingency\n• the likely schedule\n• the value of a simpler as-is process\n\nA clear side-by-side review can help you choose deliberately—without pressure or invented promises.\n\nRequest a fictional workflow demonstration.\n\n#SellerEducation #PropertyPlanning #RealEstateWorkflow\n`,
      'facebook-post.txt': `DEMO / FICTIONAL SAMPLE\n\nSell without a major renovation? It can be a rational option.\n\nSome properties benefit from pre-sale improvements. Others do not justify the added scope, schedule, and execution risk. Before starting work, compare the estimated renovation, contingency, timing, and as-is alternative using verified local information.\n\nThe goal is not to push one answer. It is to make the tradeoffs visible so the owner can decide with clarity.\n\nRequest a fictional workflow demonstration.\n`,
    },
  },
  {
    directory: 'phoenix-market-insight',
    graphic: 'market-intelligence-square.png',
    campaign: {
      id: 'demo-market-insight', createdAt: now, updatedAt: now, status: 'copy_ready',
      name: 'DEMO / FICTIONAL — Phoenix Investor Market Snapshot', tags: ['Demo', 'Fictional', 'Market insight'],
      sourceData: { campaignType: 'market_update', title: 'Phoenix Investor Market Snapshot', targetMarket: 'Phoenix, Arizona · Educational Demo', topicSummary: 'A non-statistical framework for reviewing a market snapshot with current verified sources.', uploadedImages: [{ id: 'market-demo', url: '/demo/fictional-property-exterior.png', name: 'Fictional demo exterior', source: 'sample', provenance: 'fixture', aspectRatio: 1.5, isHero: true }] },
      strategy: { targetAudience: { name: 'Investment teams', description: 'Teams reviewing acquisition criteria.', painPoints: [], motivations: [] }, primaryObjective: 'Demonstrate a disciplined market-update format.', coreAngle: 'A useful market snapshot separates verified facts from underwriting assumptions.', keyHooks: [], valueProposition: 'A repeatable review of basis, scope, exit assumptions, and evidence dates.', supportingEvidence: [], ctaStrategy: 'Invite a workflow demo.', suggestedPlatforms: ['linkedin', 'instagram'] },
      designConfigs: baseConfigs({ templateFamily: 'market_intelligence', aspectRatio: 'square', headline: 'Phoenix Investor Market Snapshot', subtitle: 'DEMO / FICTIONAL · VERIFY CURRENT MARKET DATA', imageCropY: 50, imageZoom: 1, activeMetricIds: [], customBadgeText: 'MARKET INTELLIGENCE', customCtaText: 'REVIEW THE FRAMEWORK', showDisclaimer: true }),
    },
    files: {
      'linkedin-post.txt': `DEMO / FICTIONAL SAMPLE\n\nA credible investor market snapshot should show its work.\n\nFor each opportunity, separate four layers:\n1. verified property and market facts\n2. deterministic calculations\n3. underwriting assumptions\n4. open questions that still require diligence\n\nThat structure matters more than a dramatic headline. It makes updates easier to review, compare, and revise when source data changes.\n\nThis educational Phoenix example intentionally contains no live market statistics. A production update should cite current, dated sources.\n\nRequest a demonstration of the workflow.\n`,
      'instagram-caption.txt': `DEMO / FICTIONAL SAMPLE\n\nA market snapshot is useful only when verified facts and assumptions are clearly separated.\n\nReview the basis. Define the renovation contingency. Date every source. Stress-test the exit assumption. List what still needs diligence.\n\nThis Phoenix example is educational and intentionally uses no live market statistics.\n\n#MarketIntelligence #RealEstateUnderwriting #PhoenixInvestors\n`,
    },
  },
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
try {
  for (const sample of samples) {
    const directory = path.join(root, sample.directory);
    const graphics = path.join(directory, 'graphics');
    await mkdir(graphics, { recursive: true });
    for (const [filename, content] of Object.entries(sample.files)) await writeFile(path.join(directory, filename), content);
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.evaluate(({ campaign, brand }) => {
      window.localStorage.clear();
      window.localStorage.setItem('zaw_marketing_campaigns_v1', JSON.stringify([campaign]));
      window.localStorage.setItem('zaw_marketing_brand_kit_v1', JSON.stringify(brand));
    }, { campaign: sample.campaign, brand: brandKit });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText(sample.campaign.name).first().click();
    await page.getByRole('button', { name: 'Design & Flyers', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export High-Res PNG/i }).click();
    await (await downloadPromise).saveAs(path.join(graphics, sample.graphic));
  }
} finally {
  await browser.close();
}

process.stdout.write(JSON.stringify({ ok: true, samples: samples.map((sample) => sample.directory) }));
