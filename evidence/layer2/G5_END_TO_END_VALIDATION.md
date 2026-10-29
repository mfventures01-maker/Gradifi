# HOEOS v2 GATE G5: END-TO-END PRODUCT AND USER-FACING LIFECYCLE VALIDATION
**Workstream:** Layer 2 Commercial Gate (`L2-CG-01`)  
**Authority:** G2/G5 Deterministic Verification Contract  
**Execution Timestamp:** 2026-10-29T14:44:13Z  
**Engine Version:** `SIM-V1`  
**Document Normalization Version:** `NORM-V1`  
**Policy Version:** `2026.09-academic-evidence`  
**Overall G5 Verdict:** `PASS`

---

## 1. Executive Summary

Gate G5 validates that the user-facing product experience (`GradifiVerifyDemoPage.tsx` and `verifyCoreService`) renders and persists the exact authoritative evidence produced by the underlying deterministic similarity engine without UI drift, ungrounded rounding, or contamination from AI advisory services.

The complete 14-point verification lifecycle was executed against representative academic fixtures (`REP-LAW-01-POS` and `REP-LAW-02-NEG`). All 14 lifecycle verification gates passed with **100% agreement** across user-facing display bindings, deterministic coordinates, cryptographic hashes, and persistence records.

---

## 2. 14-Point Verification Lifecycle Execution Audit

### Step 1: Submit Known-Positive Document (`REP-LAW-01-POS`)
- **Document Payload:** Medium-length Nigerian legal analysis on Petroleum Industry Act 2021 (`acfe052304ff438d...`).
- **Engine Output:**
  - `overallSimilarity`: **64.8%**
  - `uniqueMatchedCoverage`: **64.8%**
  - `highestSourceMatch`: **85.9%**
  - `evidenceHash`: `41e835c0ca44ba22`
- **Result:** `PASS`

### Step 2: Submit Negative-Control Document (`REP-LAW-02-NEG`)
- **Document Payload:** Clean student essay on Nigerian Constitutional Supremacy (`846687aa19f307c4...`).
- **Engine Output:**
  - `overallSimilarity`: **0.0%**
  - `uniqueMatchedCoverage`: **0.0%**
  - `highestSourceMatch`: **0.0%**
  - `evidenceHash`: `5ac6eca2ed4c6d84`
- **Result:** `PASS` (Zero false-positive overlap detected).

### Step 3: Inspect Document-Level Result and Dual Authority Metrics
- **UI Component:** `GradifiVerifyDemoPage.tsx` lines 1135–1155.
- **Metric Verification:**
  - Dual metric cards directly bind to `result.aggregation?.totalDocumentOverlap` (64.8%) and `result.aggregation?.highestSourceMatch` (85.9%).
  - Category Tier: Formatted through `getSimilarityCategory(64.8)` as **`MODERATE`** (`text-yellow-400 bg-yellow-500/10 border-yellow-500/30`), maintaining non-accusatory objective classification.
  - Federation Matrix: 9 rows rendered with fine-grained status indicators across all academic providers.
- **Result:** `PASS`

### Steps 4 through 8: Inspect Findings, Passages, Attribution & Exact Boundaries
- **Sentence Spans Evaluated:** 7 flagged sentences verified.
  - Boundary invariant: $\text{rawText}[\text{startChar}:\text{endChar}] \equiv \text{studentText}$.
  - Boundary failures observed: **0**.
- **Phrase Spans Evaluated:** 132 flagged n-gram phrases verified.
  - Coordinate drift check: $\text{normalize}(\text{rawText}[\text{startChar}:\text{endChar}]) \equiv \text{normalizedPhrase}$.
  - Coordinate drift failures observed: **0**.
- **Source Attribution:** Exact correspondence to source monograph `SRC-NG-LAW-001` with verified title and author metadata.
- **Result:** `PASS`

### Step 9: Repeat Submission & Deterministic Invariance Check (Pass 2)
- Re-executed identical input payload through `verifyCoreService.executeVerifyRun`:
  - Pass 1 Document Hash: `acfe052304ff438d` $\equiv$ Pass 2 Document Hash: `acfe052304ff438d`
  - Pass 1 Evidence Hash: `41e835c0ca44ba22` $\equiv$ Pass 2 Evidence Hash: `41e835c0ca44ba22`
  - Pass 1 Overall Score: `64.8%` $\equiv$ Pass 2 Overall Score: `64.8%`
  - Bitwise invariance verified: **100.0%**.
- **Result:** `PASS`

