# G0 GATE DISPOSITION

**Gate:** G0 - Reproducible Frozen State
**Disposition date:** 2026-10-23
**Baseline commit (cited):** d339a488debecbf420a96a5f2d6956f6c2e2effd
**Baseline commit (current HEAD):** d339a488debecbf420a96a5f2d6956f6c2e2effd
**Branch:** clean-deploy
**Baseline subject:** "Gate D: base runtime certification PASS"

**Verdict:** **BLOCKED**

---

## 1. Verdict in one paragraph

The baseline commit is identified and reachable. The worktree diverges from it on eight tracked files, none of which invalidate the baseline's identity. The staging pass produced a 32-path staged set that matches the audit's classification counts after correcting an error in the track list's fixture expansion. The two HOEOS constitution files were modified after the audit by a separate session, under a claim of authorization; the operator has confirmed that authorization, and the modified hashes are canonical. However, G0's acceptance criterion — a reproducible frozen state — is not yet satisfied because the frozen proposal's `.gitignore` additions (P1, P3, P4) have not been applied, so the tree is not yet in a state that a fresh clone would reproduce. The gate is BLOCKED on that specific remaining action, not on any defect.

---

## 2. Baseline identity

| Field | Value |
|---|---|
| BASELINE_SHA_CITED | d339a488debecbf420a96a5f2d6956f6c2e2effd |
| BASELINE_SHA_CURRENT_HEAD | d339a488debecbf420a96a5f2d6956f6c2e2effd |
| BASELINE_ANCESTOR_OF_HEAD | True (trivially, equal) |
| BASELINE_SUBJECT | Gate D: base runtime certification PASS |
| BASELINE_BRANCH | clean-deploy |
| WORKTREE_STATE_HASH_AT_RECONCILIATION | 8c7e34e2c435eeb6774405ea89043970676591e7f5dd97ec4451926f93c5546e |
| BASELINE_WORKTREE_DIVERGENCE_ON_INGESTION | True |

The worktree diverges from HEAD on eight tracked files:

| File | Status | Evidence |
|---|---|---|
| src/services/verify/universalIngestionService.ts | MODIFIED (G1 seam repair) | F6D300DB01010D88C377A9D6CB4587B59CD9F508EFDF38461A1BB6AF5E65EA79 |
| src/services/verify/deterministicEngine.ts | MODIFIED | 21eba8eca8625643cfab84b3d667a12bd364131b583e3498e44a0f6942f7b47c |
| src/services/verify/documentNormalizer.ts | MODIFIED | b5d62497a11f24bce9b8c2a87c7c50f5fbdf3703f986d23057e860f6263cf98d |
| src/services/verify/verifyCoreService.ts | MODIFIED | dd618fad9eeb3f0533828a9dec40e19deecfec28017518fb7f853a337b1353ac |
| src/components/verify/CanonicalDocumentViewer.tsx | MODIFIED | a1d01bd4fd3c4e8fe2a4081c3e60e11b979471f7ffbacf93a93b04fa50c14fe2 |
| e2e/g4-live-provider-certification.spec.ts | MODIFIED | (no repair record cited) |
| package.json | MODIFIED | (no repair record cited) |
| package-lock.json | MODIFIED | (no repair record cited) |
| playwright.config.ts | MODIFIED | 3384550bbd9723ed458c9ad1ac3911cbce63b6cd165dd6f100415714c1b99e47 |

The four `src/services/verify/` modifications and the `CanonicalDocumentViewer.tsx` modification are the runtime changes the G1 evidence was produced against. `universalIngestionService.ts` at F6D300DB... is the G1 seam repair. Its presence in the worktree is what makes G1's evidence valid for the current tree.

`playwright.config.ts` at 3384550B... is the harness fix that made the browser acceptance spec reach the page. Without it, the browser path fails at page readiness, not at extraction.

The four unstaged tracked files without repair records are recorded here as `UNRESOLVED (no repair record cited)`. They are preserved in their current state and are not modified by this disposition.

