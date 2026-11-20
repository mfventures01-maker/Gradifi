# Gradifi Primary Worktree and Supabase Alignment Register

**Register ID:** HOEOS-GRADIFI-PRIMARY-2026-11-20  
**Repository:** `mfventures01-maker/Gradifi`  
**Primary integration branch:** `integration/gradifi-primary-2026-11-20`  
**Branch base:** `repair/dean-recovery-engine-2026-11-17`  
**Database:** Supabase project `ehkmfnaqkdgkjmdxxbwj`  
**Database project name:** Sentiment and emotional free assessment system  
**Database region/status:** `eu-west-1` / `ACTIVE_HEALTHY`  
**Decision:** `BLOCKED - RECONCILIATION IN PROGRESS`  
**Scope priority:** Bring institution onboarding and verification gates G1-G7 into one coherent, testable Git branch, then establish exact repository-to-Supabase migration parity.

---

## 1. Executive decision

A new non-production integration branch has been created from the strongest inspected onboarding/recovery candidate:

`integration/gradifi-primary-2026-11-20`

The branch base, `repair/dean-recovery-engine-2026-11-17`, contains the current higher-education onboarding components, Dean recovery implementation, actor-provisioning recovery tests, G1 format matrix, G3 deterministic forensic test, G4-D persistence-integrity test, and the verification workbench.

It is **not yet a certified single source of truth**. The branch does not contain all G6/G7 integration changes, the latest auth-projection repair is isolated on another branch, and the repository migration files do not currently reproduce the complete live Supabase migration history.

No existing branch was deleted, reset, force-pushed, or merged. No production database migration or schema mutation was performed.

## 2. Correct Supabase target

The correct connected project for Gradifi/SEFAES is:

- Project ref: `ehkmfnaqkdgkjmdxxbwj`
- Name: `Sentiment and emotional free assessment system`
- Status: `ACTIVE_HEALTHY`
- Region: `eu-west-1`

The connected project `efvvczmopacoroudzfnl` is named `ECOMMERCE` and its public schema contains CP Splash/e-commerce tables. It is **not** the Gradifi database and must not be used for Gradifi migration work.

The Gradifi Supabase project currently reports only its `main` database branch. A separate Supabase development branch has not been created; creating one may incur charges and requires cost confirmation.

## 3. GitHub branch disposition

### Selected integration base

| Branch | Observed evidence | Disposition |
|---|---|---|
| `repair/dean-recovery-engine-2026-11-17` | G1 matrix, G3 deterministic forensic test, G4-D persistence-integrity test, verification workbench, HigherInstitutionRegistration, higher-ed authority tests, actor recovery engine/schema tests, OIR-01 migration | **Chosen staging base** |
| `reconcile/ho-eos-unified-integration-2026-11-18` | G1/G3/G5 workbench plus G6 trusted correction and G7 public receipt/privacy tests; G6/persistence changes touch shared verification files | **Source for controlled G6/G7 integration; do not merge wholesale** |
| `fix/onboarding-source-auth-projection-2026-11-18` | Four-file auth/recovery repair: authService, actor-onboarding Dean recovery/index, and a PIN lockout migration | **Controlled auth patch candidate; migration version mismatch must be reconciled first** |
| `onboarding/deterministic-sync` | Dedicated onboarding workflow, contract test, and browser E2E spec; workflow can skip E2E when required secrets are absent | **E2E reference; do not merge whole branch because it also carries unrelated CBT/onboarding history** |
| `integration/verify-workspace-2026-11-17` | G1/G4-D integration workflow and browser payload tests; G4-D API is intercepted in the browser test | **Verification evidence reference** |
| `feat/higher-ed-vc-rector-authority-2026-11-16` | Higher-ed authority UI/service/migrations and authority contract suite | **Authority source reference** |

### Divergence warning

The compared branches are divergent, not clean linear successors. For example, the selected base and unified verification branch differ by a 28-file change set touching the verification page, persistence handlers, public verification service, G1 fidelity tests, and G6/G7 test/migration files. The selected base and auth-projection branch differ by four files. Do not use a blind merge or interpret ahead/behind counts as a file-level merge plan.

## 4. Supabase migration reconciliation

The live Supabase migration history includes, among others:

| Live version | Live migration name | Repository evidence |
|---|---|---|
| `20261107144418` | `20261107090000_canonical_actor_onboarding` | Matching versioned migration file exists on selected base |
| `20261117165144` | `oir01_actor_provisioning_recovery_ledger` | Matching versioned migration file exists on selected base |
| `20261116082730` | `verify_receipt_evidence_privacy_repair` | Matching versioned migration file exists on selected base |
| `20261118085337` | `public_demo_security_tenant_isolation_trial_controls` | Exact migration file not found on selected base or unified integration branch |
| `20261118085407` | `qualify_verify_tenant_ownership_policy_columns` | Exact migration file not found on selected base or unified integration branch |
| `20261118085447` | `convert_internal_reporting_views_to_invoker_security` | Exact migration file not found on selected base or unified integration branch |
| `20261118091905` | `verify_private_document_storage_and_upload_records` | Exact migration file not found on selected base or unified integration branch |
| `20261118092019` | `tighten_verify_upload_metadata_grants` | Exact migration file not found on selected base or unified integration branch |
| `20261118120306` | `fix_pin_lockout_extension_20261118` | Exact versioned file not found on selected base; auth patch branch carries `20261118123000_fix_pin_lockout_extension_20261118.sql` instead |

Additional G6 migration discrepancy:

- `reconcile/ho-eos-unified-integration-2026-11-18` contains `20261116160000_g6_correction_lineage_metadata.sql`.
- `repair/g6-before-after-g7-public-receipt-2026-11-16` contains `20261116120000_g6_correction_lineage.sql`.
- Neither version appears in the live Supabase migration inventory inspected on 2026-11-20.

**Migration decision: BLOCKED.** Do not apply either G6 migration, rename migration files, mark migrations as applied, or replay the PIN lockout migration until the SQL definitions and live catalog state have been reconciled. The five 20261118 live migrations missing from the inspected repository branches must be recovered from the authoritative source or reconstructed from a verified schema/catalog diff and committed as a documented baseline/reconciliation change. Never create empty placeholder migrations to make version lists look equal.

## 5. Onboarding consolidation register

The selected base contains:

- `OnboardingWizard.tsx`
- `HigherInstitutionRegistration.tsx`
- `HigherEducationOnboarding.tsx`
- actor onboarding service and authority-related components
- higher-ed authority contract tests
- Dean recovery implementation and tests
- OIR-01 actor provisioning recovery ledger migration and schema test

The deterministic onboarding branch contains a dedicated workflow, contract test, and browser E2E journey. Its workflow requires Supabase E2E credentials and can skip the real E2E when those secrets are unavailable. The existence of the workflow is not proof that the production onboarding journey passed.

The auth-projection repair branch contains four changes relative to the selected base's common ancestry: `authService.ts`, `dean-recovery.ts`, `actor-onboarding/index.ts`, and migration `20261118123000_fix_pin_lockout_extension_20261118.sql`. The live migration version is `20261118120306`, so the SQL must be compared before that migration can be accepted.

**Onboarding status: STRUCTURAL / PARTIALLY RUNTIME; NOT CERTIFIED.**

Acceptance for the consolidated onboarding flow:

1. Institution registration creates one canonical institution and one canonical root authority.
2. Auth identity, actor identity, institution membership, and role projection resolve to the same authenticated user.
3. Higher-ed VC/Rector and Dean provisioning follows the authority contract.
4. Subordinate provisioning is idempotent and cannot create duplicate actors on retry.
5. A failed or interrupted registration can recover without duplicate Auth identities or credential disclosure.
6. School Principal flows and higher-ed flows are both covered by browser E2E tests.
7. Real Supabase rows are read back after creation; tests must not rely only on mocked/intercepted APIs.
8. Negative tests cover unauthenticated access, wrong authority, cross-institution access, duplicate submission, retry, lockout, and partial failure.

## 6. G1-G7 evidence register

