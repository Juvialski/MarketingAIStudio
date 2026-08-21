import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, 'client-demo-output');
const campaignRoot = path.join(outputRoot, 'phoenix-value-add');
const graphicsRoot = path.join(campaignRoot, 'graphics');
const printRoot = path.join(campaignRoot, 'print');
const screenshotRoot = path.join(outputRoot, 'screenshots');
const campaign = JSON.parse(await readFile(path.join(campaignRoot, 'campaign-fixture.json'), 'utf8'));
const demoBrandKit = {
  id: 'zawmarketing-demo-brand',
  isDefault: true,
  companyName: 'ZawMarketing Demo Studio',
  tagline: 'Fictional real-estate marketing automation sample',
  logoUrl: '',
  logoDarkUrl: '',
  website: 'zawmarketing.example',
  phone: 'Demo only',
  email: 'demo@zawmarketing.example',
  colors: { primary: '#0f172a', secondary: '#1b3b2b', accent: '#c85a32', backgroundLight: '#fdfbf7', backgroundDark: '#0a1128', textPrimary: '#0f172a', textMuted: '#64748b' },
  typography: { headlineFont: 'Playfair Display', bodyFont: 'Inter', monoFont: 'JetBrains Mono', familyPairing: 'editorial_serif' },
  toneOfVoice: 'analytical_investor',
  targetAudienceDefault: 'Real-estate investment teams evaluating marketing automation',
  preferredCta: 'Request a workflow demonstration',
  requiredDisclaimer: 'DEMO / FICTIONAL SAMPLE. Illustrative inputs only; not a real listing, offering, or projection. Verify all facts independently.',
  forbiddenWords: ['guaranteed returns', 'game-changing', 'unlock the potential', 'rare opportunity'],
  imageStylePreference: 'authentic_photos_first',
};
const baseURL = process.env.DEMO_BASE_URL || 'http://127.0.0.1:4174';

await Promise.all([mkdir(graphicsRoot, { recursive: true }), mkdir(printRoot, { recursive: true }), mkdir(screenshotRoot, { recursive: true })]);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: 'reduce' });
const page = await context.newPage();

async function downloadFrom(buttonName, destination) {
  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  await page.getByRole('button', { name: buttonName }).click();
  const download = await downloadPromise;
  await download.saveAs(destination);
}

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.evaluate(({ fixture, brandKit }) => {
    window.localStorage.clear();
    window.localStorage.setItem('zaw_marketing_campaigns_v1', JSON.stringify([fixture]));
    window.localStorage.setItem('zaw_marketing_brand_kit_v1', JSON.stringify(brandKit));
  }, { fixture: campaign, brandKit: demoBrandKit });
  await page.reload({ waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(screenshotRoot, '01-dashboard.png'), fullPage: true });

  await page.getByText('DEMO / FICTIONAL SAMPLE — Phoenix Value-Add Investment Opportunity').first().click();
  await page.screenshot({ path: path.join(screenshotRoot, '05-full-marketing-kit.png'), fullPage: true });

  await page.getByRole('button', { name: 'Strategy', exact: true }).click();
  await page.screenshot({ path: path.join(screenshotRoot, '02-campaign-strategy.png'), fullPage: true });

  await page.getByRole('button', { name: 'Copy Studio', exact: true }).click();
  await page.screenshot({ path: path.join(screenshotRoot, '03-multi-platform-copy.png'), fullPage: true });

  await page.getByRole('button', { name: 'Design & Flyers', exact: true }).click();
  const formats = [
    ['Instagram Square', 'instagram-square.png'],
    ['Instagram Portrait', 'instagram-portrait.png'],
    ['Story / Reel / TikTok', 'story-reel.png'],
    ['Facebook & LinkedIn Banner', 'facebook-linkedin-landscape.png'],
  ];
  for (const [format, filename] of formats) {
    await page.getByRole('button', { name: format }).click();
    if (format === 'Instagram Square') {
      await page.screenshot({ path: path.join(screenshotRoot, '04-design-editor.png'), fullPage: true });
    }
    await downloadFrom(/Export High-Res PNG/i, path.join(graphicsRoot, filename));
  }

  await page.getByRole('button', { name: 'Printable Investment Flyer (US Letter)' }).click();
  await downloadFrom(/Export PDF/i, path.join(printRoot, 'investment-flyer-letter.pdf'));

  await page.getByRole('button', { name: 'Full Marketing Kit', exact: true }).click();
  await downloadFrom(/Download Kit/i, path.join(campaignRoot, 'ZawMarketing-Phoenix-Demo-Kit.zip'));
} finally {
  await browser.close();
}

process.stdout.write(JSON.stringify({ ok: true, outputRoot }));
