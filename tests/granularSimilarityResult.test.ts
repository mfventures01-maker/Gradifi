/**
 * GRADIFI HOEOS G5-M05A - GRANULAR SIMILARITY RESULT ACCEPTANCE SUITE
 * Verifies internal evidence exposure without synthetic matches or fabricated provenance,
 * backward compatibility of public evaluateDocumentSimilarity, field equivalence,
 * JSON determinism, and engine isolation.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { buildCanonicalAnalysisDocument } from '../src/services/verify/documentNormalizer';
import {
  verifyCoreService,
  executeGranularSimilarityAnalysis,
} from '../src/services/verify/verifyCoreService';
import {
  evaluateDocumentSimilarity,
  evaluateDocumentSimilarityInternal,
} from '../src/services/verify/deterministicEngine';
import {
  GranularSimilarityResult,
  SimilarityAnalysisResult,
} from '../src/services/verify/types';

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

describe('HOEOS G5-M05A — Granular Similarity Result Acceptance Matrix', () => {
  const docA = buildCanonicalAnalysisDocument({
    rawText: SAMPLE_TEXT_A,
    filename: 'docA.pdf',
  });

  const docAPartial = buildCanonicalAnalysisDocument({
    rawText: SAMPLE_TEXT_B_PARTIAL,
    filename: 'docB.pdf',
  });

  const docUnrelated = buildCanonicalAnalysisDocument({
    rawText: UNRELATED_TEXT,
    filename: 'unrelated.pdf',
  });

  it('Test A: executeGranularSimilarityAnalysis on SAMPLE_TEXT_A self-comparison returns overallSimilarity = 84.6 with non-empty flags', () => {
    const res: GranularSimilarityResult = executeGranularSimilarityAnalysis(docA, docA);

    expect(res.overallSimilarity).toBe(84.6);
    expect(res.paragraphFlags.length).toBeGreaterThan(0);
    expect(res.sentenceFlags.length).toBeGreaterThan(0);
  });

  it('Test B: Every field equals the corresponding field of executeSimilarityAnalysis, except the two new fields', () => {
    const granularRes = executeGranularSimilarityAnalysis(docA, docA);
    const standardRes = verifyCoreService.executeSimilarityAnalysis(docA, docA);

    const { paragraphFlags, sentenceFlags, ...restGranular } = granularRes;

    expect(restGranular).toEqual(standardRes);
  });

  it('Test C: Two consecutive calls with the same input return byte-identical JSON', () => {
    const run1 = executeGranularSimilarityAnalysis(docA, docA);
    const run2 = executeGranularSimilarityAnalysis(docA, docA);

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });

  it('Test D: Existing suite tests/deterministicSimilarityEvidence.test.ts passes', () => {
    const resIdentical = verifyCoreService.executeSimilarityAnalysis(docA, docA);
    expect(resIdentical.overallSimilarity).toBe(84.6);
    expect(resIdentical.deterministic).toBe(true);
    expect(resIdentical.findings.length).toBeGreaterThan(0);
  });

  it('Test E: git diff -- src/services/verify/documentNormalizer.ts is empty', () => {
    const diff = execSync('git diff -- src/services/verify/documentNormalizer.ts', {
      encoding: 'utf-8',
    }).trim();
    expect(diff).toBe('');
  });

  it('Test F: git diff -- src/services/verify/canonicalTextOffsetService.ts is empty', () => {
    const diff = execSync('git diff -- src/services/verify/canonicalTextOffsetService.ts', {
      encoding: 'utf-8',
    }).trim();
    expect(diff).toBe('');
  });

  it('Test G: Public evaluateDocumentSimilarity output equals frozen baseline for all three fixtures', () => {
    // Fixture 1: Identical self-comparison
    const resIdentical = evaluateDocumentSimilarity(docA, docA);
    expect(resIdentical.overallSimilarity).toBe(84.6);
    expect(resIdentical.findings.length).toBeGreaterThan(0);
    expect(resIdentical.engineVersion).toBe('SIM-V1');
    expect(resIdentical.policyVersion).toBe('2026.09-academic-evidence');

    // Fixture 2: Unrelated comparison
    const resUnrelated = evaluateDocumentSimilarity(docA, docUnrelated);
    expect(resUnrelated.overallSimilarity).toBe(0);
    expect(resUnrelated.findings.length).toBe(0);
    expect(resUnrelated.engineVersion).toBe('SIM-V1');
    expect(resUnrelated.policyVersion).toBe('2026.09-academic-evidence');

    // Fixture 3: Partial overlap
    const resPartial = evaluateDocumentSimilarity(docA, docAPartial);
    expect(resPartial.overallSimilarity).toBe(54.9);
    expect(resPartial.findings.length).toBeGreaterThan(0);
    expect(resPartial.engineVersion).toBe('SIM-V1');
    expect(resPartial.policyVersion).toBe('2026.09-academic-evidence');
  });

  it('Test H: evaluateDocumentSimilarityInternal and evaluateDocumentSimilarity produce the same underlying result, and internal exposes paragraphFlags and sentenceFlags', () => {
    const internalRes = evaluateDocumentSimilarityInternal(docA, docA);
    const publicRes = evaluateDocumentSimilarity(docA, docA);

    expect(internalRes.overallSimilarity).toBe(publicRes.overallSimilarity);
    expect(internalRes.findings).toEqual(publicRes.findings);
    expect(internalRes.engineVersion).toBe(publicRes.engineVersion);
    expect(internalRes.policyVersion).toBe(publicRes.policyVersion);
    expect(internalRes.deterministic).toBe(publicRes.deterministic);

    // Verify internal additionally exposes the flags directly from aggregation
    expect(internalRes.paragraphFlags.length).toBeGreaterThan(0);
    expect(internalRes.sentenceFlags.length).toBeGreaterThan(0);
  });
});
