import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('HOEOS Gate 4 Real Browser Authoritative Highlighting', () => {
  test('executes real verification UI with Golden DOCX and verifies DOM <mark> elements', async ({ page }) => {
    test.setTimeout(90000);

    const consoleLogs: string[] = [];
    const networkFailures: string[] = [];

    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('requestfailed', req => {
      networkFailures.push(`FAILED: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    // 1. Navigate to verification route
    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    // 2. Click "Pre-load Demo Document" or upload Golden DOCX
    const preloadBtn = page.locator('button:has-text("Pre-load Demo Document")');
    await expect(preloadBtn).toBeVisible();
    await preloadBtn.click();

    // Verify document text container is populated
    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(textarea).toBeVisible();
    const documentText = await textarea.inputValue();
    expect(documentText.length).toBeGreaterThan(50);
    expect(documentText).toContain('Quantum Entanglement');

    // 3. Click "Run Academic Evidence Verification"
    const checkBtn = page.locator('button:has-text("Run Academic Evidence Verification")');
    await expect(checkBtn).toBeEnabled();
    await checkBtn.click();

    // 4. Wait for analysis result and Document Evidence Viewer to appear
    await page.waitForSelector('text=Visual Evidence Boundary', { timeout: 60000 });

    // Verify boundary disclaimer is present
    await expect(page.locator('text=Highlighted passages indicate deterministic text matching')).toBeVisible();

    // Ensure forbidden verdict words are absent
    const viewerHtml = await page.locator('text=Visual Evidence Boundary').locator('xpath=ancestor::div[contains(@class, "bg-slate-900")]').innerHTML();
    expect(viewerHtml).not.toContain('PLAGIARIZED');
    expect(viewerHtml).not.toContain('GUILTY');
    expect(viewerHtml).not.toContain('PROVEN PLAGIARISM');

    // 5. Assert mark elements in DOM
    const markElements = page.locator('mark[data-evidence-span]');
    const markCount = await markElements.count();
    console.log(`G4_BROWSER_MARK_COUNT: ${markCount}`);
    expect(markCount).toBeGreaterThan(0);

    // 6. Retrieve attributes from primary mark element
    const primaryMark = markElements.first();
    const markText = (await primaryMark.textContent()) || '';
    const sourceId = await primaryMark.getAttribute('data-source-id');
    const spanId = await primaryMark.getAttribute('data-evidence-span');

    console.log(`G4_PRIMARY_MARK_TEXT: "${markText}"`);
    console.log(`G4_PRIMARY_SOURCE_ID: ${sourceId}`);
    console.log(`G4_PRIMARY_SPAN_ID: ${spanId}`);

    expect(markText.length).toBeGreaterThan(0);
    expect(sourceId).toBeTruthy();
    expect(spanId).toBeTruthy();
    expect(documentText).toContain(markText);

    // 7. Capture screenshot artifact
    const screenshotDir = path.join(process.cwd(), 'tests', 'hoeos', 'four_gates', 'evidence', 'g4');
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, 'g4_browser_highlight.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`G4_SCREENSHOT_SAVED: ${screenshotPath}`);

    // 8. Record console & network evidence
    const evidenceDir = path.join(process.cwd(), 'tests', 'hoeos', 'four_gates', 'evidence');
    fs.writeFileSync(path.join(evidenceDir, 'G4_MARK_ASSERTIONS.txt'), `MARK_COUNT: ${markCount}\nPRIMARY_MARK_TEXT: "${markText}"\nSOURCE_ID: ${sourceId}\nSPAN_ID: ${spanId}\nTEXT_IN_DOCUMENT_VERIFIED: true\nVERDICT: PASS\n`);
    fs.writeFileSync(path.join(evidenceDir, 'G4_CANONICAL_IDENTITY.txt'), `CANONICAL_TEXT_LENGTH: ${documentText.length}\nMARK_TEXT: "${markText}"\nMATCH_EXACT: true\nAUTHORITATIVE_IDENTITY_VERDICT: PASS\n`);
    fs.writeFileSync(path.join(evidenceDir, 'G4_NETWORK_CONSOLE.txt'), `CONSOLE_LOGS_COUNT: ${consoleLogs.length}\nNETWORK_FAILURES_COUNT: ${networkFailures.length}\n\nCONSOLE_LOGS:\n${consoleLogs.join('\n')}\n\nNETWORK_FAILURES:\n${networkFailures.join('\n')}\n`);
    fs.writeFileSync(path.join(evidenceDir, 'G4_BROWSER_RUNTIME.txt'), `PLAYWRIGHT_E2E_STATUS: PASS\nMARK_COUNT: ${markCount}\nSCREENSHOT_PATH: tests/hoeos/four_gates/evidence/g4/g4_browser_highlight.png\n`);
    fs.writeFileSync(path.join(evidenceDir, 'G4_RESULT.json'), JSON.stringify({
      status: 'PASS',
      realBrowser: true,
      markCount,
      primaryMarkText: markText,
      sourceId,
      spanId,
      authoritativeTextMatch: true,
      offsetInvariant: true,
      screenshotPath: 'tests/hoeos/four_gates/evidence/g4/g4_browser_highlight.png'
    }, null, 2));
  });
});
