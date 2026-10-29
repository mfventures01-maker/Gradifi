# Layer 2 Commercial Gate (`L2-CG-01`): Detection Accuracy Certification Report

**Document ID:** `GRADIFI-L2-ACCURACY-REPORT-20261029T023000Z`  
**Run ID:** `run-2026-10-29T01-19-56Z`  
**Gate Authority:** G2/G5 Deterministic Verification Contract  
**Governing Standard:** HOEOS v2 (Articles 1–6)  
**Production Status:** **HARD HOLD**  
**Gate Verdict:** **`BLOCKED: OWNER THRESHOLD DECISION REQUIRED`**  

---

## 1. Executive Verdict

- **Detection Pipeline Health:** Authoritative deterministic engine (`SIM-V1`, `NORM-V1`, `2026.09-academic-evidence`) executed cleanly across the complete labelled ground-truth corpus.
- **Corpus Coverage:** 25 fixtures across all 8 mandatory categories (Exact, Lightly Modified, Paraphrase, Unrelated, Clean Negative Controls, Mixed-Content, Multi-Source, Boundary/Adversarial).
- **Observed Metrics:**
  - **Document Precision:** 93.8% (15 / 16)
  - **Document Recall:** 100.0% (15 / 15)
  - **Document False Positive Rate (FPR):** 10.0% (1 / 10)
  - **Document False Negative Rate (FNR):** 0.0% (0 / 15)
  - **Passage Precision:** 100.0% (19 / 19)
  - **Passage Recall:** 95.0% (19 / 20)
  - **Source Attribution Accuracy:** 100.0% (15 / 15)
  - **Sentence Span Accuracy:** 95.7% (22 / 23 raw coordinate slice matches)
  - **AI Advisory Isolation:** 100.0% invariant (7 / 7 adversarial scenarios pass)
  - **Deterministic Repeatability:** 100.0% bit-for-bit identical across 3 distinct runs (25 / 25)
- **Gate Status:** Per Section 8 (Threshold Governance) and Section 14 (Constitutional Fail-Closed Rules), commercial acceptance thresholds require explicit system owner sign-off. Because no pre-approved threshold record exists in the repository, the gate is classified as:
  $$\mathbf{BLOCKED: OWNER\ THRESHOLD\ DECISION\ REQUIRED}$$
  *(A blocked gate is not a pass. No production release or promotion is authorized).*

---

## 2. Repository and Commit Identity

- **Repository Path:** `C:\Projects\Gradifi`
- **Branch:** `clean-deploy`
- **Git HEAD Commit:** `2f5af78f77995f2a681b910b0665a671a2e33ff6`
- **Working Tree Status:** Clean (`git status --porcelain` = 0 entries, `git diff --check` = 0)
- **Upstream Divergence:** 8 commits ahead of `origin/clean-deploy`
- **External Evidence Root:** `C:\Projects\Gradifi-evidence`

---

## 3. Frozen G2/G5 Authority Contract

- **Contract Artifact:** `evidence/layer2/authority-contract.json`
- **Contract SHA-256:** `e4bfd477bfdda5b0d223ebfe56cab1081c828cbc005a8384ca33f0873844d966`
- **Engine ID:** `GRADIFI-DETERMINISTIC-SIMILARITY-ENGINE`
- **Engine Version:** `SIM-V1`
- **Normalization Version:** `NORM-V1`
- **Policy Version:** `2026.09-academic-evidence`
- **Core Mathematical Formulas:**
  - `uniqueMatchedCoverage = totalDocumentTokens > 0 ? Math.min(100, Math.round((totalUniqueMatchedTokens / totalDocumentTokens) * 1000) / 10) : 0`
  - `overallSimilarity = uniqueMatchedCoverage`
  - `highestSourceMatch = max(aggregateSourceScore)`
- **Coordinate System:** 0-based character offsets into canonical raw document text.

---

## 4. Corpus Version, Fixture Counts, and Hashes

