# HOEOS G6 Remote Lineage Reconciliation

**Assessment date:** 2026-11-28  
**Repository:** `mfventures01-maker/Gradifi`  
**Comparison baseline:** `integration/gradifi-primary-2026-11-20`  
**Frozen integration SHA:** `094230a46157d2fd89e9dabfbd0f402abe955a60`  
**Review branch:** `reconcile/g6-remote-lineage-review-2026-11-28`  
**Assessment type:** Remote GitHub static/structural review only. No runtime certification.

## 1. Scope and safeguards

This report reconciles the historical G6 branches against the frozen integration reference. It records branch ancestry, changed-file deltas, and implementation-contract differences.

No historical branch was merged, rebased, reset, force-pushed, cherry-picked, or deleted. No application source, migration, workflow, database, or deployment was changed. This report is the only file added to this isolated review branch.

## 2. Remote comparison results

All five historical branches below share merge base `81cf1363704ba26aecf9466c6d8f23f8141f0c32` with integration.

| Branch | Ahead of integration | Behind integration | Compare status |
|---|---:|---:|---|
| `repair/g6-hobby-plan-postgres-validation-2026-11-16` | 45 | 527 | diverged |
| `repair/g6-trusted-comparison-on-pr12-2026-11-16` | 44 | 527 | diverged |
| `reconcile/g6-trusted-comparison-2026-11-18` | 51 | 527 | diverged |
| `reconcile/g5-direct-comparison-2026-11-18` | 50 | 527 | diverged |
| `reconcile/ho-eos-unified-integration-2026-11-18` | 58 | 527 | diverged |

The two repair branches were also compared directly:

- Base: `repair/g6-trusted-comparison-on-pr12-2026-11-16`
- Head: `repair/g6-hobby-plan-postgres-validation-2026-11-16`
- Status: diverged
- Ahead by: 4
- Behind by: 3
- Merge base: `7e69ce93cf6a8f8cdca2723e56b0fe029b3c78dd`
- The hobby-plan branch adds three files relative to the trusted-comparison branch: the PostgreSQL validation workflow, the privacy repair migration, and the PostgreSQL baseline SQL.

These branch-level ahead counts are not additive. The branches share substantial ancestry and must not be merged wholesale.

## 3. Shared historical lineage

The commit inventory found 1,790 branch-to-commit relationships across 53 branches, representing 745 distinct commit SHAs. A set of commits was shared across 13 branches, including both G6 repair branches, the G5/G6 reconciliation branches, `clean-deploy`, and `reconcile/ho-eos-unified-integration-2026-11-18`.

One inspected shared commit:

- SHA: `b4b6cc5b1b3312f2b649f6a1190111b4b07ebd2e`
- Message: `Use a reproducible evidence hash in G4-D persistence fixture`
- Date: `2026-11-15T23:17:56Z`
- File: `tests/g4d_persisted_evidence_integrity.test.ts`
- Change: replaces a hardcoded evidence-hash fixture with a deterministic hash derived from document hash, engine version, and policy version.

This is a deterministic test-fixture improvement. It does not establish production persistence correctness or runtime certification.

## 4. Persistence architecture reconciliation

### Historical repair branches

The historical branch versions of `src/services/verify/server/persistenceServerHandler.ts` use direct service-role table operations against `public_verification_records`:

- Read the correction parent receipt.
- Validate the persisted parent record.
- Read an existing receipt for idempotency.
- Insert the receipt directly.
- Read back a raced insert after a unique-key conflict.

Inspected blob identities:

| Ref | Path | Blob SHA |
|---|---|---|
| `repair/g6-hobby-plan-postgres-validation-2026-11-16` | `src/services/verify/server/persistenceServerHandler.ts` | `9704ca2c3274f21085b29b037651092faf544e4a` |
| `repair/g6-trusted-comparison-on-pr12-2026-11-16` | same | `7fadd50dfbe59915bbe81b97e777375e803f1169` |

Both historical handlers expose `correctionOfVerificationId`, but their payload contract does not include `sourceUploadId`. The inspected historical handler also does not resolve a workspace and active service version before persistence.

### Frozen integration branch

The integration version of the same handler is materially different:

- Blob SHA: `e84ccd7ac0dbf1affd59e0828545638f306be58a`
- Resolves an active identity actor.
- Resolves an active individual or institutional workspace.
- Resolves the active service version matching the deterministic engine and policy.
- Accepts `sourceUploadId` and `correctionOfVerificationId`.
- Delegates persistence to the database RPC `persist_verification_run_and_receipt`.
- Expects the RPC to return `CREATED` or `IDEMPOTENT_EXISTS`.

The integration implementation is the current architectural contract for this comparison. The old direct-table-write handler is not a safe replacement for it.

## 5. Historical G6 artifacts and their status

The hobby-plan branch contains the following additional artifacts:

| Artifact | Blob SHA | Static observation |
|---|---|---|
| `.github/workflows/g6-hobby-postgres-validation.yml` | `74bf21294aee8636e65d4933e074808020e6a84f` | Starts PostgreSQL 17, applies a synthetic baseline, applies privacy and correction-lineage migrations, and asserts grants, lineage and immutability. |
| `supabase/migrations/20261116150000_verify_receipt_evidence_privacy_repair.sql` | `ed023d57f7da6e6d5506e179f8c58fcd623cb3e8` | Revokes public-role access to `evidence_envelope` and reasserts a receipt metadata allowlist. |
| `supabase/migrations/20261116160000_g6_correction_lineage_metadata.sql` | `80a35e986980f2355e22ec3e1e161f49a7dcef76` | Adds a correction-parent column, FK, no-self-reference check, public-role column SELECT grant, and partial index. |
| `supabase/verification/g6_hobby_plan_baseline.sql` | present on branch | Synthetic PostgreSQL baseline used by the workflow. |

The two migration files are absent from the frozen integration tree under those exact paths. This is a Git tree observation only. It does not prove the equivalent behavior is absent from the live database. Previously recovered live database evidence records later atomic persistence migrations and RPCs; any migration decision must reconcile against the current live migration ledger and definitions, not file presence alone.

The workflow is configured for pull requests targeting `fix/verify-persistence-auth-validation` with relevant migration/verification paths, plus manual dispatch. Its existence and content are STATIC evidence. This review has not established a successful workflow run or independent execution of its SQL assertions.

## 6. Test evidence classification

The historical branches contain:

- `tests/verifyPersistenceAuthorization.test.ts`
- `tests/trustedCorrectionComparison.test.ts`
- `tests/publicReceiptPrivacy.test.ts`
- `tests/g4d_persisted_evidence_integrity.test.ts`

The inspected authorization test uses mocked Supabase clients and asserts authentication, active actor, tampered canonical text rejection, and safe receipt output. The trusted comparison test uses mocked receipt data and checks a comparison DTO, private evidence exclusion, and correction-parent relationship.

Classification:

- **STATIC:** test and source files exist at the inspected branch refs.
- **STRUCTURAL:** the tests are written to exercise selected mocked code paths.
- **RUNTIME:** not established by this GitHub file review.
- **CERTIFICATION:** not established.

Do not describe these tests as passed without a linked successful workflow run and artifact/log review.

## 7. Reconciliation decisions

| Item | Decision | Reason |
|---|---|---|
| Historical direct-write persistence handler | PRESERVE / DO NOT RESTORE | Superseded by integration's workspace-scoped atomic RPC architecture. |
| G6 trusted correction comparison handler and client | RECOVER FOR CONTRACT REVIEW | Valuable historical capability, but must be checked against current receipt schema, auth/workspace boundaries, and API dispatcher contract before adaptation. |
| G6 correction and privacy migrations | PRESERVE / DO NOT REPLAY | Candidate historical SQL; exact live equivalence and migration ledger must be checked first. |
| PostgreSQL hobby-plan validation workflow and baseline | PRESERVE AS HISTORICAL TEST ASSET | Useful isolated validation design; workflow execution and parity with current schema remain unproven. |
| Authorization and trusted comparison tests | PRESERVE / ADAPT | Useful test intent, but mocks and old direct-write assumptions require alignment with current RPC architecture. |
| Shared deterministic evidence-hash fixture change | PRESERVE | Narrow test-fixture improvement; verify whether the exact change is already present in integration before any port. |

## 8. Open verification questions

