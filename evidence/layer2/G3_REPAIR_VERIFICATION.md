# Gate G3: Deterministic Engine Repair Verification Report

**Document ID:** `G3-REPAIR-VERIFICATION-20261029T113000Z`  
**Timestamp (UTC):** 2026-10-29T11:30:00Z  
**Governing Standard:** HOEOS v2 (Articles 1–6)  
**Project:** Gradifi  
**Workstream:** Layer 2 Commercial Gate (`L2-CG-01`)  
**Repository Path:** `C:\Projects\Gradifi`  
**Git Branch:** `clean-deploy`  
**Parent Run ID:** `run-2026-10-29T11-13-35Z`  
**Production Status:** **`HARD HOLD`**  
**Gate G3 Verdict:** **`PASS`**  

---

## 1. Executive Summary

All three documented Layer 2 defects have been repaired in the authoritative production engine path through minimal, surgical code edits. Zero secondary scoring paths or mock engines were introduced.

1. **Defect A Repaired (`L2-CAT-C-03` False Positive):** Sentence token coverage is now gated by substantive similarity (`similarityPercentage >= 40`, corresponding to `MODERATE_SIMILARITY_SENTENCE` and above). In C-03, incidental 2-gram overlap ($25.1\%$) is reported as an informational flag without inflating document coverage. Overall similarity changed from $100.0\%$ to $0.0\%$, converting the false positive to a True Negative (`TN`).
2. **Defect B Repaired (`L2-CAT-H-02` Offset Misalignment):** `segmentDocument` now correctly calculates paragraph start position including leading whitespace (`pStart = match.index + pLeading`). Sentence spans now achieve **100.0% raw text slice accuracy** (23 / 23).
3. **Defect C Repaired (Phrase-Span Coordinate Drift):** Implemented deterministic token span mapping (`mapTokenSpans`), eliminating all coordinate drift across hyphens, diacritics, and punctuation. Phrase spans achieved **100.0% exact raw text slice accuracy** (796 / 796).

---

## 2. Authorized Source Code Modifications

### 2.1 File: `src/services/verify/deterministicEngine.ts`
- **Location:** Line 521–523
- **Edit:**
  ```diff
  - // Track token coverage for this sentence if matched
  - if (sentenceMatch.similarityPercentage >= 20) {
  + // Track token coverage for this sentence if matched with substantive similarity (>= 40% MODERATE or HIGH)
  + if (sentenceMatch.similarityPercentage >= 40) {
  ```
- **Rationale:** Strictly preserves the owner's `ACCEPT_WHOLE_SENTENCE_COVERAGE` policy while ensuring that incidental common-word overlap (<40%) does not falsely inflate document coverage to 100%.

### 2.2 File: `src/services/verify/documentNormalizer.ts`
- **Location:** Lines 95–130
  - Added deterministic token span mapping function `mapTokenSpans(sText, tokens)` to map each token to its exact character boundaries in `sText`.
- **Location:** Lines 160–166
  - Added paragraph leading whitespace offset calculation:
    ```typescript
    const pLeading = match[0].length - match[0].trimStart().length;
    const pStart = match.index + pLeading;
    const pEnd = pStart + pText.length;
    ```
- **Location:** Lines 220–245
  - Mapped n-gram phrase start and end directly to token spans:
    ```typescript
    const startRel = tokenSpans[i] ? tokenSpans[i].start : 0;
    const endRel = tokenSpans[i + n - 1] ? tokenSpans[i + n - 1].end : (startRel + phraseText.length);
    const startChar = sStart + startRel;
    const endChar = sStart + endRel;
    ```

---

## 3. Repaired Engine Verification Results

- **Run ID:** `run-2026-10-29T11-13-35Z`
- **Total Fixtures:** 25
- **Passed:** **25 / 25 (100.0%)**
- **Failed:** **0 (0.0%)**

### Repaired Confusion Matrix & Performance Metrics

| Evaluation Metric | Observed Result | Approved Threshold | Margin / Status |
| :--- | :---: | :---: | :---: |
| **Document Precision** | **100.0%** (15 / 15) | $\ge 95.0\%$ | $+5.0\%$ (**PASS**) |
| **Document Recall** | **100.0%** (15 / 15) | $\ge 90.0\%$ | $+10.0\%$ (**PASS**) |
| **False Positive Rate (FPR)** | **0.0%** (0 / 10) | $\le 5.0\%$ | $-5.0\%$ (**PASS**) |
| **False Negative Rate (FNR)** | **0.0%** (0 / 15) | $0.0\%$ | **PASS** |
| **Passage Precision** | **100.0%** (19 / 19) | $\ge 90.0\%$ | **PASS** |
| **Passage Recall** | **100.0%** (19 / 19) | $\ge 90.0\%$ | **PASS** |
| **Source Attribution Accuracy** | **100.0%** (15 / 15) | $100.0\%$ | **PASS** |
| **Sentence Span Raw Text Accuracy** | **100.0%** (23 / 23) | $\ge 95.0\%$ | $+5.0\%$ (**PASS**) |
| **Phrase Span Raw Text Accuracy** | **100.0%** (796 / 796) | $\ge 95.0\%$ | $+5.0\%$ (**PASS**) |
| **AI Advisory Isolation** | **100.0%** (7 / 7) | $100.0\%$ | **PASS** |
| **Deterministic Repeatability** | **100.0%** (25 / 25) | $100.0\%$ | **PASS** |

---

## 4. Regression & Safety Invariant Audit

1. **G2 Golden Fixture Suite:** `npx vitest run tests/deterministicSimilarityEvidence.test.ts` executed with 10 / 10 assertions passing (exit code 0).
2. **TypeScript Compilation:** `npx tsc --noEmit` executed with 0 errors (exit code 0).
3. **AI Isolation Boundary:** Verified across 7 adversarial conditions; deterministic scores, hashes, and spans remain 100% invariant.
4. **Repeatability:** Executed across 3 independent passes with fresh process invocation; all 25 fixtures produced identical `authoritativeHash` and `evidenceHash`.

---

## 5. Gate G3 Acceptance Verdict

`PASS`. All three documented defects are repaired, all approved commercial thresholds are satisfied on the 25-fixture baseline, zero regressions were introduced, and the working tree remains strictly controlled under `HARD HOLD`.

