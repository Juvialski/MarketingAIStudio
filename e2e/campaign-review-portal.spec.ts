import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=1');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('owner workspace can create review link and view generated public URL', async ({ page }) => {
  // 1. Open sample campaign
  await page.getByText(/Demo · Phoenix Value-Add/i).first().click();

  // 2. Click "Share & Review" tab
  await page.getByRole('button', { name: 'Share & Review' }).click();

  await expect(page.getByText('Shareable Campaign Review Room')).toBeVisible();

  // 3. Create review link
  await page.getByRole('button', { name: 'Create Secure Review Link' }).click();

  // 4. Verify link is active and token URL is displayed
  await expect(page.getByText('Review Link Active')).toBeVisible();
  await expect(page.getByText(/\/review\/demo\/phoenix-value-add/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy Review Link' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish Latest Changes' })).toBeVisible();
});

test('public client review portal loads standalone room with presentation, variants, and approval', async ({ page }) => {
  // 1. Open campaign and create link
  await page.getByText(/Demo · Phoenix Value-Add/i).first().click();
  await page.getByRole('button', { name: 'Share & Review' }).click();
  await page.getByRole('button', { name: 'Create Secure Review Link' }).click();

  // 2. Extract generated URL from text
  const linkText = await page.getByTestId('review-link-url').textContent();
  expect(linkText).toBeTruthy();

  // 3. Navigate directly to the public review URL
  await page.goto(linkText!.trim());

  // 4. Verify client-facing review room header
  await expect(page.getByText('Review Package · Version 1')).toBeVisible();
  await expect(page.getByText('Investment Presentation Deck')).toBeVisible();
  await expect(page.getByText('Marketing Graphics & Flyer Materials')).toBeVisible();

  // 5. Verify presentation deck is present and read-only
  const deck = page.locator('.zaw-deck');
  await expect(deck).toBeVisible();
  // Annotator dock button should NOT be visible in read-only mode
  await expect(page.getByRole('button', { name: 'Canvas drawing tool' })).not.toBeVisible();

  // 6. Test Variant Comparison modal
  const compareBtn = page.getByRole('button', { name: /Compare/i }).first();
  await compareBtn.click();
  const modal = page.getByRole('dialog', { name: /Compare/i });
  await expect(modal).toBeVisible();
  await expect(modal.getByText('Compare Creative Versions')).toBeVisible();

  // Click Mark as Preferred on variant inside modal
  const markPreferredBtn = modal.getByRole('button', { name: /Mark as Preferred|Mark Preferred/i }).first();
  await markPreferredBtn.click();

  // Close comparison modal
  await modal.getByRole('button', { name: 'Close comparison view' }).click();
  await expect(modal).not.toBeVisible();

  // 7. Test Lightbox Modal with Instagram Portrait & Zoom / Fit controls
  const inspectBtns = page.getByRole('button', { name: /Inspect/i });
  if (await inspectBtns.count() > 0) {
    await inspectBtns.first().click({ force: true });
    const lightbox = page.getByRole('dialog', { name: /Lightbox View/i });
    await expect(lightbox).toBeVisible();

    // Verify default state is Fit mode
    await expect(lightbox.getByRole('button', { name: 'Fit design to screen' })).toBeVisible();
    await expect(lightbox.getByText(/Fit ·/i)).toBeVisible();

    // Verify preview canvas box is completely within viewport bounds
    const previewBox = lightbox.locator('.material-preview-canvas-box');
    await expect(previewBox).toBeVisible();

    const boxBounds = await previewBox.boundingBox();
    const viewportBounds = await lightbox.locator('.material-preview-viewport').boundingBox();
    expect(boxBounds).toBeTruthy();
    expect(viewportBounds).toBeTruthy();
    expect(boxBounds!.height).toBeLessThanOrEqual(viewportBounds!.height + 2);

    // Test Zoom In
    const zoomInBtn = lightbox.getByRole('button', { name: 'Zoom in' });
    await zoomInBtn.click();
    await expect(lightbox.getByText(/Fit ·/i)).not.toBeVisible(); // switched to custom zoom

    // Test Fit Reset
    const fitBtn = lightbox.getByRole('button', { name: 'Fit design to screen' });
    await fitBtn.click();
    await expect(lightbox.getByText(/Fit ·/i)).toBeVisible();

    // Test Next Material navigation resets zoom to Fit
    const nextBtn = lightbox.getByRole('button', { name: 'Next material' });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await expect(lightbox.getByText(/Fit ·/i)).toBeVisible();
    }

    // Close lightbox
    await lightbox.getByRole('button', { name: 'Close lightbox' }).click();
    await expect(lightbox).not.toBeVisible();
  }

  // 8. Submit Campaign Package Approval
  const nameInput = page.getByPlaceholder('Your name (e.g. John)');
  await nameInput.fill('Sarah General Partner');

  const approvePkgBtn = page.getByRole('button', { name: 'Approve Selected Materials' }).first();
  await approvePkgBtn.click();

  await expect(page.getByText('Review Successfully Submitted')).toBeVisible();
});

