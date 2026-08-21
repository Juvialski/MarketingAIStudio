import { mkdir, readFile, writeFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import JSZip from 'jszip';

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, 'client-demo-output');
const screenshotRoot = path.join(outputRoot, 'screenshots');
const baseURL = process.env.DEMO_BASE_URL || 'http://127.0.0.1:4174';

const demoBrandKit = {
  id: 'zawmarketing-demo-brand',
  isDefault: true,
  companyName: 'Apex Capital Partners (Demo)',
  tagline: 'Fictional Real Estate Marketing & Investment Intelligence Sample',
  logoUrl: '',
  logoDarkUrl: '',
  website: 'www.apexcapitalpartners.example',
  phone: '(480) 555-0194',
  email: 'acquisitions@apexcapitalpartners.example',
  colors: {
    primary: '#0f172a',
    secondary: '#1b3b2b',
    accent: '#c85a32',
    backgroundLight: '#fdfbf7',
    backgroundDark: '#0a1128',
    textPrimary: '#0f172a',
    textMuted: '#64748b',
  },
  typography: {
    headlineFont: 'Playfair Display',
    bodyFont: 'Inter',
    monoFont: 'JetBrains Mono',
    familyPairing: 'editorial_serif',
  },
  toneOfVoice: 'analytical_investor',
  targetAudienceDefault: 'Accredited real estate investors, private capital partners, and value-add operators',
  preferredCta: 'Request Detailed Investment Memorandum & Underwriting Pro Forma',
  requiredDisclaimer: 'DEMO / FICTIONAL SAMPLE. Illustrative inputs only; not a real listing, offering, or projection. Conduct independent due diligence.',
  forbiddenWords: [
    'guaranteed returns',
    'get rich quick',
    'can’t lose',
    'game-changer',
    'nestled in the heart of',
    'unlock the secret',
  ],
  imageStylePreference: 'authentic_photos_first',
};

// Import sample campaigns from src/data/sampleCampaigns.ts
// We will read and evaluate sampleCampaigns
const sampleCampaignsCode = await readFile(path.join(projectRoot, 'src', 'data', 'sampleCampaigns.ts'), 'utf8');

// Ensure directories
await Promise.all([
  mkdir(outputRoot, { recursive: true }),
  mkdir(screenshotRoot, { recursive: true }),
  mkdir(path.join(outputRoot, 'phoenix-value-add', 'graphics'), { recursive: true }),
  mkdir(path.join(outputRoot, 'phoenix-value-add', 'print'), { recursive: true }),
  mkdir(path.join(outputRoot, 'dallas-multifamily', 'graphics'), { recursive: true }),
  mkdir(path.join(outputRoot, 'dallas-multifamily', 'print'), { recursive: true }),
]);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
  reducedMotion: 'reduce',
});
const page = await context.newPage();

async function downloadFrom(buttonName, destination) {
  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  await page.getByRole('button', { name: buttonName }).click();
  const download = await downloadPromise;
  await download.saveAs(destination);
}

try {
  // 1. Load web app and seed localStorage with both sample campaigns
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  
  // Extract campaigns by loading app
  const campaigns = await page.evaluate(({ brand }) => {
    // Read from sampleCampaigns if present in memory or localStorage
    const saved = localStorage.getItem('zaw_marketing_campaigns_v1');
    return JSON.parse(saved || '[]');
  }, { brand: demoBrandKit });

  // Take Dashboard Screenshot
  await page.screenshot({ path: path.join(screenshotRoot, '01-dashboard.png'), fullPage: true });

  // 2. Process Phoenix Value-Add Campaign
  console.log('Processing Phoenix Value-Add Campaign...');
  await page.getByText(/Phoenix Value-Add/i).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotRoot, '05-full-marketing-kit.png'), fullPage: true });

  // Strategy View
  await page.getByRole('button', { name: 'Strategy', exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotRoot, '02-campaign-strategy.png'), fullPage: true });

  // Copy View
  await page.getByRole('button', { name: 'Copy Studio', exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotRoot, '03-multi-platform-copy.png'), fullPage: true });

  // Design View
  await page.getByRole('button', { name: 'Design & Flyers', exact: true }).click();
  await page.waitForTimeout(500);

  const phxDir = path.join(outputRoot, 'phoenix-value-add');
  const phxGraphics = path.join(phxDir, 'graphics');
  const phxPrint = path.join(phxDir, 'print');

  const formats = [
    ['Instagram Square', 'instagram-square.png'],
    ['Instagram Portrait', 'instagram-portrait.png'],
    ['Story / Reel / TikTok', 'story-reel.png'],
    ['Facebook & LinkedIn Banner', 'facebook-linkedin-landscape.png'],
  ];

  for (const [format, filename] of formats) {
    await page.getByRole('button', { name: format }).click();
    await page.waitForTimeout(300);
    if (format === 'Instagram Square') {
      await page.screenshot({ path: path.join(screenshotRoot, '04-design-editor.png'), fullPage: true });
    }
    await downloadFrom(/Export High-Res PNG/i, path.join(phxGraphics, filename));
  }

  // Export Letter Flyer PDF
  await page.getByRole('button', { name: 'Printable Investment Flyer (US Letter)' }).click();
  await page.waitForTimeout(400);
  await downloadFrom(/Export PDF/i, path.join(phxPrint, 'investment-flyer-letter.pdf'));

  // Export Full Marketing Kit ZIP
  await page.getByRole('button', { name: 'Full Marketing Kit', exact: true }).click();
  await page.waitForTimeout(400);
  await downloadFrom(/Download Kit/i, path.join(phxDir, 'ZawMarketing-Phoenix-Value-Add-Demo.zip'));

  // 3. Process Dallas Multi-Family Campaign
  console.log('Processing Dallas Multi-Family Campaign...');
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByText(/Dallas 8-Unit/i).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotRoot, '06-dallas-multifamily-kit.png'), fullPage: true });

  const dalDir = path.join(outputRoot, 'dallas-multifamily');
  const dalGraphics = path.join(dalDir, 'graphics');
  const dalPrint = path.join(dalDir, 'print');

  await page.getByRole('button', { name: 'Design & Flyers', exact: true }).click();
  await page.waitForTimeout(500);

  for (const [format, filename] of formats) {
    await page.getByRole('button', { name: format }).click();
    await page.waitForTimeout(300);
    await downloadFrom(/Export High-Res PNG/i, path.join(dalGraphics, filename));
  }

  // Export Letter Flyer PDF
  await page.getByRole('button', { name: 'Printable Investment Flyer (US Letter)' }).click();
  await page.waitForTimeout(400);
  await downloadFrom(/Export PDF/i, path.join(dalPrint, 'investment-flyer-letter.pdf'));

  // Export Full Marketing Kit ZIP
  await page.getByRole('button', { name: 'Full Marketing Kit', exact: true }).click();
  await page.waitForTimeout(400);
  await downloadFrom(/Download Kit/i, path.join(dalDir, 'ZawMarketing-Dallas-Multifamily-Demo.zip'));

  // 4. Capture Brand Kit Manager Screenshot
  await page.getByRole('button', { name: 'Brand Kit', exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotRoot, '07-brand-kit-manager.png'), fullPage: true });

} finally {
  await browser.close();
}

console.log('Demo kit asset generation complete.');
