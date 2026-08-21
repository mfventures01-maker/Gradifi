import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Principal Dashboard Fix & Evidence Verification', () => {
  test('should display 12 students and 1 teacher on Principal Dashboard', async ({ page }) => {
    // Navigate to principal dashboard
    await page.goto('/portal/principal');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify UI components and metrics
    await expect(page.locator('text=Michael Secondary School')).toBeVisible();
    await expect(page.locator('text=Total Students')).toBeVisible();
    await expect(page.locator('text=Total Teachers')).toBeVisible();

    // Check student count text (12)
    const studentContainer = page.locator('text=Total Students').locator('..');
    const studentText = await studentContainer.textContent();
    console.log('UI Total Students Container Text:', studentText);
    expect(studentText).toContain('12');

    // Check teacher count text (1)
    const teacherContainer = page.locator('text=Total Teachers').locator('..');
    const teacherText = await teacherContainer.textContent();
    console.log('UI Total Teachers Container Text:', teacherText);
    expect(teacherText).toContain('1');

    // Console verification evaluation
    const consoleResult = await page.evaluate(async () => {
      // @ts-ignore
      const { principalService } = await import('/src/services/principalService.ts');
      const data = await principalService.getDashboardStats('0178b8de-1df6-4de6-babf-7657743f8cd5');
      return {
        school_name: data.school_name,
        total_students: data.total_students,
        total_teachers: data.total_teachers,
        total_classes: data.total_classes,
        passed: data.total_students === 12 && data.total_teachers === 1
      };
    });

    console.log('✅ Browser Console RPC Verification:', consoleResult);
    expect(consoleResult.passed).toBe(true);

    // Write screenshots
    const targetPath1 = 'c:/Projects/Gradifi/01-principal-dashboard-fixed.png';
    const targetPath2 = 'C:/Users/Administrator/.gemini/antigravity-ide/brain/de33b81a-174c-42e8-a1c1-316ba6a7810d/01-principal-dashboard-fixed.png';
    
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    fs.writeFileSync(targetPath1, screenshotBuffer);
    fs.writeFileSync(targetPath2, screenshotBuffer);
    
    // Also save in test-results/dashboard-fix/
    const dir = 'c:/Projects/Gradifi/test-results/dashboard-fix';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '01-principal-dashboard-fixed.png'), screenshotBuffer);
    
    console.log('📸 Screenshots written successfully to disk');
  });
});
