import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';
import { evaluateDocumentSimilarity } from '../src/services/verify/deterministicEngine';

const SAMPLE_TEXT_A = "Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks\nBy Dr. Aris Thorne, Prof. Elena Rostova, and Dr. Marcus Vance (2024)\nJournal of Advanced Computer Science & Quantum Information Systems, Vol. 14, DOI: 10.1038/s41586-023-00001-x.\n\nAbstract:\nFederated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. By utilizing deterministic hashing and provenance verification, our model achieves 99.4% accuracy across distributed node topology while preserving complete privacy.";

const SAMPLE_TEXT_B_PARTIAL = "An Analysis of High-Order Evidence Systems in Edge Computing Topology\nBy Prof. Elena Rostova and Dr. Aris Thorne\n\nIntroduction:\nFederated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. Furthermore, mathematical determinism guarantees non-repudiation of evidence.";

async function run() {
  const docA = buildCanonicalAnalysisDocument({ rawText: SAMPLE_TEXT_A, filename: 'docA.pdf' });
  const docB = buildCanonicalAnalysisDocument({ rawText: SAMPLE_TEXT_B_PARTIAL, filename: 'docB.pdf' });

  console.log('DOC_A_ID:', docA.documentId);
  console.log('DOC_A_LENGTH:', docA.normalizedText.length);
  console.log('DOC_B_ID:', docB.documentId);

  const result: any = evaluateDocumentSimilarity(docA, docB);
  const findings = result.findings || [];

  console.log('FINDINGS_COUNT:', findings.length);
  if (findings.length === 0) {
    console.error('FAIL: no findings produced');
    process.exit(1);
  }

  let checked = 0;
  for (const f of findings) {
    if (typeof f.sourceStart !== 'number' || typeof f.sourceEnd !== 'number') {
      console.log('SKIP', f.findingId, '(no source offsets)');
      continue;
    }
    const slice = (docA.rawText || '').slice(f.sourceStart, f.sourceEnd);
    const expected = f.sourceSegment;
    console.log('FINDING', f.findingId, 'start', f.sourceStart, 'end', f.sourceEnd, 'SLICE_EQ_SEGMENT:', slice === expected);
    if (slice !== expected) {
      console.error('FAIL: slice does not equal sourceSegment');
      console.error('  SLICE:   ', JSON.stringify(slice));
      console.error('  SEGMENT: ', JSON.stringify(expected));
      process.exit(1);
    }
    checked++;
  }
  console.log('CHECKED:', checked);
  if (checked === 0) {
    console.error('FAIL: no findings had offsets to verify');
    process.exit(1);
  }
  console.log('G2-4 OFFSET FIDELITY: PASS');
  process.exit(0);
}

run().catch(err => { console.error('ERROR:', err); process.exit(1); });
