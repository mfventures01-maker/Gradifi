# G0 Baseline Reverification Record
**Timestamp:** 2026-10-22T13:48:00+01:00  
**Commit:** d339a488debecbf420a96a5f2d6956f6c2e2effd  
**Branch:** clean-deploy (in sync with origin/clean-deploy)  
**Baseline Evidence Root:** `C:\Users\faith\Documents\Gradifi-HOEOS-Baseline\20261022-083756`  

## 1. Cryptographic Baseline Verification
| Artifact | Baseline Reference SHA-256 | Current Computed SHA-256 | Status |
| :--- | :--- | :--- | :--- |
| `baseline-manifest.json` | `9D36D0D82D1269D7F2D6439AB9C6B6875123C0A6C516F5C7B900BBD9F651935E` | `9D36D0D82D1269D7F2D6439AB9C6B6875123C0A6C516F5C7B900BBD9F651935E` | MATCH |
| `G0-working-tree.patch` | `0C2524A9812CD024D2EB47875CEE9D114E4C60E63EFA4085A62BA646D8841A96` | `0C2524A9812CD024D2EB47875CEE9D114E4C60E63EFA4085A62BA646D8841A96` | MATCH |

## 2. Working Tree Drift Record
Comparison of `baseline-manifest.json.WorkingTree` (captured at 2026-10-22 08:37:56) against current `git status --porcelain -uall`:
- **Files Removed:** 0
- **Tracked Modifications Added (2 files):**
  - `M e2e/g4-live-provider-certification.spec.ts` (added independent provenance assertions comparing DOM marks against engine data attributes)
  - `M src/services/verify/deterministicEngine.ts` (added Fix A suppression branch at line 903)
- **Untracked Evidence Artifacts Added (16 files):**
  - `certification/federation_logs/2026-10-22/core.jsonl`
  - `certification/federation_logs/2026-10-22/crossref.jsonl`
  - `certification/federation_logs/2026-10-22/googlebooks.jsonl`
  - `certification/federation_logs/2026-10-22/semanticscholar.jsonl`
  - `certification/federation_logs/2026-10-22/unpaywall.jsonl`
  - `evidence/gate-d-provenance-20261022-094100/UNRENDERED_FINDING.json`
  - `evidence/gate-d-provenance-20261022-094100/spec.after.ts`
  - `evidence/gate-d-provenance-20261022-094100/spec.before.ts`
  - `evidence/gate-d-provenance-20261022-094100/spec.diff.patch`
  - `evidence/gate-d-provenance-20261022-105333/engine.before-fix.ts`
  - `evidence/gate-d-provenance-20261022-105333/fix-a-change-record.txt`
  - `evidence/gate-d-provenance-20261022-105333/hashes-before.txt`
  - `evidence/gate-d-provenance-20261022-105333/spec.before-cleanup.ts`
  - `evidence/gate-d-provenance-20261022-105333/tsc-client-fix-a-exit.txt`
  - `evidence/gate-d-provenance-runtime-after.csv`
  - `evidence/gate-d-provenance-runtime-before.csv`

## 3. Disposition
**G0 Reverification Status:** PASS (amended with documented drift from 09:41:00 and 10:53:33 test executions).
All baseline artifacts match byte-for-byte; HEAD commit and branch are unchanged.
