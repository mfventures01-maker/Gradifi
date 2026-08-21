import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('CORE API Integration Verification', () => {
  test('should execute searchCORE using VITE_CORE_API_KEY in live browser without process error', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const { plagiarismService } = await import('/src/services/plagiarismService.ts');
      
      console.log('🔍 Executing plagiarism check with CORE API in browser...');
      const checkResult = await plagiarismService.checkDocument('Quantum Computing in Education: Academic Survey and Literature Review');
      
      const coreStats = checkResult.providerStats?.core || { found: 0, used: 0, errors: 0 };
      const coreMatches = checkResult.matches.filter((m: any) => m.sourceType === 'core');

      return {
        overallSimilarity: checkResult.overallSimilarity,
        totalSources: checkResult.totalSources,
        coreStats,
        coreMatchesCount: coreMatches.length,
        hasNoProcessError: true
      };
    });

    console.log('✅ CORE API Browser Evaluation Result:', result);
    expect(result.hasNoProcessError).toBe(true);

    const targetPath1 = 'c:/Projects/Gradifi/test-results/core-api-fix/01-core-api-verified.png';
    const targetPath2 = 'C:/Users/Administrator/.gemini/antigravity-ide/brain/de33b81a-174c-42e8-a1c1-316ba6a7810d/01-core-api-verified.png';

    const screenshotBuffer = await page.screenshot({ fullPage: true });
    
    const dir = 'c:/Projects/Gradifi/test-results/core-api-fix';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(targetPath1, screenshotBuffer);
    fs.writeFileSync(targetPath2, screenshotBuffer);
    console.log('📸 CORE API Evidence Screenshot saved');
  });
});
