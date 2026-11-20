# HOEOS G6 Application Contract Reconciliation
Date: 2026-11-20
Repository: `mfventures01-maker/Gradifi`
Primary worktree branch: `integration/gradifi-primary-2026-11-20`
Production Supabase project: `ehkmfnaqkdgkjmdxxbwj`
Status: application wiring consolidated; G6/G7/G8 production contract remains blocked pending hash/run persistence implementation and approved migration.

## 1. Scope and outcome

The onboarding wizard, higher-education registration, and HOEOS G0-G12 verification gates are now represented in one primary integration branch and one CI workflow. G6 trusted correction UI/API/service/test code has been selectively brought into that branch. This does not mean G6 is runtime-certified against production.

The exact five November 18 production migration definitions and corrected PIN migration are already restored in this branch. This report uses that recovered baseline and a fresh read-only production catalog inspection.

## 2. Same-branch onboarding and gate wiring

The application router contains these routes:

- `/onboarding` -> `OnboardingWizard`
- `/onboarding/higher-education/register` -> `HigherInstitutionRegistration`
- `/onboarding/higher-education` -> Dean-authenticated `HigherEducationOnboarding`
- `/verify` and `/verify/:verificationId` -> `GradifiVerifyDemoPage`

Root school/higher-institution registration calls the canonical `actor-onboarding` Edge Function after Supabase Auth registration/confirmation. Staff/academic actor provisioning also uses `actor-onboarding`. The auth service now uses an explicit non-secret profile projection and active identity actor lookup.

Added browser smoke test: `e2e/onboarding-entrypoints.spec.ts`.

Added unified workflow: `.github/workflows/gradifi-primary-g0-g12.yml`. It makes onboarding a prerequisite for G1 and then sequences G1-G12 as dependent jobs. It uses placeholder Supabase browser credentials, has no service-role secret, and performs no production writes.

### Gate mapping

| Gate | Meaning | Primary-branch evidence / workflow job |
|---|---|---|
| G0 | Baseline freeze | Branch/commit check, typecheck, build |
| G1 | Document ingestion | 17-format contract and format matrix |
| G2 | Canonical document authority | Canonical text/offset and evidence regression |
| G3 | Deterministic evidence | Deterministic forensic E2E suite |
| G4 | Passage/source alignment | G4-B, G4-C, matched-text highlighting |
| G5 | Student correction and re-verification | New deterministic correction lifecycle suite |
| G6 | Trusted before/after correction report | Trusted comparison server tests and authorization tests |
| G7 | Public receipt resolution | Public RPC privacy and resolution contract tests |
| G8 | Persistence integrity | G4-D persisted evidence integrity and persistence tests |
| G9 | Provider federation | Federation hardening tests |
| G10 | Security and authority boundaries | AI output firewall, actor recovery and higher-ed authority tests |
| G11 | Commercial UX | Onboarding and public verification browser entrypoint tests |
| G12 | Unified commercial MVP release contract | Primary worktree gate-map test, typecheck and build |

The existing `e2e/golden-path-demo-e2e.spec.ts` is preserved as the full G12 runtime target, but it is not run by this workflow. It writes/persists verification data and cannot be executed against production without explicit write approval. The CI G12 job is therefore STATIC/STRUCTURAL only.

## 3. G6 application flow now present in the branch

### 3.1 Correction submission

`GradifiVerifyDemoPage` now has the correction submission path:

1. Requires an original persisted verification receipt.
2. Re-runs the unchanged deterministic verification engine on the corrected text.
3. Builds the bounded G4-D persistence payload.
4. Sends `correctionOfVerificationId` with the new result and evidence envelope.
5. Requires the returned child receipt ID to differ from the parent and to confirm the parent pointer.
6. Requests a trusted before/after comparison using only the two receipt IDs.

G5's deterministic scoring authority is not changed by the G6 comparison feature.

### 3.2 Trusted persistence

The browser persistence service obtains the current Supabase access token and posts to `/api/verify/persist`.

Both Vercel API and Vite development middleware require a Bearer token. The server handler:

- validates the canonical text/hash and deterministic evidence envelope before creating privileged access;
- validates the Supabase Auth user;
- requires an active `identity_actors` row and reads its institution/school scope;
- loads and integrity-checks the correction parent using the service-role client;
- requires the parent receipt to reference a completed verification run;
- verifies the parent run's receipt identity, hashes, completion status and institution/school or individual-owner scope;
- rejects a cross-tenant parent before writing the child receipt with `correction_of_verification_id`;
- rejects a conflicting or malformed idempotent record.

The service-role key remains server-only.

### 3.3 Trusted comparison

The browser sends only `originalVerificationId` and `correctedVerificationId` to `/api/verify/compare-correction`.

The server re-authenticates the user and checks the active actor's institution/school scope, loads both records using service role, validates each persisted envelope and completed verification run, verifies that the corrected receipt points to the specified parent and that the child run's `parent_run_id` points to the original run, and requires distinct canonical document hashes. Both runs must belong to the same institution/school scope or, for individual actors, to the authenticated user. It calculates the before/after counts and returns a bounded comparison DTO. It does not return evidence envelopes, submitted text, matched passages, provider payloads or internal diagnostics.

The Vite development BFF now exposes the same comparison endpoint as the Vercel API route.

### 3.4 Public G7 resolution

