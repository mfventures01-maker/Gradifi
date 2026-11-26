# FREELANCER_STAGE_1_MIGRATION_READINESS_REPORT

**HOEOS work package:** FREELANCER-01A  
**Target:** Gradifi / SEFAES  
**Inspection date:** 2026-11-22  
**Supabase project:** `ehkmfnaqkdgkjmdxxbwj`  
**Project status:** `ACTIVE_HEALTHY`  
**PostgreSQL:** 17.6.1.063  
**Repository baseline inspected:** `integration/gradifi-primary-2026-11-20`  
**Report verdict:** **BLOCKED**

---

## 1. Executive decision

The existing SEFAES database already contains the individual identity foundation required by the Freelancer Package. It does **not** yet support a complete individual verification journey.

The current live schema confirms:

- `profiles.role='individual'` and `profiles.account_type` already support freelancer and other individual account categories.
- `identity_actors.actor_type='individual'` is already permitted, with an explicit no-institution/no-school/no-authority scope constraint and email authentication requirement.
- `bootstrap_public_individual(text,text)` already creates the individual profile and identity actor from the authenticated, email-confirmed user.
- `verification_runs.institution_id` is still NOT NULL.
- `verify_document_uploads.institution_id` is still NOT NULL.
- The deployed `upload-document` Edge Function requires an active institutional membership and a supplied institution ID.
- The deployed `verify` and `ocr-processor` Edge Functions are fail-closed HTTP 503 stubs.
- `lookup_public_verification(text)` filters on lowercase `status='verified'`, while the live status constraint only permits uppercase `VALID`, `REVOKED`, `EXPIRED`, `NOT_FOUND`, `UNAVAILABLE`, or NULL.
- All 68 existing public verification records have NULL status, run ID, result hash, manifest hash and public schema version. There are zero verification runs.
- The individual plan, subscription, payment-event and usage-ledger tables proposed for the Freelancer Package do not exist.
- The live ACL grants `authenticated` TRUNCATE on both `verification_runs` and `profiles`. RLS does not protect TRUNCATE. This is a separate security blocker that must be reviewed before expanding the exposed verification path.

**No production DDL, DML, policy changes, function changes, Storage changes, or deployments were performed.** The inspection used read-only metadata and SELECT queries, plus retrieval of deployed Edge Function source.

The approved six-migration architecture remains directionally valid, but it requires the corrections and preconditions in this report. Do not start M1 until the blockers below have been dispositioned.

## 2. Scope and evidence method

The inspection covered the live Supabase project and repository migration counterparts. Live queries inspected columns, nullability, defaults, constraints, indexes, RLS flags, policies, triggers, table ACLs, function definitions and grants, row counts, receipt status distribution, active service versions, Storage bucket configuration, migration history and deployed Edge Function metadata/source.

Repository migration files were fetched from the named integration ref. Their content is treated as repository-source evidence, not proof that a given deployment is running that source. Deployed Edge Function source was retrieved separately from Supabase.

No user document contents, email addresses, authentication tokens, secrets or personal identity values were included in this report.

## 3. Live migration ledger

The live migration ledger contains the verification foundation and later security-hardening migrations, including:

- `2026091200_public_verification_records`
- `20261004073941_sim_v1_persistence_spine`
- `20261116181553_actor_lifecycle_integrity_and_public_individuals`
- `20261118085337_public_demo_security_tenant_isolation_trial_controls`
- `20261118091905_verify_private_document_storage_and_upload_records`
- `20261118092019_tighten_verify_upload_metadata_grants`
- `20261120175328_security_hardening_explicit_rls_and_function_search_paths_20261120`
- `20261120175437_security_hardening_private_graphql_surfaces_and_trigger_rpcs_20261120`
- `20261120175520_security_hardening_revoke_unsafe_legacy_definer_rpcs_20261120`
- `20261120175539_security_hardening_invoker_views_and_private_operational_views_20261120`
- `20261120175620_security_hardening_disable_legacy_placeholder_activity_rpc_20261120`

The live migration ledger is later than the earlier Stage 0 snapshot. The live definitions in this report supersede any earlier assumption where they differ.

## 4. Live data baseline

Counts are from the live project at inspection time:

| Object | Live count / finding |
|---|---:|
| `auth.users` | 1 |
| `profiles` | 1 |
| `profiles.role='individual'` | 0 |
| `identity_actors` | 1 |
| `identity_actors.actor_type='individual'` | 0 |
| `verification_runs` | 0 |
| `verify_document_uploads` | 0 |
| `public_verification_records` | 68 |
| Public records with NULL status | 68 |
| Public records with NULL run ID | 68 |
| Public records with NULL result hash | 68 |
| Public records with NULL manifest hash | 68 |
| Public records with NULL public schema version | 68 |
| `public_trial_sessions` | 0 |
| `public_user_trials` | 0 |

The one existing profile and actor are institution-backed, not individual. No individual account or verification run was created for this inspection.

**Historical preservation requirement:** all 68 public records must remain byte-for-byte/data-value unchanged. Do not synthesize runs, hashes, schema versions, or VALID statuses for these records.

## 5. Object-level schema findings

### 5.1 `profiles`

Live characteristics:

- `user_id` references `auth.users(id)` and is unique.
- `role` already permits `individual`.
- `account_type` already exists.
- `profiles_account_type_check` permits `freelancer`, `independent_student`, `independent_professional`, and `other_individual` only when role is individual.
- `institution_id` and `school_id` are nullable.
- `profiles_role_check` already includes individual.
- RLS is enabled.
- Existing SELECT and UPDATE policies are self-scoped.
- The profile authority guard blocks authenticated users from changing identity, role, institution/school, account type and authentication/authority fields through UPDATE.
- `profiles_sync_institution_membership` fires after INSERT or updates to user/institution/role. It creates or updates institutional membership only when both user_id and institution_id are non-null. For an individual profile with institution_id NULL, this trigger does not create an institutional membership.

**Conclusion:** do not add another individual profile model or repeat the existing account_type/role changes. Preserve the existing profile model.

### 5.2 `identity_actors`

Live characteristics:

- `auth_user_id` is NOT NULL, FK to `auth.users(id)`, and unique.
- `actor_type` already permits `individual`.
- `status` permits `active`, `suspended`, `disabled`, and `pending`.
- `auth_method` permits `email` and `pin`.
- The existing `identity_actors_individual_scope_check` requires an individual actor to have:
  - `institution_id IS NULL`
  - `school_id IS NULL`
  - `authority_user_id IS NULL`
  - `auth_method='email'`
- RLS is enabled; an authenticated actor can select its own actor row.
- No identity actor INSERT/UPDATE grant is available to authenticated. Trusted server functions provision actors.

**Conclusion:** the individual actor scope is already implemented. M1 should reference this canonical actor. Do not create a second freelancer identity table or an artificial institution.

The unique `auth_user_id` constraint means one Auth user maps to one identity actor. The current model is mutually exclusive for an Auth identity: an existing institutional actor cannot also become an individual actor using the same Auth UID. This matches the approved mutually exclusive ownership model. If product requirements later demand one login with simultaneous institutional and freelancer personas, that is a separate identity architecture decision, not a silent M1 extension.

### 5.3 `bootstrap_public_individual(text,text)`

The live function:

- Is SECURITY DEFINER with `search_path=pg_catalog, public`.
- Derives the user from `auth.uid()`; it does not accept a caller-supplied user ID.
- Requires a non-empty full name and one of the four allowed individual account types.
- Requires an Auth user with confirmed email.
- Rejects an already-provisioned conflicting profile or actor.
- Inserts a profile with role individual, no institution/school/authority, email authentication and the requested account type.
- Inserts an active individual actor with no institution/school/authority and email authentication.
- Returns the profile and actor IDs.
- Is executable by authenticated and service_role; not anon or PUBLIC.

The idempotent success branch checks individual role/type and null institution/school, but does not explicitly require actor status active or auth_method email before returning success. Any downstream verification authorization must independently validate the actor's current status, type, scope and auth_user_id. Do not treat a successful bootstrap response as proof of current authorization.

The function does not provision an individual plan, subscription, payment event or usage allowance. M2 must address free-plan provisioning without breaking this existing identity transaction.

### 5.4 `verification_runs`

Live characteristics:

- `institution_id UUID NOT NULL`, FK to institutions.
- `school_id UUID NULL`, FK to schools.
- `service_version_id UUID NOT NULL`, FK to service_versions.
- `billable_event_id UUID NULL`, FK to billable_events.
- `source_submission_id UUID NULL`.
- `created_by_user_id UUID NULL`, FK to auth.users.
- Hashes, engine/policy versions, status, attempt, parent_run_id and result fields already exist.
- Status values: queued, running, succeeded, failed, superseded, cancelled.
- Unique partial index exists for non-null verification_id.
- RLS is enabled and FORCE RLS is enabled.
- Existing INSERT policy requires created_by_user_id = auth.uid(), active institution membership, and matching submission/institution when a source submission is supplied.
- Existing SELECT policy is:
  `created_by_user_id = auth.uid() OR is_current_user_institution_member(institution_id)`.
- There are no UPDATE or DELETE RLS policies in the inspected policy set.
- There are zero rows at inspection time.

**M1 conflict:** institution_id must become nullable and owner_actor_id must be added. The proposed individual scope must require institution_id NULL, school_id NULL, owner_actor_id NOT NULL, and created_by_user_id equal to the actor's auth_user_id. Institutional rows must retain institution_id NOT NULL and owner_actor_id NULL.

**RLS correction required:** simply adding an individual SELECT policy is insufficient. PostgreSQL permissive policies are OR-combined. The existing SELECT policy's creator branch would still allow an individual creator to read a row without validating that their actor is active. Replace/split the policy into explicit institutional and individual branches, preserving the current institution-member/creator behaviour for institutional rows and requiring an active, correctly scoped individual actor for individual rows.

The existing institutional INSERT policy should remain institution-only. Individual persistence must use a trusted server transaction, not a newly broadened browser INSERT policy.

### 5.5 `verify_document_uploads`

Live characteristics:

- `institution_id UUID NOT NULL`, FK to institutions.
- `tenant_id UUID NULL`, FK to tenants.
- `owner_user_id UUID NOT NULL`, FK to auth.users.
- `bucket_id` defaults to verify-private.
- `object_path` is unique.
- Source SHA-256 is required and validated.
- Extraction and canonicalization status/version/hash fields already exist.
- `verification_run_id` is nullable and currently references verification_runs with ON DELETE SET NULL.
- A unique composite constraint exists on (id, institution_id, owner_user_id).
- RLS is enabled and FORCE RLS is enabled.
- Authenticated has SELECT only; service_role has the server-side write privileges.
- Existing SELECT policy is owner_user_id = auth.uid() OR institution membership.
- There are zero rows.

**M1 conflict:** institution_id must become nullable and owner_actor_id must be added. Keep owner_user_id as the Auth-user ownership key. For an individual upload, owner_actor_id must resolve to an active individual actor and owner_user_id must equal that actor's auth_user_id. Keep tenant_id nullable; do not fabricate a tenant or institution.

**RLS correction required:** the current owner_user_id OR institution-member policy bypasses any additional individual actor-status policy if a new permissive policy is merely added. Replace/split it into explicit institutional and individual branches. Preserve the institutional owner/member behaviour and require an active individual actor for individual rows.

### 5.6 `public_verification_records`

Live characteristics:

- `verification_id` is NOT NULL and unique.
- `document_hash`, `evidence_hash`, `engine_version`, `policy_version`, `overall_similarity`, `total_sources_found`, `evidence_envelope`, `created_at` are required.
- `verification_run_id`, `result_hash`, `manifest_hash`, `status`, `public_schema_version` are nullable.
- `pvr_status_ck` allows NULL or one of uppercase VALID, REVOKED, EXPIRED, NOT_FOUND, UNAVAILABLE.
- No FK exists from verification_run_id to verification_runs.
- A partial index exists on non-null verification_run_id.
- A partial index exists on non-null manifest_hash.
- There are two unique indexes/constraints covering verification_id; do not remove either as part of this package without a separate index review.
- RLS is enabled. A deny-all policy applies to anon and authenticated.
- Direct table grants to anon/authenticated are absent in the live ACL. service_role has SELECT and INSERT.

The live lookup function uses `status='verified'`, which is incompatible with the uppercase status CHECK. It also requires run ID, result hash, manifest hash and public schema version. As all 68 current rows have these fields NULL, none can currently resolve through that function.

