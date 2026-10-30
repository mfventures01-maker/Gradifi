# HOEOS G2-1B: Similarity Threshold Governance Decision Record

**Document:** `docs/hoeos/G2-1B-threshold-governance.md`
**Workstream:** G2-1B
**Status:** `AWAITING_OWNER_DECISION`
**Implementation authorization:** NOT GRANTED
**Production status:** HARD HOLD
**Decision owner:** Awaiting identification/confirmation
**Decision date:** Pending

---

## 1. Purpose

This document establishes the complete current scoring policy implementation, records the available governance options, identifies the unresolved policy questions, and provides a formal decision point for the project owner.

No implementation change is authorized by this document.

The purpose is to ensure that scoring policy behavior, policy versioning, and verification receipts remain deterministic, explainable, and auditable.

## 2. Current verified implementation state

Source inspection was performed at commit `fdcd2b1ab9f04349b05b43f1e0d769b0140bbcf3`. The dependency trace is captured in evidence item E-07.

### 2.1 Consolidated scoring architecture

There are three independent score paths and one display path:

**Path A — Source-level scoring (`aggregateSourceScore`)**

```
highestSentenceMatch  = max(similarityPercentage) over sourceSentenceMatches
sourceCoverage        = sourceMatchedTokenIndices.size / docTokens.length
aggregateSourceScore  = min(100, round((sourceCoverage * 0.4 + highestSentenceMatch * 0.6) * 10) / 10)
```

- `sourceSentenceMatches` is populated at line 512 for every sentence, unconditionally. Each sentence's `similarityPercentage` is 0 unless the sentence matched, and the LOW boundary (line 256, `>= 20`) governs whether the sentence receives a nonzero similarity. Therefore the LOW boundary affects `highestSentenceMatch`.
- `sourceMatchedTokenIndices.add` occurs exactly once, at line 528, inside the `>= 40` gate at line 522. Therefore the 40% boundary controls `sourceCoverage`.

**Path B — Global overall similarity (`overallSimilarity`)**

```
uniqueMatchedCoverage = globalMatchedTokenIndices.size / docTokens.length
overallSimilarity     = uniqueMatchedCoverage
```

- `globalMatchedTokenIndices.add` occurs exactly once, at line 529, inside the same `>= 40` gate at line 522. Therefore the 40% boundary controls `overallSimilarity`.
- The 40% boundary is thus a shared admission condition for both `sourceCoverage` and `uniqueMatchedCoverage`.

**Path C — Paragraph evidence (display-only)**

```
coveredTokens        = sum of sentence tokens where similarity >= 20    (line 298)
coveragePercentage   = coveredTokens / paragraph.tokenCount            (line 305)
similarityPercentage = weightedSimilaritySum / coveredTokens           (line 306-308)
flag                 = HIGH (>= 60) | MODERATE (>= 30) | LOW (>= 10)    (line 311-316)
```

The `evaluateParagraphMatch` function body (lines 279-331) mutates no outer state and returns only paragraph evidence. There is no path from any paragraph threshold to `aggregateSourceScore`, `highestSourceMatch`, `uniqueMatchedCoverage`, or `overallSimilarity`. Paragraph thresholds are display-only.

**Path D — Relevance score (secondary per-source metric)**

```
relevanceScore = min(100, round((sourceCoverage * 0.5 + highestSentenceMatch * 0.5) * 10) / 10)   (line 586)
```

This is a second weighting (50/50) distinct from `aggregateSourceScore` (40/60). It feeds the `EvidenceMatch.relevanceScore` field, not `aggregateSourceScore` or `overallSimilarity`.

### 2.2 Complete policy inventory

**Score-affecting parameters:**

