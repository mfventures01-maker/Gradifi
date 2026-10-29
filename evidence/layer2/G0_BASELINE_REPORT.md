# Gate G0: Baseline and Evidence Preservation Report

**Document ID:** `G0-BASELINE-REPORT-20261029T080500Z`  
**Timestamp (UTC):** 2026-10-29T08:05:00Z  
**Governing Standard:** HOEOS v2 (Articles 1–6)  
**Project:** Gradifi  
**Workstream:** Layer 2 Commercial Gate (`L2-CG-01`)  
**Repository Path:** `C:\Projects\Gradifi`  
**Git Branch:** `clean-deploy`  
**HEAD Commit:** `2f5af78f77995f2a681b910b0665a671a2e33ff6`  
**Upstream Status:** Up to date with `origin/clean-deploy`  
**Working Tree Status:** Clean source tree (`?? evidence/layer2/` untracked evidence)  
**Production Status:** **`HARD HOLD`**  
**Gate Verdict:** **`PASS`**  

---

## 1. Baseline Integrity and Worktree Audit

- `[STATIC]` **Git HEAD Commit:** `2f5af78f77995f2a681b910b0665a671a2e33ff6`
- `[STATIC]` **Commit Title:** `Untrack certification/federation_logs/ — runtime output, not source`
- `[STATIC]` **Git Status:** 0 tracked files modified. `git diff` produces 0 lines. `git diff --staged` produces 0 lines.
- `[STATIC]` **Untracked Directory:** `evidence/layer2/` contains Layer 2 test runs, reports, and manifests.
- `[STATIC]` **Upstream Divergence:** `clean-deploy` is synchronized with `origin/clean-deploy`.
- `[STATIC]` **Build & Test Configuration:** Node.js v22.23.3, TypeScript 5.6.2, Vite 5.4.9, Vitest 2.1.9, tsx 4.19.2.

---

## 2. Evidence Inventory & Disk Hash Audit

The complete contents of `evidence/layer2/` and `C:\Projects\Gradifi-evidence\layer2/` were hashed directly from disk using SHA-256.

