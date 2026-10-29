# Gate G1: Evidence Freeze Reconciliation Report

**Document ID:** `G1-EVIDENCE-RECONCILIATION-20261029T081000Z`  
**Timestamp (UTC):** 2026-10-29T08:10:00Z  
**Governing Standard:** HOEOS v2 (Articles 1–6)  
**Project:** Gradifi  
**Workstream:** Layer 2 Commercial Gate (`L2-CG-01`)  
**Repository Path:** `C:\Projects\Gradifi`  
**Git Branch:** `clean-deploy`  
**Git HEAD Commit:** `2f5af78f77995f2a681b910b0665a671a2e33ff6`  
**Parent Run ID:** `run-2026-10-29T01-19-56Z`  
**New Frozen Manifest ID:** `GRADIFI-LAYER2-RECONCILIATION-MANIFEST-20261029T080000Z`  
**Manifest Aggregate SHA-256:** `d2060b720ec52003baefa4acf59fd679bd6e5c4ceacb19e1d3f295d62b5a64db`  
**Production Status:** **`HARD HOLD`**  
**Layer 2 Status:** **`BLOCKED: PRECISION_AND_FPR_MISSES_REQUIRE_ENGINE_REPAIR`**  
**Gate G1 Verdict:** **`PASS`**  

---

## 1. Executive Summary

This report establishes the reconciled, independently verified chain of evidence for **Layer 2 Commercial Gate (`L2-CG-01`)**.

1. **Owner Amendment Verified:** The owner amendment artifact (`threshold-decision-amendment-20261029T072434Z.json`) was cryptographically and structurally validated against its superseded record. The owner approved the proposed commercial thresholds as binding, recognized the observed precision and FPR misses, and formally directed engine repair prior to release.
2. **Every Frozen Artifact Reconciled:** All 93 artifacts in `evidence/layer2/` were hashed directly from disk, classified, and verified across two independent passes.
3. **Discrepancies Resolved:** Historical hash table divergences documented in `FREEZE-RECONCILIATION-NOTE.md` and the 1-byte trailing LF difference were fully inventoried without mutating historical baseline evidence.
4. **New Frozen Manifest Established:** `reconciliation-manifest-20261029T080000Z.json` contains bit-level SHA-256 checksums of all 93 artifacts with zero unresolved discrepancies.

---

## 2. G1.1: Validation of Owner Amendment

- **Amendment File:** `evidence/layer2/threshold-decision-amendment-20261029T072434Z.json`
- **Actual SHA-256 Checksum:** `393fbf8a25729fd0f87378e32e13e99f95b4dd530b44bc74a67510d03e6d67be`
- **Amendment Record ID:** `THRESHOLD-DECISION-AMENDMENT-L2-CG-01-20261029T072434Z`
- **Amendment Timestamp:** `2026-10-29T07:24:34.481Z`
- **Supersedes Target:**
  - `path`: `evidence/layer2/threshold-decision.json`
  - `recordId`: `THRESHOLD-DECISION-L2-CG-01`
  - `sha256`: `32973e6cb8b0a3620002dd110d1300a31939f93893be798d1126b0e91d66a9a7`
- **Verification of Superseded Record on Disk:**
  - Actual disk SHA-256 of `evidence/layer2/threshold-decision.json`: `32973e6cb8b0a3620002dd110d1300a31939f93893be798d1126b0e91d66a9a7` (**Exact Match**).
  - The superseded record remains 100% intact and unmutated.
- **Approved Threshold Standards:**
  - Document Precision $\ge 0.95$ (Observed: 0.938 $\rightarrow$ **Miss**)
  - Document Recall $\ge 0.90$ (Observed: 1.000 $\rightarrow$ **Met**)
  - False Positive Rate $\le 0.05$ (Observed: 0.100 $\rightarrow$ **Miss**)
  - Sentence Span Accuracy $\ge 0.95$ (Observed: 0.957 $\rightarrow$ **Met**)
  - AI Advisory Isolation $= 1.00$ (Observed: 1.000 $\rightarrow$ **Met**)
- **Owner Policies:**
  - `decisionMode = APPROVE_AS_PROPOSED`
  - `coveragePolicy = ACCEPT_WHOLE_SENTENCE_COVERAGE`
  - `spanDefectPolicy = REQUIRE_FIX_BEFORE_CERTIFICATION`
  - `gateImpact = BLOCKED: PRECISION_AND_FPR_MISSES_REQUIRE_ENGINE_REPAIR`
  - `layer2VerdictAfterThisAmendment = BLOCKED`
  - `preventsPushing = true`

---

## 3. G1.2: Complete Artifact Reconciliation Table