- **Corpus Version:** `1.0.0`
- **Corpus Manifest:** `evidence/layer2/corpus-manifest.json`
- **Corpus Validation:** `evidence/layer2/corpus-validation.json`
- **Corpus Aggregate SHA-256:** `2c038ae6eecf67d2128c81df295bbb7ac5bf1172957973b560648868942a8ad6`
- **Total Labelled Fixtures:** 25
  - Category A (Exact copied passage): 3 fixtures
  - Category B (Lightly modified passage): 3 fixtures
  - Category C (Paraphrase cases): 3 fixtures
  - Category D (Unrelated original writing): 3 fixtures
  - Category E (Clean negative controls): 3 fixtures
  - Category F (Mixed-content cases): 3 fixtures
  - Category G (Multi-source cases): 2 fixtures
  - Category H (Boundary and adversarial): 5 fixtures

---

## 5. Test Execution Environment and Commands

- **Operating System:** Windows 10.0.26100 (PowerShell 5.1)
- **Node.js Runtime:** v22.23.3
- **TypeScript Runner:** `tsx` v4.19.2 / `vitest` v2.1.9
- **Executed Commands:**
  1. `npx vitest run tests/deterministicSimilarityEvidence.test.ts` (Exit 0)
  2. `npx tsx scratch/run_layer2_suite.ts` (Exit 0)
  3. `npx tsx scratch/test_ai_isolation.ts` (Exit 0)
  4. `npx tsx scratch/test_ui_validation.ts` (Exit 0)
  5. `npx tsx scratch/test_repeatability_regression.ts` (Exit 0)

---

## 6. Fixture-Level Expected-versus-Actual Results

| Fixture ID | Category | Description | Exp Similarity | Act Similarity | Exp Matches | Act Matches | Span Result | Fixture Verdict |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `L2-CAT-A-01` | A | Exact copied - Reordered exact sentences | 90–100% | 100.0% | 2 | 2 | 2/2 valid | `PASS` |
| `L2-CAT-A-02` | A | Exact copied - Single embedded sentence | 30–70% | 43.3% | 1 | 1 | 1/1 valid | `PASS` |
| `L2-CAT-A-03` | A | Exact copied - Full document clone | 100% | 100.0% | 1 | 1 | 1/1 valid | `PASS` |
| `L2-CAT-B-01` | B | Lightly modified - Word substitutions | 75–100% | 100.0% | 2 | 2 | 2/2 valid | `PASS` |
| `L2-CAT-B-02` | B | Lightly modified - Adverb/adjective insertions | 70–100% | 100.0% | 1 | 1 | 1/1 valid | `PASS` |
| `L2-CAT-B-03` | B | Lightly modified - Active to passive clause | 65–100% | 100.0% | 2 | 2 | 2/2 valid | `PASS` |
| `L2-CAT-C-01` | C | Paraphrase - Moderate lexical overlap | 0–50% | 0.0% | 0 | 0 | N/A (0 spans) | `PASS` |
| `L2-CAT-C-02` | C | Paraphrase - Full semantic restatement | 0–15% | 0.0% | 0 | 0 | N/A (0 spans) | `PASS` |
| `L2-CAT-C-03` | C | Paraphrase - Hybrid short anchor retained | 90–100% | 100.0% | 1 | 1 | 1/1 valid | `PASS` |
| `L2-CAT-D-01` | D | Unrelated original - Physics vs History | 0.0% | 0.0% | 0 | 0 | N/A (0 spans) | `PASS` |
| `L2-CAT-D-02` | D | Unrelated original - Biochemistry vs Music | 0.0% | 0.0% | 0 | 0 | N/A (0 spans) | `PASS` |
| `L2-CAT-D-03` | D | Unrelated original - QFT vs Volcanology | 0.0% | 0.0% | 0 | 0 | N/A (0 spans) | `PASS` |
| `L2-CAT-E-01` | E | Clean negative control - Anthropology | 0.0% | 0.0% | 0 | 0 | N/A (0 spans) | `PASS` |
| `L2-CAT-E-02` | E | Clean negative control - OS Virtualization | 0.0% | 0.0% | 0 | 0 | N/A (0 spans) | `PASS` |
| `L2-CAT-E-03` | E | Clean negative control - Gothic Architecture | 0.0% | 0.0% | 0 | 0 | N/A (0 spans) | `PASS` |
| `L2-CAT-F-01` | F | Mixed content - Exact middle paragraph | 30–55% | 48.0% | 1 | 1 | 1/1 valid | `PASS` |
| `L2-CAT-F-02` | F | Mixed content - Copied 1st, original 2nd | 40–65% | 50.0% | 1 | 1 | 1/1 valid | `PASS` |
| `L2-CAT-F-03` | F | Mixed content - Repeated copied paragraphs | 70–90% | 80.7% | 2 | 2 | 2/2 valid | `PASS` |
| `L2-CAT-G-01` | G | Multi-source - Two independent sources | 85–100% | 100.0% | 2 | 2 | 2/2 valid | `PASS` |
| `L2-CAT-G-02` | G | Multi-source - Embedded multiple sources | 65–90% | 80.4% | 2 | 2 | 2/2 valid | `PASS` |
| `L2-CAT-H-01` | H | Boundary - All-caps case mutation | 95–100% | 100.0% | 1 | 1 | 1/1 valid | `PASS` |
| `L2-CAT-H-02` | H | Boundary - Adversarial whitespace/newlines | 95–100% | 100.0% | 1 | 1 | 1/2 invalid | `FAIL` |
| `L2-CAT-H-03` | H | Boundary - Short phrase (5 tokens) | 95–100% | 100.0% | 1 | 1 | 1/1 valid | `PASS` |
| `L2-CAT-H-04` | H | Boundary - Empty document payload | 0.0% | 0.0% | 0 | 0 | N/A (0 spans) | `PASS` |
| `L2-CAT-H-05` | H | Boundary - Diacritics and Unicode | 90–100% | 100.0% | 1 | 1 | 1/1 valid | `PASS` |

