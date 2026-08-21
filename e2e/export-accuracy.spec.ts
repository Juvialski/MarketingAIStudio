import { expect, test, type Page } from '@playwright/test';

const socialFormats = [
  ['Instagram Square', 'square', 1080, 1080],
  ['Instagram Portrait', 'portrait', 1080, 1350],
  ['Story / Reel / TikTok', 'story', 1080, 1920],
  ['Facebook & LinkedIn Banner', 'landscape', 1200, 630],
] as const;

async function expectExportCanvas(
  page: Page,
  aspect: string,
  expectedWidth: number,
  expectedHeight: number
): Promise<void> {
  const canvas = page.locator(`[data-aspect-ratio="${aspect}"]`);
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('id', `rendered-design-${aspect}`);
  await expect(canvas).toHaveAttribute('data-target-width', String(expectedWidth));
  await expect(canvas).toHaveAttribute('data-target-height', String(expectedHeight));

  await page.evaluate(async () => {
    if ('fonts' in document) await document.fonts.ready;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=1');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByText(/Demo · Phoenix Value-Add/i).first().click();
  await page.getByRole('button', { name: 'Design & Flyers' }).click();
});

test('social export UI exposes the exact declared PNG dimensions', async ({ page }) => {
  for (const [format, aspect, expectedWidth, expectedHeight] of socialFormats) {
    await page.getByRole('button', { name: format }).click();
    await expectExportCanvas(page, aspect, expectedWidth, expectedHeight);

    const button = page.getByRole('button', { name: /Export High-Res PNG/i });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  }
});

test('Letter and A4 export UI exposes the exact 300 DPI raster contract and PDF action', async ({ page }) => {
  const flyers = [
    ['Printable Investment Flyer (US Letter)', 'flyer_letter', 2550, 3300],
    ['Printable Investment Flyer (A4)', 'flyer_a4', 2480, 3508],
  ] as const;

  for (const [format, aspect, expectedWidth, expectedHeight] of flyers) {
    await page.getByRole('button', { name: format }).click();
    await expectExportCanvas(page, aspect, expectedWidth, expectedHeight);

    const button = page.getByRole('button', { name: /Export PDF/i });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  }
});
