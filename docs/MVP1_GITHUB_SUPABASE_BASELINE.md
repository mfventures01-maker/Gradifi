# Gradifi MVP1 GitHub–Supabase Baseline

**Assessment date:** 2026-11-18 (UTC)  
**Assessment scope:** Phase 0, T0.1–T0.4  
**Repository:** `mfventures01-maker/Gradifi`  
**Supabase project:** `ehkmfnaqkdgkjmdxxbwj`  
**Assessment mode:** Read-only against Supabase production and GitHub; documentation branch only  
**G0 status:** **PENDING SIGN-OFF**

---

## 1. Executive summary

The connected GitHub repository and Supabase project were inspected without applying migrations, changing production records, or deploying Edge Functions.

The principal findings are:

1. Supabase is active and healthy. Its live migration ledger reports **46 applied versions**.
2. The live higher-education schema is only partially populated. The two university records have no campus records; the NUC faculty catalogue rows are not institution-bound; `nuc_departments` is empty.
3. The 12 live student records all belong to the secondary-school institution and one school. They do not constitute a higher-education QA cohort.
4. The institutional submission and canonical verification-run tables are empty. The 68 public verification records are not linked to verification runs and lack result/manifest hashes and status.
5. The deployed `actor-onboarding` version 6 is behind the GitHub PR #24 implementation. The deployed handler imports Dean recovery only; PR #24 also imports subordinate recovery.
6. The deployed `verify`, `upload-document`, and `ocr-processor` functions are basic placeholder handlers, not the G5 verification, durable upload, or OCR implementations required by MVP1.
7. PR #23 contains a recovery-ledger migration variant that is not in the live migration ledger. The applied migration is the PR #24 version `20261117165144`. The live foreign-key delete behavior and partial unique index match the PR #24 version, not the older PR #23 variant.
8. The latest PR #24 CI run passed its targeted tests, typechecks, server build and production build. This is repository CI evidence, not a live institutional golden-path certification.
9. The local workstation working-tree state and the exact stored DEMO-01 evidence artifact/hash could not be read through the GitHub/Supabase connections. Those two items remain outstanding before formal G0 sign-off.

**No production database writes, migration applications, Edge Function deployments, Auth-user creation, or production-record modifications were performed during this assessment.**

---

## 2. T0.1 — Baseline freeze

### 2.1 GitHub repository and remote branch evidence

| Item | Observed value |
|---|---|
| Repository | `mfventures01-maker/Gradifi` |
| Default branch | `main` |
| Repository visibility | Public |
| PR #24 head branch | `repair/dean-recovery-engine-2026-11-17` |
| PR #24 head commit | `88ab7cf6f471fe495530f163c4b12ce90a183277` |
| PR #24 base branch | `repair/oir01-identity-recovery-phase1-2026-11-17` |
| PR #24 base SHA | `17bbf734818c0a2a82cf7ac60cde6cf959b54806` |
| PR #24 | Open, draft, mergeable |
| Latest PR #24 workflow run | `44191273135`, run 123 |
| Workflow conclusion | Success |
| Vercel commit status | Success |

The remote PR head is the implementation reference used for the Phase 0 comparison. This does **not** prove that the user's local workstation is checked out to that branch or commit.

### 2.2 Local Git status: not yet verified

The connected GitHub integration can inspect remote refs and commits, but it cannot inspect uncommitted or untracked files on the user's Windows workstation.

Run the following in the Gradifi repository's PowerShell terminal and retain the output in the baseline record:

```powershell
git status --short --branch
git rev-parse --show-toplevel
git rev-parse HEAD
git diff --stat
git diff --cached --stat
```

**Owner:** Repository maintainer / local release operator  
**Repair task:** Attach the output and reconcile any local-only changes before implementation work continues.

### 2.3 Relevant pull request inventory

The following PRs are relevant to the MVP1 identity, verification, persistence, ingestion, or release baseline.