**M4/M5 correction:** add a run FK with ON DELETE RESTRICT and partial uniqueness for run linkage, preserving NULL historical run IDs. Require complete fields on new receipt writes through a trusted atomic path. A NOT VALID constraint can preserve legacy NULL rows while enforcing the condition for new/updated rows, but it does not repair or certify old rows. M5 must use the approved uppercase VALID status and verify run/receipt parity before returning the public allowlist.

### 5.7 `service_versions` and `services`

- One active service exists: Similarity Verification.
- One active service version exists: SIM-V1.
- Active version has engine_version G5-DETERMINISTIC-v1 and policy_version G3-POLICY-v1.
- canonicalization_version is NULL on the active service version.
- `verification_runs.service_version_id` is NOT NULL.

M4 can resolve the current active SIM version, but must not assume canonicalization_version is populated. If the verification pipeline requires a canonicalization version, it must obtain it from the certified canonicalizer and persist the actual version. Do not fabricate a version value.

### 5.8 Trial and institutional billing objects

- `public_trial_sessions` is RLS-enabled, client-denied, service-role controlled, and stores hashed token/IP values, a three-check counter and 24-hour expiry.
- `public_user_trials` is RLS-enabled and client-denied; it is keyed by device_fingerprint, not a registered individual actor.
- `pricing_plans`, `subscriptions`, `tenant_subscriptions`, `price_versions`, and `billable_events` are existing institutional or tenant billing surfaces.
- `billable_events.institution_id` is NOT NULL and its idempotency uniqueness is scoped by institution.
- Existing subscription rows do not provide the proposed individual actor ownership, individual plan catalog, verified payment event ledger or word-usage ledger.
- No table-name collision exists for:
  - `individual_plan_catalog`
  - `individual_subscriptions`
  - `individual_payment_events`
  - `individual_usage_ledger`

**Conclusion:** do not repurpose institutional billing or anonymous device trials for registered freelancer entitlements. Separate individual billing/usage tables are required.

## 6. Storage and deployed Edge Function findings

### 6.1 Storage

The `verify-private` bucket is private, has a 20 MiB maximum file size, and allows PDF, TXT and DOCX MIME types.

The current Storage SELECT policy resolves an object through `verify_document_uploads` and permits access when the authenticated user is the upload owner or an active member of the upload's institution. That owner branch can support individual ownership only after the upload metadata model is extended and its RLS predicate is made actor-aware. Do not make the bucket public.

### 6.2 Deployed `upload-document`

Live deployment:

- Status ACTIVE, version 8.
- `verify_jwt=true`.
- Source SHA-256: `e4c6939a796a691c1748990e85296bbec1ebde55eda9d479730ebd2274c6ffc4`.

The deployed source:

- Validates the bearer token with Auth.
- Requires multipart file input.
- Requires a valid `institutionId`.
- Validates file size, extension, MIME type and basic PDF/DOCX/TXT signatures.
- Uses service_role to check an active `institution_memberships` row.
- Constructs object paths as institutionId/userId/uploadId/filename.
- Inserts upload metadata with institution_id and owner_user_id.
- Compensates for metadata insert failure by removing the uploaded object.

It has no individual actor-resolution or individual upload branch. It cannot support a freelancer upload as currently deployed. M3 therefore requires a separately reviewed server implementation that resolves the authenticated user to an active individual actor, validates the individual scope, writes the owner_actor_id metadata and uses a server-controlled individual path. No Edge Function was deployed during this inspection.

### 6.3 Deployed `verify` and `ocr-processor`

Both are ACTIVE version 8 with `verify_jwt=true`. Their retrieved source returns HTTP 503 fail-closed responses:

- `verify`: `g5_verification_pipeline_not_configured`
- `ocr-processor`: `document_extraction_pipeline_not_configured`

This means the live individual upload and verification journey is not currently executable end to end. M3 alone cannot complete the freelancer package. The extraction and G5 execution adapters must be implemented and independently certified before M4 can be activated.

## 7. Security and RLS findings

### 7.1 Existing ownership policy OR-bypass

The current SELECT policies on verification_runs and verify_document_uploads use permissive OR expressions. Adding a separate individual policy will not restrict the existing creator/owner branch. The existing policy must be rewritten into explicit mutually exclusive institutional and individual scope branches.

