import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=1');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /Brand Kit/i }).click();
  await expect(page.getByText('Brand Color Palette')).toBeVisible();
});

test('brand color palette renders 6 non-collapsing square swatches with canonical demo colors', async ({ page }) => {
  const expectedTokens = [
    { key: 'primary', label: 'Primary', hex: '#0f172a' },
    { key: 'secondary', label: 'Secondary', hex: '#1b3b2b' },
    { key: 'accent', label: 'Accent', hex: '#c85a32' },
    { key: 'backgroundLight', label: 'Light Background', hex: '#fdfbf7' },
    { key: 'backgroundDark', label: 'Dark Background', hex: '#0a1128' },
    { key: 'textPrimary', label: 'Primary Text', hex: '#0f172a' },
  ];

  for (const token of expectedTokens) {
    // 1. Verify field and input are visible with expected canonical demo value
    const input = page.getByLabel(`${token.label} Hex Value`);
    await expect(input).toBeVisible();
    await expect(input).toHaveValue(token.hex);

    // 2. Verify swatch exists and is not collapsed into a thin vertical strip
    const swatch = page.getByTestId(`brand-color-swatch-${token.key}`);
    await expect(swatch).toBeVisible();

    const box = await swatch.boundingBox();
    expect(box, `Bounding box for ${token.key} swatch should exist`).not.toBeNull();
    expect(box!.width, `Swatch ${token.key} width should be >= 36px`).toBeGreaterThanOrEqual(36);
    expect(box!.height, `Swatch ${token.key} height should be >= 36px`).toBeGreaterThanOrEqual(36);

    // Ensure it is approximately square (not a thin 2-5px vertical strip)
    const ratio = box!.width / box!.height;
    expect(ratio, `Swatch ${token.key} aspect ratio should be ~1:1`).toBeGreaterThanOrEqual(0.85);
    expect(ratio, `Swatch ${token.key} aspect ratio should be ~1:1`).toBeLessThanOrEqual(1.15);
  }
});

test('color picker and hex input stay synchronized upon edits', async ({ page }) => {
  const primaryInput = page.getByLabel('Primary Hex Value');
  const primarySwatch = page.getByTestId(`brand-color-swatch-primary`);

  // 1. Valid hex input updates swatch immediately
  await primaryInput.fill('#2563eb');
  await expect(primarySwatch).toHaveCSS('background-color', 'rgb(37, 99, 235)');

  // 2. Color picker change updates hex text input
  const pickerInput = page.locator('#color-picker-primary');
  await pickerInput.fill('#10b981');

  await expect(primaryInput).toHaveValue('#10b981');
  await expect(primarySwatch).toHaveCSS('background-color', 'rgb(16, 185, 129)');
});

test('draft hex validation protects live brand preview from corrupted CSS and restores on blur', async ({ page }) => {
  const primaryInput = page.getByLabel('Primary Hex Value');
  const primarySwatch = page.getByTestId(`brand-color-swatch-primary`);

  // Initial state: #0f172a (rgb(15, 23, 42))
  await expect(primarySwatch).toHaveCSS('background-color', 'rgb(15, 23, 42)');

  // Type an incomplete/invalid hex: #0f
  await primaryInput.fill('#0f');

  // Swatch and live preview remain safe (still using valid fallback/canonical color, not corrupted)
  await expect(primarySwatch).toHaveCSS('background-color', 'rgb(15, 23, 42)');

  // Blur restores the last valid canonical value
  await primaryInput.blur();
  await expect(primaryInput).toHaveValue('#0f172a');
  await expect(primarySwatch).toHaveCSS('background-color', 'rgb(15, 23, 42)');
});

test('responsive layout has no horizontal overflow across 390px, 1440px, and 1920px viewports', async ({ page }) => {
  const viewports = [
    { width: 390, height: 844, name: 'mobile' },
    { width: 1440, height: 900, name: 'desktop-mac' },
    { width: 1920, height: 1080, name: 'desktop-fhd' },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/?demo=1');
    await page.getByRole('button', { name: /Brand Kit/i }).click();
    await expect(page.getByText('Brand Color Palette')).toBeVisible();

    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(metrics.page, `No horizontal overflow on ${vp.name}`).toBeLessThanOrEqual(metrics.viewport + 1);
  }
});

test('brand color palette matches desktop visual baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?demo=1');
  await page.getByRole('button', { name: /Brand Kit/i }).click();
  const palette = page.locator('div:has(> div > h3:has-text("Brand Color Palette"))').first();
  await expect(palette).toBeVisible();
  await expect(palette).toHaveScreenshot('brand-color-palette-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.05,
  });
});

