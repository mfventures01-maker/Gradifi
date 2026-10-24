# HOEOS G4 R3 EVIDENCE RECONCILIATION REPORT (R4.5)

**Run Identifier:** `run-20261017T2245Z`  
**Reconciled Run Path:** `evidence/g4-repair-20261017T1430Z/r3/run-20261017T2040Z/`  
**Reconciled By:** `scratch/finalize_g4_evidence_r4.ps1` (SHA-256: `9C0A43015DD66A3345A282FF80AA44E4B4DE6C01CAC3A988DB8570202863C7B2`)  
**Date:** 2026-10-17T23:59:49Z  
**Corrected Finalizer Status:** `PASS` (Process Exit Code: 0)  
**G4 Verification-Engine Certification Status:** `NOT CERTIFIED`

---

## 1. RECONCILIATION EXECUTIVE SUMMARY

The repaired finalizer (`finalize_g4_evidence_r4.ps1`) was executed directly against the authentic, preserved R3 production-preview evidence artifacts located at:
`evidence/g4-repair-20261017T1430Z/r3/run-20261017T2040Z/production-preview`

Without modifying any R3 test files, reports, or artifacts, the repaired finalizer evaluated:
1. Positive browser test evidence (`g4-browser-results.json` and `g4_browser_highlight.png`).
2. Negative browser test evidence (`g4-negative-browser-results.json` and `g4_negative_browser_unavailable.png`).
3. Mathematical and offset invariants computed from raw evidence.
4. Process exit codes recorded during R3 execution.

**Reconciliation Outcome:** The preserved R3 evidence satisfies all repaired acceptance criteria. The corrected terminal status is `PASS`.

---

## 2. COMPARISON: PRIOR CLAIMS VS REPAIRED FINALIZER FINDINGS

| Item / Claim | Prior R3 Report Claim | Observed Preserved Artifact | Repaired Finalizer Verdict | Discrepancy Analysis |
|---|---|---|---|---|
| **R3 Certification Status** | `R3_CERTIFICATION_PASS` | `final-report.md` Line 10 | `PASS` (Finalizer Evaluation) | No discrepancy in finalizer outcome. However, G4 verification-engine certification remains explicitly `NOT CERTIFIED` as required by HOEOS governance. |
| **F1 Self-Attestation** | `hardcodedClaimsRemoved = $true` | Present in legacy finalizer line 307 | Removed | The legacy finalizer inserted a hardcoded boolean. The repaired finalizer derives all conclusions directly from evidence. |
| **F2 Negative Condition Field** | `missingCanonicalPrecondition` | `missingCanonicalCondition: "missing_canonical_raw_text"` | Reconciled & Passed | Legacy finalizer looked for `...Precondition`; reconciled to match authoritative fixture contract. |
| **F3 Stale Highlight Counts** | `observedStaleHighlightCount` | `observedHighlightCount: 0`, `expectedHighlightCount: 0` | Reconciled & Passed | Semantics verified: 0 highlight marks observed when canonical doc missing. |
| **F4 Assertion Dictionary** | `assertions.staleHighlightMarksCountZero: true` | Flat fields: `unavailableIndicatorObserved: true`, `viewerSuppressed: true`, etc. | Reconciled & Passed | Schema reconciled to validate flat properties directly without requiring synthetic wrapper object. |
| **F5 Terminal Status** | Informal compound string | Machine-readable status enum | `PASS` (Precedence 4, Exit Code 0) | Reconciled to strict 4-valued standard: `BLOCKED`, `NOT RUN`, `FAIL`, `PASS`. |
| **F6 Primary Highlight Invariants** | Phantom boolean flags: `authoritativeTextMatch: true`, etc. | Raw offsets `[0, 85]`, `markText`, `expectedSlice`, `findingId`, `sourceId` | Reconciled & Passed | Invariants derived directly from evidence: `0 <= start < end`, `markText === expectedSlice`, non-empty IDs. |

---

## 3. EVIDENCE INTEGRITY & HASH VALIDATION

The preserved R3 artifacts and specs were verified against their recorded SHA-256 hashes:

| File | Preserved Hash | Match Baseline? |
|---|---|---|
| `e2e/four-gates-g4-browser.spec.ts` | `BEAFAC3618B4A762F1950414EF3A8A15A97DE494066B424F23437BF679DB9452` | YES (Unchanged) |
| `e2e/four-gates-g4-negative.spec.ts` | `9497E73F59D146D8199934F06540E0589C23D8BC7A24F0E9AB8E02E5B25CEFCC` | YES (Unchanged) |
| `g4-browser-results.json` | `A9C885EEF888F604D4F703505758924EAF60E437C37F78D0B560C76D5C3D436D` | YES (Unchanged) |
| `g4-negative-browser-results.json` | `C493A7BE377838F623C7CF2A15BC967AEB9610713FCC650F5F82830192234898` | YES (Unchanged) |
| `g4_browser_highlight.png` | `D18A58129AC72E158BC15CE6E8373CD4D4BA826FE325510255395349581E1528` | YES (Unchanged) |
| `g4_negative_browser_unavailable.png` | `0523C64188F58D9C9672800D6054EB8EF03D0FA6A9280E79796EE482E19EBBD8` | YES (Unchanged) |

---

## 4. G4 CERTIFICATION BOUNDARY NOTICE

While the R4 finalizer repair and R3 evidence reconciliation both conclude `PASS`, **G4 verification-engine certification remains `NOT CERTIFIED`**.
The production-preview tests operated through an explicitly enabled test seam (`VITE_ENABLE_TEST_SEAM: 'true'`) injecting result fixtures (`__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__`). Full G4 certification requires end-to-end evidence that the actual verification engine independently generates the required findings without injected result fixtures.
