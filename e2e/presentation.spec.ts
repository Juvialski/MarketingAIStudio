import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=1');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('phoenix investment presentation loads and renders 12 deterministic slides with preflight score', async ({ page }) => {
  await page.getByText(/Demo · Phoenix Value-Add/i).first().click();
  await page.getByRole('button', { name: 'Investment Deck' }).click();

  await expect(page.getByText('Investment Presentation & Deck Studio')).toBeVisible();
  await expect(page.getByText('12 Slides')).toBeVisible();
  await expect(page.getByText(/Preflight Quality Check: Passed/i)).toBeVisible();

  // Verify slide stage is present
  const deckStage = page.locator('.zaw-deck');
  await expect(deckStage).toBeVisible();

  // Verify Cover Slide content
  await expect(page.getByRole('heading', { name: /Phoenix Value-Add/i })).toBeVisible();
});

test('keyboard navigation and slide controls navigate across presentation', async ({ page }) => {
  await page.getByText(/Demo · Phoenix Value-Add/i).first().click();
  await page.getByRole('button', { name: 'Investment Deck' }).click();

  const deck = page.locator('.zaw-deck');
  await expect(deck).toBeVisible();

  // Slide 1 -> Slide 2 via keyboard
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/Opportunity & Underwriting Overview/i)).toBeVisible();

  // Slide 2 -> Slide 3
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/4421 E Cambridge Ave/i).first()).toBeVisible();

  // Slide 3 -> Slide 5 (Financial Snapshot)
  await page.keyboard.press('ArrowRight'); // Slide 4 (Thesis)
  await page.keyboard.press('ArrowRight'); // Slide 5 (Financials)
  await expect(page.getByText('$285,000')).toBeVisible();
  await expect(page.getByText('$390,000')).toBeVisible();
  await expect(page.getByText('$70,000')).toBeVisible();
  await expect(page.getByText('21.9%')).toBeVisible();
});

test('standalone presenter mode route loads full-screen without dashboard chrome', async ({ page }) => {
  await page.goto('/?presenter=1&campaign=campaign-phoenix-fix-flip');

  // Presenter mode renders PresentationRenderer directly
  const deck = page.locator('.zaw-deck');
  await expect(deck).toBeVisible();

  // Confirm dashboard/app navigation chrome is not rendered
  await expect(page.getByRole('button', { name: 'Campaign Studio' })).not.toBeVisible();
  await expect(page.getByText('Bolt Slides Presentation Engine')).not.toBeVisible();

  // Verify slide content is interactive
  await expect(page.getByRole('heading', { name: /Phoenix 3-Bed Value-Add Flip/i })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/Opportunity & Underwriting Overview/i)).toBeVisible();
});