| PR | Subject | Current state | MVP1 relevance |
|---:|---|---|---|
| #24 | Deterministic Dean provisioning and onboarding wizard | Open, draft | Current Dean recovery and subordinate recovery implementation |
| #23 | OIR-01 actor provisioning recovery schema | Open | Earlier recovery-ledger migration variant; reconcile before merge |
| #22 | VC/Rector authority and institution hierarchy | Merged | Higher-ed root authority and hierarchy |
| #21 | Canonical identity and actor provisioning foundation | Merged | Canonical actor identity foundation |
| #20 | G5 direct document comparison UI | Open | G5 browser comparison presentation |
| #19 | G6 correction comparison and migration validation | Merged | Verification-workspace integration |
| #18 | Authenticated verification persistence baseline | Merged | Verification persistence trust boundary |
| #17 | Higher-ed authority and dual-entry identity model | Open, draft | Higher-ed onboarding and individual identity |
| #16 | Restore authenticated dashboards and Rector/Dean workspace | Open | Institutional workspace and route restoration |
| #15 | G6 PostgreSQL migration validation | Open | Migration-order and privacy validation |
| #14 | G6 trusted correction comparison | Open | Trusted before/after receipt comparison |
| #13 | G6 correction lineage | Open | Immutable correction lineage |
| #12 | Secure Verify persistence endpoint | Open | Authenticated persistence authorization |
| #11 | G1 DOCX fidelity test discovery repair | Open | DOCX regression-test discovery |
| #10 | Deploy Verify G0–G4D engine to clean-deploy | Merged | Verification engine and ingestion deployment branch |
| #9 | Restore Supabase production migration lineage | Merged | Historical migration restoration |
| #8 | Connect G5 direct document comparison | Open | G5 comparison workflow |
| #7 | Browser G4-D persistence payload contract | Merged | Deterministic persistence payload |
| #5 | Canonical generated-ID onboarding and PIN authentication | Open | Earlier actor-onboarding work; reconcile with newer authority work |

PRs #1, #2 and #4 concern the CBT workstream and are not treated as direct MVP1 verification/onboarding dependencies in this baseline.

### 2.4 CI, typecheck and build evidence

GitHub Actions run **44191273135**, workflow **Dean Recovery CI**, completed successfully on PR #24 head commit `88ab7cf6f471fe495530f163c4b12ce90a183277`.

| Check | Result |
|---|---|
| `higherEdAuthorityContract.test.ts` | 16 passed |
| `actorProvisioningRecoveryEngine.test.ts` | 13 passed |
| `actorProvisioningRecoverySchema.test.ts` | 5 passed |
| Total targeted tests | **34 passed, 0 failed** |
| Server runtime build | Passed |
| Client TypeScript check | Passed |
| Server TypeScript check | Passed |
| Production build | Passed |
| Vercel commit status | Success |

CI warnings that remain visible:
- Supabase credentials were absent in the build runner and fallback mode was used.
- Vite externalized `fs` and `path` imports from `providerLogger.ts` for browser compatibility.
- The main JavaScript chunk exceeded the 500 kB warning threshold.
- Dependency audit warnings were printed during installation.
- GitHub Actions warned that actions targeting Node.js 20 are being forced to Node.js 24.

These checks certify the tested PR #24 contract scope only. They do not certify live Auth provisioning, live Edge Function behavior, DOCX browser extraction, the G5 golden path, or institutional persistence end to end.

### 2.5 DEMO-01 negative-control evidence

The supplied forensic baseline identifies DEMO-01 as existing negative-control evidence and requires it to be preserved.

The supplied material describes the negative-control case as a zero-overlap demonstration, but it does not identify a canonical artifact path, immutable file ID, SHA-256, or CI artifact reference.

**Status:** Preservation requirement recorded; original artifact identity and hash not independently verified in this Phase 0 inspection.

**Owner:** Verification QA / demo evidence custodian  
**Repair task:** Locate the original DEMO-01 fixture, result and report; record their exact paths and SHA-256 values. Do not overwrite or regenerate the original evidence as a substitute.

### 2.6 DOCX ingestion defect

The supplied forensic baseline records DOCX package extraction as an immediate G1 blocker.

Required deterministic path:

```text
DOCX binary
  -> ZIP/package reader
  -> word/document.xml
  -> XML text extraction
  -> canonical text
  -> document hash
```

The known defect is the missing or incomplete package/XML extraction stage. A successful filename upload or a PDF/TXT test does not satisfy DOCX acceptance.

**Owner:** Verification ingestion workstream  
**Repair task:** Reproduce a real browser DOCX upload, repair deterministic ZIP/XML extraction, and prove canonical text and hash generation without a long-running hang.

### 2.7 G5 scoring and evidence baseline to preserve

The supplied forensic implementation baseline records the following G5 formulas as certified:

- `overallSimilarity = uniqueMatchedCoverage`.
- `uniqueMatchedCoverage` is the unique, non-overlapping matched document-token count divided by total document tokens, multiplied by 100 and rounded to one decimal place.
- `highestSourceMatch = max(aggregateSourceScore)` across sources.

Phrase, sentence and paragraph evidence are represented. Student and source passages are paired with offsets and deterministic provenance. The `/tools/plagiarism` route is recorded as using `GradifiVerifyDemoPage` → `verifyCoreService` → the G5 deterministic engine. The legacy `plagiarismService.ts` path is not to become a competing authority.