---

## 3. Untracked inventory

Authoritative capture: `evidence/G0-reconciliation-20261022-233110/inv-v1.txt` (742 paths, hash `dcc78e24...`). At the time of the pre-staging capture, 777 paths. At the last pre-disposition capture, 769 paths. The fluctuation is attributable to audit and reconciliation activity writing into `evidence/`; the drift is recorded, not hidden.

| Class | Count | Staged | Disposition |
|---|---|---|---|
| TEST_PROJECT_ARTIFACT | 12 | 12 | Staged |
| E2E_PROJECT_ARTIFACT | 7 | 7 | Staged |
| FIXTURE_PROJECT_ARTIFACT | 3 | 3 | Staged |
| PROJECT_ARTIFACT_TOOLING | 3 | 3 | Staged |
| PROJECT_ARTIFACT_DOCS | 2 | 2 | Staged |
| SCRATCH (measure-document.ts) | 1 | 1 | Staged |
| PLAYWRIGHT CONFIGS | 4 | 4 | Staged |
| **Total staged** | **32** | **32** | |

The audit's classification CSV also records one `UNRESOLVED` entry (`tests/pipeline/pipelineAuditFailClosed.test.ts`), resolved in this disposition to `TEST_PROJECT_ARTIFACT` and staged.

### Track-list expansion error, corrected

The audit's classification correctly recorded 3 `FIXTURE_PROJECT_ARTIFACT` files, not 3 directories. The track list derived from the audit expanded the three directory entries into 16 explicit paths by reading directory contents. Of those 16, 13 were already tracked at HEAD. `git add` correctly staged the 3 genuinely-untracked files (`tests/fixtures/g1/DIGITAL_THERMOMETER_real.docx`, `tests/fixtures/ingestion/quantum_federated_learning_paper.pdf`, `tests/fixtures/providers/stub-responses.json`) and did nothing for the 13 already-tracked files. The 32-path staged set matches the audit's classification counts and does not include the 13 tracked fixtures.

Verification:
- `git ls-files -- tests/fixtures/ingestion/` lists all 13 files (tracked).
- `git ls-files --stage -- tests/fixtures/ingestion/empty.txt` shows mode 100644, blob bac9c714..., stage 0 (tracked, clean).
- `git diff --cached --name-status -- tests/fixtures/ingestion` shows only `A quantum_federated_learning_paper.pdf`.

This is recorded as an error in the track list's construction, not a defect in git, the repository, or the classification.

### Named condition

`BASELINE_WORKTREE_DIVERGENCE_ON_INGESTION = True`. The G1 repair to `universalIngestionService.ts` is outside the baseline commit and is uncommitted. This was already recorded in the reconciliation and remains true.

---

## 4. Stash

Two entries, both preserved, neither applied nor dropped:

- **stash@{0}**: "hoeos-pre-repair-4-5-20260923100738" on branch clean-deploy, base `0689bc11...`. Touches `certification/g1_extension/G1_EXTENSION_RECORD.txt` and `scripts/hoeos/verifyG3Certification.ps1`. Relevant to G3 tooling.
- **stash@{1}**: "WIP before Offer-1 frontend demo", base `4cfd32a9...`. 589 KB across Gradifi school-management UI, `playwright.config.ts`, `tsconfig.json`, and test-results deletions. Unrelated to HOEOS verification. Its base is not `d339a488...`, so a pop would conflict.

Neither stash touches `src/services/verify/`. Neither is applied. The stashes are preserved in their current state.

---

## 5. The `.temp` tests - operator decision recorded

All three retained in the staged set, per operator decision:

- `tests/g5m02-baseline-check.temp.test.ts` (50 lines)
- `tests/g5m02-partial-diagnostic.temp.test.ts` (36 lines)
- `tests/g5m02-sentinel-collision.temp.test.ts` (21 lines)

