import { test, expect, type Page } from '@playwright/test';

const COPIED_PASSAGE =
  'The rapid advancement of distributed artificial intelligence has transformed academic research and scientific collaboration.';

async function runControlledG5Comparison(page: Page, studentText: string, sourceText: string) {
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
    await expect(sourcePassage).toHaveText(COPIED_PASSAGE);
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