The Storage object SELECT policy has the same owner-or-institution shape and must be reconciled with the new upload ownership model.

### 7.2 Excess authenticated table privileges

Live table ACL inspection found:

- `verification_runs`: authenticated ACL includes SELECT, INSERT, UPDATE, DELETE, TRUNCATE and additional table privileges.
- `profiles`: authenticated ACL includes SELECT, INSERT, DELETE, TRUNCATE and additional table privileges.

The inspected RLS policy set does not include a DELETE policy for either table. RLS does not filter TRUNCATE. The `authenticated` role nevertheless has TRUNCATE at the table ACL level.

This is a **high-severity least-privilege blocker**. Do not assume RLS neutralizes TRUNCATE. It needs a separate, explicit security review and a controlled privilege correction. This report does not execute that correction because the directive forbids production changes and institutional behaviour changes.

Supabase Security Advisor also reports project-wide GraphQL exposure warnings (6 anon-visible objects and 55 authenticated-visible objects), SECURITY DEFINER RPC exposure warnings, and leaked-password protection disabled. These are project-wide findings, not all attributable to the Freelancer Package. They require their own owner-reviewed triage; do not bulk-revoke unrelated access as part of M1-M6.

### 7.3 SECURITY DEFINER boundaries

The inspected individual bootstrap and trial RPCs use SECURITY DEFINER and fixed search_path settings. The bootstrap function derives the user from auth.uid() and is restricted to authenticated/service_role. Trial RPCs are service_role-only. Keep new persistence functions in a non-client-executable or explicitly restricted boundary, validate the authenticated actor server-side, set a fixed search_path, and grant execution only to the intended trusted role.

Do not expose service_role credentials in the browser.

## 8. Repository counterpart reconciliation

The following repository files were fetched from `integration/gradifi-primary-2026-11-20` and compared conceptually with the live schema:

| Repository migration | Blob SHA | Live reconciliation |
|---|---|---|
| `2026091200_public_verification_records.sql` | `05ef63dcaf5d8b23abcbacd6fad1e3ff31b8d466` | Original receipt table and initial public read policy; later live hardening supersedes its public-read policy. |
| `20261004073941_sim_v1_persistence_spine.sql` | `91af27a0ba23c6636d1595fcb391cb31bfa1c528` | Defines services, service_versions, institutional billable_events and institution-required verification_runs. |
| `20261116181553_actor_lifecycle_integrity_and_public_individuals.sql` | `f48e6f1e02cf231a9c6f56aded61e713c36c9286` | Introduces individual actor scope, account_type, profile guard and bootstrap RPC. Live schema confirms those objects exist. |
| `20261118085337_public_demo_security_tenant_isolation_trial_controls.sql` | `164f386997313d1c0bd948588d34eede5b12fca7` | Establishes membership helper, run policies, trial-session RPCs and lookup function. Live schema confirms current function/policy behaviour. |
| `20261118091905_verify_private_document_storage_and_upload_records.sql` | `4026d9af668916c890bfe1acedfd9b7e5a598eec` | Creates institution-required upload metadata and private bucket policy. |
| `20261118092019_tighten_verify_upload_metadata_grants.sql` | `c9b11a9ebce3c36cc2229466d4e23ae739c4c065` | Restricts upload metadata to authenticated SELECT and service_role writes; live ACL agrees. |
| `20261114105153_verify_receipt_least_privilege_20261114.sql` | `5f506973758d5ab09146d8dd5bd1ce22d062de22` | Receipt table privilege hardening. |
| `20261114105314_verify_receipt_column_allowlist_20261114.sql` | `079018b10dee02646cb2d0352ee9cb00c90e3338` | Column-level public receipt allowlist. |
| `20261116082730_verify_receipt_evidence_privacy_repair.sql` | `7a1aa4d492307bdd3ae3bd4d70cebde072725633` | Removes public access to evidence_envelope. |
| `20261118085407_qualify_verify_tenant_ownership_policy_columns.sql` | `0b045136ebe943c78b41848f014a9341485eade5` | Clarifies tenant/institution policy references. |
| `20261120175328_security_hardening_explicit_rls_and_function_search_paths_20261120.sql` | `a9d50e5663a82e3172d5d2217714f0115e8f015d` | Adds deny policies to RLS tables without policies and fixed search_path to functions missing it. |
| `20261120175520_security_hardening_revoke_unsafe_legacy_definer_rpcs_20261120.sql` | `2544613cd9d787dbecd4dfd690c0faa9eb30ae79` | Revokes selected unsafe legacy SECURITY DEFINER RPC execution. |

