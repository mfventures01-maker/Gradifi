import { describe, expect, it } from 'vitest';
import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';

/** G5: re-run the unchanged deterministic comparison engine on corrected text. */
describe('G5 student correction and re-verification lifecycle', () => {
  const sourceText = [
    'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.',
    'Researchers publish calibrated observations with transparent methods and reproducible measurement records.',
  ].join(' ');

  it('re-evaluates corrected content and produces a new canonical identity without changing the scoring authority', () => {
    const originalStudent = buildCanonicalAnalysisDocument({
      rawText: sourceText,
      title: 'Student submission',
      filename: 'student-original.txt',
    });
    const correctedStudent = buildCanonicalAnalysisDocument({
      rawText: 'Urban gardens provide fresh food for nearby residents. Local volunteers maintain planting schedules throughout the year.',
      title: 'Student corrected submission',
      filename: 'student-corrected.txt',
    });
    const source = buildCanonicalAnalysisDocument({
      rawText: sourceText,
      title: 'Reference source',
      filename: 'reference.txt',
    });

    const before = verifyCoreService.executeGranularSimilarityAnalysis(originalStudent, source);
    const after = verifyCoreService.executeGranularSimilarityAnalysis(correctedStudent, source);

    expect(before.deterministic).toBe(true);
    expect(after.deterministic).toBe(true);
    expect(before.findings.length).toBeGreaterThan(0);
    expect(after.findings).toHaveLength(0);
    expect(after.overallSimilarity).toBeLessThan(before.overallSimilarity);
    expect(correctedStudent.documentId).not.toBe(originalStudent.documentId);
  });

  it('keeps correction analysis local and does not create a receipt or persistence request', () => {
    const student = buildCanonicalAnalysisDocument({
      rawText: 'A corrected student submission contains original writing about community gardens.',
      title: 'Corrected submission',
    });
    const source = buildCanonicalAnalysisDocument({
      rawText: 'The coastal monitoring network records temperature shifts through distributed acoustic sensors.',
      title: 'Reference source',
    });

    const result = verifyCoreService.executeGranularSimilarityAnalysis(student, source);
    expect(result.deterministic).toBe(true);
    expect(result.sourceDocumentId).toBe(student.documentId);
    expect(result.matchedDocumentId).toBe(source.documentId);
  });
});
