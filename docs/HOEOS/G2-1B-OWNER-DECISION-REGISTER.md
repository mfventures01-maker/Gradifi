# G2-1B — Owner Decision Register

Gate: G2-1B — Scoring and Metric Semantics
Baseline commit: 17b3f3dce5673dbee7313d1375496be6f18d8db0
Engine under test: 48353296a3fbb9714bb2607485011c5616f212666c22719229e77824b104c169
Status: SIGNED

## Decisions

DEC-01 — uniqueMatchedCoverage
Define as the percentage of distinct document token positions supported by
qualifying, independently verifiable source-level matching evidence.
Simple token-vocabulary membership is classified as lexical overlap and is
not, on its own, proof of copied material. Phrase-matched spans may
contribute when document and source coordinates are validated.

DEC-02 — documentCoverage (per-source)
Per-source coverage uses the same qualifying-match basis and the same
document token denominator. The sum of per-source coverages may exceed
global coverage because the same positions can be matched by multiple
sources.

DEC-03 — sentenceQualifiedCoverage (SQC)
Retain the current sentence-admission computation as a separate diagnostic
metric named sentenceQualifiedCoverage. Every report must display the
admission threshold used to compute it, immediately adjacent to the value.

DEC-04 — Global aggregation
Global uniqueMatchedCoverage is the union of qualifying matched document
token positions across sources; each position counted once.

DEC-05 — Threshold governance
The 40% sentence-admission threshold remains operational but is not
approved as a universal standard. It is NOT OBSERVED IN THE TESTED
SCORING CONSTRUCTIONS (B3). Calibration is required under G2-9.

DEC-06 — Implementation restriction
G2-1B authorises metric definitions only. No engine change, threshold
change, or scoring-formula change is authorised under G2-1B. The engine
remains at 48353296a3fbb9714bb2607485011c5616f212666c22719229e77824b104c169.

## Additional acceptance requirements for G2-2

T1 — Common-word control
T2 — Repeated-token control
T3 — Phrase-span validation
T4 — Source provenance
T5 — Independent recomputation
T6 — Multi-paragraph offset control

## Signature

Owner: __________HOEOS____________
Date: _____________30/10/2026_________
Decision: [X] APPROVE WITH MODIFICATIONS
Signature class: [X] DIGITAL

I accept the decisions recorded above and authorise preparation of the
G2-1B closure packet.