test('slides do not scroll and fit responsively across desktop and mobile viewports', async ({ page }) => {
  // 1. Desktop 1440x900
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?presenter=1&campaign=campaign-phoenix-fix-flip');
  await expect(page.locator('.zaw-deck')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Phoenix 3-Bed Value-Add Flip/i })).toBeVisible();
  await page.waitForTimeout(650);

  const desktopSlideOverflow = await page.locator('.zaw-deck .slide-stage .slide').evaluate((el) => ({
    overflowY: window.getComputedStyle(el).overflowY,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  expect(desktopSlideOverflow.overflowY).toBe('hidden');
  expect(desktopSlideOverflow.scrollHeight).toBeLessThanOrEqual(desktopSlideOverflow.clientHeight + 2);

  // 2. Mobile 390x844
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.zaw-deck')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Phoenix 3-Bed Value-Add Flip/i })).toBeVisible();
  await page.waitForTimeout(650);

  const mobileSlideOverflow = await page.locator('.zaw-deck .slide-stage .slide').evaluate((el) => ({
    overflowY: window.getComputedStyle(el).overflowY,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(mobileSlideOverflow.overflowY).toBe('hidden');
  expect(mobileSlideOverflow.scrollWidth).toBeLessThanOrEqual(mobileSlideOverflow.clientWidth + 2);
});

test('key presentation slides match visual baselines', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?presenter=1&campaign=campaign-phoenix-fix-flip');
  const deck = page.locator('.zaw-deck');
  await expect(deck).toBeVisible();

  // Slide 1: Cover
  await expect(deck).toHaveScreenshot('presentation-phoenix-slide-1-cover.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.15,
  });

  // Slide 3: Property Overview
  await page.keyboard.press('ArrowRight'); // Slide 2
  await page.keyboard.press('ArrowRight'); // Slide 3
  await expect(page.getByText(/4421 E Cambridge/i).first()).toBeVisible();
  await expect(deck).toHaveScreenshot('presentation-phoenix-slide-3-property.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.15,
  });

  // Slide 5: Financial Snapshot
  await page.keyboard.press('ArrowRight'); // Slide 4
  await page.keyboard.press('ArrowRight'); // Slide 5
  await expect(page.getByText('$285,000')).toBeVisible();
  await expect(deck).toHaveScreenshot('presentation-phoenix-slide-5-financials.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.15,
  });

  // Slide 9: Creative Showcase
  await page.keyboard.press('ArrowRight'); // Slide 6
  await page.keyboard.press('ArrowRight'); // Slide 7
  await page.keyboard.press('ArrowRight'); // Slide 8
  await page.keyboard.press('ArrowRight'); // Slide 9
  await expect(page.getByText(/One Campaign Brief → Complete Creative Suite/i)).toBeVisible();
  await expect(deck).toHaveScreenshot('presentation-phoenix-slide-9-creatives.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.15,
  });

  // Slide 11: Risk & Disclosures
  await page.keyboard.press('ArrowRight'); // Slide 10
  await page.keyboard.press('ArrowRight'); // Slide 11
  await expect(page.getByText(/Legal & Underwriting Disclosures/i)).toBeVisible();
  await expect(page.getByText(/Underwriting Assumptions & Risk Notice/i)).toBeVisible();
  const disclosureCard = page.locator('.zaw-deck .slide-stage .mat');
  await expect(disclosureCard).toBeVisible();
  const cardBounds = await disclosureCard.boundingBox();
  expect(cardBounds).toBeTruthy();
  // Card should span widely on the 1600x900 canvas (scaled down to 1280x720)
  expect(cardBounds!.width).toBeGreaterThan(900);

  // Slide 12: Next Steps
  await page.keyboard.press('ArrowRight'); // Slide 12
  await expect(page.getByText(/Request Detailed Due Diligence Package/i)).toBeVisible();
  await expect(deck).toHaveScreenshot('presentation-phoenix-slide-12-next-steps.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.15,
  });
});

test('workspace button and keyboard F use the exact same presentation host for fullscreen', async ({ page }) => {
  await page.getByText(/Demo · Phoenix Value-Add/i).first().click();
  await page.getByRole('button', { name: 'Investment Deck' }).click();

  const deck = page.locator('.zaw-deck');
  await expect(deck).toBeVisible();

  // Track fullscreen requests
  await page.evaluate(() => {
    (window as any).__fsTargets = [];
    Element.prototype.requestFullscreen = async function () {
      (window as any).__fsTargets.push({
        tagName: this.tagName,
        className: this.className,
        isZawDeck: this.classList.contains('zaw-deck'),
      });
    };
  });

  // 1. Trigger fullscreen via workspace button
  await page.getByRole('button', { name: 'Present Fullscreen' }).click();

  const targetFromButton = await page.evaluate(() => {
    const targets = (window as any).__fsTargets;
    return targets[targets.length - 1];
  });

  expect(targetFromButton).toBeDefined();
  expect(targetFromButton.isZawDeck).toBe(true);

  // 2. Trigger fullscreen via keyboard 'F'
  await page.keyboard.press('f');

  const targetFromKeyboard = await page.evaluate(() => {
    const targets = (window as any).__fsTargets;
    return targets[targets.length - 1];
  });

  expect(targetFromKeyboard).toBeDefined();
  expect(targetFromKeyboard.isZawDeck).toBe(true);

  // 3. Confirm both methods targeted the exact same host element class (.zaw-deck)
  expect(targetFromButton.className).toBe(targetFromKeyboard.className);
});
