import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Plagiarism Checker UI Verification', () => {
  test('should execute plagiarism check and display results with similarity scores and sources', async ({ page }) => {
    await page.goto('/tools/plagiarism');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify UI components present
    await expect(page.locator('text=Plagiarism Checker')).toBeVisible();

    const sampleText = `Artificial intelligence has transformed modern education by providing personalized learning experiences and automated grading systems. AI-powered tools can analyze student performance and adapt to individual learning styles.`;

    // Fill textarea
    await page.fill('textarea[placeholder*="Paste your text"]', sampleText);

    // Click Check Plagiarism button
    const checkBtn = page.locator('button:has-text("Check Plagiarism")');
    await expect(checkBtn).toBeEnabled();
    await checkBtn.click();

    // Wait for results section to appear
    await page.waitForSelector('text=Plagiarism & Similarity Report', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Verify similarity score element
    await expect(page.locator('text=Overall Similarity')).toBeVisible();
    await expect(page.locator('text=Matching Academic Sources')).toBeVisible();

    // Capture screenshot evidence
    const screenshotBuffer = await page.screenshot({ fullPage: true });

    const targetDir1 = 'c:/Projects/Gradifi/test-results/plagiarism-ui';
    if (!fs.existsSync(targetDir1)) fs.mkdirSync(targetDir1, { recursive: true });

    fs.writeFileSync(path.join(targetDir1, 'plagiarism-ui-working.png'), screenshotBuffer);
    fs.writeFileSync(
      'C:/Users/Administrator/.gemini/antigravity-ide/brain/de33b81a-174c-42e8-a1c1-316ba6a7810d/plagiarism-ui-working.png',
      screenshotBuffer
    );

    console.log('📸 Plagiarism Checker UI Evidence Screenshot saved successfully');
  });
});