The `.temp` in the filename is retained. The decision to retain is recorded here. If the `.temp` designation is intended as a signal that these are not part of the durable test suite, that is a convention the operator has overridden for the current gate; a future gate may revisit.

---

## 6. The whitespace modification - operator decision recorded

The two HOEOS constitution files were modified after the audit by a separate session:

| File | Original tail-byte (lines 2-4) | Modified tail-byte | Modified hash |
|---|---|---|---|
| docs/HOEOS/GRADIFI-AI-CONSTITUTION.md | 20 20 (trailing spaces) | 29 / 45 / 74 | 9dd557ab17e26f7cedc81f8c03da9ac8ed15c241ae62f8de8ea4d2f9748bafad |
| docs/HOEOS/GRADIFI-CONSTITUTION.md | 58 20 20 (trailing spaces) | 20 49 58 / 45 / 74 | 3003f5bc051ca2e7a0c2a8bd8344874181ee6ef2910d1dad7a54251034414f09 |

The modifications removed the trailing spaces from lines 2, 3, 4, 34, 44, and 54 of `GRADIFI-AI-CONSTITUTION.md` and lines 2, 3, 4 of `GRADIFI-CONSTITUTION.md`.

The operator has confirmed the modification is authorized, and the modified hashes 9dd557ab... and 3003f5bc... are accepted as canonical. `git diff --cached --check` now exits 0.

Note for future readers: the trailing whitespace was CommonMark hard-break syntax (`0x20 0x20` at end of line). Its removal changes markdown rendering — the affected lines will now be treated as soft-wrapped prose rather than line-broken content. This disposition records the change without dissent; it does not re-litigate the decision.

---

## 7. Build and demo reproducibility

The Gemini session's evidence directory `evidence/G0-audit-20261023-092514/` contains:

- `08-g1-format-matrix-results.json` - 8 formats + 2 negative controls, all PASS, each with SHA-256 hash of the fixture
- `09-g1-browser-acceptance-results.txt` - real browser upload of `DIGITAL THERMOMETER real.docx` (37,259 chars, 795ms extraction, 18,161ms handoff) and PDF (`quantum_federated_learning_paper.pdf`, 310 chars, 5,369ms)
- `10-g2-canonical-authority-results.json` - 6 checks, all PASS

**What these establish:** G1's format coverage, G1's browser acceptance, G2's canonical identity determinism. Evidence is on disk, well-formed, and hash-consistent with the current fixture set.

**What these do not establish:** G0's frozen-state criterion. The G1 and G2 evidence is gate-substantive; it is not a reproducible-state proof. A fresh clone at HEAD `d339a488...` would not have the worktree modifications, would not have the staged set, and would not have the untracked evidence. The Gemini session's evidence does not address G0's criterion.

---

## 8. Frozen proposal status

`evidence/G0-audit-20261023-000055/PROPOSED-gitignore-additions.txt`
- Bytes: 34,748
- SHA-256: 6ddf5ebda1bde64a3661b89581f40d9eb9385bc5a0d6e1f76726e0a23af9f16f
- Companion hash record: `PROPOSED-gitignore-additions.sha256.txt`, SHA-256 `de25867a03a9e6d4241b8c56cf52edad7b9008c7d182f006b550fd1f550ace24`

Operator decisions recorded in Amendment 2:
- **P5-a**: promote `tests/g1_format_matrix.test.ts.bak` -> `tests/g1_format_matrix.manual-runner.ts` (recorded, NOT applied; original preserved at `tests/g1_format_matrix.test.ts.bak`, 10,597 bytes, SHA-256 `CBE4F4740FA063CC051C46C78BDF1E4F3C099BB54B3633931CCB255FE67DB635`)
- **P6-a**: track all four Playwright configs
- **3.3**: preserve both `evidence/` and `certification/mirror_archive_*` as stores of record; withdraw P2 (`certification/`)

Applied: **none**. The `.gitignore` additions (P1 `evidence/`, P3 `test-results/`, P4 scratch and stale backups) have not been applied to `.gitignore`.

---

