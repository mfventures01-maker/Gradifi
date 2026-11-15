import { describe, expect, it } from 'vitest';
import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';
import { toCanonicalEvidenceText } from '../src/services/verify/deterministicEngine';
import { normalizeText } from '../src/services/verify/documentNormalizer';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';

const sourceText = [
  'Preface: unrelated material must not be selected as matching evidence.',
  'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.',
  'Researchers publish calibrated observations with transparent methods and reproducible measurement records.'
].join('\n\n');

const studentText = [
  'Urban gardens provide fresh food for nearby residents.',
  'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.',
  'Coastal monitoring networks record temperature changes using distributed acoustic sensors and preserve observations inside a verified evidence ledger.'
].join('\n\n');

describe('G4-B canonical source passage alignment', () => {
  it('returns source passages whose canonical ranges reproduce the exact segment', () => {
    const student = buildCanonicalAnalysisDocument({ rawText: studentText, title: 'Student' });
    const source = buildCanonicalAnalysisDocument({ rawText: sourceText, title: 'Reference' });
    const result = verifyCoreService.executeGranularSimilarityAnalysis(student, source);
    const canonicalStudent = toCanonicalEvidenceText(student.rawText);
    const canonicalSource = toCanonicalEvidenceText(source.rawText);

    expect(result.findings.length).toBeGreaterThan(0);
    for (const finding of result.findings) {
      expect(finding.offsetBasis).toBe('CANONICAL_EVIDENCE_TEXT_UTF16');
      expect(finding.sourceStart).toBeDefined();
      expect(finding.sourceEnd).toBeDefined();
      expect(canonicalStudent.slice(finding.sourceStart, finding.sourceEnd)).toBe(finding.sourceSegment);

      if (finding.matchedStart !== undefined || finding.matchedEnd !== undefined) {
        expect(finding.matchedStart).toBeDefined();
        expect(finding.matchedEnd).toBeDefined();
        expect(canonicalSource.slice(finding.matchedStart!, finding.matchedEnd!)).toBe(finding.matchedSegment);
        expect(finding.matchedStart).toBeGreaterThanOrEqual(0);
        expect(finding.matchedEnd).toBeLessThanOrEqual(canonicalSource.length);
      } else {
        expect(finding.matchedSegment).toBe('');
      }
    }

    const exact = result.findings.find(f => f.matchMethod === 'EXACT_PHRASE');
    expect(exact).toBeDefined();
    expect(exact!.matchedStart).toBeDefined();
    expect(exact!.matchedSegment).not.toBe('');
    expect(normalizeText(exact!.matchedSegment)).toBe(normalizeText(exact!.sourceSegment));
    expect(canonicalSource.slice(exact!.matchedStart!, exact!.matchedEnd!)).toBe(exact!.matchedSegment);
    expect(exact!.matchedStart).toBeGreaterThan(canonicalSource.indexOf('Preface'));
  });

  it('aligns modified-overlap evidence to an actual source phrase, not the source prefix', () => {
    const student = buildCanonicalAnalysisDocument({ rawText: studentText, title: 'Student' });
    const source = buildCanonicalAnalysisDocument({ rawText: sourceText, title: 'Reference' });
    const result = verifyCoreService.executeGranularSimilarityAnalysis(student, source);
    const canonicalSource = toCanonicalEvidenceText(source.rawText);
    const overlap = result.findings.find(f => f.matchMethod === 'NGRAM');

    expect(overlap).toBeDefined();
    expect(overlap!.matchedStart).toBeDefined();
    expect(overlap!.matchedEnd).toBeDefined();
    expect(overlap!.matchedSegment).not.toBe('');
    expect(canonicalSource.slice(overlap!.matchedStart!, overlap!.matchedEnd!)).toBe(overlap!.matchedSegment);
    expect(overlap!.matchedSegment).not.toBe(canonicalSource.slice(0, 200));
  });

  it('keeps repeated runs byte-for-byte stable for source alignment fields', () => {
    const student = buildCanonicalAnalysisDocument({ rawText: studentText, title: 'Student' });
    const source = buildCanonicalAnalysisDocument({ rawText: sourceText, title: 'Reference' });
    const first = verifyCoreService.executeGranularSimilarityAnalysis(student, source);
    const second = verifyCoreService.executeGranularSimilarityAnalysis(student, source);
    const signature = (result: typeof first) => result.findings.map(f => ({
      findingId: f.findingId,
      matchedSegment: f.matchedSegment,
      matchedStart: f.matchedStart,
      matchedEnd: f.matchedEnd,
      sourceStart: f.sourceStart,
      sourceEnd: f.sourceEnd
    }));
    expect(signature(first)).toEqual(signature(second));
  });

  it('does not invent source offsets when no aligned phrase exists', () => {
    const student = buildCanonicalAnalysisDocument({
      rawText: 'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.',
      title: 'Student'
    });
    const source = buildCanonicalAnalysisDocument({
      rawText: 'Preface material is deliberately unrelated to the submitted passage.',
      title: 'Reference'
    });
    const result = verifyCoreService.executeGranularSimilarityAnalysis(student, source);
    expect(result.findings).toHaveLength(0);
  });
});