| Gate | Current evidence | HOEOS classification | Decision |
|---|---|---|---|
| G1 Universal ingestion | G1 format matrix exists. User's recent local run: DOCX/TXT/EPUB/malformed DOCX passed, text-native PDF failed with `OCR_NO_TEXT`; separate PDF browser acceptance test exists but must be executed on the frozen branch | Runtime evidence for partial matrix; no complete certification | **FAIL / repair PDF path** |
| G2 Canonical authority | Historical CI run reported canonical authority, offset fidelity, OCR determinism, and tamper tests passing; commit/baseline lineage must be tied to the primary branch | Historical runtime evidence; not current certification | **BLOCKED** |
| G3 Deterministic similarity/policy | Deterministic positive/negative-control test exists on selected base; successful run on the frozen primary commit not yet established | Structural | **BLOCKED pending execution** |
| G4 Evidence and persistence integrity | G4-D integrity suite exists. Browser payload test intercepts the API and returns a synthetic receipt; this proves payload/transport shape, not live database write/read | Structural plus mocked browser runtime | **BLOCKED** |
| G5 Direct comparison and correction | Verification workbench and comparison/correction work exist across branches; shared UI/persistence files differ and need controlled integration | Structural | **BLOCKED** |
| G6 Before/after correction lineage | Trusted correction tests and G6 migrations exist on unified/G6 branches; corresponding migration is absent from live migration history | Structural; schema parity unproven | **BLOCKED** |
| G7 Public receipt verification | Public receipt/privacy test exists on unified branch; live `public_verification_records` exists, but full public retrieval against a real persisted receipt is not certified | Structural; live E2E unproven | **BLOCKED** |

The previous local production build success with missing Supabase credentials is not evidence of live Supabase connectivity. The prior G5.7 Vitest run also called `process.exit(1)` from a test file; its standalone checks must be converted into Vitest assertions before they can count as a valid suite result.

## 7. Required consolidation sequence

### P0 - Freeze the primary branch
- Record exact branch HEAD SHA, clean/dirty worktree state, package lock, Node version, and CI run IDs.
- Preserve the selected base and all source branches.
- Treat the new primary branch as the only integration target for this recovery.

### P1 - Establish database parity before schema changes
- Export the live migration inventory and schema/catalog evidence from the correct project.
- Recover the five missing 20261118 migration definitions.
- Compare the live PIN lockout implementation with both the live migration version and the branch's 20261118123000 file.
- Compare G6 migration SQL and live columns/constraints/RLS/functions.
- Produce a migration parity report with checksums and a forward-only reconciliation plan.
- Do not mutate production during this step.

### P2 - Consolidate onboarding
- Integrate the four-file auth-projection repair after migration-version reconciliation.
- Preserve higher-ed authority and Dean recovery changes.
- Bring in the deterministic onboarding contract and browser E2E tests as focused file changes, not a wholesale branch merge.
- Run typecheck, contract tests, and real Supabase browser onboarding E2E against a safe test tenant.

### P3 - Consolidate G1-G7
- Integrate G6/G7 handlers, services, UI, tests, and migrations from the unified/G6 branches with manual conflict resolution.
- Keep deterministic G5 scoring authoritative.
- Repair G1 PDF extraction before claiming G1 PASS.
- Ensure G4-D browser tests exercise real persistence and read-back, not only intercepted responses.
- Validate G6/G7 against the actual live schema or a Supabase development branch.

### P4 - Certification
- Run clean install, typecheck, complete unit/contract suites, build, Playwright browser journeys, and real Supabase persistence/onboarding E2E on the same primary commit.
- Record negative controls and falsification attempts.
- Capture raw logs, artifact hashes, commit SHA, migration inventory, and database project ref in each gate packet.
- Promote gates only from STATIC -> STRUCTURAL -> RUNTIME -> independent CERTIFICATION.

### P5 - Release
- Only after P1-P4 pass, open the production PR and deploy the exact certified commit.
- Verify deployed commit SHA and live Supabase migration inventory after release.
- Keep all source branches until the primary branch has passed certification and the rollback point is recorded.

## 8. Current operational boundary

**Allowed now:** read-only GitHub/Supabase inspection, branch creation, register updates, targeted PR preparation, local/test-environment verification.

**Not allowed until migration parity is established:** production DDL, migration replay, migration version repair, destructive branch reset, source branch deletion, force-push, or merging unresolved divergent branches.

## 9. Evidence captured for this register