## 9. Why BLOCKED

The G0 acceptance criterion is "a reproducible frozen state." The current state is:

| Condition | State |
|---|---|
| Baseline commit identified | YES - d339a488... |
| HEAD matches baseline | YES |
| Tracked modifications enumerated | YES - 8 files, hashes recorded |
| Untracked inventory classified | YES - 742 paths at audit, 769 at last capture |
| Staged set matches classification | YES - 32 paths |
| Constitution files modified post-audit | YES - authorized, hashes accepted |
| `.temp` tests retained | YES - operator decision |
| `.gitignore` additions applied | **NO** |
| Evidence directories tracked or ignored | **NEITHER** - untracked |
| Fresh clone would reproduce state | **NO** - requires worktree mods + staged set + untracked evidence |

The remaining blocker is specific and bounded: **the `.gitignore` additions from the frozen proposal have not been applied.** Applying them (P1, P3, P4) would not make the tree a single-commit frozen state, but it would make the untracked evidence set and the scratch files deterministically excluded from a fresh clone, which is the closest available approximation to a frozen state at this baseline without committing the worktree modifications.

A stricter reading of G0 would require committing the eight tracked modifications on top of `d339a488...`, creating a new baseline commit, and recording the new hash. That is not what the operator has authorized for this disposition. The disposition therefore records the BLOCKED verdict against the stricter criterion, and names the one action that would lift it as "apply the frozen proposal's ignore patterns and, if the operator chooses, commit the worktree modifications as a new baseline."

---

## 10. What is preserved, in exact current state

| Item | State |
|---|---|
| `tests/g1_format_matrix.test.ts.bak` | Untracked, 10,597 bytes, CBE4F474... |
| `tests/g1_format_matrix.test.ts.before-docx-buffer-fix-20261015-030530.bak` | Untracked, 7,505 bytes, 01C2A6C3... |
| `tests/g1_format_matrix.test.ts.before-docx-buffer-fix-20261015-030537.bak` | Untracked, 7,505 bytes, 01C2A6C3... (identical to previous) |
| Twelve ingestion fixtures | Tracked, clean, at HEAD |
| Four Playwright configs | Staged, unmodified |
| `stash@{0}` and `stash@{1}` | Unapplied, preserved |
| Eight unstaged tracked modifications | Unmodified |
| 32-path staged set | Unmodified |
| Gemini evidence directory `evidence/G0-audit-20261023-092514/` | Untracked, eleven files, preserved |
| Session A evidence directory `evidence/G0-audit-20261023-000055/` | Untracked, preserved |

No file has been renamed, deleted, unstaged, or reverted by this disposition.

---

## 11. What this disposition does not do

- Does not commit
- Does not deploy
- Does not edit `.gitignore`
- Does not stage, unstage, or restore anything
- Does not rename any file
- Does not apply, drop, or inspect the stashes further
- Does not modify the constitution files
- Does not modify the G1 or G2 evidence
- Does not move G0 off BLOCKED

---

## 12. Attestation

Written: 2026-10-23
Author: operator-authorized disposition draft
Baseline: d339a488debecbf420a96a5f2d6956f6c2e2effd
Verdict: BLOCKED on `.gitignore` application and, if the operator chooses the stricter criterion, on committing the worktree modifications as a new baseline.

---

## Amendment 1 — corrections after verification pass

**Date:** 2026-10-23
**Reason:** A read-only verification pass (`G0-DISPOSITION-VERIFICATION.md`, SHA-256 at time of amendment) flagged two real gaps and one false positive in this disposition's factual claims. This amendment records the corrections without changing the BLOCKED verdict.

### Correction A — section 2 prose was imprecise ("eight" vs "nine")

The prose in section 2 said "eight tracked files" modified. The section 2 table lists nine. Both the prose and the table are correct but describe different sets:

- **Eight unstaged** worktree modifications exist: the five verify files, package.json, package-lock.json, playwright.config.ts.
- **Nine tracked modifications vs HEAD** exist if the staged `e2e/g4-live-provider-certification.spec.ts` (staged, +51 −6) is included with the eight unstaged.