The repository path probes for `supabase/functions/{upload-document,verify,ocr-processor}/index.ts` returned 404 on this ref. The deployed function source was retrieved directly from Supabase. Therefore the current repository counterpart/source parity for those deployed functions remains unresolved and must be located before implementation or deployment.

## 9. Six-migration dependency design, corrected

The original dependency ordering remains:

```text
M1 Individual ownership
 ├── M2 Individual entitlements and usage
 └── M3 Individual upload access
       M2 + M3 + M1
             ↓
       M4 Atomic run/receipt persistence
             ↓
       M5 Public receipt lookup
       M6 Individual verification history
```

M5 and M6 both depend on M4. M6 also depends on M1. M2 and M3 may proceed in parallel after M1's contract is finalized.

### M1. Individual verification ownership

**Objects:** verification_runs, verify_document_uploads, identity_actors (FK target only), existing run/upload policies and indexes.

**Required changes:**

- Drop NOT NULL from verification_runs.institution_id and verify_document_uploads.institution_id.
- Add nullable owner_actor_id FKs to identity_actors.
- Add mutually exclusive scope constraints:
  - Institutional: institution_id NOT NULL and owner_actor_id NULL.
  - Individual run: institution_id NULL, school_id NULL and owner_actor_id NOT NULL.
  - Individual upload: institution_id NULL, owner_actor_id NOT NULL, owner_user_id = actor.auth_user_id.
- Validate cross-table actor_type, status, auth_user_id, institution_id, school_id, authority_user_id and auth_method in a trusted trigger or trusted transaction. Do not attempt a cross-table SQL CHECK.
- Add an owner_actor_id/created_at descending partial index for individual run history.
- Add an owner_actor_id/created_at descending partial index for individual uploads.
- Add a partial unique index for individual (owner_actor_id, idempotency_key) after the idempotency column is introduced in the approved sequence.
- Preserve all existing institutional fields, RLS branches, service-version FK and billable-event FK.
- Rewrite permissive SELECT policies into explicit institution and individual branches; do not merely append another permissive policy.
- Preserve server-only writes for individual rows.

**Preconditions:** verify zero or fully classified existing rows before altering nullability; verify no unowned rows; verify existing institutional policies and grants; approve the separate authenticated TRUNCATE ACL remediation.

**Postconditions:** institution-backed rows remain institution-owned; individual rows have an active individual actor and no institution/school; owner_user_id equals the actor Auth UID; cross-user SELECT fails.

**Rollback:** forward-compatible columns and constraints only. Do not backfill fabricated institution IDs. Do not remove owner_actor_id or relax constraints automatically after application data exists.

### M2. Individual entitlements and usage

**Objects:** new individual_plan_catalog, individual_subscriptions, individual_payment_events, individual_usage_ledger; carefully reviewed extension of bootstrap_public_individual.

**Required design:**

- Keep all four tables separate from institutional billing.
- Plan catalog contains plan identity, active state and quota rules. Do not invent prices.
- Individual subscription is actor-owned and has explicit lifecycle state and effective dates.
- Payment events are server-verified provider events with provider event ID uniqueness and immutable event history.
- Usage ledger is append-only with RESERVE, CONSUME and RELEASE events, actor, subscription/period, run/idempotency linkage, canonical word count and timestamps.
- Serialize quota reservation against the actor/subscription period row using row locking.
- Calculate word count from server-extracted canonical text. Never accept browser-supplied word count or quota state.
- Free plan provisioning must be idempotent and transactionally coupled to individual bootstrap, without causing institution membership side effects.
- Preserve agreed quotas: Free 3 attempts/month and 3,000 words per attempt; Student 100,000 words/month; Professional 300,000 words/month. Prices remain unspecified.

**Preconditions:** M1 ownership contract exists; payment provider event authenticity and event identity contract is defined; failed-attempt billing semantics are approved.

