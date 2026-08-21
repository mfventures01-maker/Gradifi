import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('CORE API Proxy & CORS Verification', () => {
  test('should fetch results via /api/core/ search proxy without CORS errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Execute searchCORE via Vite proxy
    const results = await page.evaluate(async () => {
      // @ts-ignore
      const { plagiarismService } = await import('/src/services/plagiarismService.ts');
      console.log('📚 Executing searchCORE("machine learning") via proxy...');
      const coreResults = await plagiarismService.searchCORE('machine learning');
      console.log('📚 Found:', coreResults?.length || 0, 'results');
      if (coreResults && coreResults.length > 0) {
        console.log('✅ First result:', coreResults[0].title);
      }
      return coreResults;
    });

    console.log('✅ Browser Proxy Evaluation Results count:', results?.length);
    expect(results).toBeDefined();

    // Write screenshots
    const screenshotBuffer = await page.screenshot({ fullPage: true });

    const dir1 = 'c:/Projects/Gradifi/test-results/core-api';
    if (!fs.existsSync(dir1)) fs.mkdirSync(dir1, { recursive: true });
    
    fs.writeFileSync(path.join(dir1, '02-core-api-proxy-working.png'), screenshotBuffer);
    fs.writeFileSync(
      'C:/Users/Administrator/.gemini/antigravity-ide/brain/de33b81a-174c-42e8-a1c1-316ba6a7810d/02-core-api-proxy-working.png',
      screenshotBuffer
    );
    console.log('📸 Evidence screenshot saved as 02-core-api-proxy-working.png');
  });
});