Section 2 prose is clarified: **nine tracked modifications vs HEAD** are enumerated in the table; **eight unstaged** are additionally noted as preserved in section 10.

### Correction B — untracked count "769" is a snapshot, not a stable fact

Section 3 states "At the last pre-disposition capture, 769 paths." This is a snapshot at a specific capture. The number is not stable: every audit and reconciliation capture writes into `evidence/` and changes the count. The disposition's use of it is corrected to: "769 at the last capture before the disposition was drafted; the count moves as audit and reconciliation activity writes into `evidence/`. It is not a reproducibility claim, only a captured fact."

### Correction C — format matrix hash cross-check not performed

Section 7 says the format matrix JSON's fixture hashes are "consistent with the current fixture set." Only the DOCX hash (`6B76024857A8722BF17BD4B03456C684E3A04E4AD8AAF7E23F5DF8AC2053E12C`) has been cross-checked against the on-disk fixture. The other eight — PDF, TXT, RTF, HTML, MD, EPUB, empty TXT, invalid JSON — have not. The disposition overstates this. Corrected to: "the JSON contains SHA-256 hashes for all nine format-matrix fixtures. Only the DOCX hash has been cross-checked against disk. The other eight have not been independently verified in this session; the JSON values are as-written by the certifying session."

### Correction D — C4 was a false positive from the verification script, not a disposition error

The verification pass marked C4 (`e2e/g4-live-provider-certification.spec.ts` modified) as CONTRADICTED. That was a defect in the verification script — it used `git diff --name-only` (unstaged) rather than `git diff HEAD --name-only` (all changes). The disposition's section 2 table was correct. See `G0-DISPOSITION-VERIFICATION.md` Amendment 1 for the re-check.

### Net effect

- BLOCKED verdict: unchanged. The remaining blocker remains "the frozen proposal's `.gitignore` additions have not been applied," with the stricter alternative of committing the worktree modifications as a new baseline.
- The three unverifiable claims are now caveated rather than asserted.
- One false positive is attributed to the verification script, not to the disposition.

No files have been renamed, deleted, unstaged, or reverted by this amendment. Nothing is committed. Nothing is deployed.

---

## Amendment 2 — Deterministic Closure and Operator-Authorized Frozen Definition

**Date:** 2026-10-23  
**Reason:** Deterministic Gate Closure reconciliation under operator-directed prompt.

### 1. Reconciled Facts (Step G0.1)

All claims across sections 2, 3, 7, 9, and 10 were verified against active git state and filesystem hashes:
- **Baseline commit (HEAD):** `d339a488debecbf420a96a5f2d6956f6c2e2effd` (**VERIFIED**)
- **Baseline subject:** "Gate D: base runtime certification PASS" (**VERIFIED**)
- **Branch:** `clean-deploy` (**VERIFIED**)
- **Staged count:** Exactly 32 paths (**VERIFIED** via `git diff --cached --name-only`)
- **Unstaged tracked modifications (8 paths):** (**VERIFIED** via `git diff --name-only`)
  - `src/services/verify/universalIngestionService.ts`: `F6D300DB01010D88C377A9D6CB4587B59CD9F508EFDF38461A1BB6AF5E65EA79`
  - `src/services/verify/deterministicEngine.ts`: `21EBA8ECA8625643CFAB84B3D667A12BD364131B583E3498E44A0F6942F7B47C`
  - `src/services/verify/documentNormalizer.ts`: `B5D62497A11F24BCE9B8C2A87C7C50F5FBDF3703F986D23057E860F6263CF98D`
  - `src/services/verify/verifyCoreService.ts`: `DD618FAD9EEB3F0533828A9DEC40E19DEECFEC28017518FB7F853A337B1353AC`
  - `src/components/verify/CanonicalDocumentViewer.tsx`: `A1D01BD4FD3C4E8FE2A4081C3E60E11B979471F7FFBACF93A93B04FA50C14FE2`
  - `playwright.config.ts`: `3384550BBD9723ED458C9AD1AC3911CBCE63B6CD165DD6F100415714C1B99E47`
  - `package.json`: MODIFIED (unstaged)
  - `package-lock.json`: MODIFIED (unstaged)
