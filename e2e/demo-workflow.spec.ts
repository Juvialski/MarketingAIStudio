import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('deployed demo access bug fix: AuthModal demo button is enabled with Supabase configured and launches demo mode', async ({ page }) => {
  // 1. Load normal deployed-like application (Supabase configured, unauthenticated live mode)
  await expect(page.getByText(/Live workspace/i)).toBeVisible();

  // 2. Open Sign In modal
  const signInButton = page.getByRole('button', { name: /Sign In/i }).first();
  await expect(signInButton).toBeVisible();
  await signInButton.click();

  // 3. Verify: "Launch Fictional Demo Workspace" is ENABLED
  const demoButton = page.getByRole('button', { name: /Launch Fictional Demo Workspace/i });
  await expect(demoButton).toBeVisible();
  await expect(demoButton).toBeEnabled();

  // 4. Click it
  await demoButton.click();

  // 5. Verify URL contains: ?demo=1
  await expect(page).toHaveURL(/\?demo=1/);

  // 6. Verify authentication modal closes/disappears
  await expect(page.getByRole('dialog')).not.toBeVisible();

  // 7. Verify Demo Fixture Workspace is visible
  await expect(page.getByText(/DEMO WORKSPACE · FICTIONAL DATA/i).first()).toBeVisible();

  // 8. Verify Phoenix demo campaign exists
  await expect(page.getByText(/Demo · Phoenix Value-Add/i).first()).toBeVisible();

  // 9. Open Phoenix campaign
  await page.getByRole('button', { name: /OPEN FLAGSHIP DEMO/i }).first().click();

  // 10. Open Investment Deck
  await page.getByRole('button', { name: 'Investment Deck' }).click();

  // 11. Verify deterministic 12-slide deck
  await expect(page.getByText('12 Slides')).toBeVisible();
  await expect(page.getByText(/Preflight Quality Check: Passed/i)).toBeVisible();
  const deckStage = page.locator('.zaw-deck');
  await expect(deckStage).toBeVisible();

  // 12. Verify FICTIONAL DEMO marking
  await expect(page.getByText(/FICTIONAL DEMO/i).first()).toBeVisible();
});

test('direct ?demo=1 navigation loads fictional demo workspace without opening AuthModal', async ({ page }) => {
  await page.goto('/?demo=1');

  // Verify demo workspace loads directly
  await expect(page.getByText(/DEMO WORKSPACE · FICTIONAL DATA/i).first()).toBeVisible();
  await expect(page.getByText(/Demo · Phoenix Value-Add/i).first()).toBeVisible();
  await expect(page.getByText(/Demo · Dallas 8-Unit/i).first()).toBeVisible();

  // Confirm live badge is not active
  await expect(page.getByText('Supabase: Live (ZawMarketing)')).not.toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('demo exit test: ?demo=1 -> Exit Demo -> / restores live workspace', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.getByText(/DEMO WORKSPACE · FICTIONAL DATA/i).first()).toBeVisible();
  await expect(page.getByText(/Demo · Phoenix Value-Add/i).first()).toBeVisible();

  // Click Exit Demo
  const exitDemoButton = page.getByRole('button', { name: /Exit Demo/i }).first();
  await expect(exitDemoButton).toBeVisible();
  await exitDemoButton.click();

  // Verify URL is / (does not contain demo=1)
  await expect(page).toHaveURL(/^(?!.*\?demo=1).*$/);

  // Verify runtime returns to live mode
  await expect(page.getByText(/Live workspace/i)).toBeVisible();
  // Fictional campaigns should not be displayed in unauthenticated live workspace
  await expect(page.getByText(/Demo · Phoenix Value-Add/i)).not.toBeVisible();
});

test('prominent OPEN FLAGSHIP DEMO button opens Phoenix campaign in demo mode', async ({ page }) => {
  await page.goto('/?demo=1');

  const openFlagshipBtn = page.getByRole('button', { name: /OPEN FLAGSHIP DEMO/i }).first();
  await expect(openFlagshipBtn).toBeVisible();
  await openFlagshipBtn.click();

  // Verify Phoenix campaign workspace is opened
  await expect(page.getByText('Phoenix 3-Bed Value-Add Flip Opportunity').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Investment Deck' })).toBeVisible();
});

test('demo campaign opens, edits locally, and survives reload', async ({ page }) => {
  await page.goto('/?demo=1');
  await page.getByRole('button', { name: /OPEN FLAGSHIP DEMO/i }).first().click();
  await expect(page.getByRole('button', { name: 'Full Marketing Kit', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Property Data', exact: true }).click();
  const title = page.getByLabel('Campaign Working Title');
  await title.fill('Demo · Revised Fictional Campaign');
  await page.getByRole('button', { name: /Save & Proceed to Campaign Studio/i }).click();
  await expect(page.getByText('Demo · Revised Fictional Campaign').first()).toBeVisible();

  await page.reload();
  await expect(page.getByText('Demo · Revised Fictional Campaign').first()).toBeVisible();
});

test('responsive intake form expands properly at 1920x1080 and has no horizontal overflow across viewports', async ({ page }) => {
  const viewports = [
    { width: 390, height: 844, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1366, height: 768, name: 'laptop' },
    { width: 1440, height: 900, name: 'desktop-mac' },
    { width: 1920, height: 1080, name: 'desktop-fhd' },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/?demo=1');

    // Check overview page overflow
    const overviewMetrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(overviewMetrics.page, `Overview overflow on ${vp.name}`).toBeLessThanOrEqual(overviewMetrics.viewport + 1);

    // Open New Campaign intake form
    await page.getByRole('button', { name: /New Property Campaign/i }).click();
    await expect(page.getByLabel('Campaign Working Title')).toBeVisible();

    // Check intake form overflow
    const formMetrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(formMetrics.page, `Form overflow on ${vp.name}`).toBeLessThanOrEqual(formMetrics.viewport + 1);

    // At 1920x1080, verify intake form uses expanded workspace (significantly wider than old 896px max-w-4xl)
    if (vp.width === 1920) {
      const formWidth = await page.locator('form').evaluate((el) => el.getBoundingClientRect().width);
      expect(formWidth, 'Form width at 1920x1080 should exceed 1200px').toBeGreaterThan(1200);
    }
  }
});