**Freeze rule:** Do not change the G5 scoring formula or introduce a second authoritative engine during Phase 0 reconciliation.

---

## 3. T0.2 — Migration reconciliation

### 3.1 Live migration ledger

The Supabase migration inventory returned **46 applied migration versions**.

The applied history includes the verification persistence spine, CBT migrations, canonical actor onboarding, higher-ed authority, receipt privacy repairs, onboarding hardening, and the OIR-01 recovery-ledger migration.

### 3.2 GitHub comparison

The PR #24 branch migration diff contains the current applied-version migration files and historical filename cleanup. Eleven applied ledger versions that were not in the PR #24 changed-file list were individually located by exact path in the PR #24 branch. The PR #24 diff also contains deletion patches for older timestamp-named migration variants that are not present in the live ledger.

Key applied recovery-ledger version:

`20261117165144_oir01_actor_provisioning_recovery_ledger.sql`

This file exists on PR #24 head and the live migration ledger reports version `20261117165144`.

### 3.3 PR #23 migration variant: do not apply

PR #23 contains:

`20261117130000_oir01_actor_provisioning_recovery_ledger.sql`

That version is **not** in the live migration ledger. It is not interchangeable with the applied PR #24 version.

Differences confirmed by source inspection and live schema inspection:

| Detail | PR #23 variant | Applied PR #24 variant / live schema |
|---|---|---|
| `target_auth_user_id` FK delete behavior | `ON DELETE SET NULL` | `ON DELETE RESTRICT` |
| `identity_actor_id` FK delete behavior | `ON DELETE SET NULL` | `ON DELETE RESTRICT` |
| One initial Dean per institution | No partial unique index in PR #23 migration | Live partial unique index exists |
| Migration version | `20261117130000` | `20261117165144` |
| Live migration ledger | Not applied | Applied |

The live table has `actor_provisioning_jobs_one_initial_dean_per_institution_idx`, a unique partial index on `institution_id` where `actor_type = 'dean'`. Its five foreign keys use `ON DELETE RESTRICT`.

**Decision:** Do not apply PR #23's migration. Do not merge PR #23 independently in its current form. Reconcile its branch history with PR #24 and retain the applied `20261117165144` migration as the canonical version. No migration was reapplied during this assessment.

### 3.4 Migration acceptance result

| Acceptance item | Phase 0 finding |
|---|---|
| Live applied migration history retrieved | Pass |
| Applied recovery-ledger version identified | Pass |
| PR #23 divergent un-applied version identified | Pass |
| Live recovery-ledger FK/index behavior inspected | Pass |
| Migration reapplication avoided | Pass |
| Full local migration directory and local Git status inspected | Pending workstation confirmation |

No production schema change was made during this inspection.

---

## 4. T0.3 — Edge Function reconciliation

### 4.1 Deployed function inventory

The deployed Supabase Edge Function inventory returned:

| Function | Deployed version | Status | Deployed source SHA-256 |
|---|---:|---|---|
| `actor-onboarding` | 6 | Active | `6dc035b71e01bfe50850c28539e734fda62babc2c897f52b97899f68c6b3582b` |
| `verify` | 4 | Active | `4b36ba532b8043e1e75623dc241c2550f0e91e449495b4cad3c0df3fcf03a07e` |
| `upload-document` | 4 | Active | `c9879a1b2611b6a29f3df11ef0c7fa83f57623947d01a517bd1b4c186bc00649` |
| `ocr-processor` | 4 | Active | `61113eb01aee27f120e7cdec36e3cf426ecd5312acb30fdd1328468812272def` |

### 4.2 actor-onboarding drift

The deployed version 6 source imports:

```ts
import { provisionInitialDean } from "./dean-recovery.ts";
```

The PR #24 source additionally imports:

```ts
import { provisionSubordinateActor } from "./subordinate-recovery.ts";
```

The deployed source does not contain the subordinate-recovery import or call. The fetched GitHub `index.ts` content and deployed `index.ts` content are not identical.

GitHub blob SHA for the PR #24 `index.ts`:  
`0f0dfef0bdeb076cc1d24bee46a69fc052c0ed83`

The GitHub blob SHA and Supabase deployment SHA-256 are different hash representations; they must not be compared as if they were the same algorithm. The direct source-text comparison independently confirmed drift.

**Owner:** Supabase Edge Function release owner  
**Repair task:** After PR review and explicit deployment approval, deploy the exact reviewed PR commit and all required relative files; then retrieve the deployed source and verify the subordinate recovery import and route. No deployment was performed here.

