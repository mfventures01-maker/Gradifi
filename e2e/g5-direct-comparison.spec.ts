import { expect, test } from '@playwright/test';
import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';
import { sourceText, studentText } from '../tests/fixtures/g5/sourceStudentFixture';

const STUDENT_FILENAME = 'student-a.txt';
const SOURCE_FILENAME = 'source-a.txt';

function expectedG5Result() {
  const studentDoc = buildCanonicalAnalysisDocument({ rawText: studentText });
  const sourceDoc = buildCanonicalAnalysisDocument({ rawText: sourceText });
  return verifyCoreService.executeGranularSimilarityAnalysis(studentDoc, sourceDoc);
}

test.describe('G5 direct source comparison: real browser proof', () => {
  test('ingests SOURCE-A and STUDENT-A, renders grounded findings and repeats identically', async ({ page }) => {
    const expected = expectedG5Result();

    expect(expected.deterministic).toBe(true);
    expect(expected.overallSimilarity).toBeGreaterThan(0);
    expect(expected.findings.some(f => f.matchMethod === 'EXACT_PHRASE')).toBe(true);
    expect(expected.findings.some(f =>
      (f.matchMethod === 'NGRAM' || f.matchMethod === 'TOKEN_OVERLAP') &&
      f.sourceSegment.includes('Coastal monitoring networks record temperature changes')
    )).toBe(true);

    await page.goto('/tools/plagiarism');
    await page.waitForLoadState('domcontentloaded');

    const uploadInputs = page.locator('input[type="file"]');
    await expect(uploadInputs).toHaveCount(2);

    // Upload STUDENT-A through the page's primary student-submission input.
    await uploadInputs.nth(0).setInputFiles({
      name: STUDENT_FILENAME,
      mimeType: 'text/plain',
      buffer: Buffer.from(studentText, 'utf8'),
    });

    const studentTextarea = page.locator('textarea[placeholder*="Paste academic paper"]');
    await expect(studentTextarea).toHaveValue(studentText, { timeout: 15000 });
    await expect(page.getByText('STATUS: EXTRACTED', { exact: true })).toBeVisible();
    await expect(page.getByText(STUDENT_FILENAME, { exact: true })).toBeVisible();

    // Upload SOURCE-A through the dedicated G5 comparison-source input.
    await uploadInputs.nth(1).setInputFiles({
      name: SOURCE_FILENAME,
      mimeType: 'text/plain',
      buffer: Buffer.from(sourceText, 'utf8'),
    });

    await expect(page.getByText(SOURCE_FILENAME, { exact: true })).toBeVisible({ timeout: 15000 });
    const sourceIdLabel = page.getByText('Canonical ID:').locator('..');
    await expect(sourceIdLabel).toBeVisible();
    const sourceIdMatch = (await sourceIdLabel.textContent())?.match(/[a-f0-9]{16}/i);
    expect(sourceIdMatch).not.toBeNull();
    const uploadedSourceDocumentId = sourceIdMatch![0];

    const compareButton = page.getByRole('button', { name: /Compare Student Against Source/ });
    await expect(compareButton).toBeEnabled();
    await compareButton.click();

    const result = page.getByTestId('g5-direct-comparison-result');
    await expect(result).toBeVisible();
    await expect(result.getByText('G5 Deterministic Comparison Result')).toBeVisible();

    const readBrowserSignature = async () => result.evaluate(root => {
      const findings = Array.from(root.querySelectorAll('[data-testid="g5-finding"]')).map(card => ({
        findingId: card.getAttribute('data-finding-id'),
        sourceDocumentId: card.getAttribute('data-source-document-id'),
        sourceLabel: card.querySelector('[data-testid="g5-finding-source-id"]')?.textContent?.trim() || '',
        studentPassage: card.querySelector('[data-testid="g5-student-passage"]')?.textContent || '',
        sourcePassage: card.querySelector('[data-testid="g5-source-passage"]')?.textContent || '',
        method: card.querySelector('span')?.textContent?.trim() || '',
      }));

      const highlightContainer = root.querySelector('[data-testid="g5-student-highlighted-text"]');
      if (!highlightContainer) throw new Error('Student highlight container is missing.');

      const highlights = Array.from(highlightContainer.querySelectorAll('mark')).map(mark => {
        const range = document.createRange();
        range.selectNodeContents(highlightContainer);
        range.setEndBefore(mark);
        const start = range.toString().length;
        const text = mark.textContent || '';
        return {
          findingId: mark.getAttribute('data-finding-id'),
          start,
          end: start + text.length,
          text,
        };
      });

      return {
        summary: root.textContent?.match(/Similarity\s*([0-9.]+%)/)?.[1] || '',
        findings,
        highlights,
      };
    });

    const firstRun = await readBrowserSignature();

    // Each rendered finding must point back to the uploaded source document.
    expect(firstRun.findings).toHaveLength(expected.findings.length);
    for (const finding of firstRun.findings) {
      expect(finding.sourceDocumentId).toBe(uploadedSourceDocumentId);
      expect(finding.sourceLabel).toContain(uploadedSourceDocumentId);
    }

    // Both exact-copy and modified-overlap findings must be visible in the actual UI.
    expect(firstRun.findings.some(f => f.method.includes('EXACT_PHRASE'))).toBe(true);
    expect(firstRun.findings.some(f =>
      f.method.includes('NGRAM') || f.method.includes('TOKEN_OVERLAP')
    )).toBe(true);

    // Source passages shown in each finding must be grounded in SOURCE-A.
    for (const finding of firstRun.findings) {
      expect(finding.studentPassage.length).toBeGreaterThan(0);
      expect(finding.sourcePassage.length).toBeGreaterThan(0);
      expect(sourceText).toContain(finding.sourcePassage);
    }

    // Browser highlights must occupy the exact canonical student offsets emitted by G5.
    expect(firstRun.highlights).toHaveLength(expected.findings.length);
    for (const expectedFinding of expected.findings) {
      const rendered = firstRun.highlights.find(h => h.findingId === expectedFinding.findingId);
      expect(rendered, `missing rendered highlight for ${expectedFinding.findingId}`).toBeDefined();
      expect(rendered!.start).toBe(expectedFinding.sourceStart);
      expect(rendered!.end).toBe(expectedFinding.sourceEnd);
      expect(rendered!.text).toBe(studentText.slice(expectedFinding.sourceStart, expectedFinding.sourceEnd));

      const card = firstRun.findings.find(f => f.findingId === expectedFinding.findingId);
      expect(card).toBeDefined();
      expect(card!.studentPassage).toBe(expectedFinding.sourceSegment);
      expect(card!.sourcePassage).toBe(expectedFinding.matchedSegment);
    }

    // Run the same comparison again without re-uploading or mutating either document.
    await compareButton.click();
    await expect.poll(readBrowserSignature).toEqual(firstRun);
  });
});
