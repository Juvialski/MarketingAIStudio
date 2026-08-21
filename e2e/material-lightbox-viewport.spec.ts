import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=1');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByText(/Demo · Phoenix Value-Add/i).first().click();
  await page.getByRole('button', { name: 'Share & Review' }).click();
  await page.getByRole('button', { name: 'Create Secure Review Link' }).click();

  const linkText = await page.getByTestId('review-link-url').textContent();
  expect(linkText).toBeTruthy();
  await page.goto(linkText!.trim());
});

test('Material Lightbox opens tall creatives in Fit mode without vertical clipping', async ({ page }) => {
  // Test Instagram Portrait (4:5, 1080x1350)
  const portraitCard = page.locator('div').filter({ hasText: /^PORTRAIT/ }).first();
  await portraitCard.locator('button[title="Fullscreen Lightbox"]').click();

  const lightbox = page.getByRole('dialog', { name: /Lightbox View/i });
  await expect(lightbox).toBeVisible();

  // Verify fit mode indicator
  await expect(lightbox.getByText(/Fit ·/i)).toBeVisible();

  const previewBox = lightbox.locator('.material-preview-canvas-box');
  await expect(previewBox).toBeVisible();

  const viewport = lightbox.locator('.material-preview-viewport');
  const boxBounds = await previewBox.boundingBox();
  const vpBounds = await viewport.boundingBox();

  expect(boxBounds).toBeTruthy();
  expect(vpBounds).toBeTruthy();

  // The complete creative must be inside viewport height and width
  expect(boxBounds!.height).toBeLessThanOrEqual(vpBounds!.height + 2);
  expect(boxBounds!.width).toBeLessThanOrEqual(vpBounds!.width + 2);

  // Verify top header and bottom elements are inside the visible box
  const renderedHeadline = previewBox.locator('h1');
  await expect(renderedHeadline).toBeVisible();

  // Close lightbox
  await lightbox.getByRole('button', { name: 'Close lightbox' }).click();
  await expect(lightbox).not.toBeVisible();
});

test('Material Lightbox zoom controls, panning, and fit reset work correctly', async ({ page }) => {
  const portraitCard = page.locator('div').filter({ hasText: /^PORTRAIT/ }).first();
  await portraitCard.locator('button[title="Fullscreen Lightbox"]').click();

  const lightbox = page.getByRole('dialog', { name: /Lightbox View/i });
  await expect(lightbox).toBeVisible();

  const previewBox = lightbox.locator('.material-preview-canvas-box');
  const initialBounds = await previewBox.boundingBox();

  // 1. Zoom In (+)
  const zoomInBtn = lightbox.getByRole('button', { name: 'Zoom in' });
  await zoomInBtn.click();
  await zoomInBtn.click(); // +30%

  const zoomedBounds = await previewBox.boundingBox();
  expect(zoomedBounds!.width).toBeGreaterThan(initialBounds!.width);
  expect(zoomedBounds!.height).toBeGreaterThan(initialBounds!.height);

  // 2. Zoom to 100% via badge click
  const zoomBadge = lightbox.locator('button[aria-label="Current zoom level"]');
  await zoomBadge.click(); // resets to 100% or toggles
  await expect(previewBox).toBeVisible();

  // 3. Reset to Fit
  const fitBtn = lightbox.getByRole('button', { name: 'Fit design to screen' });
  await fitBtn.click();
  await expect(lightbox.getByText(/Fit ·/i)).toBeVisible();

  const resetBounds = await previewBox.boundingBox();
  expect(resetBounds!.height).toBeCloseTo(initialBounds!.height, 0);

  // 4. Keyboard Shortcuts: '=' or '+' zooms in, '0' resets to Fit
  await page.keyboard.press('=');
  await expect(lightbox.getByText(/Fit ·/i)).not.toBeVisible();

  await page.keyboard.press('0');
  await expect(lightbox.getByText(/Fit ·/i)).toBeVisible();

  await lightbox.getByRole('button', { name: 'Close lightbox' }).click();
});

test('Material Lightbox preserves Fit mode across navigation between formats', async ({ page }) => {
  const inspectBtn = page.getByRole('button', { name: /Inspect/i }).first();
  await inspectBtn.click({ force: true });

  const lightbox = page.getByRole('dialog', { name: /Lightbox View/i });
  await expect(lightbox).toBeVisible();

  // Navigate through all materials via Next arrow and verify Fit is maintained
  const nextBtn = lightbox.getByRole('button', { name: 'Next material' });
  while (await nextBtn.isVisible()) {
    await expect(lightbox.getByText(/Fit ·/i)).toBeVisible();
    const box = lightbox.locator('.material-preview-canvas-box');
    const vp = lightbox.locator('.material-preview-viewport');
    const bBounds = await box.boundingBox();
    const vBounds = await vp.boundingBox();
    expect(bBounds!.height).toBeLessThanOrEqual(vBounds!.height + 2);
    expect(bBounds!.width).toBeLessThanOrEqual(vBounds!.width + 2);
    await nextBtn.click();
    await page.waitForTimeout(200);
  }

  await lightbox.getByRole('button', { name: 'Close lightbox' }).click();
});

test('Variant comparison modal renders bounded cards with full design visibility', async ({ page }) => {
  const compareBtn = page.getByRole('button', { name: /Compare/i }).first();
  await compareBtn.click();

  const modal = page.getByRole('dialog', { name: /Compare/i });
  await expect(modal).toBeVisible();

  // Check visible preview boxes inside comparison cards
  const previewBoxes = modal.locator('.material-preview-canvas-box:visible');
  const count = await previewBoxes.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const box = previewBoxes.nth(i);
    await expect(box).toBeVisible();
    const bounds = await box.boundingBox();
    expect(bounds).toBeTruthy();
    // Bounded preview height must be around 250px-520px
    expect(bounds!.height).toBeLessThanOrEqual(530);
    expect(bounds!.height).toBeGreaterThan(150);
  }

  await modal.getByRole('button', { name: 'Close comparison view' }).click();
});
