import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Grading Engine Pipeline (OCR + Gemma + Nemotron) Verification', () => {
  test('should execute complete pipeline and render composite score + feedback', async ({ page }) => {
    await page.goto('/grading/engine-test');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify UI components present
    await expect(page.locator('text=AI Grading Engine Test Suite')).toBeVisible();

    // Click Instant Test Pipeline button
    const testBtn = page.locator('button:has-text("Run Instant Test Pipeline")');
    await expect(testBtn).toBeVisible();
    await testBtn.click();

    // Wait for pipeline complete section
    await page.waitForSelector('text=Grading Pipeline Complete', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Verify scores and feedback rendered
    await expect(page.locator('text=Final Composite')).toBeVisible();
    await expect(page.locator('text=Extracted Text (OCR)')).toBeVisible();
    await expect(page.locator('text=Combined Pedagogical Feedback')).toBeVisible();

    // Save screenshots
    const screenshotBuffer = await page.screenshot({ fullPage: true });

    const dir = 'c:/Projects/Gradifi/test-results/grading-engine';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(path.join(dir, 'grading-engine-pipeline.png'), screenshotBuffer);
    fs.writeFileSync(
      'C:/Users/Administrator/.gemini/antigravity-ide/brain/de33b81a-174c-42e8-a1c1-316ba6a7810d/grading-engine-pipeline.png',
      screenshotBuffer
    );

    console.log('📸 Grading Engine Pipeline Evidence Screenshot saved');
  });
});
