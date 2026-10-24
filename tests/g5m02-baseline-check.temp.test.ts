import { describe, it } from 'vitest';
import {
  buildCanonicalAnalysisDocument,
  segmentDocument,
  tokenize,
} from '../src/services/verify/documentNormalizer';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';

const SAMPLE_TEXT_A = `Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
By Dr. Aris Thorne, Prof. Elena Rostova, and Dr. Marcus Vance (2024)
Journal of Advanced Computer Science & Quantum Information Systems, Vol. 14, DOI: 10.1038/s41586-023-00001-x.

Abstract:
Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. By utilizing deterministic hashing and provenance verification, our model achieves 99.4% accuracy across distributed node topology while preserving complete privacy.`;

const SAMPLE_TEXT_B_PARTIAL = `An Analysis of High-Order Evidence Systems in Edge Computing Topology
By Prof. Elena Rostova and Dr. Aris Thorne

Introduction:
Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. Furthermore, mathematical determinism guarantees non-repudiation of evidence.`;

const UNRELATED_TEXT = `Biological Rhythms and Circadian Photosensitivity in Deep-Sea Marine Organisms
By Prof. Sarah Jenkins and Dr. Liam O'Connor (2022)

Abstract:
Photosynthetic adaptation in benthic ecosystems exhibits cyclical bioluminescence under extreme hydrostatic pressure. We observed species distribution across deep hydrothermal vents using autonomous underwater vehicles.`;

describe('G5-M02 baseline check', () => {
  it('prints coverage and baseline values', () => {
    const docA = buildCanonicalAnalysisDocument({ rawText: SAMPLE_TEXT_A, filename: 'docA.pdf' });
    const docB = buildCanonicalAnalysisDocument({ rawText: SAMPLE_TEXT_B_PARTIAL, filename: 'docB.pdf' });
    const docU = buildCanonicalAnalysisDocument({ rawText: UNRELATED_TEXT, filename: 'u.pdf' });

    const resIdentical = verifyCoreService.executeSimilarityAnalysis(docA, docA);
    const resPartial = verifyCoreService.executeSimilarityAnalysis(docA, docB);
    const resUnrelated = verifyCoreService.executeSimilarityAnalysis(docA, docU);

    // Correct structural access — segmentDocument returns SegmentedDocument
    const segmentedObj = segmentDocument(SAMPLE_TEXT_A, 'F');
    const allSentences = segmentedObj.paragraphs.flatMap((p) => p.sentences);
    const allSentenceTokens = allSentences.flatMap((s) => tokenize(s.text));
    const canonicalTokens = tokenize(SAMPLE_TEXT_A);

    console.log('SAMPLE_TEXT_A coverage:', allSentenceTokens.length, '/', canonicalTokens.length);
    console.log('resIdentical.overallSimilarity =', resIdentical.overallSimilarity);
    console.log('resPartial.overallSimilarity =', resPartial.overallSimilarity);
    console.log('resUnrelated.overallSimilarity =', resUnrelated.overallSimilarity);
    console.log('resPartial findings[0].matchMethod =', resPartial.findings[0]?.matchMethod);
  });
});
