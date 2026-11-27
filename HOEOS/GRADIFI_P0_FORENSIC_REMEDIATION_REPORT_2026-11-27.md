# Gradifi P0 Forensic Remediation Report
**Date:** 2026-11-27  
**Repository:** `mfventures01-maker/Gradifi`  
**Target branch:** `integration/gradifi-primary-2026-11-20`  
**Supabase project:** `ehkmfnaqkdgkjmdxxbwj`  
**Purpose:** Evidence reconciliation and gated remediation. This report does not authorize production writes, deployments, migrations, or architectural changes.

## Executive disposition

| Workstream | Status | Evidence / blocker |
|---|---|---|
| Deployed `verify` source reconciliation | PARTIAL | Active deployment version 9, bundle hash `dbacfa16e6518daea56af0029c92558e7e2b92aeeccb0651d6a5a17236aa76cf`. Integration-branch entrypoint exists at `supabase/functions/verify/index.ts` (15,178 characters). Earlier forensic comparison established entrypoint parity after import-path normalization. Current bundle retrieval repeatedly failed, so dependency-by-dependency deployed parity cannot be re-certified in this pass. |
| Deployed `ocr-processor` source reconciliation | BLOCKED / PARTIAL | Active deployment version 9, bundle hash `b38eceb35ac478bbeea51ea8994924cbb40766ff5eab272bfa12c2e25a3a460e`. Branch entrypoint is `supabase/functions/ocr-processor/index.ts`; extraction implementation is shared at `supabase/functions/_shared/processing/extract.ts`. A successful bundle retrieval exposed a deployed-local import `./extract.ts`, whereas the branch entrypoint imports the shared implementation. Exact deployed bundle comparison could not be completed because subsequent bundle retrievals failed intermittently. Do not claim exact parity. |
| Missing migration source | FORMALLY DOCUMENTED, ORIGINAL NOT RECOVERED | Supabase migration ledger records `20261126062517_individual_bootstrap_workspace_and_truncate_privilege_fix`; corresponding SQL file is absent from the checked integration branch. Existing recovery record: `HOEOS/MIGRATION_SOURCE_RECOVERY_2026-11-26.md`. Live catalog observations are not the original migration SQL. |
| `supabase_admin` default privileges | UNRESOLVED / AUTHORITY BLOCKED | Live catalog still shows default `TRUNCATE` grants to `anon` and `authenticated` under grantor `supabase_admin`. Current session is `postgres`; `pg_has_role(current_user, 'supabase_admin', 'member') = false`. Do not attempt a role switch or privileged DDL from this connection. |
| Verification-run-to-receipt chain | SQL CHAIN RUNTIME PASS (ROLLBACK-ONLY); UPLOAD/EDGE E2E OPEN | A controlled production transaction exercised persistence → `VALID` receipt publication → public lookup using synthetic text, then rolled back the entire test subtransaction. Post-test counts remained 0 runs / 68 legacy receipts; the canary lookup returned NULL after rollback. Upload/OCR/Edge invocation was not exercised. |
| Isolated branch validation | PENDING COST APPROVAL | Supabase branch creation returned a requirement for cost confirmation. Current quoted branch compute cost: USD 0.01344 per hour. No branch was created; this is separate from the rollback-only production SQL test documented below. |

## 1. Deployed Edge source reconciliation

### Verify
- Supabase reports `verify` ACTIVE, version 9.
- Deployed bundle SHA-256 reported by Supabase: `dbacfa16e6518daea56af0029c92558e7e2b92aeeccb0651d6a5a17236aa76cf`.
- Integration branch entrypoint: `supabase/functions/verify/index.ts`.
- The branch entrypoint imports the shared deterministic engine, types, normalizer, policy and extraction modules from `supabase/functions/_shared`.
- Prior source reconciliation found the deployed entrypoint equivalent after normalizing only the relative import suffix difference (`.js` versus `.ts`).
- Current attempts to retrieve the complete deployed bundle returned `Failed to retrieve function bundle`. Therefore this pass does **not** certify all deployed dependency files byte-for-byte or semantically against the branch.

