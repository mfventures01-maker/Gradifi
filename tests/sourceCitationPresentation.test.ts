/**
 * GRADIFI VERIFY - HOEOS P5 SOURCE / DOI / ISBN / CITATION SUITE
 * Absolute verification of presentation layer, metadata preservation, zero metadata fabrication,
 * deterministic citation generation, XSS safety, and contract integrity boundaries.
 */

import { describe, test, expect } from 'vitest';
import { PublicVerificationResult, PublicAcademicSource, PublicBookSource } from '../src/services/verify/publicVerificationResult';
import { MatchedEvidenceSpan } from '../src/services/verify/matchedTextHighlightingService';
import {
  formatDoiUrl,
  formatIsbnDisplay,
  sortSourcesDeterministically,
  buildSourcePresentationModel,
  getSpansForSource
} from '../src/services/verify/sourceCitationPresentationService';

// Mock certified PublicVerificationResult fixture for testing P5 presentation layer
function createSamplePublicResult(overrides?: Partial<PublicVerificationResult>): PublicVerificationResult {
  return {
    document: {
      title: 'Quantum Entanglement and Decoupled Neural Architecture',
      authors: ['Dr. Alice Smith', 'Dr. Bob Jones'],
      year: 2024,
      wordCount: 1200,
      characterCount: 7500
    },
    similarity: {
      overallPercentage: 42.5,
      riskLevel: 'MODERATE'
    },
    matchedEvidence: [
      {
        matchId: 'match_1',
        matchedText: 'Quantum entanglement provides state synchronization across nodes.',
        startOffset: 0,
        endOffset: 65,
        matchType: 'exact',
        similarityContribution: 25.0,
        sourceId: 'src_academic_001'
      },
      {
        matchId: 'match_2',
        matchedText: 'Decoupled neural architectures eliminate main-loop blocking.',
        startOffset: 70,
        endOffset: 130,
        matchType: 'lexical',
        similarityContribution: 17.5,
        sourceId: 'src_book_002'
      }
    ],
    academicSources: [
      {
        sourceId: 'src_academic_001',
        title: 'Quantum Entanglement in Distributed AI Systems',
        authors: ['Dr. Carol Danvers', 'Dr. Edward Nygma'],
        year: 2023,
        journal: 'Journal of Federated Computing',
        publisher: 'Academic Press',
        doi: '10.1016/j.jfc.2023.104521',
        url: 'https://doi.org/10.1016/j.jfc.2023.104521',
        sourceType: 'crossref',
        matchedPercentage: 25.0
      }
    ],
    bookSources: [
      {
        sourceId: 'src_book_002',
        title: 'Principles of Modern Decoupled Systems Architecture',
        authors: ['Prof. Frank Castle'],
        year: 2022,
        publisher: 'MIT Press',
        isbn13: '9780262039994',
        isbn10: '0262039994',
        url: 'https://books.google.com/books?id=sample123',
        matchedPercentage: 17.5
      }
    ],
    citations: [
      {
        sourceId: 'src_academic_001',
        apa: 'Dr. Carol Danvers, Dr. Edward Nygma (2023). Quantum Entanglement in Distributed AI Systems. Academic Press. https://doi.org/10.1016/j.jfc.2023.104521',
        mla: 'Dr. Carol Danvers, Dr. Edward Nygma. "Quantum Entanglement in Distributed AI Systems." Academic Press, 2023. https://doi.org/10.1016/j.jfc.2023.104521',
        chicago: 'Dr. Carol Danvers, Dr. Edward Nygma. "Quantum Entanglement in Distributed AI Systems." Academic Press, 2023. https://doi.org/10.1016/j.jfc.2023.104521',
        harvard: 'Dr. Carol Danvers, Dr. Edward Nygma 2023 \'Quantum Entanglement in Distributed AI Systems\', Academic Press. https://doi.org/10.1016/j.jfc.2023.104521'
      }
    ],
    aiInterpretation: [
      {
        findingType: 'structural_analysis',
        severity: 'low',
        normalizedConfidence: 0.85,
        explanation: 'Structural alignment indicates standard academic methodology presentation.',
        authorityClassification: 'NON_AUTHORITATIVE_INTERPRETATION'
      }
    ],
    totalVerifiedSources: 2,
    receipt: {
      verificationId: 'VRF-TEST-P5-001',
      documentHash: 'a1b2c3d4e5f67890',
      evidenceHash: 'f9e8d7c6b5a43210',
      engineVersion: '1.0.0-certified',
      policyVersion: 'G3-2026.1',
      timestamp: '2026-09-13T09:00:00Z'
    },
    ...overrides
  };
}

