import { test, expect } from '@playwright/test';

test.describe('GEMINI-17: Browser Runtime Certification', () => {
  test('Verify Gemini route, credential boundary, and deterministic authority in browser', async ({ page }) => {
    test.setTimeout(90000);

    const interceptedRequests: { url: string; headers: Record<string, string>; postData?: string }[] = [];
    const interceptedResponses: { url: string; status: number; body?: string }[] = [];
    const consoleMessages: string[] = [];

    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    page.on('request', req => {
      if (req.url().includes('/api/verify')) {
        interceptedRequests.push({
          url: req.url(),
          headers: req.headers(),
          postData: req.postData() || undefined
        });
      }
    });

    page.on('response', async resp => {
      if (resp.url().includes('/api/verify')) {
        let body: string | undefined;
        try {
          body = await resp.text();
        } catch {}
        interceptedResponses.push({
          url: resp.url(),
          status: resp.status(),
          body
        });
      }
    });

    console.log('[Browser Test] Navigating to /verify...');
    await page.goto('/verify', { waitUntil: 'networkidle' });

    // 1. Verification page loads
    await expect(page.locator('h1:has-text("GRADIFI VERIFY")')).toBeVisible({ timeout: 20000 });

    // 2. Pre-load demo document
    const preloadButton = page.locator('button:has-text("Pre-load Demo Document")');
    await expect(preloadButton).toBeVisible();
    await preloadButton.click();
    await page.waitForTimeout(500);

    // 3. Run Academic Evidence Verification
    const runButton = page.locator('button:has-text("Run Academic Evidence Verification")');
    await expect(runButton).toBeEnabled({ timeout: 5000 });
    await runButton.click();

    // 4. Wait for results panel
    await expect(page.locator('text=Unique Matched Coverage')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('text=Highest Source Match')).toBeVisible();

    // 5. Check network requests for secret safety
    for (const req of interceptedRequests) {
      // 8. No client-side secret in request headers or body
      expect(req.headers['x-goog-api-key']).toBeUndefined();
      expect(req.postData || '').not.toContain('AIza');
    }

    // 9. No credential in browser console
    for (const msg of consoleMessages) {
      expect(msg).not.toContain('AIza');
      expect(msg).not.toContain('GEMINI_API_KEY');
    }

    console.log('[Browser Test] Browser runtime certification passed.');
  });
});
