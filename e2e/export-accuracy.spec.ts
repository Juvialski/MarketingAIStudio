import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const socialFormats = [
  ['Instagram Square', 1080, 1080],
  ['Instagram Portrait', 1080, 1350],
  ['Story / Reel / TikTok', 1080, 1920],
  ['Facebook & LinkedIn Banner', 1200, 630],
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=1');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByText(/Demo · Phoenix Value-Add/i).first().click();
  await page.getByRole('button', { name: 'Design & Flyers' }).click();
});

test('social PNG downloads have exact declared pixel dimensions', async ({ page }) => {
  for (const [format, expectedWidth, expectedHeight] of socialFormats) {
    await page.getByRole('button', { name: format }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export High-Res PNG/i }).click();
    const download = await downloadPromise;
    const filePath = await download.path();
    expect(filePath).not.toBeNull();
    const bytes = await readFile(filePath!);
    expect(Array.from(bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(bytes.readUInt32BE(16), format).toBe(expectedWidth);
    expect(bytes.readUInt32BE(20), format).toBe(expectedHeight);
  }
});

test('Letter and A4 PDF downloads have the correct physical page MediaBox', async ({ page }) => {
  const flyers = [
    ['Printable Investment Flyer (US Letter)', 612, 792],
    ['Printable Investment Flyer (A4)', 595.28, 841.89],
  ] as const;

  for (const [format, expectedWidth, expectedHeight] of flyers) {
    await page.getByRole('button', { name: format }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export PDF/i }).click();
    const download = await downloadPromise;
    const filePath = await download.path();
    expect(filePath).not.toBeNull();
    const pdf = (await readFile(filePath!)).toString('latin1');
    const mediaBox = pdf.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
    expect(mediaBox).not.toBeNull();
    expect(Number(mediaBox![3]), format).toBeCloseTo(expectedWidth, 0);
    expect(Number(mediaBox![4]), format).toBeCloseTo(expectedHeight, 0);
  }
});
