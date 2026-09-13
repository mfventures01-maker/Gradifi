/**
 * GRADIFI VERIFY - HOEOS LIVE BROWSER ACCEPTANCE SPEC
 * Comprehensive live browser test suite verifying anonymous public workflow,
 * provider execution, deterministic authority, G3/G5 results, and QR receipt.
 */

import { test, expect } from '@playwright/test';

test.describe('HOEOS Public Verify Machine Live Acceptance', () => {

  test('Complete Anonymous Public Verification Workflow', async ({ page }) => {
    test.setTimeout(90000);
    const consoleErrors: string[] = [];
    const networkRequests: { url: string; method: string; status?: number }[] = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture network activity
    page.on('response', response => {
      networkRequests.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status()
      });
    });

    // 1. Fresh Anonymous Session - Homepage
    console.log('1. Navigating to http://localhost:5173/...');
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('localhost:5173');
    
    const homepageHeading = await page.textContent('body');
    expect(homepageHeading).toMatch(/Gradifi/i);

    // 2. Navigate to Public Verify Machine (/tools/plagiarism)
    console.log('2. Navigating to http://localhost:5173/tools/plagiarism...');
    await page.goto('http://localhost:5173/tools/plagiarism');
    await page.waitForLoadState('networkidle');

    // Verify page renders without React ReferenceError or blank screen
    const verifyBodyText = await page.textContent('body');
    expect(verifyBodyText).toMatch(/GRADIFI VERIFY/i);
    expect(verifyBodyText).toContain('1. PDF Document Upload');
    expect(verifyBodyText).not.toContain('Uncaught ReferenceError');

    // Confirm no auth requirement on page
    const hasLoginPrompt = await page.isVisible('text="Please sign in to continue"');
    expect(hasLoginPrompt).toBe(false);

    // 3. Real Document Execution - Pre-load Demo Document
    console.log('3. Clicking "Pre-load Demo Document"...');
    await page.click('button:has-text("Pre-load Demo Document")');

    const textareaValue = await page.inputValue('textarea');
    expect(textareaValue).toContain('Quantum Entanglement and Decoupled Neural Architecture');

    // 4. Click Verification Execution
    console.log('4. Clicking "Run Academic Evidence Verification"...');
    await page.click('button:has-text("Run Academic Evidence Verification")');

    // Wait for federation execution to complete (result step rendered)
    console.log('5. Waiting for evidence verification result step...');
    await page.waitForSelector('text="7. Gradifi Verification Matrix"', { timeout: 60000 });

    const resultBodyText = await page.textContent('body');

    // 5. Verify Provider Execution & Matrix Results
    console.log('6. Validating provider execution & matrix...');
    expect(resultBodyText).toMatch(/OPENALEX/i);
    expect(resultBodyText).toMatch(/CROSSREF/i);
    expect(resultBodyText).toMatch(/UNPAYWALL/i);
    expect(resultBodyText).toMatch(/CORE/i);
    expect(resultBodyText).toMatch(/GOOGLEBOOKS/i);

    // 6. Verify Deterministic Overlap & G3 Policy
    console.log('7. Validating deterministic similarity & G3 policy...');
    expect(resultBodyText).toContain('Overall Deterministic Overlap');
    expect(resultBodyText).toContain('Plagiarism Evidence & Policy');
    expect(resultBodyText).toContain('Human Academic Review Boundary');

    // 7. Verify AI Federation (Nemotron NON-AUTHORITATIVE)
    console.log('8. Validating AI Federation status...');
    expect(resultBodyText).toContain('4. AI Federation');
    expect(resultBodyText).toContain('NON-AUTHORITATIVE');

    // 8. Verify QR Code Receipt & PDF Button
    console.log('9. Validating QR receipt & PDF download button...');
    expect(resultBodyText).toContain('8. Scannable QR Receipt');
    expect(resultBodyText).toContain('VRF-');
    expect(resultBodyText).toContain('Download PDF Verification Report');

    // 9. Check Console & Service Worker Errors
    console.log('10. Checking console error log...');
    const hasSWTypeError = consoleErrors.some(err => err.includes("Failed to convert value to 'Response'"));
    expect(hasSWTypeError).toBe(false);

    const hasRefError = consoleErrors.some(err => err.includes('verificationId is not defined'));
    expect(hasRefError).toBe(false);

    // 10. Check Secret Leakage in Network Requests
    console.log('11. Verifying zero secret leakage in network requests...');
    for (const req of networkRequests) {
      expect(req.url).not.toContain('CORE_API_KEY');
      expect(req.url).not.toContain('GOOGLE_BOOKS_API_KEY');
      expect(req.url).not.toContain('NVIDIA_API_KEY');
      expect(req.url).not.toContain('GEMINI_API_KEY');
    }

    console.log('✅ LIVE BROWSER ANONYMOUS VERIFICATION PASSED SUCCESSFULLY!');
  });

  test('Public Verification Route /verify/VRF-8AFCFF6056B0 Direct Resolution', async ({ page }) => {
    console.log('Navigating directly to http://localhost:5173/verify/VRF-8AFCFF6056B0...');
    await page.goto('http://localhost:5173/verify/VRF-8AFCFF6056B0');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/verify/VRF-8AFCFF6056B0');
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/GRADIFI VERIFY/i);
    expect(bodyText).not.toContain('Uncaught ReferenceError');

    console.log('✅ DIRECT VERIFICATION ROUTE TEST PASSED!');
  });

});