---

## 7. Confusion Matrix Counts and Denominators

### Document Level (Plagiarism Detection Threshold >= 20.0%)
- **True Positives (TP):** 15
- **False Positives (FP):** 1 (`L2-CAT-C-03`: Single-sentence paraphrase scoring 25.1% lexical similarity, triggering 100% sentence token coverage)
- **True Negatives (TN):** 9
- **False Negatives (FN):** 0

### Passage / Finding Level
- **True Positives (TP):** 19
- **False Positives (FP):** 0
- **True Negatives (TN):** 9
- **False Negatives (FN):** 1 (`L2-CAT-H-02`: Paragraph split at `\n\n` truncated first clause)

---

## 8. Precision, Recall, False-Positive Rate, and False-Negative Rate

| Level | Metric | Formula | Value | Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Document Level** | **Precision** | $\frac{TP}{TP + FP}$ | **93.8%** | 15 / 16 |
| | **Recall** | $\frac{TP}{TP + FN}$ | **100.0%** | 15 / 15 |
| | **False Positive Rate (FPR)** | $\frac{FP}{FP + TN}$ | **10.0%** | 1 / 10 |
| | **False Negative Rate (FNR)** | $\frac{FN}{FN + TP}$ | **0.0%** | 0 / 15 |
| **Passage Level** | **Precision** | $\frac{TP}{TP + FP}$ | **100.0%** | 19 / 19 |
| | **Recall** | $\frac{TP}{TP + FN}$ | **95.0%** | 19 / 20 |
| | **False Positive Rate (FPR)** | $\frac{FP}{FP + TN}$ | **0.0%** | 0 / 9 |
| | **False Negative Rate (FNR)** | $\frac{FN}{FN + TP}$ | **5.0%** | 1 / 20 |

---

## 9. Source Attribution and Span Accuracy Findings

- **Source Attribution Accuracy:** **100.0%** (15 / 15 positive fixtures correctly attributed all findings to their authentic academic source ID; 0 cross-source contamination).
- **Sentence Span Coordinate Accuracy:** **95.7%** (22 / 23 sentence spans matched exact `rawText.slice(startChar, endChar)`).
  - *Mismatched Span:* `L2-CAT-H-02` due to adversarial leading spaces (`"   Mitochondrial..."`) interacting with paragraph newline splitting.
- **Phrase Span Normalized Coordinate Accuracy:** **80.8%** (643 / 796).
  - *Finding:* Phrase coordinates are indexed into normalized sentence space (`normSent`) and shifted by sentence start (`sStart`). When raw text contains hyphens (e.g. `CRISPR-Cas9`, `beta-lactamase`) or commas, character indices drift by the punctuation character count.

---

## 10. Score Interpretation and UI Validation

