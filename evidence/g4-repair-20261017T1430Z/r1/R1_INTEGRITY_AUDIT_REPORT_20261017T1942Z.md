# R1 Closure Integrity Audit Report

**Audit Timestamp:** 2026-10-17T19:42:00Z  
**Repository:** `C:\Projects\Gradifi`  
**Git Commit:** `9b70b62190c6a739c84ccc8f4c4c9cd9470e9e44`  
**Git Branch:** `clean-deploy`  
**Governance:** HOEOS, House of Oroh Engineering Operating System  
**Verdict:** **R1 PASS**

---

## 1. Executive Summary

All required R1 closure checks and evidence verifications have been executed against the actual filesystem and repository state. Every SHA-256 digest matches expected baseline values exactly, the original negative specification is quarantined, `playwright.localprod.config.ts` is absent, `git diff --check` completed with exit code 0 and zero errors, and the production build and bundle scan confirm zero test seam leakage in production assets.

---

## 2. Check-by-Check Audit Table

| Check ID | Description | Verification Method | Expected Result | Actual Result | Exit Code | SHA-256 / Metric | Verdict |
|---|---|---|---|---|---|---|---|
| **R1-01** | Source Hash Verification | `Get-FileHash src/pages/verify/GradifiVerifyDemoPage.tsx` | `6112AA7E75B18BB05F19597171FC8709ACA40E76675A80186FDF0CE64B0E1F3C` | `6112AA7E75B18BB05F19597171FC8709ACA40E76675A80186FDF0CE64B0E1F3C` | N/A | Match | **PASS** |
| **R1-02** | Production Playwright Config Hash | `Get-FileHash playwright.prod.config.ts` | `030128EDFBD6422A707DFBF6C168D1155DEB4266BD983D0F25B1A34CEA09C3EC` | `030128EDFBD6422A707DFBF6C168D1155DEB4266BD983D0F25B1A34CEA09C3EC` | N/A | Match | **PASS** |
| **R1-03** | Quarantined Negative Spec Hash | `Get-FileHash e2e/_quarantine/four-gates-g4-negative.spec.ts.disabled` | `FA1A98F8FBD4284FEB5BD0EEAAE30E3E934D617E9DE1FCE035E23586AD54275A` | `FA1A98F8FBD4284FEB5BD0EEAAE30E3E934D617E9DE1FCE035E23586AD54275A` | N/A | Match | **PASS** |
| **R1-04** | Patched Source Snapshot Integrity | `Get-FileHash evidence/g4-repair-20261017T1430Z/r1/GradifiVerifyDemoPage.tsx.after-6112AA7E` | Snapshot exists and matches current source | `6112AA7E75B18BB05F19597171FC8709ACA40E76675A80186FDF0CE64B0E1F3C` | N/A | Exact match with current source | **PASS** |
| **R1-05** | Seam Gate Scope Verification | Code inspection of `src/pages/verify/GradifiVerifyDemoPage.tsx` | Seam guarded strictly by `import.meta.env.DEV` | Guarded by `import.meta.env.DEV && typeof window !== 'undefined'` | N/A | Confirmed | **PASS** |
| **R1-06** | Original Negative Spec Path Check | `Test-Path e2e/four-gates-g4-negative.spec.ts` | `False` (absent from active path) | `False` | N/A | Path absent | **PASS** |
| **R1-07** | Localprod Config Check | `Test-Path playwright.localprod.config.ts` | `False` (absent) | `False` | N/A | Path absent | **PASS** |
| **R1-08** | Whitespace & Patch Integrity | `git diff --check` | 0 errors | Clean (no errors, no trailing whitespace) | 0 | Exit code 0 | **PASS** |
| **R1-09** | Production Build Verification | Inspection of `build-controlled-20261017T192138Z.txt` and `.log` | ExitCode 0 | `ExitCode=0` | 0 | Build duration 57.40s | **PASS** |
| **R1-10** | Production Bundle Asset Verification | Inspection of `dist-asset-hashes-verified.txt` | 5 JS assets verified | 5 JS assets verified | N/A | Match | **PASS** |
| **R1-11** | Production Bundle Test Seam Scan | `Select-String -Path 'dist/assets/*.js' -Pattern '__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__'` | 0 hits | 0 hits | 0 | `BUNDLE_SEAM_HITS=0` | **PASS** |

---

## 3. R1 Final Verdict

**OVERALL R1 STATUS: PASS**

The baseline integrity has been forensically verified. No unexpected files, broken hashes, or unhedged seam leaks exist. R1 is closed, and R2 execution is authorized under HOEOS protocols.