### 4.3 verify, upload-document and ocr-processor

The deployed source contents show:

- **verify v4:** returns a generic working response, request path/method and a certificate number. It does not invoke the G5 verification pipeline.
- **upload-document v4:** reads multipart fields and returns filename, size, student ID and institution ID. It does not store the uploaded file or create a canonical submission.
- **ocr-processor v4:** returns a generic working response and timestamp. It does not perform OCR.

The inspected GitHub refs and relevant PR changed-file inventories did not reveal matching `supabase/functions/verify`, `supabase/functions/upload-document`, or `supabase/functions/ocr-processor` source implementations. The GitHub verification implementation is represented by the TypeScript verification services and API persistence route, not by these deployed placeholder Edge Function handlers.

**Owners and repair tasks:**

| Defect | Owner | Required repair |
|---|---|---|
| `verify` is a placeholder | Verification backend owner | Decide whether the deployed Edge Function is retired or replaced by a documented, tested G5 integration. Do not create a competing verification authority. |
| `upload-document` does not persist files | Document repository owner | Implement authenticated private storage and canonical submission creation through the approved server-owned path. |
| `ocr-processor` does not run OCR | Ingestion/OCR owner | Implement deterministic OCR processing and bounded, explicit provider/runtime failure states. |

No Edge Function deployment occurred during Phase 0.

---

## 5. Schema and data reconciliation

Counts below were obtained using direct read-only SQL counts against the live database.

### 5.1 Institutional and academic structure

| Table / entity | Live rows | Observed state |
|---|---:|---|
| `institutions` | 3 | Two `university_federal`; one `secondary_school` |
| `schools` (campus records) | 5 | Four attached to the secondary-school institution; one has no institution link |
| `faculties` | 17 | Sixteen global rows with null institution; one row attached to a sentinel institution UUID |
| `departments` | 1 | Attached to the same sentinel institution UUID |
| `nuc_faculties` | 17 | All 17 have null institution IDs |
| `nuc_departments` | 0 | Empty |

The two university institution records have no linked campus rows. The NUC faculty catalogue is not institution-bound and there are no NUC departments. This blocks a trustworthy higher-ed Dean → HOD academic routing demonstration until the catalogue and institution relationships are reconciled.

### 5.2 Student cohort

| Table | Live rows | Observed state |
|---|---:|---|
| `students` | 12 | All 12 belong to the secondary-school institution and one school |
| `profiles` | 1 | Existing profile is not a higher-ed QA cohort |
| `identity_actors` | 1 | Existing identity is not a higher-ed QA cohort |
| `actor_provisioning_jobs` | 0 | No recovery job records |

The current production dataset does not contain a validated higher-education student cohort for end-to-end QA. Do not create production QA users or records to fill this gap.

### 5.3 Submission and verification persistence

| Table | Live rows | Finding |
|---|---:|---|
| `submissions` | 0 | No canonical institutional submission records |
| `documents` | 0 | No document records |
| `verification_runs` | 0 | No canonical verification-run records |
| `public_verification_records` | 68 | Existing public projections are not linked to canonical runs |

For all 68 `public_verification_records` rows:

- `verification_run_id` is null.
- `result_hash` is null.
- `manifest_hash` is null.
- `status` is null.
- `evidence_envelope` is populated.

This is a material persistence reconciliation gap. The 68 records cannot be treated as 68 completed canonical verification runs.

**Owner:** Verification persistence and receipt owner  
**Repair task:** Reconcile historical public records as legacy projections; define a safe trusted resolver and canonical `verification_runs` linkage for new records. Do not fabricate run IDs or backfill hashes without a deterministic source and explicit approved migration.

---

## 6. Defect register and accountable workstreams