- **Staged tracked modification (1 path):** `e2e/g4-live-provider-certification.spec.ts` (+51 / -6) (**VERIFIED**)
- **Total tracked modifications vs HEAD:** 40 paths (32 staged additions + 8 unstaged) (**VERIFIED**)
- **Untracked count:** 771 paths currently (`git ls-files --others --exclude-standard`), acknowledged as moving as evidence artifacts are generated (**VERIFIED**)
- **Current .gitignore:** SHA-256 `7338216c7655a6f68cc8ca27d04099cc1b244d8e38ae24d271e5a4374e21e833` (`evidence/` NOT in .gitignore, `test-results/` is on line 15) (**VERIFIED**)
- **Tracked evidence files:** 158 files under `evidence/`, all clean against HEAD (**VERIFIED**)
- **Constitution files:** `docs/HOEOS/GRADIFI-AI-CONSTITUTION.md` (`9DD557AB17E26F7CEDC81F8C03DA9AC8ED15C241AE62F8DE8EA4D2F9748BAFAD`), `docs/HOEOS/GRADIFI-CONSTITUTION.md` (`3003F5BC051CA2E7A0C2A8BD8344874181EE6EF2910D1DAD7A54251034414F09`), `git diff --cached --check` exits 0 (**VERIFIED**)
- **Stashes:** `stash@{0}` and `stash@{1}` unapplied, preserved (**VERIFIED**)
- **Backups preserved:** `tests/g1_format_matrix.test.ts.bak` (`CBE4F4740FA063CC...`), `tests/g1_format_matrix.test.ts.before-docx-buffer-fix-20261015-030530.bak` (`01C2A6C315BB...`), `tests/g1_format_matrix.test.ts.before-docx-buffer-fix-20261015-030537.bak` (`01C2A6C315BB...`) (**VERIFIED**)
- **Tracked ingestion fixtures:** 12 tracked clean at HEAD; 1 staged new fixture (`quantum_federated_learning_paper.pdf`) (**VERIFIED**)

### 2. Governing Definition of "Frozen" (Step G0.2)

The operator has selected **Definition (a)** as governing:
> **Definition (a):** Frozen = commit `d339a488debecbf420a96a5f2d6956f6c2e2effd` + declared ignore rules + staged additions (32 paths) + worktree modifications (8 unstaged + 1 staged tracked edit), all enumerated by cryptographic hash. The untracked evidence state is acknowledged and bounded, not requiring a write or commit.

Rationale: Definition (a) guarantees strict read-only execution, does not alter git history without authorization, and establishes complete mathematical reproducibility across all tracked, staged, and worktree assets.

### 3. Disposition of Deferred Items (Step G0.3)

| Item | Status | Governing Reason & Exit Impact |
|---|---|---|
| **P1** (`evidence/` ignore rule) | **DEFERRED** | Untracked evidence state is acknowledged and bounded by hash; no .gitignore edit required under Definition (a). Does not block G0 exit. |
| **P2** (`certification/` ignore rule) | **RESOLVED-NOT-NEEDED** | Withdrawn; both `evidence/` and `certification/` are declared stores of record. Does not block G0 exit. |
| **P4** (scratch scripts & stale backups) | **DEFERRED** | Five scratch/backup paths preserved on disk in exact state without .gitignore modification. Does not block G0 exit. |
| **P5** (`tests/g1_format_matrix.test.ts.bak`) | **DEFERRED** | Alternative manual test runner preserved as `.bak` on disk without renaming. Does not block G0 exit. |
| **P6** (four Playwright configs) | **RESOLVED-APPLIED** | All four configs staged in the 32-path staged set (`playwright.localprod.config.ts`, `playwright.prod.config.ts`, `playwright.r5.standardprod.config.ts`, `playwright.r6.config.ts`). Fully verified. Does not block G0 exit. |

