import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const socialFormats = [
  ['Instagram Square', 'square', 1080, 1080],
  ['Instagram Portrait', 'portrait', 1080, 1350],
  ['Story / Reel / TikTok', 'story', 1080, 1920],
  ['Facebook & LinkedIn Banner', 'landscape', 1200, 630],
] as const;

async function waitForActiveCanvas(page: Page, aspect: string): Promise<void> {
  const canvas = page.locator(`[data-aspect-ratio="${aspect}"]`);
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('id', `rendered-design-${aspect}`);
  await page.evaluate(async () => {
    if ('fonts' in document) await document.fonts.ready;
  });
}

async function clickAndCaptureDownload(page: Page, buttonName: RegExp) {
  const button = page.getByRole('button', { name: buttonName });
  await expect(button).toBeEnabled();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    button.click(),
  ]);
  return download;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=1');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByText(/Demo · Phoenix Value-Add/i).first().click();
  await page.getByRole('button', { name: 'Design & Flyers' }).click();
});

test('social PNG downloads have exact declared pixel dimensions', async ({ page }) => {
  // High-resolution DOM rasterization is intentionally expensive in headless
  // Chromium. Keep the exact byte/dimension assertions while giving CI enough
  // time to render all four formats instead of weakening the verification.
  test.setTimeout(180_000);

  for (const [format, aspect, expectedWidth, expectedHeight] of socialFormats) {
    await page.getByRole('button', { name: format }).click();
    await waitForActiveCanvas(page, aspect);

    const download = await clickAndCaptureDownload(page, /Export High-Res PNG/i);
    const filePath = await download.path();
    expect(filePath).not.toBeNull();
    const bytes = await readFile(filePath!);
    expect(Array.from(bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(bytes.readUInt32BE(16), format).toBe(expectedWidth);
    expect(bytes.readUInt32BE(20), format).toBe(expectedHeight);
  }
});

test('Letter and A4 PDF downloads have the correct physical page MediaBox', async ({ page }) => {
  test.setTimeout(180_000);

  const flyers = [
    ['Printable Investment Flyer (US Letter)', 'flyer_letter', 612, 792],
    ['Printable Investment Flyer (A4)', 'flyer_a4', 595.28, 841.89],
  ] as const;

  for (const [format, aspect, expectedWidth, expectedHeight] of flyers) {
    await page.getByRole('button', { name: format }).click();
    await waitForActiveCanvas(page, aspect);

    const download = await clickAndCaptureDownload(page, /Export PDF/i);
    const filePath = await download.path();
    expect(filePath).not.toBeNull();
    const pdf = (await readFile(filePath!)).toString('latin1');
    const mediaBox = pdf.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
    expect(mediaBox).not.toBeNull();
    expect(Number(mediaBox![3]), format).toBeCloseTo(expectedWidth, 0);
    expect(Number(mediaBox![4]), format).toBeCloseTo(expectedHeight, 0);
  }
});