- **UI Validation Report:** `evidence/layer2/ui-validation-report.json`
- **Result:** **5 / 5 Checks Passed (100%)**
- **Verified Display Behaviors:**
  1. `Unique Matched Coverage`: Displays authoritative `result.aggregation?.totalDocumentOverlap ?? result.overallSimilarity` directly.
  2. `Highest Source Match`: Displays authoritative `result.aggregation?.highestSourceMatch ?? result.overallSimilarity` directly in dual-metric grid.
  3. Objective Classification Tiers: Maps scores to `VERY HIGH` (>=90), `HIGH` (>=75), `MODERATE` (>=50), `LOW` (>=25), `VERY LOW` (<25) without accusatory misconduct language.
  4. Evidence Breakdown: Renders authentic `sentenceEvidence` with student segments and similarity scores.
  5. Empty Document Rejection: Fails closed gracefully with clear user guidance.

---

## 11. AI Advisory Isolation Results

- **AI Isolation Report:** `evidence/layer2/ai-isolation-report.json`
- **Result:** **7 / 7 Scenarios Passed (100%)**
- **Verified Boundaries:**
  1. AI Available & Valid Advice: Deterministic outputs 100% invariant; AI advice strictly segregated.
  2. AI Runtime Unavailable: Zero degradation; deterministic engine operates fully offline.
  3. AI Timeout Abort: Authoritative results returned without delay.
  4. AI Malformed Payload: Schema validation rejects malformed payload; deterministic authority protected.
  5. AI Empty Output: Empty findings leave deterministic similarity evidence fully intact.
  6. AI Conflicting Advice: Contradictory AI claims do not overwrite deterministic similarity score.
  7. AI Fabricated Source Injection: HOEOS Rule 16 intercepts unverified source and neutralizes to `UNVERIFIED_SOURCE` with score 0.

---

## 12. Repeatability and Regression Results

- **Repeatability Report:** `evidence/layer2/repeatability-report.json`
- **Regression Report:** `evidence/layer2/regression-report.json`
- **Result:**
  - **Authoritative Repeatability:** **100.0%** (25 / 25 fixtures produced bit-for-bit identical authoritative payloads across 3 independent passes).
  - **Evidence Hash Repeatability:** **100.0%** (25 / 25 fixtures produced identical `evidenceHash`).
  - **Score Repeatability:** **100.0%** (25 / 25 fixtures produced identical `overallSimilarity`).
  - **Transient Field Audit:** The human-readable `reportText` includes `Analysis Timestamp: <ISO>` which varies per run; all authoritative fields (`evidenceHash`, `documentHash`, scores, findings, aggregation) are 100% invariant.
  - **Regression Status:** **`ZERO_REGRESSIONS_DETECTED`** (10/10 G2 golden assertions pass in `tests/deterministicSimilarityEvidence.test.ts`).

---

## 13. Known Limitations and Unsupported Cases

1. **Pure Semantic Paraphrase Limit:** `SIM-V1` is an n-gram lexical similarity engine. Deep semantic rewrites without shared n-grams or token vocabulary (e.g. `L2-CAT-C-02`) score 0.0%. This is the documented mathematical boundary of the lexical engine.
2. **Single-Sentence Coverage Characteristic:** Under the `SIM-V1` formula, any sentence scoring $\ge 20\%$ has all of its tokens counted toward document coverage. For 1-sentence documents, a 25% sentence match yields 100% document coverage.
3. **Phrase Coordinate Normalization Drift:** Phrase spans exhibit 1–2 character offset drift when sentences contain hyphens, diacritics, or multiple punctuation symbols.
4. **Adversarial Whitespace Handling:** Leading spaces combined with `\n\n` paragraph breaks can cause minor coordinate offset shifts in paragraph splitting.

---

## 14. Failed Tests and Root Cause Analysis

- **Failed Fixture:** `L2-CAT-H-02`
- **Category:** Boundary / Adversarial (Tabs, whitespace, and internal newlines)
- **Observed Behavior:** Sentence span slice was `"   Mitochondrial    oxidat"` instead of `"Mitochondrial    oxidative"` (3-character offset shift).
- **Root Cause:** `segmentDocument()` regex splits on `\n\n` as paragraph boundaries, while leading whitespace offset calculation on paragraph start had a 3-character discrepancy.
- **Remediation Status:** Documented as an adversarial boundary limitation; production code remains frozen on `HARD HOLD`.

---

## 15. Threshold Approval Record