1. Does the current integration BFF/API expose the G6 correction-comparison operation, and does it preserve the canonical single-dispatcher contract?
2. Does the integration receipt DTO expose correction lineage from the authoritative verification-run record without exposing private evidence?
3. Are the historical correction comparison reads scoped to the authenticated user's authorized workspace/tenant, rather than only to receipt IDs?
4. Does the live schema already contain equivalent correction lineage and privacy constraints through later migrations?
5. Which historical tests can be adapted to exercise the current atomic RPC path without mocking away the database authority?
6. Is there a successful PostgreSQL workflow run for the historical hobby-plan workflow, and what exact commit and artifact does it certify?

## 9. HOEOS disposition

**G6 historical branch reconciliation: CONDITIONAL / NOT CERTIFIED.**

The remote evidence identifies reusable G6 test intent and SQL validation assets, but the old persistence implementation is architecturally incompatible with the frozen integration persistence contract. No source or migration should be transplanted wholesale.

Next safe action: map the G6 comparison endpoint, BFF dispatcher, receipt schema, and live migration/RPC contract on the integration baseline. Then specify the smallest compatibility adaptation and its acceptance tests before any code repair.

---

**Evidence boundary:** This report is based on GitHub branch comparisons and fetched source blobs. It does not certify local-only working-tree changes, live database state as of the report date, successful workflow execution, browser behavior, or production runtime.


## 10. Nine-commit shared-lineage file manifest

The user-supplied remote inventory identifies the following nine commit SHAs as present on the same 13 branches listed in the CSV manifest. GitHub commit diffs were fetched for each SHA and mapped to their changed file and change intent.

| Commit | File | Reconciliation classification |
|---|---|---|
| `b4b6cc5b1b3312f2b649f6a1190111b4b07ebd2e` | `tests/g4d_persisted_evidence_integrity.test.ts` | Deterministic fixture repair |
| `cdc4d4eedb9b6fb6464ee8de15a44701b5132847` | `src/services/verify/types.ts` | Persistence DTO contract change |
| `34cc1ad2453476f1f1edad197bc457aca3069076` | `tests/verifyPersistenceAuthorization.test.ts` | Authorization test strengthening |
| `69a37e4215828803a26d7224d2b9d3dddb02d4d0` | `tests/g4d_persisted_evidence_integrity.test.ts` | Authenticated handler test alignment |
| `216bcb5ccdda31702cafcae59c23eb6747371558` | `src/services/verify/server/persistenceServerHandler.ts` | Validate payload before Supabase client construction |
| `8b79aefa512053d6a15cfe3c67143bbf7ba0a1b2` | `src/services/verify/verificationPersistenceService.ts` | Public receipt type adjustment |
| `08f0d7c39fd2d80491fb6ad05b9528ed957d770d` | `tests/g4d_persisted_evidence_integrity.test.ts` | Privacy projection assertions |
| `501e92efdde824559d237851c38504b09c79f8fe` | `src/services/verify/verificationPersistenceService.ts` | Redacts canonical text and verbatim excerpts from public evidence projection |
| `593a2c0c566e6e780a0ce8c13525e16fd7381467` | `.github/workflows/verify-persistence-auth.yml` | Adds CI workflow for typecheck, auth/tamper tests, persistence tests and build |

**Interpretation:** this shared lineage records a coherent historical hardening sequence around deterministic evidence reproducibility, authenticated persistence, privacy-safe public receipt projection, and CI enforcement. It is not nine independent implementations, and the BranchCount of 13 is not a measure of 13 separate repairs.

The commit-level manifest is stored at `docs/forensics/G0_REMOTE_SHARED_COMMIT_FILE_MANIFEST_2026-11-28.csv`. The branch membership values are preserved exactly as supplied in the remote inventory; the fetched commit diffs establish changed paths and patch intent.

### Important verification boundary

The commit diffs prove what was committed, not that the associated workflow passed or that the code remains present in integration. Before carrying any change forward, compare the exact file/blob against the frozen integration tree and inspect the later atomic persistence RPC contract. In particular, do not restore the historical direct-table-write handler merely because its validation-order change is useful. That invariant should be preserved in the current RPC-based architecture and tested there.
