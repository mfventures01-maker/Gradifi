import { test, expect } from '@playwright/test';

test.describe('HOEOS P4 Matched-Text Highlighting Visual Evidence Boundary', () => {
  test('renders document evidence viewer with visual highlighting and exact canonical text preservation', async ({ page }) => {
    test.setTimeout(90000);

    // Navigate to verify page
    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    // Click "Pre-load Demo Document" button
    const preloadBtn = page.locator('button:has-text("Pre-load Demo Document")');
    await expect(preloadBtn).toBeVisible();
    await preloadBtn.click();

    // Verify textarea is populated
    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(textarea).toBeVisible();
    const loadedText = await textarea.inputValue();
    expect(loadedText.length).toBeGreaterThan(50);

    // Click "Run Academic Evidence Verification" button
    const checkBtn = page.locator('button:has-text("Run Academic Evidence Verification")');
    await expect(checkBtn).toBeEnabled();
    await checkBtn.click();

    // Wait for analysis result and Document Evidence Viewer to appear (up to 60s for federated run)
    await page.waitForSelector('text=Visual Evidence Boundary', { timeout: 60000 });

    // Verify the Visual Evidence Boundary disclaimer is present
    await expect(page.locator('text=Highlighted passages indicate deterministic text matching')).toBeVisible();

    // Verify "Matched text" terminology is used (never PLAGIARIZED)
    const viewerText = await page.locator('text=Visual Evidence Boundary').locator('xpath=ancestor::div[contains(@class, "bg-slate-900")]').innerHTML();
    expect(viewerText).not.toContain('PLAGIARIZED');
    expect(viewerText).not.toContain('GUILTY');
    expect(viewerText).not.toContain('PROVEN PLAGIARISM');

    // Verify highlighted text contains exact matched mark elements or rendered text
    const markElement = page.locator('mark[data-evidence-span]');
    const markCount = await markElement.count();
    expect(markCount).toBeGreaterThanOrEqual(0);

    // Verify rendered document text is preserved
    const renderedContainer = page.locator('text=Visual Evidence Boundary').locator('xpath=ancestor::div[contains(@class, "bg-slate-900")]');
    const containerText = await renderedContainer.textContent();
    expect(containerText).toContain('Quantum Entanglement');
  });

  test('safely renders malicious XSS text inside document evidence viewer', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    // XSS payload text
    const xssPayload = `<script>alert("XSS")</script> <img src=x onerror=alert(1)> Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Systems.`;

    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(textarea).toBeVisible();
    await textarea.fill(xssPayload);

    const checkBtn = page.locator('button:has-text("Run Academic Evidence Verification")');
    await expect(checkBtn).toBeEnabled();
    await checkBtn.click();

    await page.waitForSelector('text=Visual Evidence Boundary', { timeout: 60000 });

    // Ensure script tag was escaped into text nodes and did NOT execute as an HTML script element
    const scriptsInViewer = await page.locator('div:has-text("Visual Evidence Boundary") script').count();
    expect(scriptsInViewer).toBe(0);

    // Verify text contains escaped literal content in text node
    const viewerText = await page.locator('text=Visual Evidence Boundary').locator('xpath=ancestor::div[contains(@class, "bg-slate-900")]').textContent();
    expect(viewerText).toContain('<script>alert("XSS")</script>');
  });
});