### OCR processor
- Supabase reports `ocr-processor` ACTIVE, version 9.
- Deployed bundle SHA-256 reported by Supabase: `b38eceb35ac478bbeea51ea8994924cbb40766ff5eab272bfa12c2e25a3a460e`.
- Branch entrypoint: `supabase/functions/ocr-processor/index.ts`.
- Branch extraction implementation: `supabase/functions/_shared/processing/extract.ts`.
- The successfully retrieved deployed bundle showed `index.ts` importing a local `./extract.ts`; the integration branch imports `../_shared/processing/extract.ts`.
- This path difference may be packaging/layout-only, but equivalence of the deployed local file and branch shared file was not established with a stable complete bundle comparison. Treat OCR parity as OPEN.

### Required close-out
1. Retrieve complete deployed bundles for both functions from a stable Supabase bundle endpoint or dashboard export.
2. Compare every deployed file against the exact integration-branch source after narrowly normalizing only import suffixes/paths.
3. Record per-file SHA-256, byte/character counts, deployment version and result.
4. If any dependency differs, classify the difference and propose a branch-only correction. Do not deploy as part of this gate.

## 2. Missing migration: formal recovery disposition

The live migration ledger records:
`20261126062517_individual_bootstrap_workspace_and_truncate_privilege_fix`.

The original SQL file was not found in the integration branch or the other branches checked in the earlier recovery pass. The existing recovery record explicitly states that the original body could not be recovered. This report preserves that distinction.

### Live-catalog reconstruction facts (not original SQL)
- `public.bootstrap_public_individual(text,text)` exists as a SECURITY DEFINER function.
- `public.ensure_personal_workspace()` exists as a SECURITY DEFINER function.
- Both use constrained search paths including `pg_catalog`, `public`, and `auth`.
- Their observed execute grants include `postgres`, `authenticated`, and `service_role`; `anon` is not granted execute.
- The bootstrap routine requires an authenticated identity and verified email, validates supported individual account types, creates/ensures profile and identity/workspace membership state, and avoids silently repairing conflicting identities.
- The personal-workspace routine ensures an active individual workspace and owner membership for the authenticated actor.
- Observed triggers include workspace-to-individual-account provisioning and the individual-account workspace-owner guard.
- Related identity/workspace tables are postgres-owned and have RLS enabled.

These facts describe current catalog state only. They do not establish the exact SQL, statement order, comments, grants, or migration-time behavior of the missing migration.

### Formal disposition
- Mark the original migration source as **UNRECOVERED**.
- Retain the existing recovery report.
- If repository history cannot produce the original, create a separately named, clearly labelled catalog reconstruction document. Never recreate a file under the original migration version and imply it is the original.
- Do not replay, reapply, or fabricate the missing migration.

## 3. Default privilege security issue

Read-only catalog query returned the following relevant state:

- `current_user = postgres`
- `pg_has_role(current_user, 'supabase_admin', 'member') = false`
- Default ACL owner/grantor: `supabase_admin`
- Default ACL for public tables includes `TRUNCATE` for `anon` and `authenticated`.

Existing public tables were previously checked after migration `20261126140955`; the earlier evidence recorded zero existing public tables with `TRUNCATE` granted to either role. The outstanding issue is the default ACL for future tables.

