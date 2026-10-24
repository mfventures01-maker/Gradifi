# HOEOS G4 R4 FINALIZER RECONCILIATION & REJECTION AUDIT SUMMARY

**Project:** Gradifi  
**Governance:** HOEOS (House of Oroh Engineering Operating System)  
**Workstream:** G4 Certification  
**Phase:** R4 (Finalizer Audit and Repair)  
**Run Identifier:** `run-20261017T2245Z`  
**Evidence Root:** `evidence/g4-repair-20261017T1430Z/r4/run-20261017T2245Z/`  
**R4 Repair Verdict:** `PASS`  
**G4 Verification-Engine Certification Status:** `NOT CERTIFIED`

---

## 1. R4 OBJECTIVES & OUTCOMES

| Objective | Requirement | Actual Outcome | Status |
|---|---|---|---|
| **R4.1 Baseline & Audit** | Freeze baseline; verify findings F1–F6 against actual files | All 6 findings confirmed with exact line numbers, schemas, and root causes | `PASS` |
| **R4.2 Finalizer Repair** | Implement Direction A; align finalizer to R3 schema; remove self-attestation; 4-valued status | `finalize_g4_evidence_r4.ps1` created, verified, and saved to `r4-finalizer-patched.ps1` | `PASS` |
| **R4.3 Adversarial Rejection** | 20+ adversarial test cases covering corrupted/missing/invalid evidence | 22/22 cases passed with exact matching terminal status and exit codes | `PASS` |
| **R4.4 Process-Exit Propagation** | Real subprocess execution, exit code capturing, and status precedence | Verified across 22 sub-processes; precedence rank 1–4 fully held | `PASS` |
| **R4.5 R3 Evidence Reconciliation** | Reconcile authentic preserved R3 evidence without spec mutation | Preserved R3 evidence evaluated to `PASS` (Exit Code 0) | `PASS` |
| **R3 Spec Preservation** | Preserve R3 Playwright spec files and hashes | Exact baseline SHA-256 hashes preserved for both specs | `PASS` |
| **R5 Deferment** | Document negative spec hardcoded literals for future repair | Explicit R5 item documented with acceptance criteria | `PASS` |

---

## 2. DEFECT RESOLUTION SUMMARY (F1–F6)

1. **F1 (Hardcoded Self-Attestation):** `hardcodedClaimsRemoved = $true` removed from executionProvenance. Finalizer now derives all conclusions strictly from observed artifacts.
2. **F2 (Negative Condition Field Mismatch):** Finalizer updated to require `missingCanonicalCondition` (matching `e2e/four-gates-g4-negative.spec.ts` and `G4_NEGATIVE_FIXTURE.condition`).
3. **F3 (Stale-Highlight Count Mismatch):** Finalizer updated to evaluate `observedHighlightCount` and `expectedHighlightCount`, verifying integer type and asserting both equal 0.
4. **F4 (Assertion Object Mismatch):** Removed requirement for synthetic `assertions` dictionary. Reconciled to inspect actual flat boolean fields (`unavailableIndicatorObserved`, `viewerSuppressed`, `allMandatoryAssertionsPassed`).
5. **F5 (Four-Valued Status):** Implemented strict terminal statuses (`BLOCKED`, `NOT RUN`, `FAIL`, `PASS`) with deterministic integer exit codes (2, 3, 1, 0) and HOEOS precedence.
6. **F6 (Primary-Highlight Invariant Mismatch):** Replaced phantom boolean flags with computed mathematical invariants: `0 <= start < end`, non-empty `findingId`/`sourceId`, and exact slice match `markText === expectedSlice`.

---

## 3. ADVERSARIAL REJECTION SUITE MATRIX (22 / 22 PASSED)

| Case ID | Scenario Description | Expected Status | Observed Status | Expected Exit | Observed Exit | Match? |
|---|---|---|---|---|---|---|
| `case_00_control_valid` | Control fixture with valid authentic evidence | `PASS` | `PASS` | 0 | 0 | YES |
| `case_01_missing_positive` | Missing positive browser results artifact | `BLOCKED` | `BLOCKED` | 2 | 2 | YES |
| `case_02_missing_negative` | Missing negative browser results artifact | `BLOCKED` | `BLOCKED` | 2 | 2 | YES |
| `case_03_missing_directory` | Non-existent evidence directory | `BLOCKED` | `BLOCKED` | 2 | 2 | YES |
| `case_04_malformed_json` | Malformed JSON in positive results | `BLOCKED` | `BLOCKED` | 2 | 2 | YES |
| `case_05_empty_json` | Empty JSON in negative results | `BLOCKED` | `BLOCKED` | 2 | 2 | YES |
| `case_06_missing_field` | Required field missing (`missingCanonicalCondition` omitted) | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_07_wrong_type` | Required field present with wrong type | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_08_missing_pos_screenshot` | Referenced positive screenshot artifact missing | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_09_missing_neg_screenshot` | Referenced negative screenshot artifact missing | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_10_subprocess_nonzero` | Subprocess returns non-zero exit code (pwExit = 1) | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_11_zero_marks_positive` | Subprocess succeeds but emits markCount = 0 | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_12_reversed_offsets` | Highlight with start >= end (reversed offsets) | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_13_negative_offset` | Negative start offset in highlight | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_14_mark_text_mismatch` | Highlight text does not match expected slice | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_15_offset_out_of_bounds` | Highlight end offset exceeds canonical length | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_16_empty_identity` | Finding ID or Source ID is empty | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_17_contradictory_negative` | Contradictory negative assertions | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_18_stale_marks_in_negative` | Negative test observed stale highlights > 0 | `FAIL` | `FAIL` | 1 | 1 | YES |
| `case_19_test_not_run` | Required positive test not run (pwExit = -1) | `NOT RUN` | `NOT RUN` | 3 | 3 | YES |
| `case_20_precedence_blocked_over_fail` | Precedence test: BLOCKED overrides FAIL | `BLOCKED` | `BLOCKED` | 2 | 2 | YES |
| `case_21_precedence_notrun_over_fail` | Precedence test: NOT RUN overrides FAIL | `NOT RUN` | `NOT RUN` | 3 | 3 | YES |

---

## 4. R5 DEFERRED ITEM

- **Target File:** `e2e/four-gates-g4-negative.spec.ts`
- **Lines:** 93, 95, 96, 97, 99
- **Observation:** In the test's result serializer, literal values (`executionStatus: 'PASS'`, `unavailableIndicatorObserved: true`, `viewerSuppressed: true`, `observedHighlightCount: 0`, `allMandatoryAssertionsPassed: true`) are serialized rather than querying the DOM via Playwright locators at the point of serialization.
- **Remediation for R5:** Update serializer to query the locator counts dynamically (e.g. `await allMarks.count()`, `await unavailableBanner.isVisible()`) while preserving enclosing `expect(...)` assertions.

---

## 5. G4 CERTIFICATION BOUNDARY

Under HOEOS Governance, G4 verification-engine certification remains **`NOT CERTIFIED`**.
The production-preview test suite verifies UI visual rendering and fail-closed state when fed known fixtures through the test seam hook (`__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__`). Independent certification of the verification engine requires proof that the backend verification pipeline produces these findings end-to-end without seam injection.
