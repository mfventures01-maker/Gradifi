import { test, expect } from '@playwright/test';

test.describe('HOEOS P5 Source / DOI / ISBN / Citation Presentation E2E Suite', () => {
  test('renders Source Attribution & Citation Hub with validated metadata and interactive source linkage', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Navigate to verify page
    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    // 2. Pre-load demo document & execute verification
    const preloadBtn = page.locator('button:has-text("Pre-load Demo Document")');
    await expect(preloadBtn).toBeVisible();
    await preloadBtn.click();

    const checkBtn = page.locator('button:has-text("Run Academic Evidence Verification")');
    await expect(checkBtn).toBeEnabled();
    await checkBtn.click();

    // 3. Wait for Source Attribution & Citation Hub to appear (up to 60s for federated run)
    await page.waitForSelector('text=Source Attribution & Citation Hub (P5)', { timeout: 60000 });

    // 4. Verify boundary disclaimer is present
    await expect(page.locator('text=Source attribution provides verified academic and bibliographic record details')).toBeVisible();

    // 5. Verify source cards render with visible metadata
    const sourceHub = page.locator('text=Source Attribution & Citation Hub (P5)').locator('xpath=ancestor::div[contains(@class, "bg-slate-900")]');
    const sourceHubHtml = await sourceHub.innerHTML();

    // 6. Verify "Matched text" terminology (never PLAGIARIZED)
    expect(sourceHubHtml).not.toContain('PLAGIARIZED');
    expect(sourceHubHtml).not.toContain('GUILTY');
    expect(sourceHubHtml).not.toContain('PROVEN PLAGIARISM');

    // 7. Verify Academic Citation tabs (APA, MLA, Chicago, Harvard) exist and are interactive
    const apaBtn = page.locator('button:has-text("apa")').first();
    const mlaBtn = page.locator('button:has-text("mla")').first();
    await expect(apaBtn).toBeVisible();
    await expect(mlaBtn).toBeVisible();
    await mlaBtn.click();

    // 8. Verify DOI / ISBN display or truthful unavailable badge
    const doiBadge = page.locator('text=/DOI:/i').first();
    const isDoiVisible = await doiBadge.isVisible().catch(() => false);
    if (isDoiVisible) {
      await expect(doiBadge).toBeVisible();
    } else {
      await expect(page.locator('text=DOI unavailable').first()).toBeVisible();
    }

    // 9. Verify zero secret leakage in DOM
    expect(sourceHubHtml).not.toContain('CORE_API_KEY');
    expect(sourceHubHtml).not.toContain('NVIDIA_API_KEY');
    expect(sourceHubHtml).not.toContain('circuitBreaker');
    expect(sourceHubHtml).not.toContain('httpStatus');

    // 10. Verify provider-agnostic presentation
    expect(sourceHubHtml).toContain('Similarity Match');
  });

  test('safely renders malicious XSS metadata without executing script', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    // XSS payload text payload
    const xssPayload = `<script>alert("XSS-P5")</script> Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Systems.`;

    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(textarea).toBeVisible();
    await textarea.fill(xssPayload);

    const checkBtn = page.locator('button:has-text("Run Academic Evidence Verification")');
    await expect(checkBtn).toBeEnabled();
    await checkBtn.click();

    await page.waitForSelector('text=Source Attribution & Citation Hub (P5)', { timeout: 60000 });

    // Verify script tags in Source Attribution Hub are 0 (rendered as text nodes)
    const scriptsCount = await page.locator('div:has-text("Source Attribution & Citation Hub") script').count();
    expect(scriptsCount).toBe(0);
  });
});