- GitHub branch inventory and branch-to-branch comparisons performed 2026-11-20.
- GitHub file inspection of onboarding wizard, higher-ed registration, onboarding workflow, G1 matrix, G3 deterministic test, G4-D integrity test, verification workbench, G6 correction test, and G7 public receipt test.
- PR changed-file inventories inspected for #3, #17, #23, #24, #25, #29, #30, #31, and #32.
- Supabase project metadata, live migration inventory, public table inventory, and schema table inventory inspected read-only on 2026-11-20.

**This register is a recovery plan and evidence inventory, not a claim that the primary branch or any G1-G7 gate is certified.**


---

## 10. 2026-11-20 synchronization follow-up

### Primary branch and draft PR state

- Primary branch created: `integration/gradifi-primary-2026-11-20`.
- Register committed on that branch: `f333686a667b434849c5c5880d014698e86409d9`.
- Draft PR #33 created for the four-file onboarding auth-projection patch. GitHub reports `mergeable: false`.
- Draft PR #34 created for G6/G7 integration from the unified verification branch. GitHub reports `mergeable: false`.
- Both PRs remain draft and unmerged. This confirms that the source branches cannot be treated as clean fast-forward integrations.

### Live G6 schema check

A read-only catalog query of live `public.public_verification_records` returned these columns:

`id, verification_id, document_hash, evidence_hash, engine_version, policy_version, overall_similarity, total_sources_found, evidence_envelope, created_at, verification_run_id, result_hash, manifest_hash, status, public_schema_version`.

The live table does **not** contain `correction_of_verification_id`. The G6 migration candidate `20261116160000_g6_correction_lineage_metadata.sql` adds that column, a self-reference FK, a no-self-correction check, a public metadata column grant, and an index. Therefore G6 correction lineage is not yet present in the inspected live schema. Do not claim G6 persistence is live.

The same read-only permission inspection showed `anon` and `authenticated` have SELECT only on the explicit public receipt metadata columns, not on `evidence_envelope`. This is consistent with the intended public/private receipt boundary; preserve it when designing G6 metadata access.

### Immediate database blockers

1. Five live 20261118 migration versions are not represented by exact migration files in either inspected candidate branch:
   - `20261118085337`
   - `20261118085407`
   - `20261118085447`
   - `20261118091905`
   - `20261118092019`
2. Live PIN lockout migration version is `20261118120306`; the auth patch branch proposes `20261118123000`. Compare SQL and catalog state; do not replay or rename blindly.
3. Live G6 correction-lineage column is absent. The G6 migration is pending and must be validated as a forward migration.
4. Supabase reports only the `main` database branch. No paid development branch was created.

### Updated gate consequence

- G6: **FAIL/BLOCKED at live-schema gate** because the correction lineage column is absent.
- G7: **STRUCTURAL/BLOCKED**; the public receipt metadata table and privacy boundary exist, but full persisted correction-chain/public retrieval E2E is not established.
- Supabase parity: **FAIL/BLOCKED** until the five missing live migration definitions and PIN lockout version discrepancy are reconciled with repository source.

### Next safe action

Recover the missing 20261118 SQL definitions from the authoritative deployment source, or produce a catalog-derived, reviewed baseline/reconciliation migration. Then compare each migration's resulting schema, grants, policies, indexes, triggers, and function definitions against live. Only after that should the G6 forward migration be added and tested on an isolated database branch.


---

## 11. Production-only database operating constraint (user directive, 2026-11-20)

**Binding instruction:** All Gradifi database inspection and any subsequently approved database work must use the existing production Supabase project `ehkmfnaqkdgkjmdxxbwj` only. Do not create, use, or request a Supabase development/staging/preview database branch for this work.

Operating rules:
1. GitHub integration may continue on `integration/gradifi-primary-2026-11-20`; this is a source-control branch, not a database environment.
2. Supabase access is restricted to the existing production project. Keep the environment target explicit in every database operation.
3. Read-only production inspection is permitted for migration inventory, schema/catalog, RLS, grants, indexes, triggers, and function definitions.
4. No production DDL, migration replay, migration repair/mark-as-applied, data mutation, function deployment, or destructive operation is authorized merely by the instruction to use production. Each such change requires a specific reviewed change plan and explicit approval.
5. Before any approved production mutation, capture the current catalog state and backups/recovery point where available; prepare forward and rollback/recovery procedures; apply one migration at a time; verify the exact resulting schema and application path immediately.
6. Do not suggest or create a separate Supabase database branch for this project unless the user explicitly changes this production-only directive.