| ID | Defect / gap | Owner role | Required next task | Phase 0 status |
|---|---|---|---|---|
| B0-01 | Local working-tree state not remotely inspectable | Repository maintainer | Capture local branch, SHA, staged/unstaged and untracked state | Open |
| B0-02 | DEMO-01 artifact path/hash not established | Verification QA custodian | Locate and hash original negative-control evidence | Open |
| B0-03 | DOCX package/XML extraction blocker | Verification ingestion owner | Repair ZIP/XML extraction and browser E2E | Confirmed blocker |
| B0-04 | G5 scoring authority must remain unchanged | Verification engine owner | Preserve formula and regression fixtures | Freeze rule |
| B0-05 | PR #23 recovery migration differs from applied schema | Migration release owner | Reconcile/close/update PR #23; never replay its migration | Confirmed |
| B0-06 | Deployed actor-onboarding v6 lacks subordinate recovery | Edge Function release owner | Review PR #24, obtain approval, deploy exact reviewed source, verify readback | Confirmed drift |
| B0-07 | verify v4 is placeholder | Verification backend owner | Align deployed handler with approved G5 server architecture | Confirmed |
| B0-08 | upload-document v4 does not persist files | Document repository owner | Implement authenticated private storage and canonical submission persistence | Confirmed |
| B0-09 | ocr-processor v4 does not perform OCR | Ingestion/OCR owner | Implement OCR path and explicit failure classification | Confirmed |
| B0-10 | Higher-ed campus/catalogue data incomplete | Institutional data owner | Reconcile institution types, campuses, faculty and department catalogues | Confirmed |
| B0-11 | No higher-ed QA identity cohort | QA data owner | Define isolated non-production QA tenant and controlled test identities | Confirmed |
| B0-12 | 68 public receipts lack canonical run/hash/status linkage | Verification persistence owner | Define legacy projection handling and trusted canonical receipt flow | Confirmed |
| B0-13 | CI build uses fallback Supabase config and emits bundle warnings | CI/release owner | Separate compile-only CI from configured runtime E2E; address warnings | Open |

No individual assignee was inferred. Owners are accountable workstreams, to be assigned to named people by the project maintainer.

---

## 7. T0.4 — Baseline certification

### 7.1 Acceptance matrix

| Acceptance condition | Result |
|---|---|
| GitHub and Supabase differences documented | **PASS** |
| Applied migration history compared with GitHub migration inventory | **PASS WITH PR #23 EXCEPTION REGISTERED** |
| No migration accidentally reapplied | **PASS** |
| No production records modified | **PASS** |
| Edge Function deployment versions and source drift documented | **PASS** |
| Every known defect has an owner role and repair task | **PASS** |
| DEMO-01 original evidence path/hash preserved and verified | **PENDING** |
| Local workstation Git status frozen | **PENDING** |
| G0 formal sign-off | **PENDING** |

### 7.2 G0 decision

**G0 is NOT signed off yet.**

The remote implementation and production database baseline is documented. Formal sign-off is withheld for two evidence items that cannot be established through the connected remote services:

1. Local workstation Git status and local HEAD.
2. Exact identity and SHA-256 of the original DEMO-01 negative-control evidence.

The confirmed deployment drift and production schema/data gaps are registered as downstream repair tasks. They do not justify an unreviewed production deployment or a migration replay.

### 7.3 Change-control boundary

Until G0 is signed off:

- Do not apply any migration from PR #23 or PR #24.
- Do not deploy Edge Functions.
- Do not create production QA institutions, Auth users, students or submissions.
- Do not alter the G5 scoring formula.
- Do not overwrite DEMO-01 evidence.
- Do not treat CI success as live runtime or certification evidence.

---

## 8. Source references

- GitHub repository: https://github.com/mfventures01-maker/Gradifi
- PR #24: https://github.com/mfventures01-maker/Gradifi/pull/24
- PR #23: https://github.com/mfventures01-maker/Gradifi/pull/23
- PR #22: https://github.com/mfventures01-maker/Gradifi/pull/22
- PR #21: https://github.com/mfventures01-maker/Gradifi/pull/21
- PR #20: https://github.com/mfventures01-maker/Gradifi/pull/20
- PR #19: https://github.com/mfventures01-maker/Gradifi/pull/19
- PR #18: https://github.com/mfventures01-maker/Gradifi/pull/18
- PR #17: https://github.com/mfventures01-maker/Gradifi/pull/17
- PR #15: https://github.com/mfventures01-maker/Gradifi/pull/15
- PR #14: https://github.com/mfventures01-maker/Gradifi/pull/14
- PR #13: https://github.com/mfventures01-maker/Gradifi/pull/13
- PR #12: https://github.com/mfventures01-maker/Gradifi/pull/12
- PR #11: https://github.com/mfventures01-maker/Gradifi/pull/11
- PR #10: https://github.com/mfventures01-maker/Gradifi/pull/10
- PR #9: https://github.com/mfventures01-maker/Gradifi/pull/9
- PR #8: https://github.com/mfventures01-maker/Gradifi/pull/8
- PR #7: https://github.com/mfventures01-maker/Gradifi/pull/7
- PR #24 CI run: https://github.com/mfventures01-maker/Gradifi/actions/runs/44191273135

**Supabase project:** `ehkmfnaqkdgkjmdxxbwj`  
All Supabase findings in this report were obtained by read-only project inspection and SQL SELECT queries.