test('anonymous reviewer on completely isolated browser context opens review link without any storage or auth', async ({ browser, page }) => {
  // 1. In creator workspace: open Phoenix demo campaign and navigate to Share & Review
  await page.getByText(/Demo · Phoenix Value-Add/i).first().click();
  await page.getByRole('button', { name: 'Share & Review' }).click();

  // Create or retrieve active review link URL
  const createBtn = page.getByRole('button', { name: 'Create Secure Review Link' });
  if (await createBtn.isVisible()) {
    await createBtn.click();
  }

  const linkText = await page.getByTestId('review-link-url').textContent();
  expect(linkText).toBeTruthy();
  const publicUrl = linkText!.trim();
  expect(publicUrl).toContain('/review/demo/phoenix-value-add');

  // 2. Open completely separate anonymous browser context (emulating a completely separate device/phone/incognito)
  const anonymousContext = await browser.newContext();
  const anonPage = await anonymousContext.newPage();

  // 3. Navigate directly to the copied public URL
  await anonPage.goto(publicUrl);

  // 4. Verify context was not pre-seeded with creator data
  const storageData = await anonPage.evaluate(() => ({
    creatorLinks: window.localStorage.getItem('zaw_review_links_v1'),
    creatorCampaigns: window.localStorage.getItem('zaw_campaigns_v1'),
    sbSession: window.localStorage.getItem('sb-auth-token'),
  }));
  expect(storageData.creatorLinks).toBeNull();
  expect(storageData.creatorCampaigns).toBeNull();
  expect(storageData.sbSession).toBeNull();

  // 5. Verify no database error strings or 'review link invalid' warnings appear
  await expect(anonPage.getByText(/function digest/i)).not.toBeVisible();
  await expect(anonPage.getByText(/relation .* does not exist/i)).not.toBeVisible();
  await expect(anonPage.getByText(/PGRST/i)).not.toBeVisible();
  await expect(anonPage.getByText(/This review link is invalid or no longer active/i)).not.toBeVisible();

  // 6. Verify review portal header & content render cleanly
  await expect(anonPage.getByText('Review Package · Version 1')).toBeVisible();
  await expect(anonPage.getByText('Investment Presentation Deck')).toBeVisible();
  await expect(anonPage.getByText('Marketing Graphics & Flyer Materials')).toBeVisible();

  // 7. Verify presentation deck is visible and rendered
  const deck = anonPage.locator('.zaw-deck');
  await expect(deck).toBeVisible();

  // 8. Verify demo images render correctly
  const heroImages = anonPage.locator('img[src*="fictional-property-exterior"]');
  expect(await heroImages.count()).toBeGreaterThanOrEqual(1);

  // 9. Enter reviewer name and select preferred variant
  const anonNameInput = anonPage.getByPlaceholder('Your name (e.g. John)');
  await anonNameInput.fill('External Client Reviewer');

  const markPreferredBtn = anonPage.getByRole('button', { name: /Mark Preferred|Preferred/i }).first();
  if (await markPreferredBtn.isVisible()) {
    await markPreferredBtn.click();
  }

  // 10. Submit overall package approval in anonymous context
  const approveBtn = anonPage.getByRole('button', { name: 'Approve Selected Materials' }).first();
  await approveBtn.click();

  await expect(anonPage.getByText('Review Successfully Submitted')).toBeVisible();

  // 11. Hard reload on anonymous page and verify it continues to render cleanly
  await anonPage.reload();
  await expect(anonPage.getByText('Review Package · Version 1')).toBeVisible();
  await expect(anonPage.getByText('Investment Presentation Deck')).toBeVisible();

  await anonymousContext.close();
});



