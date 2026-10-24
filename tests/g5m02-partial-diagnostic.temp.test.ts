import { describe, it } from 'vitest';
import {
  buildCanonicalAnalysisDocument,
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

describe('G5-M02 partial baseline diagnostic', () => {
  it('prints every partial finding with match method and score', () => {
    const docA = buildCanonicalAnalysisDocument({ rawText: SAMPLE_TEXT_A, filename: 'docA.pdf' });
    const docB = buildCanonicalAnalysisDocument({ rawText: SAMPLE_TEXT_B_PARTIAL, filename: 'docB.pdf' });

    const resPartial = verifyCoreService.executeSimilarityAnalysis(docA, docB);

    console.log('resPartial.overallSimilarity =', resPartial.overallSimilarity);
    console.log('findings count =', resPartial.findings.length);
    console.log('');
    console.log('=== EVERY FINDING ===');
    for (let i = 0; i < resPartial.findings.length; i++) {
      const f = resPartial.findings[i];
      console.log(`#${i}  method=${f.matchMethod}  score=${f.similarityScore}  source="${(f.sourceSegment || '').slice(0, 80)}..."  matched="${(f.matchedSegment || '').slice(0, 80)}..."`);
    }
  });
});