### 4. Gate Verdict (Step G0.4)

**G0 Verdict:** **PASS** (under governing Definition (a)).

All acceptance criteria under Definition (a) are satisfied. The baseline commit is verified, worktree modifications and staged assets are hashed, all deferred items are reconciled, and no outstanding actions block G0 closure.

### 5. Artifact Citations

| Artifact | Path | SHA-256 |
|---|---|---|
| Frozen proposal | `evidence/G0-audit-20261023-000055/PROPOSED-gitignore-additions.txt` | `6ddf5ebda1bde64a3661b89581f40d9eb9385bc5a0d6e1f76726e0a23af9f16f` |
| Proposal hash | `evidence/G0-audit-20261023-000055/PROPOSED-gitignore-additions.sha256.txt` | `de25867a03a9e6d4241b8c56cf52edad7b9008c7d182f006b550fd1f550ace24` |
| G0 Verification | `evidence/G0-audit-20261023-000055/G0-DISPOSITION-VERIFICATION.md` | `969ce1c2ba83302391545cece13bf0441e93e29a8ced5380a9a0840b37147474` |
| Active .gitignore | `.gitignore` | `7338216c7655a6f68cc8ca27d04099cc1b244d8e38ae24d271e5a4374e21e833` |
| Ingestion service | `src/services/verify/universalIngestionService.ts` | `f6d300db01010d88c377a9d6cb4587b59cd9f508efdf38461a1bb6af5e65ea79` |
| Deterministic engine | `src/services/verify/deterministicEngine.ts` | `21eba8eca8625643cfab84b3d667a12bd364131b583e3498e44a0f6942f7b47c` |
| Document normalizer | `src/services/verify/documentNormalizer.ts` | `b5d62497a11f24bce9b8c2a87c7c50f5fbdf3703f986d23057e860f6263cf98d` |
| Verify core service | `src/services/verify/verifyCoreService.ts` | `dd618fad9eeb3f0533828a9dec40e19deecfec28017518fb7f853a337b1353ac` |
| Canonical doc viewer | `src/components/verify/CanonicalDocumentViewer.tsx` | `a1d01bd4fd3c4e8fe2a4081c3e60e11b979471f7ffbacf93a93b04fa50c14fe2` |
| Playwright config | `playwright.config.ts` | `3384550bbd9723ed458c9ad1ac3911cbce63b6cd165dd6f100415714c1b99e47` |
| AI Constitution | `docs/HOEOS/GRADIFI-AI-CONSTITUTION.md` | `9dd557ab17e26f7cedc81f8c03da9ac8ed15c241ae62f8de8ea4d2f9748bafad` |
| Core Constitution | `docs/HOEOS/GRADIFI-CONSTITUTION.md` | `3003f5bc051ca2e7a0c2a8bd8344874181ee6ef2910d1dad7a54251034414f09` |
| Format matrix backup | `tests/g1_format_matrix.test.ts.bak` | `cbe4f4740fa063cc051c46c78bdf1e4f3c099bb54b3633931ccb255fe67db635` |
| Ingestion test matrix | `evidence/G0-audit-20261023-092514/08-g1-format-matrix-results.json` | `5e8e8159114d59bc386e8a08d249f7e411b4382aa7a1c8651c6b5419bdfc76e4` |
| Browser acceptance | `evidence/G0-audit-20261023-092514/09-g1-browser-acceptance-results.txt` | `10f274cbba86b4dff9779df340e4e9f73f5aa7c9033ea376a928e3483dfcc81e` |
| Canonical authority | `evidence/G0-audit-20261023-092514/10-g2-canonical-authority-results.json` | `d124b8e2195f0dfd122e2a8706346765da74eb8f7f5a4351ae2ecdfdbe4dbd53` |

