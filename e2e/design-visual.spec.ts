import { expect, test, type Locator, type Page } from '@playwright/test';

const families = [
  ['Editorial Real Estate', 'editorial'],
  ['Institutional Investment', 'institutional'],
  ['Modern Brokerage', 'modern_brokerage'],
  ['Direct Response Investor', 'direct_response'],
  ['Market Intelligence & Data', 'market_intelligence'],
] as const;

async function expectCanvasContract(
  canvas: Locator,
  expectedWidth: number,
  expectedHeight: number,
  expectedFamily?: string
): Promise<void> {
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-target-width', String(expectedWidth));
  await expect(canvas).toHaveAttribute('data-target-height', String(expectedHeight));
  if (expectedFamily) {
    await expect(canvas).toHaveAttribute('data-template-family', expectedFamily);
  }

  const health = await canvas.evaluate((element) => {
    const images = (Array.from(element.querySelectorAll('img')) as HTMLImageElement[]).map((image) => ({
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    }));

    return {
      textLength: (element.textContent || '').trim().length,
      images,
    };
  });

  expect(health.textLength).toBeGreaterThan(20);
  for (const image of health.images) {
    expect(image.complete).toBe(true);
    expect(image.naturalWidth).toBeGreaterThan(0);
    expect(image.naturalHeight).toBeGreaterThan(0);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=1');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByText(/Demo · Phoenix Value-Add/i).first().click();
  await page.getByRole('button', { name: 'Design & Flyers' }).click();
});

test('all five design families render the correct square template contract', async ({ page }) => {
  for (const [familyName, familyId] of families) {
    await page.getByRole('button', { name: new RegExp(familyName) }).click();
    const canvas = page.locator('[data-aspect-ratio="square"]');
    await expectCanvasContract(canvas, 1080, 1080, familyId);
  }
});

test('representative portrait, story, landscape, and flyer layouts do not overflow', async ({ page }) => {
  const formats = [
    ['Instagram Portrait', 'portrait', 1080, 1350, undefined],
    ['Story / Reel / TikTok', 'story', 1080, 1920, undefined],
    ['Facebook & LinkedIn Banner', 'landscape', 1200, 630, undefined],
    ['Printable Investment Flyer (US Letter)', 'flyer_letter', 2550, 3300, 'flyer'],
  ] as const;

  for (const [buttonName, aspect, width, height, family] of formats) {
    await page.getByRole('button', { name: buttonName }).click();
    const canvas = page.locator(`[data-aspect-ratio="${aspect}"]`);
    await expectCanvasContract(canvas, width, height, family);

    const overflow = await canvas.evaluate((element) => ({
      width: element.scrollWidth - element.clientWidth,
      height: element.scrollHeight - element.clientHeight,
    }));
    expect(overflow.width).toBeLessThanOrEqual(1);
    expect(overflow.height).toBeLessThanOrEqual(1);
  }
});
