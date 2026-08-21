import { expect, test } from '@playwright/test';

const families = [
  'Editorial Real Estate',
  'Institutional Investment',
  'Modern Brokerage',
  'Direct Response Investor',
  'Market Intelligence & Data',
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=1');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByText(/Demo · Phoenix Value-Add/i).first().click();
  await page.getByRole('button', { name: 'Design & Flyers' }).click();
});

test('all five design families have deterministic square visual baselines', async ({ page }) => {
  for (const family of families) {
    await page.getByRole('button', { name: new RegExp(family) }).click();
    const canvas = page.locator('[data-aspect-ratio="square"]');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveScreenshot(`${family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-square.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.12,
    });
  }
});

test('representative portrait, story, landscape, and flyer layouts do not overflow', async ({ page }) => {
  const formats = [
    ['Instagram Portrait', 'portrait'],
    ['Story / Reel / TikTok', 'story'],
    ['Facebook & LinkedIn Banner', 'landscape'],
    ['Printable Investment Flyer (US Letter)', 'flyer_letter'],
  ] as const;

  for (const [buttonName, aspect] of formats) {
    await page.getByRole('button', { name: buttonName }).click();
    const canvas = page.locator(`[data-aspect-ratio="${aspect}"]`);
    await expect(canvas).toBeVisible();
    const overflow = await canvas.evaluate((element) => ({
      width: element.scrollWidth - element.clientWidth,
      height: element.scrollHeight - element.clientHeight,
    }));
    expect(overflow.width).toBeLessThanOrEqual(1);
    expect(overflow.height).toBeLessThanOrEqual(1);
    await expect(canvas).toHaveScreenshot(`representative-${aspect}.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.12,
    });
  }
});