The browser's `PublicVerificationService` now calls `lookup_public_verification(text)` and maps only its allowlisted metadata DTO. It no longer directly selects from `public_verification_records`.

The public receipt test suite asserts the RPC-only access path and verifies that no evidence envelope or raw text is returned.

## 4. Production database baseline and discrepancies

Read-only inspection was performed against production project `ehkmfnaqkdgkjmdxxbwj`.

### 4.1 Receipt table

Observed:

- `public.public_verification_records` has RLS enabled and no row policies.
- No user-defined triggers are attached to the table.
- `service_role` has table-level INSERT and SELECT only.
- `authenticated` has column SELECT grants for eight metadata columns; it does not have `evidence_envelope` access.
- No anon table/column grant was observed.
- The table contains 68 rows.
- All 68 rows have NULL `status`, `verification_run_id`, `result_hash`, `manifest_hash`, and `public_schema_version`.

### 4.2 Public lookup function defect

The production `lookup_public_verification(text)` function is SECURITY DEFINER and its current predicate requires:

- `status = 'verified'`
- non-null `verification_run_id`
- non-null `result_hash`
- non-null `manifest_hash`
- non-null `public_schema_version`

But the live status CHECK constraint permits `VALID`, `REVOKED`, `EXPIRED`, `NOT_FOUND`, and `UNAVAILABLE`, not `verified`. All 68 current rows have NULL status and none has any of the other four required fields. Therefore the current RPC returns no eligible receipt from the existing production rows. The application must not expose these incomplete legacy rows as valid public receipts.

### 4.3 Verification run spine

Production has:

- active service `SIM`;
- active service version `SIM-V1`;
- service version ID `d7e91ded-b31f-4669-8e92-20630f289d60`;
- a `verification_runs` table with `parent_run_id`, result/document/evidence/manifest hashes, engine/policy versions and `succeeded` status;
- zero current `verification_runs` rows.

The G6 application code currently writes only `public_verification_records`. It does not create a `verification_runs` row, does not populate `verification_run_id`, `result_hash`, `manifest_hash`, `status` or `public_schema_version`, and does not set `verification_runs.parent_run_id`.

This is the decisive G7/G8 integration blocker. The current G6 receipt-pointer flow can be structurally represented once its pointer migration is approved, but the production public receipt RPC will still correctly return NOT_FOUND until the trusted persistence implementation creates the complete run/receipt projection.

### 4.4 Run mutability

Production grants `service_role` UPDATE and DELETE on `verification_runs`. A correction lineage stored only in `parent_run_id` is therefore not immutable under the current privilege model. The proposed SQL includes a trigger to freeze completed run evidence and lineage while still permitting queued/running lifecycle updates and a succeeded-to-superseded transition.

## 5. Migration proposal

Review-only SQL proposal:

`supabase/proposals/G6_CORRECTION_LINEAGE_PUBLIC_RECEIPT_2026-11-20.sql`

It is deliberately outside `supabase/migrations/` and has not been applied.

Proposed changes:

1. Add `correction_of_verification_id` to public receipt records.
2. Add a self-reference FK, format check, no-self-correction check and correction-parent index.
3. Add the missing FK from `public_verification_records.verification_run_id` to `verification_runs.id`.
4. Require a complete run/hash/schema projection whenever a receipt is marked `VALID`.
5. Add an immutability trigger for succeeded/superseded verification-run evidence and lineage.
6. Replace the public lookup RPC with a metadata-only allowlist that uses the allowed status `VALID`, requires a succeeded/superseded matching run, and exposes the correction parent only through the RPC.
7. Preserve RLS with no browser table-read policy. Do not grant anon/authenticated direct SELECT on the correction pointer or evidence envelope.
8. Do not backfill or relabel the 68 legacy rows.

## 6. Required application follow-up before G6/G7/G8 certification

The server persistence contract must be extended before production approval:

- derive and validate `result_hash` and `manifest_hash` using a documented deterministic serialization/hash contract; do not invent these algorithms in SQL;
- resolve the authenticated actor's institution and school;
- resolve the active `SIM-V1` service version;
- create a `verification_runs` row with the correct identity, hashes, versions and `succeeded` status;
- for corrections, set `verification_runs.parent_run_id` to the original run and set `public_verification_records.correction_of_verification_id` to the original receipt ID;
- create the public receipt row with `verification_run_id`, `result_hash`, `manifest_hash`, `status='VALID'`, and the approved `public_schema_version`;
- make run and receipt creation atomic, preferably through one service-role-only database RPC after the hash contract is frozen;
- return only the safe public receipt DTO to the browser;
- verify parent and child run/receipt linkage, hash equality, idempotency and no direct evidence access.

The current repository does not yet define the result/manifest hash algorithm or atomic run-plus-receipt write contract. This must be resolved in code and tests before the proposal is approved for production.

## 7. Safety and evidence classification

- No production DDL, data mutation, migration replay, migration repair, or function deployment occurred.
- No Supabase development, staging, preview or temporary database was created or used.
- No legacy receipt metadata was fabricated or backfilled.
- **STATIC:** branch integration, source wiring, tests and proposal SQL.
- **STRUCTURAL:** production catalog, constraints, policies, grants, function definitions, migration history and row counts.
- **RUNTIME:** not certified against production.
- **CERTIFICATION:** G6/G7/G8/G12 full production path is not claimed as certified.