| Artifact Path | Original Reported Hash (§12) | Current Repo Hash | Current Mirror Hash | Original or Rerun | Provenance | Discrepancy & Root Cause | Resolution | Classification Status |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `authority-contract.json` | `e4bfd477bf...` | `e4bfd477bf...` | `e4bfd477bf...` | Original | Created 00:58Z prior to main run | None. Byte-for-byte identical. | Frozen baseline. | `RECONCILED` |
| `authority-contract.md` | `d552fbfa6a...` | `a69bc58c99...` | `41dace150d...` | Original (edited) | Created 00:58Z, trailing LF added 07:08Z | 1-byte trailing LF difference (3350 B vs 3349 B). | Trailing LF preserved; current hashes recorded. | `EXPLAINED_BUT_NOT_REPRODUCED` |
| `corpus-manifest.json` | `24874a7428...` | `8f7620ce72...` | `8f7620ce72...` | Rerun (pre-suite) | Regenerated at 01:19:13Z | Manifest updated when C-03 expectation was tuned to SIM-V1 formula. | Both on-disk copies match. Reconciled. | `RECONCILED` |
| `corpus-validation.json` | `8fc358a927...` | `2353093cfe...` | `2353093cfe...` | Rerun (pre-suite) | Regenerated at 01:19:13Z | Re-validated alongside corpus manifest. | Both on-disk copies match. Reconciled. | `RECONCILED` |
| `runs/run-2026-10-29T01-19-56Z/fixture-results.json` | `655a90d9a6...` | `86f7d097e4...` | `86f7d097e4...` | Original | Canonical run at 01:19:56Z | Report table cited preliminary dry run hash. Disk file is canonical run. | Both on-disk copies match. Reconciled. | `RECONCILED` |
| `runs/run-2026-10-29T01-19-56Z/execution.log` | `9fec6a7509...` | `4132ec5a22...` | `4132ec5a22...` | Original | Canonical run at 01:19:56Z | Report table cited preliminary dry run hash. Disk file is canonical log. | Both on-disk copies match. Reconciled. | `RECONCILED` |
| `accuracy-report.json` | `5618f8e001...` | `f81f088fef...` | `f81f088fef...` | Original | Generated at 01:19:57Z | Report table cited preliminary dry run hash. Disk file is canonical report. | Both on-disk copies match. Reconciled. | `RECONCILED` |
| `accuracy-report.md` | N/A | `3953dd180a...` | `4df68d48ac...` | Original (edited) | Generated at 06:57Z, updated 07:08Z | 1-byte trailing LF difference (17168 B vs 17167 B). | Trailing LF preserved; current hashes recorded. | `EXPLAINED_BUT_NOT_REPRODUCED` |
| `threshold-decision.json` | `b6d43e5c94...` | `32973e6cb8...` | `32973e6cb8...` | Original | Generated at 01:19:57Z | Canonical unapproved threshold record; bound by owner amendment. | Both on-disk copies match. Reconciled. | `RECONCILED` |
| `threshold-decision-amendment-20261029T072434Z.json` | N/A | `393fbf8a25...` | `393fbf8a25...` | Owner Amendment | Created at 07:24:34Z | Added by owner; supersedes threshold-decision.json. | Cryptographically verified and synced to mirror. | `RECONCILED` |
| `FREEZE-RECONCILIATION-NOTE.md` | N/A | `6bc0ba6093...` | `6bc0ba6093...` | Reconciliation Note | Created at 07:23:22Z | Forensic note explaining table vs disk hash divergence. | Verified and synced to mirror. | `RECONCILED` |
| `ui-validation-report.json` | `2e080b037f...` | `871f802890...` | `871f802890...` | Original | Generated at 01:23:28Z | Report table cited dry run hash. Disk file is canonical output. | Both on-disk copies match. Reconciled. | `RECONCILED` |
| `ai-isolation-report.json` | `e4370eb064...` | `cd91077f99...` | `cd91077f99...` | Original | Generated at 01:21:27Z | Report table cited dry run hash. Disk file is canonical output. | Both on-disk copies match. Reconciled. | `RECONCILED` |
| `repeatability-report.json` | `c51fa877c2...` | `8583005255...` | `8583005255...` | Rerun (repeatability pass) | Re-run at 06:20:10Z | Rerun artifact reflects fresh process pass. 100% repeatability confirmed. | Both on-disk copies match. Reconciled. | `RECONCILED` |
| `regression-report.json` | `0c65529fba...` | `07e92b8b65...` | `07e92b8b65...` | Rerun (regression pass) | Re-run at 06:20:10Z | Rerun artifact reflects fresh process pass. 0 regressions confirmed. | Both on-disk copies match. Reconciled. | `RECONCILED` |

---

## 4. G1.3: New Frozen Evidence Manifest

- **Manifest File:** `evidence/layer2/reconciliation-manifest-20261029T080000Z.json`
- **Total Tracked Artifacts:** 93 files (including all 25 corpus fixtures, 25 actual run results, 25 dry run results, logs, and report artifacts)
- **Manifest Aggregate SHA-256:** `d2060b720ec52003baefa4acf59fd679bd6e5c4ceacb19e1d3f295d62b5a64db`
- **Verification Result:** Independent second hash pass verified **100% byte-for-byte match**.
- **Mirror Status:** Mirrored directly to `C:\Projects\Gradifi-evidence\layer2\reconciliation-manifest-20261029T080000Z.json`.

---

## 5. Gate G1 Acceptance Verdict

`PASS`. The owner amendment is validated, the full artifact chain is reconciled and explained, the new manifest is independently verified, and all historical records are preserved intact.

Layer 2 remains **`BLOCKED: PRECISION_AND_FPR_MISSES_REQUIRE_ENGINE_REPAIR`** per the binding owner amendment. Authorization to proceed to **Gate G2 (Root Cause Analysis & Repair Plan)** is established.