**Postconditions:** concurrent reservations cannot overspend; replayed payment events do not duplicate entitlements; usage cannot be edited by the client.

**Rollback:** retain append-only payment and usage history; disable new plan activation through a controlled feature flag rather than deleting rows.

### M3. Individual upload access

**Objects:** verify_document_uploads, storage.objects policies, verify-private bucket, deployed upload-document Edge Function.

**Required changes:**

- Add actor-aware metadata ownership using M1.
- Replace upload SELECT policy with mutually exclusive institutional/individual branches.
- Replace Storage object SELECT policy with equivalent actor-aware logic.
- Keep bucket private and current MIME/size restrictions.
- Implement individual upload authorization using authenticated Auth UID -> active identity actor -> individual scope.
- Server generates the object path and metadata. No browser-supplied actor ID, institution ID, owner ID, or path is authoritative.
- Preserve current institutional upload branch.
- Maintain object cleanup/compensation if metadata persistence fails.

**Preconditions:** M1 deployed and tested in a non-production environment; repository source location and deployed upload-document v8 provenance reconciled; individual upload path reviewed.

**Postconditions:** individual owner can access only own active-actor uploads; other users cannot read object or metadata; institutional upload regression tests pass.

**Rollback:** disable the individual upload route without changing the private bucket or removing historical objects.

### M4. Atomic verification and receipt persistence

**Objects:** verification_runs, public_verification_records, individual_usage_ledger, new trusted commit function.

**Required changes:**

- Add FK public_verification_records.verification_run_id -> verification_runs.id ON DELETE RESTRICT.
- Add partial unique index on non-null verification_run_id.
- Introduce idempotency key on the run/transaction boundary.
- Implement a service-role-only atomic commit function.
- Validate actor ownership, active status, plan entitlement, usage reservation, service version and correction parent ownership.
- Insert completed run and public receipt in one transaction.
- Insert receipt with status VALID, non-null result_hash, manifest_hash and public_schema_version.
- Commit consumption in the same transaction.
- Ensure a failed transaction leaves no half-run, half-receipt or consumed usage.
- Return only the safe receipt projection.
- Keep original correction receipts immutable; corrections create new run/receipt events linked to the parent.

**Preconditions:** M1 and M2 complete; extraction and G5 runtime path certified; canonicalization and hash source definitions fixed.

**Postconditions:** run/receipt linkage and hashes match; duplicate retries return the same committed result; no receipt exists without a valid completed run; no usage is consumed for rolled-back persistence.

**Rollback:** stop accepting new individual verification requests; do not delete committed receipts or reverse historical runs.

### M5. Public receipt lookup contract

**Objects:** lookup_public_verification(text), public_verification_records, linked verification_runs.

**Required changes:**

- Correct the status predicate from lowercase verified to uppercase VALID.
- Require a linked run and verify run/receipt parity for verification ID, document hash, evidence hash, result hash, manifest hash, engine version and policy version.
- Require supported public_schema_version.
- Return only the approved public allowlist.
- Preserve direct table deny policies and the restricted SECURITY DEFINER function boundary.
- Keep fixed search_path and explicit grants to anon/authenticated only if public lookup is intended.

**Preconditions:** M4 and valid newly committed receipt fixtures.

**Postconditions:** a valid receipt resolves; NULL, revoked, expired, mismatched, orphaned or incomplete receipts do not resolve.

**Rollback:** fail closed by disabling lookup response, not by exposing direct table SELECT.

### M6. Individual verification history

**Objects:** verification_runs, public_verification_records, identity_actors, new authenticated history RPC.

**Required changes:**

- Provide an authenticated, actor-scoped history query.
- Require auth.uid() to resolve to the active individual actor.
- Return only safe history metadata and receipt status.
- Never expose result JSON, private evidence envelope, uploaded document paths or another user's records.
- Support pagination and deterministic ordering.

**Preconditions:** M1 and M4 complete.

**Postconditions:** user sees only their own runs and safe receipt metadata; cross-user lookup returns no rows; inactive actors are denied.

**Rollback:** disable the history RPC without changing stored runs or receipts.

## 10. Pre-migration checklist

Before any migration is authored for production:

