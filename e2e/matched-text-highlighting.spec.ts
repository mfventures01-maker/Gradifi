import { test, expect, type Page } from '@playwright/test';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';

const COPIED_PASSAGE =
  'The rapid advancement of distributed artificial intelligence has transformed academic research and scientific collaboration.';

async function runControlledG5Comparison(page: Page, studentText: string, sourceText: string) {
  const trialActions: string[] = [];
  const trialToken = 'T'.repeat(64);

  await page.route('**/functions/v1/trial', async route => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
        },
        body: '',
      });
    }

    const body = route.request().postDataJSON() as { action?: string };
    trialActions.push(body.action || '');
    if (body.action === 'start') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          trialToken,
          checksRemaining: 3,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }),
      });
    }
    if (body.action === 'consume') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, checksRemaining: 2 }),
      });
    }
    return route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, code: 'UNKNOWN_ACTION' }),
    });
  });

  await page.route('**/api/verify/run', async route => {
    const request = route.request().postDataJSON() as { mode?: string; trialToken?: string };
    expect(request.mode).toBe('compare');
    expect(request.trialToken).toBe(trialToken);
    const result = verifyCoreService.executeGranularSimilarityAnalysis(studentText, sourceText);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, result, checksRemaining: 2 }),
    });
  });

  await page.goto('/verify');
  await page.waitForLoadState('domcontentloaded');

  const studentInput = page.locator('textarea[placeholder*="Paste academic paper"]');
  await expect(studentInput).toBeVisible();
  await studentInput.fill(studentText);

  const fileInputs = page.locator('input[type="file"]');
  await expect(fileInputs).toHaveCount(2);
  await fileInputs.nth(1).setInputFiles({
    name: 'known-positive-source.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(sourceText, 'utf8'),
  });

  await expect(page.getByText('known-positive-source.txt', { exact: true })).toBeVisible();
  const compareButton = page.getByRole('button', { name: /Compare Student Against Source/ });
  await expect(compareButton).toBeEnabled();
  await compareButton.click();

  const result = page.getByTestId('g5-direct-comparison-result');
  await expect(result).toBeVisible();
  await expect(page.getByText(/Public trial checks remaining:/)).toContainText('2');
  expect(trialActions).toEqual(['start']);
  return result;
}

test.describe('HOEOS G5 controlled positive matching and P4 highlighting', () => {
  test('renders an exact known-positive finding and highlights the student passage', async ({ page }) => {
    test.setTimeout(90000);

    const studentText =
      'This introduction is original student writing. ' +
      COPIED_PASSAGE +
      ' The conclusion is independently written by the student.';
    const sourceText =
      COPIED_PASSAGE +
      ' The source contains additional context that is not included in the student submission.';

    const result = await runControlledG5Comparison(page, studentText, sourceText);
    const marks = result.locator('mark');

    expect(await marks.count()).toBeGreaterThan(0);
    await expect(marks.first()).toHaveText(COPIED_PASSAGE);

    const studentPassage = result
      .getByText('Student passage', { exact: true })
      .locator('xpath=following-sibling::p');
    const sourcePassage = result
      .getByText('Source passage', { exact: true })
      .locator('xpath=following-sibling::p');

    await expect(studentPassage).toHaveText(COPIED_PASSAGE);
    await expect(sourcePassage).toHaveText(COPIED_PASSAGE.slice(0, -1));
  });

  test('renders a positive match while keeping hostile document markup as inert text', async ({ page }) => {
    test.setTimeout(90000);

    const studentText =
      '<script>alert("XSS")</script> <img src=x onerror=alert(1)>.\n' +
      COPIED_PASSAGE;
    const sourceText =
      COPIED_PASSAGE +
      ' The source includes a separate sentence for context.';

    const result = await runControlledG5Comparison(page, studentText, sourceText);
    const marks = result.locator('mark');

    expect(await marks.count()).toBeGreaterThan(0);
    await expect(marks.first()).toHaveText(COPIED_PASSAGE);
    await expect(result.locator('script')).toHaveCount(0);
    await expect(result.locator('img')).toHaveCount(0);

    const renderedText = await result.textContent();
    expect(renderedText).toContain('<script>alert("XSS")</script>');
    expect(renderedText).toContain('<img src=x onerror=alert(1)>');
  });
});