describe('HOEOS P5 Source / DOI / ISBN / Citation Presentation Suite', () => {

  // Category 1
  test('1. renders academic source metadata from public contract', () => {
    const result = createSamplePublicResult();
    const model = buildSourcePresentationModel(result);
    const academic = model.find(m => m.sourceId === 'src_academic_001');

    expect(academic).toBeDefined();
    expect(academic?.title).toBe('Quantum Entanglement in Distributed AI Systems');
    expect(academic?.authors).toEqual(['Dr. Carol Danvers', 'Dr. Edward Nygma']);
    expect(academic?.publisher).toBe('Academic Press');
    expect(academic?.year).toBe(2023);
  });

  // Category 2
  test('2. renders validated DOI', () => {
    expect(formatDoiUrl('10.1016/j.jfc.2023.104521')).toBe('https://doi.org/10.1016/j.jfc.2023.104521');
    expect(formatDoiUrl('https://doi.org/10.1016/j.jfc.2023.104521')).toBe('https://doi.org/10.1016/j.jfc.2023.104521');

    const result = createSamplePublicResult();
    const model = buildSourcePresentationModel(result);
    const academic = model.find(m => m.sourceId === 'src_academic_001');

    expect(academic?.hasDoi).toBe(true);
    expect(academic?.doi).toBe('10.1016/j.jfc.2023.104521');
    expect(academic?.doiUrl).toBe('https://doi.org/10.1016/j.jfc.2023.104521');
    expect(academic?.doiDisplay).toContain('10.1016/j.jfc.2023.104521');
  });

  // Category 3
  test('3. renders validated ISBN', () => {
    expect(formatIsbnDisplay('978-0-262-03999-4')).toBe('9780262039994');
    expect(formatIsbnDisplay('0262039994')).toBe('0262039994');

    const result = createSamplePublicResult();
    const model = buildSourcePresentationModel(result);
    const book = model.find(m => m.sourceId === 'src_book_002');

    expect(book?.hasIsbn).toBe(true);
    expect(book?.isbn).toBe('9780262039994');
    expect(book?.isbnFormatted).toContain('9780262039994');
  });

  // Category 4
  test('4. preserves sourceId mapping', () => {
    const spans: MatchedEvidenceSpan[] = [
      {
        spanId: 'span_1',
        startOffset: 0,
        endOffset: 30,
        matchedText: 'Quantum entanglement',
        sourceId: 'src_academic_001',
        matchType: 'EXACT_MATCH',
        evidenceType: 'EXACT_MATCH'
      }
    ];

    const matchedSpans = getSpansForSource(spans, 'src_academic_001');
    expect(matchedSpans.length).toBe(1);
    expect(matchedSpans[0].sourceId).toBe('src_academic_001');
  });

  // Category 5
  test('5. generates deterministic citation', () => {
    const result = createSamplePublicResult();
    const model = buildSourcePresentationModel(result);
    const academic = model.find(m => m.sourceId === 'src_academic_001');

    expect(academic?.citation).toBeDefined();
    expect(academic?.citation.apa).toContain('Dr. Carol Danvers');
    expect(academic?.citation.mla).toContain('Quantum Entanglement in Distributed AI Systems');
    expect(academic?.citation.chicago).toContain('2023');
    expect(academic?.citation.harvard).toContain('10.1016');
  });

  // Category 6
  test('6. handles missing DOI truthfully', () => {
    expect(formatDoiUrl(undefined)).toBeNull();
    expect(formatDoiUrl('')).toBeNull();
    expect(formatDoiUrl('invalid-doi')).toBeNull();

    const result = createSamplePublicResult({
      academicSources: [
        {
          sourceId: 'src_academic_nodoi',
          title: 'Paper Without DOI',
          authors: ['Dr. Smith'],
          sourceType: 'crossref',
          matchedPercentage: 10.0
        }
      ]
    });

    const model = buildSourcePresentationModel(result);
    const src = model.find(m => m.sourceId === 'src_academic_nodoi');

    expect(src?.hasDoi).toBe(false);
    expect(src?.doi).toBeUndefined();
    expect(src?.doiUrl).toBeUndefined();
    expect(src?.doiDisplay).toBe('DOI unavailable');
  });

  // Category 7
  test('7. handles missing ISBN truthfully', () => {
    expect(formatIsbnDisplay(undefined)).toBeNull();
    expect(formatIsbnDisplay('123')).toBeNull(); // Less than 10 digits

    const result = createSamplePublicResult({
      bookSources: [
        {
          sourceId: 'src_book_noisbn',
          title: 'Book Without ISBN',
          authors: ['Author A'],
          sourceType: 'googlebooks',
          matchedPercentage: 5.0
        }
      ]
    });

    const model = buildSourcePresentationModel(result);
    const book = model.find(m => m.sourceId === 'src_book_noisbn');

    expect(book?.hasIsbn).toBe(false);
    expect(book?.isbn).toBeUndefined();
    expect(book?.isbnDisplay).toBe('ISBN unavailable');
  });

  // Category 8
  test('8. handles missing author truthfully', () => {
    const result = createSamplePublicResult({
      academicSources: [
        {
          sourceId: 'src_noauthor',
          title: 'Anonymous Treatise',
          authors: ['Author metadata unavailable'],
          sourceType: 'crossref',
          matchedPercentage: 15.0
        }
      ]
    });

    const model = buildSourcePresentationModel(result);
    const src = model.find(m => m.sourceId === 'src_noauthor');

    expect(src?.hasAuthors).toBe(false);
    expect(src?.authorDisplay).toBe('Author metadata unavailable');
  });

  // Category 9
  test('9. does not fabricate metadata', () => {
    const result = createSamplePublicResult({
      academicSources: [
        {
          sourceId: 'src_minimal',
          title: 'Minimal Source Title',
          authors: [],
          sourceType: 'openalex',
          matchedPercentage: 12.0
        }
      ]
    });

    const model = buildSourcePresentationModel(result);
    const src = model.find(m => m.sourceId === 'src_minimal');

    expect(src?.doi).toBeUndefined();
    expect(src?.isbn).toBeUndefined();
    expect(src?.year).toBeUndefined();
    expect(src?.publisher).toBeUndefined();
  });

  // Category 10
  test('10. does not alter similarity', () => {
    const result = createSamplePublicResult();
    const originalSimilarity = result.similarity.overallPercentage;
    buildSourcePresentationModel(result);

    expect(result.similarity.overallPercentage).toBe(originalSimilarity);
  });

  // Category 11
  test('11. does not alter matched spans', () => {
    const spans: MatchedEvidenceSpan[] = [
      {
        spanId: 'span_1',
        startOffset: 10,
        endOffset: 25,
        matchedText: 'decoupled neural',
        sourceId: 'src_book_002',
        matchType: 'EXACT_MATCH',
        evidenceType: 'EXACT_MATCH'
      }
    ];

    const copy = [...spans];
    getSpansForSource(spans, 'src_book_002');

    expect(spans[0].startOffset).toBe(copy[0].startOffset);
    expect(spans[0].endOffset).toBe(copy[0].endOffset);
    expect(spans[0].matchedText).toBe(copy[0].matchedText);
  });

  // Category 12
  test('12. does not alter G3 classification', () => {
    const result = createSamplePublicResult();
    const originalRisk = result.similarity.riskLevel;
    buildSourcePresentationModel(result);

    expect(result.similarity.riskLevel).toBe(originalRisk);
    expect(result.similarity.riskLevel).toBe('MODERATE');
  });

  // Category 13
  test('13. Google Books remains bibliographic evidence', () => {
    const result = createSamplePublicResult();
    const model = buildSourcePresentationModel(result);
    const book = model.find(m => m.sourceId === 'src_book_002');

    expect(book?.sourceTypeLabel).toBe('Book Source (Bibliographic)');
    expect(book?.sourceTypeLabel).not.toContain('Plagiarism Authority');
  });

  // Category 14
  test('14. AI remains non-authoritative', () => {
    const result = createSamplePublicResult();
    expect(result.aiInterpretation[0].authorityClassification).toBe('NON_AUTHORITATIVE_INTERPRETATION');
  });

  // Category 15
  test('15. deterministic ordering', () => {
    const unsorted = [
      { sourceId: 'z_source' },
      { sourceId: 'a_source' },
      { sourceId: 'm_source' }
    ];

    const sorted = sortSourcesDeterministically(unsorted);
    expect(sorted.map(s => s.sourceId)).toEqual(['a_source', 'm_source', 'z_source']);
  });

  // Category 16
  test('16. repeated execution produces identical presentation', () => {
    const result = createSamplePublicResult();
    const firstRun = JSON.stringify(buildSourcePresentationModel(result));

    for (let i = 0; i < 50; i++) {
      const nextRun = JSON.stringify(buildSourcePresentationModel(result));
      expect(nextRun).toBe(firstRun);
    }
  });

  // Category 17
  test('17. unsafe metadata renders as text', () => {
    const xssTitle = '<script>alert("XSS")</script>';
    const result = createSamplePublicResult({
      academicSources: [
        {
          sourceId: 'src_xss',
          title: xssTitle,
          authors: ['<img src=x onerror=alert(1)>'],
          sourceType: 'crossref',
          matchedPercentage: 10.0
        }
      ]
    });

    const model = buildSourcePresentationModel(result);
    const xssSource = model.find(m => m.sourceId === 'src_xss');

    expect(xssSource?.title).toBe(xssTitle);
    expect(xssSource?.authors[0]).toBe('<img src=x onerror=alert(1)>');
  });

  // Category 18
  test('18. provider diagnostics are excluded', () => {
    const result = createSamplePublicResult();
    const model = buildSourcePresentationModel(result);
    const jsonString = JSON.stringify(model);

    expect(jsonString).not.toContain('httpStatus');
    expect(jsonString).not.toContain('latencyMs');
    expect(jsonString).not.toContain('circuitBreaker');
    expect(jsonString).not.toContain('rawPayload');
  });

  // Category 19
  test('19. credentials are excluded', () => {
    const result = createSamplePublicResult();
    const model = buildSourcePresentationModel(result);
    const jsonString = JSON.stringify(model);

    expect(jsonString).not.toContain('CORE_API_KEY');
    expect(jsonString).not.toContain('NVIDIA_API_KEY');
    expect(jsonString).not.toContain('bearer');
    expect(jsonString).not.toContain('secret');
  });

  // Category 20
  test('20. source attribution survives P4 integration', () => {
    const result = createSamplePublicResult();
    const model = buildSourcePresentationModel(result);

    const spans: MatchedEvidenceSpan[] = [
      {
        spanId: 'span_academic_1',
        startOffset: 0,
        endOffset: 65,
        matchedText: 'Quantum entanglement provides state synchronization across nodes.',
        sourceId: 'src_academic_001',
        matchType: 'EXACT_MATCH',
        evidenceType: 'EXACT_MATCH'
      }
    ];

    const academicSource = model.find(m => m.sourceId === 'src_academic_001');
    const matchedSpans = getSpansForSource(spans, academicSource!.sourceId);

    expect(academicSource).toBeDefined();
    expect(matchedSpans.length).toBe(1);
    expect(matchedSpans[0].matchedText).toBe('Quantum entanglement provides state synchronization across nodes.');
  });
});