### Owner-authorized remediation (not executed)
A database administrator acting as `supabase_admin` (or an authorized member of that role) should evaluate and execute:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
IN SCHEMA public
REVOKE TRUNCATE ON TABLES FROM anon, authenticated;
```

Then verify the catalog with `pg_default_acl` and `aclexplode`, and separately verify existing public tables. Do not execute this as `postgres` unless the role has the required membership/ownership authority. This report does not claim the privilege issue is fixed.

## 4. Verification-run-to-receipt chain

Latest read-only counts from the production project:

| Relation / condition | Count |
|---|---:|
| `public.verification_runs` | 0 |
| `public.public_verification_records` | 68 |
| `public.verify_document_uploads` | 0 |
| Uploads with `verification_run_id` | 0 |
| Public receipts with `verification_run_id` | 0 |
| Receipts with status, result hash, manifest hash and public schema version all populated | 0 |

Earlier read-only inspection found all 68 historical receipt rows have NULL status, run linkage, result hash, manifest hash and public schema version. A sampled legacy receipt lookup returned NULL under current lookup integrity rules.

### Architecture observations
The catalog definitions previously retrieved show the expected chain:
1. `public.persist_verification_run_and_receipt(...)` delegates to the private persistence implementation.
2. The private routine validates workspace/membership scope, service version, G5 result metadata, canonical document/evidence material, optional source upload and correction-parent scope.
3. It creates and advances a verification run, computes hashes/manifest, links the upload, and invokes public receipt publication.
4. The publisher requires a successful run and matching hashes before inserting a `VALID` public receipt.
5. The public lookup joins the receipt to its run and requires matching hashes, versions, evidence envelope and run-integrity validation.

This is structural evidence from function definitions, not runtime proof. No live successful chain exists in the observed data.

## 4A. Controlled production transaction test (2026-11-27)

Following explicit user authorization, a narrowly scoped synthetic test was executed against the production database. The test exercised the actual deployed database functions, not a mocked implementation:

1. Called `public.persist_verification_run_and_receipt(...)` with synthetic raw text and a synthetic G5 result payload.
2. Used the existing active institutional workspace membership solely to satisfy the function's current workspace-scope checks. No real document text or customer data was used.
3. Verified that the function returned `CREATED` and produced a verification ID.
4. Called `public.lookup_public_verification(verification_id)` inside the same transaction and asserted that it returned the expected verification ID, schema version, result hash and manifest hash.
5. Deliberately raised a rollback sentinel inside a PL/pgSQL exception subtransaction after the assertions passed. PostgreSQL rolled back the run and receipt inserts.

### Post-rollback verification

| Check | Result |
|---|---:|
| `verification_runs` after rollback | 0 |
| `public_verification_records` after rollback | 68 (unchanged) |
| Synthetic canary ID | `VRF-F545ADC52A42` |
| Public lookup for canary after rollback | NULL |
| Persistent synthetic upload/run/receipt artifacts | 0 |

The same production SQL path also rejected a null/invalid persistence request without creating records.

**Disposition:** PASS for the database persistence → receipt publication → public lookup path under a rollback-only production transaction. This is meaningful runtime evidence for the SQL chain, but it is **not** a full upload-to-receipt end-to-end certification. The test deliberately passed `p_source_upload_id = NULL`; it did not upload a Storage object, invoke `ocr-processor`, invoke the `verify` Edge Function, or exercise a JWT-authenticated client request. No durable production test rows were left behind.

## 5. Isolation validation plan

A full isolated test must exercise, using synthetic identities and documents only:

1. Create isolated test workspace and authorized test membership.
2. Upload a known TXT and DOCX fixture through the real upload function.
3. Run `ocr-processor` and verify source-file hash, extracted text and canonical hash.
4. Run `verify` against the extracted canonical object.
5. Confirm exactly one successful verification run and source-upload linkage.
6. Confirm exactly one public receipt with status, run ID, result/evidence/manifest hashes and schema version.
7. Retrieve the receipt through `lookup_public_verification` and compare the public result with the deterministic run result.
8. Repeat the same idempotency key/input and confirm no duplicate authoritative run/receipt.
9. Perform isolated tamper tests against a disposable test record and confirm lookup fails closed.
10. Clean up only the isolated branch/test fixtures according to its retention policy.

### Branch cost gate
Supabase quoted the development branch at **USD 0.01344 per hour**. User approval is required before obtaining a cost confirmation ID and creating the branch. No branch has been created yet.

## 6. Safety and scope controls

- Work target remains `integration/gradifi-primary-2026-11-20`.
- PR #35 remains open and draft.
- No merge or deployment.
- No durable production writes, migrations, backfills, deployments or test records. One explicitly authorized rollback-only production SQL transaction was executed; its synthetic run/receipt inserts were verified absent after rollback.
- No changes to correction handling, receipt generation, integrity validation or public lookup architecture.
- The isolated branch-based upload/OCR/verify E2E test remains pending branch cost approval.
- Production runtime E2E remains separately gated and requires explicit authorization after isolated certification.

## 7. Remediation exit criteria

This P0 phase is not complete until:
- Both deployed Edge bundles have complete per-file parity evidence.
- The missing migration is either recovered from authoritative history or formally retained as unrecovered with a clearly labelled live-catalog reconstruction.
- An authorized `supabase_admin` action removes the default TRUNCATE grant and catalog verification passes.
- The upload/OCR/verify Edge path, source-upload linkage, idempotency and tamper tests pass in isolation. The SQL persistence-to-receipt-to-public-lookup path has now passed a rollback-only production transaction test.
- Evidence is committed to the integration branch and CI is green.
- A separate production-runtime authorization request is presented only after all prior technical gates pass.

**Current overall status: BLOCKED / PARTIALLY EVIDENCED.** The report intentionally does not convert missing runtime proof or missing role authority into a PASS.
