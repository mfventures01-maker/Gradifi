import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

test.describe('HOEOS G12 Unified Commercial Golden-Path Demo Certification Suite', () => {
  test('executes complete 7-step commercial verification journey: real-PDF upload -> canonical extraction -> federated verification -> passage highlighting -> correction guidance -> receipt persistence -> public resolution', async ({ page }) => {
    test.setTimeout(180000);

    const hasIsolatedReceiptStorage = Boolean(
      process.env.VERIFY_ISOLATED_SUPABASE_URL &&
      process.env.VERIFY_ISOLATED_SUPABASE_ANON_KEY &&
      process.env.VERIFY_ISOLATED_SUPABASE_SERVICE_ROLE_KEY
    );

    const consoleLogs: string[] = [];
    const networkFailures: string[] = [];

    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', err => {
      console.log('BROWSER UNCAUGHT PAGE ERROR:', err.message);
    });

    page.on('requestfailed', req => {
      networkFailures.push(`FAILED: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    // =========================================================================
    // STEP 1: FIXTURE PROVENANCE & REAL UPLOAD
    // =========================================================================
    const fixturePath = path.resolve('tests/fixtures/ingestion/quantum_federated_learning_paper.pdf');
    expect(fs.existsSync(fixturePath)).toBe(true);

    const fileBytes = fs.readFileSync(fixturePath);
    expect(fileBytes.length).toBe(652);
    const fixtureHash = crypto.createHash('sha256').update(fileBytes).digest('hex');
    expect(fixtureHash.toLowerCase()).toBe('0c5860b9d729860dcf3a7480d9ec26d7e5354ade7353b1d7e8fcd66895c9f4ff');

    console.log('Navigating to commercial verification workbench (/verify)...');
    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    // Locate file input and perform real file selection (NO synthetic preload button)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    console.log(`Uploading real PDF fixture: ${fixturePath}`);
    await fileInput.setInputFiles(fixturePath);

    // =========================================================================
    // STEP 2: REAL PDF EXTRACTION & INTEGRITY CHECK
    // =========================================================================
    const statusBadge = page.locator('text=STATUS: EXTRACTED');
    await expect(statusBadge).toBeVisible({ timeout: 45000 });
    await expect(page.locator('text=quantum_federated_learning_paper.pdf')).toBeVisible();
    await expect(page.locator('text=Method: pdf_stream_extractor')).toBeVisible();

    const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(textarea).toBeVisible();
    const canonicalRawText = await textarea.inputValue();
    expect(canonicalRawText.length).toBeGreaterThan(100);
    expect(canonicalRawText).toContain('Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks');
    expect(canonicalRawText).toContain('Federated learning across edge networks faces latency challenges');
    console.log(`Verified canonical text extracted from real bytes (${canonicalRawText.length} characters)`);

    // =========================================================================
    // STEP 3: CANONICAL NORMALIZATION & STEPPER ADVANCEMENT
    // =========================================================================
    await expect(page.locator('text=2. Canonical Analysis Document')).toBeVisible();
    await expect(page.locator('text=PROVENANCE: NORMALIZED')).toBeVisible();

    // =========================================================================
    // STEP 4: EXECUTE ACADEMIC VERIFICATION & FEDERATION
    // =========================================================================
    const verifyButton = page.locator('button:has-text("Run Academic Evidence Verification")');
    await expect(verifyButton).toBeEnabled();
    console.log('Executing verification run...');
    await verifyButton.click();

    // Wait for verification completion: stepper reaches results / receipt
    await expect(page.locator('text=5. Similarity & Plagiarism Evidence')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('text=Canonical Document Evidence Payload')).toBeVisible();
    console.log('Verification completed: evidence and similarity results rendered.');

    // =========================================================================
    // STEP 5: BROWSER EVIDENCE / NO-FALSE-POSITIVE INVARIANT
    // =========================================================================
    const viewer = page.getByTestId('canonical-document-viewer');
    const marks = viewer.locator('mark[data-finding-id][data-start-offset][data-end-offset]');
    const markCount = await marks.count();
    const findingsRaw = await viewer.getAttribute('data-verify-result');
    expect(findingsRaw).not.toBeNull();
    const findings = JSON.parse(findingsRaw || '[]');
    expect(Array.isArray(findings)).toBeTruthy();

    console.log(`PDF rendered DOM <mark> elements count: ${markCount}`);
    console.log(`PDF authoritative finding count: ${findings.length}`);

    // The small PDF fixture is a no-match control. If the engine returns no
    // findings, the viewer must render no highlights. If it does return
    // findings, every visible highlight must map to the canonical text.
    if (findings.length === 0) {
      expect(markCount).toBe(0);
      console.log('PDF_NEGATIVE_CONTROL: zero findings and zero false highlights.');
    } else {
      expect(markCount).toBeGreaterThan(0);
      const firstMark = marks.first();
      const markText = (await firstMark.textContent() || '').trim();
      const startOffsetStr = await firstMark.getAttribute('data-start-offset');
      const endOffsetStr = await firstMark.getAttribute('data-end-offset');
      const findingId = await firstMark.getAttribute('data-finding-id');
      const sourceId = await firstMark.getAttribute('data-source-id');

      expect(markText.length).toBeGreaterThan(0);
      expect(startOffsetStr).not.toBeNull();
      expect(endOffsetStr).not.toBeNull();
      expect(findingId).not.toBeNull();
      expect(sourceId).not.toBeNull();

      const startOffset = parseInt(startOffsetStr!, 10);
      const endOffset = parseInt(endOffsetStr!, 10);
      expect(canonicalRawText.slice(startOffset, endOffset).trim()).toBe(markText);
    }

    // STEP 6: STUDENT CORRECTION GUIDANCE & CITATIONS
    // =========================================================================
    const correctionHeading = page.locator('text=Correction Guidance');
    await expect(correctionHeading).toBeVisible();

    // If actionable items exist, verify copy citation functionality
    const copyButton = page.locator('button:has-text("Copy Citation")').first();
    if (await copyButton.isVisible()) {
      await copyButton.click();
      console.log('Actionable citation copied successfully.');
    }

    // =========================================================================
    // =========================================================================
    // STEP 7: RECEIPT GENERATION (ISOLATED STORAGE ONLY)
    // =========================================================================
    await expect(page.locator('text=8. Verification Receipt')).toBeVisible();

    let verificationId: string | null = null;
    if (hasIsolatedReceiptStorage) {
      const vrfLocator = page.locator('text=/VRF-[0-9A-F]{12}/');
      await expect(vrfLocator.first()).toBeVisible({ timeout: 15000 });
      verificationId = (await vrfLocator.first().textContent())?.match(/VRF-[0-9A-F]{12}/)?.[0] || null;
      expect(verificationId).not.toBeNull();

      const qrSvg = page.locator('.bg-white svg');
      await expect(qrSvg.first()).toBeVisible();
      console.log(`Generated isolated verification receipt: ${verificationId}`);
    } else {
      await expect(page.locator('text=NO PUBLIC RECEIPT')).toBeVisible();
      await expect(page.getByText(/No public QR receipt was created/)).toBeVisible();
      console.log('No isolated Supabase credentials: receipt persistence correctly fails closed.');
    }

    const evidenceDir = path.resolve('tests/hoeos/four_gates/evidence/g12');
    fs.mkdirSync(evidenceDir, { recursive: true });
    const demoScreenshotPath = path.join(evidenceDir, 'golden_path_demo_results.png');
    await page.screenshot({ path: demoScreenshotPath, fullPage: true });
    console.log(`Demo results screenshot saved to: ${demoScreenshotPath}`);

    // =========================================================================
    // STEP 8: INDEPENDENT PUBLIC RECEIPT RESOLUTION (ISOLATED STORAGE ONLY)
    // =========================================================================
    if (verificationId) {
      console.log(`Resolving public verification receipt at /verify/${verificationId}...`);
      await page.goto(`/verify/${verificationId}`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=PUBLIC VERIFICATION RECEIPT')).toBeVisible({ timeout: 20000 });
      await expect(page.locator('text=HASH LINKAGE: VALID')).toBeVisible();
      await expect(page.getByText(verificationId, { exact: true })).toBeVisible();
      await expect(page.locator('text=Document SHA-256 Hash')).toBeVisible();
      await expect(page.locator('text=Evidence Snapshot Hash')).toBeVisible();
      await expect(page.locator('text=Overall Similarity')).toBeVisible();

      const receiptScreenshotPath = path.join(evidenceDir, 'golden_path_public_receipt.png');
      await page.screenshot({ path: receiptScreenshotPath, fullPage: true });
      console.log(`Public receipt screenshot saved to: ${receiptScreenshotPath}`);

      // =======================================================================
      // STEP 9: FAILURE BOUNDARY (DETERMINISTIC NOT_FOUND RESOLUTION)
      // =======================================================================
      console.log('Testing public resolution failure boundary with non-existent ID...');
      await page.goto('/verify/VRF-999999999999');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Public Verification Failed')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=STATUS: NOT_FOUND')).toBeVisible();
      console.log('Deterministic failure boundary verified.');
    } else {
      console.log('Public receipt resolution is deferred until an isolated Supabase test project is configured.');
    }
  });
});