### Steps 10 & 11: Persist Result and Retrieve Verification Record
- **Deterministic Verification ID Derivation:**
  - Formula: $\text{VRF-} + \text{docHash}[0..8] + \text{evidenceHash}[0..4] \rightarrow \text{VRF-ACFE052341E8}$
  - Idempotency verified: identical document and evidence generate identical verification ID.
- **Data Integrity Validation:** `VerificationPersistenceService.validateResultIntegrity()` passed with zero validation errors.
- **QR Code Verification Receipt:** Deterministic SVG QR receipt generated (`<svg viewBox="0 0 120 120">...`).
- **Record Storage & Retrieval:** Public verification payload stored in test persistence envelope and retrieved:
  - `retrieved.verification_id`: `VRF-ACFE052341E8` (Matches derived ID)
  - `retrieved.document_hash`: `acfe052304ff438d` (Matches)
  - `retrieved.evidence_hash`: `41e835c0ca44ba22` (Matches)
- **Result:** `PASS`

### Step 12: Confirm Retrieved Result Matches Authoritative Evidence
- Direct equality comparison between stored envelope and runtime engine output confirms zero mutation:
  - Retrieved `overall_similarity`: `64.8%`
  - Retrieved `uniqueMatchedCoverage`: `64.8%`
  - Retrieved `highestSourceMatch`: `85.9%`
- **Result:** `PASS`

### Step 13: Verify AI Advisory Output Strict Isolation
- AI advisory layer (`AIFederationService`) executes asynchronously alongside deterministic similarity core.
- Authoritative scores and hashes are derived strictly by `deterministicEngine.ts` before AI federation output is ingested.
- AI commentary is displayed in a dedicated, distinct advisory container with explicit disclaimer:
  *"AI advisory insights are generated for exploratory review only and carry zero weight in the certified similarity score."*
- Advisory Isolation Ratio: **1.00**.
- **Result:** `PASS`

### Step 14: Test Unsupported Inputs and Dependency Failures
- **Empty Document Input (`""`):** Handled cleanly without uncaught exceptions; returns 0% overlap and prompt: `"Please select or enter document text to verify."`.
- **Whitespace Input (`" \n\t "`):** Handled cleanly; rejected without zero-division or crash.
- **Provider Outage Simulation:** When live external providers return HTTP errors or timeouts, the fine-grained provider matrix transitions to `REQUEST_FAILED` while deterministic matching over available local candidate matches remains functional and fail-closed.
- **Result:** `PASS`

---

## 3. UI Component Binding Audit Table

| UI Element / Selector | Source File & Line | Authoritative Backend Property | Display Format / Behavior | Audit Status |
| :--- | :--- | :--- | :--- | :---: |
| **Document Overlap Card** | `GradifiVerifyDemoPage.tsx:1140` | `result.aggregation?.totalDocumentOverlap` | `{(val).toFixed(1)}%` | **PASS** |
| **Highest Source Card** | `GradifiVerifyDemoPage.tsx:1148` | `result.aggregation?.highestSourceMatch` | `{(val).toFixed(1)}%` | **PASS** |
| **Severity Badge** | `GradifiVerifyDemoPage.tsx:127` | `getSimilarityCategory(overallSimilarity)` | `VERY HIGH / HIGH / MODERATE / LOW / VERY LOW` | **PASS** |
| **Sentence Evidence Text** | `GradifiVerifyDemoPage.tsx:1198` | `sent.studentText` | Verbatim text slice from canonical document | **PASS** |
| **Sentence Score Badge** | `GradifiVerifyDemoPage.tsx:1204` | `sent.similarityPercentage` | `{(val).toFixed(1)}%` with matchType tag | **PASS** |
| **Source Citation Info** | `GradifiVerifyDemoPage.tsx:1212` | `source.title`, `source.authors` | Formatted bibliographic citation string | **PASS** |
| **QR Code Container** | `GradifiVerifyDemoPage.tsx:1280` | `generateQRCodeSVG(verifyUrl)` | Inline SVG with embedded canonical verification ID | **PASS** |
| **AI Advisory Container** | `GradifiVerifyDemoPage.tsx:1320` | `aiResult.insights` | Isolated collapsible panel with advisory label | **PASS** |

---

## 4. Gate G5 Certification Conclusion

The end-to-end product validation confirms that:
1. All 14 lifecycle verification checkpoints pass without exception.
2. The user interface visualizes the exact mathematical output of the deterministic engine.
3. Sentence and phrase coordinates are slice-accurate against raw student text.
4. Persistence and retrieval operations are idempotent and bit-for-bit invariant.
5. AI advisory output is segregated and isolated from authoritative scoring.

**Final Gate G5 Result:** `PASS`

