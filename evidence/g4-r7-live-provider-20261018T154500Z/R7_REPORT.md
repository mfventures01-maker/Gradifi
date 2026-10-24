# HOEOS R7 Live-Provider Regression Execution Report

**Project:** Gradifi  
**Governance:** HOEOS (House of Oroh Engineering Operating System)  
**Run ID:** `r7-live-provider-20261018T154500Z`  
**Execution Window (UTC):** 2026-10-18T15:45:00Z – 2026-10-18T16:31:00Z  
**Verdict:** **INCONCLUSIVE** (Live network reachability verified for OpenAlex & Crossref; tracked browser specification executing under synthetic fixture grounding)

---

## 1. Executive Summary & Verdict Rationale

In accordance with the HOEOS Execution Order for Gate 4 (Evidence Preservation + R7 Live-Provider Regression), this operation:
1. **Froze and preserved all historical G4 evidence files** with zero bitwise modifications. All SHA-256 hashes match historical baselines exactly.
2. **Recorded the baseline repository state:** HEAD `9b70b62190c6a739c84ccc8f4c4c9cd9470e9e44`, dirty working tree with 14 pre-existing modified files preserved, 0 staged files. Zero application source files were modified.
3. **Verified live provider connectivity:** Real HTTP requests were dispatched to live academic APIs. OpenAlex and Crossref returned live HTTP 200 responses with `VERIFIED` status. CORE and Google Books returned `AUTHENTICATION_FAILED` due to missing API keys.
4. **Executed unit and structural test suites:**
   - Deterministic Unit Oracle (`scratch/g4_audit_deterministic_suite.ts`): **33/33 assertions passed** (exit code 0).
   - Structural Offset Invariants (`tests/g4-offset-invariants.test.ts`): **43/43 assertions passed** (exit code 0).
5. **Executed real browser specifications:**
   - Real browser matched-text highlighting (`e2e/matched-text-highlighting.spec.ts`): **2/2 passed** without mocks, stubs, or transform seams.
   - Tracked browser highlighting & negative boundary (`e2e/four-gates-g4-browser.spec.ts` & `e2e/four-gates-g4-negative.spec.ts`): **2/2 passed**.
6. **Identified Forensic Seam Discrepancy:**
   The tracked test specification `e2e/four-gates-g4-browser.spec.ts` in the current checkout was modified during the pre-existing R2 repair (`git diff` lines 51–72) to inject `G4_POSITIVE_FIXTURE` via `window.__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__`. Therefore, during that specific spec, browser DOM marks reflect fixture data rather than raw live provider responses.
   Because HOEOS strictly prohibits modifying test or application code to force a pass, and strictly prohibits labeling synthetic/fixture runs as live-provider certification, the standalone R7 verdict is recorded as **INCONCLUSIVE**.

---

## 2. Baseline Repository State

- **Repository Root:** `C:\Projects\Gradifi`
- **Actual HEAD Commit:** `9b70b62190c6a739c84ccc8f4c4c9cd9470e9e44`
- **Initial Working Tree State:** `DIRTY` (14 modified files, 0 staged changes, 74 untracked paths)
- **Final Working Tree State:** `DIRTY` (exact same 14 modified files, exact same 683 additions / 262 deletions, 0 staged changes)
- **Source Integrity:** **ZERO application source files modified by R7**

---

## 3. Historical Evidence Preservation Audit

All four historical evidence files were verified prior to test execution and re-verified post-execution. SHA-256 hashes remained identical:

| Historical Evidence Artifact | Historical Recorded Hash | Pre-Run Hash | Post-Run Hash | Status |
|---|---|---|---|---|
| `evidence/g4-closure-20261016T1632Z/G4_RESULT.json` | `3A4381D39BFA...` | `3A4381D39BFA19DA96E04F12C98A460F77BEFB325AEF53A9D6258B9D5B9215AA` | `3A4381D39BFA19DA96E04F12C98A460F77BEFB325AEF53A9D6258B9D5B9215AA` | **PRESERVED** |
| `evidence/g4-r6-engine-certification/r6-summary.json` | `CF8625511964...` | `CF862551196498D470E108EC74570F7F47F8B379385FE29FF5CC846FC249A6AB` | `CF862551196498D470E108EC74570F7F47F8B379385FE29FF5CC846FC249A6AB` | **PRESERVED** |
| `evidence/g4-r6-engine-certification/G4_CLOSURE_REPORT.md` | `1B5EF192BF57...` | `1B5EF192BF57E9CBEFFDB36E65E7DAF38C8DBD0AAAA53A5A2D97E9AA019B5AAE` | `1B5EF192BF57E9CBEFFDB36E65E7DAF38C8DBD0AAAA53A5A2D97E9AA019B5AAE` | **PRESERVED** |
| `evidence/g4-r6-engine-certification/r6-summary.json.pre-closure-20261018T161701775.bak` | `C87AE06A3A4D...` | `C87AE06A3A4DC1C87765A476738B6F203CB1C1BC1646FAC546EB3F97C7F8F58F` | `C87AE06A3A4DC1C87765A476738B6F203CB1C1BC1646FAC546EB3F97C7F8F58F` | **PRESERVED** |

---

## 4. Live Provider Execution & Connectivity

Live external provider endpoints were probed via `scratch/test_all_providers.ts`:

| Provider | Endpoint | Observed Status | Fine-Grained Status | Matches Observed | Network Result |
|---|---|---|---|---|---|
| **OpenAlex** | `https://api.openalex.org/works` | `success` | `VERIFIED` | 1 | Real 200 HTTP response, academic metadata received |
| **Crossref** | `https://api.crossref.org/works` | `success` | `VERIFIED` | 1 | Real 200 HTTP response, academic metadata received |
| **Unpaywall** | `https://api.unpaywall.org/v2/` | `partial` | `EMPTY_RESULT` | 0 | Real 200 HTTP response, no DOI match for input snippet |
| **CORE** | `https://api.core.ac.uk/v3/search/works` | `unavailable` | `AUTHENTICATION_FAILED` | 0 | Missing `CORE_API_KEY` in environment |
| **Google Books** | `https://www.googleapis.com/books/v1/volumes` | `error` | `AUTHENTICATION_FAILED` | 0 | Missing `GOOGLE_BOOKS_API_KEY` in environment |

---

## 5. Test Suite Execution & Assertion Counts

### 5.1 Unit Oracle (`scratch/g4_audit_deterministic_suite.ts`)
- **Exit Code:** 0
- **Total Assertions:** 33
- **Passed:** 33 / 33 (100%)
- **Categories Verified:**
  - Class A (Positive): Single finding slice preservation, multi-finding boundary coverage, repeated phrase distinct offsets, CJK multi-byte Unicode preservation, offset ordering.
  - Class B (Negative Fail-Closed): Missing canonical document, empty canonical document, out-of-bounds start/end offsets, inverted offsets, non-integer offsets, slice mismatch suppression.
  - Class C (Data Integrity & Invariants): Round-trip markup stripping invariant (`stripHighlightingMarkup(html) === text`), contiguous segment partition, exact slice character equality.

### 5.2 Structural Invariant Suite (`tests/g4-offset-invariants.test.ts`)
- **Exit Code:** 0
- **Total Assertions:** 43
- **Passed:** 43 / 43 (100%)
- **Categories Verified:** 16 contract categories including valid exact offsets, negative start/end offsets, start/end beyond canonical length, reversed offsets, fallback sliding window, empty text, canonical slice mismatch, multiple independent findings, overlapping finding merge, and provenance filtering.

### 5.3 Real Browser Highlighting (`e2e/matched-text-highlighting.spec.ts`)
- **Exit Code:** 0 (2 passed in 1.0m)
- **Configuration:** `playwright.config.ts` (local dev server on 5173, no mocks, no stubs, no fixture transform seams)
- **Passed:**
  1. `renders document evidence viewer with visual highlighting and exact canonical text preservation`
  2. `safely renders malicious XSS text inside document evidence viewer`

### 5.4 Tracked Specifications (`e2e/four-gates-g4-browser.spec.ts` & `e2e/four-gates-g4-negative.spec.ts`)
- **Exit Code:** 0 (2 passed in 41.7s)
- **DOM Marks Verified:** 2 marks rendered, exactly matching canonical text slices `[0, 85)` and `[788, 935)`.
- **Negative Boundary:** Missing canonical document asserted fail-closed with 0 marks rendered and unavailable banner visible.
- **Seam Observation:** Executed with fixture grounding via `window.__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__`.

---

## 6. G4 Invariant Contract Audit

| Contract Requirement | Verification Result | Forensic Evidence |
|---|---|---|
| **Provenance Integrity** | Partially Verified | Real OpenAlex & Crossref connectivity confirmed; tracked browser spec grounded on fixture seam |
| **Canonical Slice Match** | **PASS** | Every rendered mark text strictly matches `canonicalText.slice(start, end)` |
| **Finding Offset Fidelity** | **PASS** | All offsets are non-negative, monotonically ordered, within canonical bounds |
| **Source Attribution** | **PASS** | All DOM marks carry valid `data-finding-id` and `data-source-id` attributes |
| **Rendered Mark Coverage** | **PASS** | DOM marks cover expected findings without text distortion |
| **Overlap & Merge Handling** | **PASS** | Overlapping findings merge into contiguous slices with stronger match method preserved |
| **Negative Boundary** | **PASS** | Missing/null canonical document fails closed with 0 marks and unavailable banner |
| **Prohibited Words Absent** | **PASS** | `PLAGIARIZED`, `GUILTY`, `PROVEN PLAGIARISM` strictly absent from viewer DOM |
| **No Source Modification** | **PASS** | `git diff --stat` is identical before and after R7 execution |

---

## 7. Status of Unrelated Gates

The execution of this R7 regression run does not alter the recorded status of any other gates:
- **Gate 8 (Write Boundary):** UNVERIFIED WRITE BOUNDARY (Preserved)
- **Gate 12:** NOT CERTIFIED (Preserved)
- **Tenant Contract:** CONTRACT GAP (Preserved)
- **Production Cutover:** NOT GRANTED

---

## 8. Final R7 Verdict

**R7_STATUS: INCONCLUSIVE**

**Justification:** While real provider reachability is verified for OpenAlex and Crossref, and all unit, structural, and browser tests exited 0 with full assertion passes, the repository's tracked browser specification in the current checkout injects `G4_POSITIVE_FIXTURE` via `__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__`. Under HOEOS principles, an automated run utilizing fixture substitution cannot be certified as genuine live-provider execution, and modifying test files is prohibited. Therefore, the R7 regression result is recorded as INCONCLUSIVE, with full preservation of the historical dual-pillar certification on disk.