**Current status:** Production-only scope accepted. Production database remains unchanged by this consolidation work. Migration parity and G6 live-schema gaps remain open; resolve them with read-only evidence and reviewed, explicitly approved production changes only.


## 12. Production migration reconciliation update (2026-11-20)

The forensic report is recorded at `HOEOS/PRODUCTION_MIGRATION_RECONCILIATION_2026-11-20.md`.

- Recovered the exact submitted SQL for production migrations `20261118085337`, `20261118085407`, `20261118085447`, `20261118091905`, and `20261118092019` from production PostgreSQL logs. Restored all five files to `supabase/migrations/` on this primary integration branch.
- Recovered and confirmed the PIN lockout migration at production version `20261118120306`. Corrected the repository filename from `20261118123000` to `20261118120306` on both the auth-projection PR branch and this integration branch. The live function body and service-role execution boundary match the recovered SQL.
- Confirmed the second tenant-policy migration corrects the first migration's unqualified tenant/project column references. The live policies use qualified outer-table columns.
- Confirmed the private verification upload bucket/table, RLS and object-read policy, public receipt column allowlist, and invoker-security view state against the live catalog.
- Confirmed G6 correction lineage remains absent from production: no `correction_of_verification_id` column, FK, no-self-correction constraint, or correction-parent index. G6 remains blocked and no candidate migration was applied.
- Production database work remained read-only. No migration replay, DDL, data mutation, migration repair, or function deployment occurred.

This is STATIC/STRUCTURAL reconciliation, not RUNTIME or CERTIFICATION evidence. The upload metadata grant still permits authenticated users who pass the row policy to read all 19 upload metadata columns; confirm this is the intended privacy contract before certifying it.


## 13. Onboarding + G0-G12 single-worktree integration (2026-11-20)

- Primary branch remains `integration/gradifi-primary-2026-11-20`.
- School onboarding wizard and higher-education registration routes are present in `src/App.tsx`; root registration and actor provisioning use the canonical `actor-onboarding` Edge Function.
- Auth service now selects an explicit non-secret profile projection and resolves the active canonical actor.
- Added browser smoke coverage at `e2e/onboarding-entrypoints.spec.ts`.
- Added `.github/workflows/gradifi-primary-g0-g12.yml`, with onboarding as a prerequisite and sequential G1-G12 jobs.
- Added deterministic G5 correction lifecycle tests, trusted G6 comparison/auth tests, G7 RPC privacy/resolution tests, and a static same-worktree gate-map test.
- G6 correction UI, trusted persistence endpoint, comparison endpoint, Vercel API route and Vite development middleware are now on this branch.
- Public verification resolution now uses `lookup_public_verification(text)` and does not directly query `public_verification_records`.
- Gate map: `HOEOS/GRADIFI_PRIMARY_G0_G12_GATE_MAP.md`.
- G6 application reconciliation: `HOEOS/G6_APPLICATION_CONTRACT_RECONCILIATION_2026-11-20.md`.
- Review-only SQL proposal: `supabase/proposals/G6_CORRECTION_LINEAGE_PUBLIC_RECEIPT_2026-11-20.sql`. It is not in the executable migration directory.

### G6/G7/G8 production blocker

Production has 68 legacy public receipt rows. All 68 have NULL `status`, `verification_run_id`, `result_hash`, `manifest_hash`, and `public_schema_version`. The production public lookup function currently filters for `status='verified'`, while the live status constraint permits `VALID`, `REVOKED`, `EXPIRED`, `NOT_FOUND`, and `UNAVAILABLE`. There are zero `verification_runs` rows, although an active `SIM-V1` service version exists.

The current G6 application handler persists the receipt row and correction pointer, but does not yet create a `verification_runs` row or populate the run/hash/schema fields required by G7. The application must define the deterministic result/manifest hash contract and atomically create the run and receipt before G6/G7/G8 can be certified. The SQL proposal adds the receipt pointer, run FK, run immutability guard and corrected public RPC contract, but is review-only.

The CI workflow's G12 job is STATIC/STRUCTURAL only. It intentionally does not run `e2e/golden-path-demo-e2e.spec.ts`, which persists data. CI uses placeholder Supabase credentials and no production service-role secret. No production writes were performed.