| ID | Parameter | Current | Location | Effect on score |
|---|---|---|---|---|
| P1 | Global token admission | 40 | deterministicEngine.ts:522 | Controls both `sourceMatchedTokenIndices.add` (528) and `globalMatchedTokenIndices.add` (529). Feeds `sourceCoverage` (40% weight of `aggregateSourceScore`) and `uniqueMatchedCoverage` (100% of `overallSimilarity`). |
| P2 | Source sentence admission (LOW boundary) | 20 | deterministicEngine.ts:256 | Sets the minimum similarity for a sentence to receive a nonzero `similarityPercentage`. Feeds `highestSentenceMatch` (60% weight of `aggregateSourceScore`). |
| P3 | Source aggregate weighting | 0.4 / 0.6 | deterministicEngine.ts:572 | Direct weight in `aggregateSourceScore = sourceCoverage * 0.4 + highestSentenceMatch * 0.6`. |
| P4 | Source relevance weighting | 0.5 / 0.5 | deterministicEngine.ts:586 | Direct weight in `relevanceScore = sourceCoverage * 0.5 + highestSentenceMatch * 0.5`. Feeds `EvidenceMatch.relevanceScore`, not `aggregateSourceScore` or `overallSimilarity`. |

**Display-only parameters (evidence-only effect):**

| ID | Parameter | Current | Location |
|---|---|---|---|
| P5 | Sentence MODERATE boundary | 40 | deterministicEngine.ts:254 |
| P6 | Sentence HIGH boundary | 75 | deterministicEngine.ts:252 |
| P7 | Paragraph coverage admission | 20 | deterministicEngine.ts:298 |
| P8 | Paragraph classification boundaries | 60 / 30 / 10 | deterministicEngine.ts:311-316 |

**Versioning:**

| ID | Parameter | Current | Location |
|---|---|---|---|
| P9 | Policy version identifier | `2026.09-academic-evidence` | deterministicEngine.ts:63 |

### 2.3 Persistence and receipt traceability

The inspected persistence implementation records:

```
policy_version: result.policyVersion || 'G3-POLICY-v1'
```

The receipt stores the policy version label but does not appear to store the effective numerical threshold values (P1-P4). Two verification runs under `policy_version = '2026.09-academic-evidence'` therefore cannot be distinguished from their receipts alone if any of P1-P4 changed without a corresponding policy version change.

This does not establish that no other persistence path records the effective policy. That requires separate verification.

## 3. Historical reason for the threshold change

Commit `9ee57c3` raised the sentence coverage gate from `>= 20` to `>= 40`. Its stated reason was closure of `L2-CAT-C-03`. The commit message is the cited authority for that reason.

The commit did not touch P2 (source sentence admission), P3/P4 (weightings), P5/P6 (sentence classification), or P7/P8 (paragraph thresholds). Those elements are unchanged since their introduction and are not covered by any recorded policy decision.

The following evidence must accompany the final decision record:

1. The full `9ee57c3` commit message and relevant diff.
2. G2 similarity score-isolation evidence (E-02).
3. G2 source-line causality confirmation (E-03).
4. The source inspection at `fdcd2b1` (E-04).
5. The complete dependency trace at `fdcd2b1` (E-07).

**Blueprint evidence limitation:** The HOEOS Blueprint Section 3 wording referenced during this investigation was supplied in conversation. The canonical document was not located in the repository during the reported search. The conversational transcription must not be represented as an independently verified repository document.

## 4. Available governance options

### Option A: Retain all current values without policy-version change

No source changes. No behavior changes. No version change.

**Audit implication:** the receipt does not declare P1-P4 numerically. Future readers cannot reconstruct the policy from the receipt alone.

### Option B: Retain all current values and introduce an explicit policy version

Bump `POLICY_VERSION` to a descriptive string that names the effective P1-P4 values. Update tests that assert the current version string.

**Audit implication:** new receipts carry an explicit version identifier that names the effective P1-P4 values. This is a naming change, not a behavioral change.

### Option C1: Parameterize P1 only (global 40% gate)

Add `globalTokenAdmission?: number` to `DeterministicAnalysisInput`, defaulting to 40. Use it at line 522. Leaves P2-P4 hard-coded.

**Audit implication:** partial. `sourceCoverage` and `uniqueMatchedCoverage` become configurable together (both derive from the same gate), but `highestSentenceMatch` (via P2) and both weightings remain fixed.

### Option C2: Parameterize P1 and P2 (both score-affecting thresholds)

Add `globalTokenAdmission?: number` (default 40) and `sourceSentenceAdmission?: number` (default 20) to `DeterministicAnalysisInput`. Leaves P3-P4 hard-coded.

**Audit implication:** all score-affecting thresholds are configurable. Weightings remain fixed.