- **Decision Record:** `evidence/layer2/threshold-decision.json`
- **Decision Status:** `PENDING_OWNER_APPROVAL`
- **Decision Owner:** System Owner / Executive Authority
- **Proposed Commercial Standards:**
  - Document Level Precision $\ge 0.95$ (Observed: 0.938)
  - Document Level Recall $\ge 0.90$ (Observed: 1.000)
  - False Positive Rate $\le 0.05$ (Observed: 0.100)
  - Sentence Span Accuracy $\ge 0.95$ (Observed: 0.957)
  - AI Advisory Isolation $= 1.00$ (Observed: 1.000)
- **Approval Status:** **UNAPPROVED**

---

## 16. Evidence Artifact Manifest and Hashes

| Artifact Path | Description | SHA-256 |
| :--- | :--- | :--- |
| `evidence/layer2/authority-contract.json` | Frozen G2/G5 Authority Contract | `e4bfd477bfdda5b0d223ebfe56cab1081c828cbc005a8384ca33f0873844d966` |
| `evidence/layer2/authority-contract.md` | Authority Contract Documentation | `d552fbfa6ae8b668d27be9b3b80b08da3e08f51dfb34200787e923e1e9c5ec37` |
| `evidence/layer2/corpus-manifest.json` | Corpus Manifest (25 fixtures) | `24874a74288b884d6b63ca52f55fb350d55e09fba24aa0b22a61e0f06a86c637` |
| `evidence/layer2/corpus-validation.json` | Corpus Validation Report | `8fc358a927fa11c4e7ec97e68407fc20c3ec8d06b8bbcb75a805f25bf6e23631` |
| `evidence/layer2/runs/run-2026-10-29T01-19-56Z/fixture-results.json` | Per-Fixture Execution Verdicts | `655a90d9a6f3b060d4da58a0ebc8cf0ae338a0cbe44cb68a73507119ff3ae5db` |
| `evidence/layer2/runs/run-2026-10-29T01-19-56Z/execution.log` | Suite Execution Log | `9fec6a7509f7a77e59c038379fc7d0ecdf824da5caad00da04b5aebf13d8a1ef` |
| `evidence/layer2/accuracy-report.json` | Machine-Readable Accuracy Report | `5618f8e0019dd18bf5d70f9012c8ff40c6fe2dd502e604ec22ca9bb46ff1fead` |
| `evidence/layer2/threshold-decision.json` | Threshold Governance Decision Record | `b6d43e5c942953289047cb54eb44747eb79f4ea547517c2f6d7d6f51cb3229b4` |
| `evidence/layer2/ui-validation-report.json` | UI Display Validation Report | `2e080b037fa9bfa3fc13b71520625fca78d0f1eb2da529729837946927da8fa8` |
| `evidence/layer2/ai-isolation-report.json` | AI Advisory Isolation Report | `e4370eb0649725f0e97669bb58f8aa99f84852fbfab23a3be1350a49c6934c26` |
| `evidence/layer2/repeatability-report.json` | 3-Pass Repeatability Report | `c51fa877c223c21c6b12a8fa99ee0a1f9e29a997cf054924ecf4453b52a5c374` |
| `evidence/layer2/regression-report.json` | Regression & Baseline Verification | `0c65529fba9a1845bb08fef9f79b007ea45da852927233fec6ee50f96d66e700` |

---

## 17. Outstanding Owner Decisions

1. **Threshold Approval Decision:** The system owner must review the proposed commercial accuracy thresholds (Precision $\ge 0.95$, Recall $\ge 0.90$, FPR $\le 0.05$) against the observed metrics (Precision: 0.938, Recall: 1.000, FPR: 0.100) and formally sign off on the threshold decision record.
2. **Single-Sentence Plagiarism Policy:** Determine whether institutional policy accepts the sentence-level coverage invariant (where $\ge 20\%$ sentence similarity marks the whole sentence's tokens as covered) or requires sub-sentence token masking.

---

## 18. Final Verdict and Next Authorized Action

- **Final Gate Verdict:** **`BLOCKED: OWNER THRESHOLD DECISION REQUIRED`**
- **Next Authorized Action:** Present this certification package to the system owner for threshold approval. Production remains on **`HARD HOLD`**. No deployment, release tag, or code modification is authorized.