| Artifact Path | Repo Size | Repo MTime (UTC) | Repo SHA-256 | Mirror Size | Mirror SHA-256 | Status |
| :--- | :---: | :--- | :--- | :---: | :--- | :---: |
| `authority-contract.json` | 6,517 B | 2026-10-29T00:58:24Z | `e4bfd477bfdda5b0d223ebfe56cab1081c828cbc005a8384ca33f0873844d966` | 6,517 B | `e4bfd477bfdda5b0d223ebfe56cab1081c828cbc005a8384ca33f0873844d966` | Identical |
| `authority-contract.md` | 3,350 B | 2026-10-29T07:08:07Z | `a69bc58c992e40d6db06556fb5d10c2955b5f07357a692298ecccf8450b273f9` | 3,349 B | `41dace150df0a76d4b9ec0d587d054ec7c6e2ff907373456f07f580fd8aaa8cb` | 1-B Discrepancy |
| `corpus-manifest.json` | 13,375 B | 2026-10-29T01:19:13Z | `8f7620ce720f431cac45297d33e5cc4007d9acc6549ec9d1895106c8b98a2899` | 13,375 B | `8f7620ce720f431cac45297d33e5cc4007d9acc6549ec9d1895106c8b98a2899` | Identical |
| `corpus-validation.json` | 4,487 B | 2026-10-29T01:19:13Z | `2353093cfe678490ac961a23fe43977af013f88e1ca83237b51d2565137bd44e` | 4,487 B | `2353093cfe678490ac961a23fe43977af013f88e1ca83237b51d2565137bd44e` | Identical |
| `runs/run-2026-10-29T01-19-56Z/fixture-results.json` | 27,714 B | 2026-10-29T01:19:56Z | `86f7d097e4c5570c8ebb3bbfd7a25e3ba0a7086bd53ac5ae3658167215f3abab` | 27,714 B | `86f7d097e4c5570c8ebb3bbfd7a25e3ba0a7086bd53ac5ae3658167215f3abab` | Identical |
| `runs/run-2026-10-29T01-19-56Z/execution.log` | 10,630 B | 2026-10-29T01:19:57Z | `4132ec5a22fc87105cb543646451f54d75a7f3a8fa13a002f2d894dd654ceb77` | 10,630 B | `4132ec5a22fc87105cb543646451f54d75a7f3a8fa13a002f2d894dd654ceb77` | Identical |
| `accuracy-report.json` | 1,656 B | 2026-10-29T01:19:57Z | `f81f088feff7c2817d7bd17dfef1b18e5fc538e791c9c400cfb2cc92f8ae669a` | 1,656 B | `f81f088feff7c2817d7bd17dfef1b18e5fc538e791c9c400cfb2cc92f8ae669a` | Identical |
| `accuracy-report.md` | 17,168 B | 2026-10-29T07:08:07Z | `3953dd180a2dbedc3cf080b4e56269f81bef9aa60da70991e625f8e5a3dde501` | 17,167 B | `4df68d48aca532ed1318c64e50cabab06f32ea7ff0d832f07894c15d002f7f6d` | 1-B Discrepancy |
| `threshold-decision.json` | 1,421 B | 2026-10-29T01:19:57Z | `32973e6cb8b0a3620002dd110d1300a31939f93893be798d1126b0e91d66a9a7` | 1,421 B | `32973e6cb8b0a3620002dd110d1300a31939f93893be798d1126b0e91d66a9a7` | Identical |
| `threshold-decision-amendment-20261029T072434Z.json` | 2,036 B | 2026-10-29T07:24:34Z | `393fbf8a25729fd0f87378e32e13e99f95b4dd530b44bc74a67510d03e6d67be` | N/A | N/A | Repo Only |
| `FREEZE-RECONCILIATION-NOTE.md` | 5,721 B | 2026-10-29T07:23:22Z | `6bc0ba60936a256ca78577d815de6b066b67af09e0e8cc9bb20bab388e7a70e7` | N/A | N/A | Repo Only |
| `ui-validation-report.json` | 3,694 B | 2026-10-29T01:23:28Z | `871f80289047543500476c1db65f5006f17732ec90ed376acb73e6284b0c9ddb` | 3,694 B | `871f80289047543500476c1db65f5006f17732ec90ed376acb73e6284b0c9ddb` | Identical |
| `ai-isolation-report.json` | 5,710 B | 2026-10-29T01:21:27Z | `cd91077f9916bb346fc4e582fe950fcfeac9e2eb6038fee537971582bd5242a9` | 5,710 B | `cd91077f9916bb346fc4e582fe950fcfeac9e2eb6038fee537971582bd5242a9` | Identical |
| `repeatability-report.json` | 13,721 B | 2026-10-29T06:20:10Z | `85830052555271da5b80d345433b32e1c9570b4272c50df73e8dcbca35469196` | 13,721 B | `85830052555271da5b80d345433b32e1c9570b4272c50df73e8dcbca35469196` | Identical |
| `regression-report.json` | 1,257 B | 2026-10-29T06:20:10Z | `07e92b8b655f4516b7b89e0ea0a7a005579194302df30d2d4faa4c33115e6d58` | 1,257 B | `07e92b8b655f4516b7b89e0ea0a7a005579194302df30d2d4faa4c33115e6d58` | Identical |

---

## 3. Discrepancy Analysis

1. **One-Byte Trailing LF Discrepancies:**
   - `accuracy-report.md`: Repo has 17,168 bytes, mirror has 17,167 bytes (trailing LF).
   - `authority-contract.md`: Repo has 3,350 bytes, mirror has 3,349 bytes (trailing LF).
2. **Amendment and Note Presence:**
   - `threshold-decision-amendment-20261029T072434Z.json` and `FREEZE-RECONCILIATION-NOTE.md` exist in `evidence/layer2/` and record the owner's decision to approve proposed thresholds, requiring engine repair before release.
3. **Historical §12 Table Divergence:**
   - As documented in `FREEZE-RECONCILIATION-NOTE.md`, the markdown report's initial table contained dry-run hashes from earlier in the session, whereas the files on disk reflect the canonical final run at `01:19:56Z` and the rerun at `06:20:10Z`.

---

## 4. Known Defects Recorded (No Repair in G0)

- **Defect A (`L2-CAT-C-03`):** 1-sentence document with 25.1% lexical similarity triggers whole-sentence coverage, yielding 100.0% document coverage and a false positive against the 20% document threshold.
- **Defect B (`L2-CAT-H-02`):** Adversarial leading whitespace and `\n\n` paragraph boundaries cause a 3-character offset misalignment on paragraph start.
- **Defect C (Phrase Coordinates):** Hyphens and punctuation in raw text cause phrase offsets to drift by 1–2 characters because phrase start is mapped into normalized sentence space.

---

## 5. Gate G0 Verdict

`PASS`. Baseline repository status, evidence inventory, disk hashes, and discrepancies are fully recorded. Original evidence is preserved. Production remains on `HARD HOLD`.