1. Resolve the authenticated TRUNCATE privilege finding through a separate security review and controlled least-privilege migration.
2. Reconcile the deployed Edge Function source with its repository location and exact commit.
3. Implement and certify document extraction and G5 execution adapters; current verify/OCR endpoints return 503.
4. Confirm no production rows have appeared since this inspection in runs/uploads/receipts; rerun preflight immediately before M1.
5. Confirm all existing institutional run/upload rows satisfy the institutional branch before adding scope constraints.
6. Capture a recoverable database backup and record its restore point.
7. Capture current policy, ACL, trigger, function, index and migration-ledger snapshots.
8. Confirm the active service version and canonicalization version contract.
9. Confirm provider webhook signature verification and payment-event idempotency.
10. Approve whether failed verification attempts consume quota or release the reservation.
11. Freeze the G5 engine and document normalizer hashes; verify they remain unchanged.
12. Review the final SQL diff and test it on an isolated Supabase branch before any production migration.

## 11. Readiness blockers

| ID | Finding | Severity | Required disposition |
|---|---|---|---|
| B-01 | verification_runs.institution_id is NOT NULL | Blocker | M1 nullable scope extension |
| B-02 | verify_document_uploads.institution_id is NOT NULL | Blocker | M1 nullable scope extension |
| B-03 | upload-document v8 requires institution membership | Blocker | M3 individual server path |
| B-04 | verify v8 returns HTTP 503 | Blocker | Certified G5 execution adapter |
| B-05 | ocr-processor v8 returns HTTP 503 | Blocker | Certified extraction adapter |
| B-06 | Public lookup uses 'verified' but CHECK allows uppercase VALID | Blocker | M5 contract correction |
| B-07 | 68 public records have NULL status/run/hash/schema fields | Historical limitation | Preserve; do not fabricate |
| B-08 | Existing permissive owner/creator SELECT policies bypass actor-status branch | Security blocker | Rewrite policy logic, preserve institutional branch |
| B-09 | authenticated has TRUNCATE on verification_runs and profiles | High security blocker | Separate least-privilege review and correction |
| B-10 | Individual entitlement and usage tables do not exist | Blocker | M2 |
| B-11 | Active service_versions.canonicalization_version is NULL | Dependency | Resolve actual canonicalizer version before persistence |
| B-12 | Deployed upload/verify/OCR repository source path parity unresolved | Dependency | Locate exact tracked source and commit |

## 12. Migration test specification

Migration-specific test cases are defined in `FREELANCER_STAGE_1_MIGRATION_TEST_PLAN.md`. Required coverage includes individual ownership, institutional regression, cross-user isolation, inactive actor rejection, upload ownership, quota concurrency, idempotency, transaction rollback, receipt/run hash parity, historical preservation, public lookup integrity and correction immutability.

## 13. HOEOS evidence classification

| Evidence class | Result | What is proven |
|---|---|---|
| A. STATIC | PASS | Repository migration source, deployed function source, function definitions, schema metadata, constraints, policies, ACLs and migration ledger were inspected. |
| B. STRUCTURAL | PASS | Existing identity relationships, institutional constraints, individual scope check, run/upload ownership gaps, receipt lookup mismatch and migration dependencies are established from live metadata. |
| C. RUNTIME | NOT RUN | No upload, extraction, G5 verification, receipt commit, public lookup or history workflow was executed. |
| D. CERTIFICATION | NOT ACHIEVED | No independent end-to-end acceptance evidence exists. |

Read-only SQL metadata inspection is not proof that a production user journey works. Deployed function source retrieval is not execution evidence.

## 14. Final verdict

**BLOCKED**

The individual identity foundation is already present, so Stage 1 must not repeat identity schema work. The remaining ownership, entitlement, upload, atomic persistence and receipt work is feasible, but the current live upload/verification functions do not provide a functioning freelancer path. The receipt lookup status contract is inconsistent, existing SELECT policies require a careful OR-policy correction, and authenticated TRUNCATE grants require separate security disposition.

**Authorized work completed:** live read-only Supabase inspection and repository source comparison; report and test-plan documentation only.

**Not performed:** production migrations, SQL writes, data changes, RLS changes, ACL changes, Storage changes, Edge Function deployment, G5 changes, document-normalizer changes, runtime verification or certification.