### Option C3: Parameterize the complete scoring policy (P1-P4)

Add a `scoringPolicy?: ScoringPolicy` field with `globalTokenAdmission`, `sourceSentenceAdmission`, `sourceCoverageWeight`, `highestSentenceWeight`, `relevanceCoverageWeight`, `relevanceSentenceWeight`, and a `version` string. Every value defaults to the current constant. Every threshold and weight site in the engine reads from the effective policy.

Persist the effective policy in every verification receipt.

**Audit implication:** complete. Each verification record identifies every score-affecting parameter used for that run.

### Option D: Full parameterization including display-only parameters

Extend Option C3 to also cover P5-P8 (sentence classification, paragraph coverage admission, paragraph classification). Useful for institutional display customization, but does not affect any score.

**Audit implication:** complete for both score and display policy. Larger change surface.

## 5. Decisions required from the owner

**Decision 1 — Score-affecting parameters (P1-P4).**

Select one:

- [ ] Option A: keep all fixed, no version change.
- [ ] Option B: keep all fixed, bump `POLICY_VERSION` to reflect current values.
- [ ] Option C1: parameterize P1 only, default unchanged.
- [ ] Option C2: parameterize P1 and P2, defaults unchanged.
- [ ] Option C3: parameterize P1-P4 via a `ScoringPolicy` contract, defaults unchanged.

**Decision 2 — Display-only parameters (P5-P8).**

- [ ] Leave fixed.
- [ ] Parameterize alongside Option C3 (i.e., Option D).
- [ ] Defer.

**Decision 3 — Receipt traceability.**

- [ ] Policy version only, backed by an immutable policy definition.
- [ ] Policy version plus the effective values of every parameterized element.
- [ ] Policy version plus a reference to a versioned, immutable policy record.

**Decision 4 — Canonical Blueprint Section 3 location.**

- [ ] Commit the canonical Blueprint Section 3 to the repository at a known path.
- [ ] Cite an external authoritative source and preserve it as an evidence artifact.
- [ ] Defer.

**Rationale for any non-default choice:**

Pending owner response.

## 6. Evidence register

| Evidence ID | Description | Reference |
|---|---|---|
| E-01 | Historical threshold change | Commit `9ee57c3` and full commit message |
| E-02 | Similarity score isolation | `g2-score-isolation-r2-20261030T124605Z` |
| E-03 | Source-line causality confirmation | `g2-cause-confirm-20261030T131455Z` |
| E-04 | Current threshold and persistence inspection | Read at commit `fdcd2b1` |
| E-05 | HOEOS Blueprint Section 3 | Conversational transcription; canonical repository source not yet located |
| E-06 | Three-questions read (Q1, Q2, Q3) | Read at `fdcd2b1` |
| E-07 | Complete dependency trace (gaps 1 and 2) | `g2-1b-trace-20261030T152300Z` — trace hash: `
48d1917527d5ce479ca770758eee6e4e2414099865a3086fe84ae274fdc98a8a
` |

## 7. Authorization boundary

Until the owner decision is recorded:

- No threshold implementation change is authorized.
- No threshold parameterization is authorized.
- No policy-version change is authorized.
- No persistence schema change is authorized.
- No weighting change is authorized.
- No production release is authorized.

The decision record itself does not authorize implementation.

## 8. Owner decision record

**Decision status:** `AWAITING_OWNER_DECISION`

**Owner:** Pending

**Decision date:** Pending

**Decision 1 (P1-P4):** Pending

**Decision 2 (P5-P8):** Pending

**Decision 3 (Receipt traceability):** Pending

**Decision 4 (Blueprint location):** Pending

**Rationale:** Pending

**Owner approval/signature:** Pending

## 9. Closure criteria

G2-1B may be considered closed only when:

1. The owner decision is documented.
2. The canonical policy definition is identified or established.
3. The selected policy is reflected in the implementation (if any implementation is authorized).
4. Tests demonstrate the approved behavior for any parameterized element.
5. Receipts preserve the required policy and threshold evidence.
6. Historical behavior and compatibility implications are documented.
7. The implementation diff and evidence are reviewed under HOEOS gates.
8. The closure commit is verified.

**Current disposition: AWAITING_OWNER_DECISION.**

**Production remains HARD HOLD.**
