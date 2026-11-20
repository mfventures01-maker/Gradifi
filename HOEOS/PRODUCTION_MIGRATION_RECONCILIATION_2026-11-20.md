# Production Migration Reconciliation Report
Date: 2026-11-20
Target: Gradifi production Supabase project `ehkmfnaqkdgkjmdxxbwj`
Repository: `mfventures01-maker/Gradifi`
Scope: read-only production catalog and migration-history inspection; GitHub branch/file inspection
Status: forensic reconciliation only. No production DDL, data mutation, migration replay, migration repair, or function deployment was performed.

## Executive result

- Production PostgreSQL logs yielded the original submitted SQL for all five November 18 migrations. The exact SQL bodies have been restored to the primary integration branch under their production migration versions.
- The live catalog was independently inspected to compare the resulting effective schema/security state with those recovered statements. No migration was replayed.
- The PIN lockout function in production matches the implementation in the repository's PIN migration file, but the migration version in production is `20261118120306` while the repository filename is `20261118123000_fix_pin_lockout_extension_20261118.sql`. This is a migration filename/version discrepancy, not an observed function-body discrepancy.
- G6 correction lineage is not present in production. The candidate G6 migration exists in repository branches, but the live table has no correction pointer column, FK, check constraint, or supporting index.
- No production changes are authorized or proposed by this report.

## 1. Production migration history

The production migration inventory reports these exact entries:

| Version | Recorded migration name |
|---|---|
| `20261118085337` | `public_demo_security_tenant_isolation_trial_controls` |
| `20261118085407` | `qualify_verify_tenant_ownership_policy_columns` |
| `20261118085447` | `convert_internal_reporting_views_to_invoker_security` |
| `20261118091905` | `verify_private_document_storage_and_upload_records` |
| `20261118092019` | `tighten_verify_upload_metadata_grants` |
| `20261118120306` | `fix_pin_lockout_extension_20261118` |

The five November 18 files were absent from the selected integration base and the inspected repository branch candidates. Their original submitted statements were recovered from production PostgreSQL logs for project `ehkmfnaqkdgkjmdxxbwj`, with timestamps matching the production migration versions. The SQL was restored to the integration branch at:

- `supabase/migrations/20261118085337_public_demo_security_tenant_isolation_trial_controls.sql`
- `supabase/migrations/20261118085407_qualify_verify_tenant_ownership_policy_columns.sql`
- `supabase/migrations/20261118085447_convert_internal_reporting_views_to_invoker_security.sql`
- `supabase/migrations/20261118091905_verify_private_document_storage_and_upload_records.sql`
- `supabase/migrations/20261118092019_tighten_verify_upload_metadata_grants.sql`

The production log records were at 08:53:37.473, 08:54:07.168, 08:54:47.638, 09:19:05.804, and 09:20:19.873 UTC on 2026-11-18. The restored files preserve the submitted migration bodies, excluding the Supabase log wrapper and migration-history bookkeeping appended by the management API.

## 2. Effective production state for the five missing migrations

### 2.1 `20261118085337_public_demo_security_tenant_isolation_trial_controls`

Observed in production:

- `public.public_user_trials` exists with device fingerprint, optional email, remaining/used check counters, and first/last-used/created/updated timestamps.
- `public.public_trial_sessions` exists with token hash, IP hash, remaining/used check counters, creation/last-used timestamps, and an expiry default of 24 hours.
- Row-level security is enabled on both tables.
- `public_trial_sessions` has FORCE ROW LEVEL SECURITY enabled.
- The inspected policy inventory returned no policies for these two tables.

Interpretation: RLS is active and the session table is forced through RLS. The lack of table policies means ordinary roles will not gain row access through permissive policies. Table grants and service-role access must be checked against the intended demo flow before any code path is certified. The catalog does not recover the original migration body.

### 2.2 `20261118085407_qualify_verify_tenant_ownership_policy_columns`

Observed policy expressions include explicit outer-table qualification:

- `documents_insert_member_owner` and `documents_update_member_owner` validate tenant/institution ownership through `tenants t`, with `t.id = documents.tenant_id` and `t.institution_id = documents.institution_id`.
- `submissions_insert_member_owner` and `submissions_update_member_owner` validate project/institution ownership through `projects p`, with `p.id = submissions.project_id` and `p.institution_id = submissions.institution_id`.
- Both families also bind the authenticated owner and current institution membership.

Important sequence finding: the first migration created the initial owner/member policies with unqualified references in the tenant/project subqueries. In those expressions, an unqualified `institution_id` can resolve to the inner relation and become a tautological self-comparison. The second migration explicitly drops and recreates the four affected INSERT/UPDATE policies using `documents.institution_id`, `documents.tenant_id`, `submissions.institution_id`, and `submissions.project_id`. The live catalog now shows the qualified expressions. This is a confirmed historical repair, not merely a cosmetic naming change.

### 2.3 `20261118085447_convert_internal_reporting_views_to_invoker_security`

The recovered migration itself changes these seven views to `security_invoker=true`: `import_progress_view`, `invites_public`, `pipeline_health`, `queue_health`, `result_sheet_view`, `student_sequence_status`, and `superadmin_fsm_overview`. Every public view returned by the later production catalog query also has `security_invoker=true`. The observed catalog views include:

- `pipeline_health`
- `student_sequence_status`
- `queue_health`
- `superadmin_fsm_overview`
- `v_cbt_exams`
- `result_sheet_view`
- `import_progress_view`
- `sub_accounts_public`
- `student_roster`
- `sub_accounts`
- `principal_dashboard`
- `student_numbers_view`
- `invites_public`

There are 13 views in this observed list. Each returned `reloptions` containing `security_invoker=true`.

Interpretation: the seven intended view changes are present, and the broader live public-view inventory is also configured for invoker security.

### 2.4 `20261118091905_verify_private_document_storage_and_upload_records`

Observed in production:

- Private storage bucket `verify-private` exists; `public=false`.
- Maximum object size is 20 MiB.
- Allowed MIME types are PDF, plain text, and DOCX.
- `public.verify_document_uploads` exists with tenant, institution, owner, bucket/path, filename, content type, byte size, source SHA-256, extraction/canonicalization status and hashes, verification run, error code, and timestamps.
- The upload table has RLS enabled and FORCE RLS enabled.
- The authenticated SELECT policy permits the owner or a current institution member.
- `storage.objects` has a SELECT policy for `verify-private` that requires a matching upload row by bucket and object path, then owner or institution-member authorization.
- The table has checks for positive size up to 20 MiB, SHA-256 formats, and valid extraction/canonicalization states, plus foreign keys to institutions, tenants, auth users, and verification runs.

Interpretation: the private bucket, upload registry, row-level policy, and object-level read boundary are present in production. This is structural evidence only; it is not a runtime upload/download test.

### 2.5 `20261118092019_tighten_verify_upload_metadata_grants`

Observed production grants:

- `public.public_verification_records`: `authenticated` has SELECT only on `created_at, document_hash, engine_version, evidence_hash, overall_similarity, policy_version, total_sources_found, verification_id`. The sensitive `evidence_envelope` column is not in that allowlist. `anon` has no observed table/column grant. `service_role` has INSERT and SELECT.
- `public.verify_document_uploads`: `authenticated` has SELECT on all 19 columns, including `object_path`, `original_filename`, `owner_user_id`, `tenant_id`, and source/canonical hashes. No `anon` table/column grant was observed. `service_role` has the required write/read privileges.
- The upload table's RLS policy still limits visible rows to owner or current institution member.

Interpretation: the public receipt's sensitive evidence envelope remains excluded from authenticated column SELECT. The upload metadata grant is broader: authenticated users with a row visible under RLS can select every upload metadata column. Confirm that this is the intended privacy contract. If the intended policy was column-level minimization for upload metadata as well, this is a review item, not an assumed pass.

## 3. PIN lockout migration discrepancy

Repository file:
`supabase/migrations/20261118123000_fix_pin_lockout_extension_20261118.sql`

Production migration history:
`20261118120306 / fix_pin_lockout_extension_20261118`

The live `public.auth_pin_login(text,text)` definition matches the repository migration's function implementation:

- validates identifier and PIN shape;
- returns a generic invalid-credentials response for missing/invalid actors;
- treats an active `locked_until` as terminal and does not increment attempts or move the lockout forward during that active lock;
- increments failed attempts for a failed PIN;
- locks after five failed attempts for 15 minutes;
- resets failed attempts and lockout on successful PIN authentication.

Production routine privileges observed: EXECUTE for `service_role` and `postgres`; no EXECUTE grant was observed for `public`, `anon`, or `authenticated`.

Conclusion: implementation/body and execution boundary match the repository candidate. The filename timestamp did not match the production applied version. I corrected the auth-projection branch by adding `20261118120306_fix_pin_lockout_extension_20261118.sql` and deleting the mismatched `20261118123000_...` file. The correction is on `fix/onboarding-source-auth-projection-2026-11-18` (new-file commit `4c4e33b8d1a0eaccbf80d2d553417b944f267c4f`; deletion commit `c0f23e47a9d6a3de5afc663156e9cc5bf3404cd5`). The same correctly versioned file was also added to the primary integration branch (commit `7d2c7743a0eeea5b5cd985d078ef8cb1cc54e6e6`). This is repository-only reconciliation. Do not replay this migration on production.

## 4. G6 correction-lineage schema

The candidate migration `20261116160000_g6_correction_lineage_metadata.sql` adds:

- nullable `correction_of_verification_id` on `public.public_verification_records`;
- a self-reference FK to `public_verification_records(verification_id)`;
- a no-self-correction CHECK;
- a partial index on non-null correction parent values;
- SELECT grant for the pointer column to `anon` and `authenticated`.

Production catalog result:

- no `correction_of_verification_id` column;
- no correction-parent FK;
- no no-self-correction CHECK;
- no correction-parent index.

The live public receipt SELECT allowlist does not include a correction pointer. The candidate migration is therefore unapplied and G6 lineage persistence is not certified against production. The alternate older candidate `20261116120000_g6_correction_lineage.sql` is also not recorded in production migration history.

Do not apply either candidate as-is. First settle the canonical pointer name, public visibility contract, correction-parent validation, uniqueness/immutability expectations, and the exact receipt schema. Preserve the existing rule that `evidence_envelope` is not readable by anon/authenticated.

## 5. Reconciliation decisions

| Area | Production state | Repository state | Decision |
|---|---|---|---|
| Five missing Nov 18 migrations | Applied versions present; effective state partly inspected | Exact SQL files absent from inspected branch candidates | Record catalog-backed baseline; historical SQL recovery remains unresolved |
| PIN lockout | Function body and service-role boundary match | Candidate file version is 12:30, live version is 12:03:06 | Rename/reconcile repository version only; do not reapply |
| G6 | Correction lineage absent | Candidate migration exists on G6 branches | Keep G6 blocked; design/review canonical migration before any production write |

## 6. Safe next actions

1. Preserve the five restored production migration files and their log provenance on the primary integration branch.
2. Run static migration ordering/duplicate-version checks and compare each restored migration's resulting catalog objects with the live production schema. Do not replay already-applied migrations.
3. PIN migration filename/version has been corrected on both the auth-projection PR branch and the primary integration branch without running it against production.
4. Keep G6 unapplied until its public receipt privacy contract and full migration are reviewed.
5. For every eventual production write: inspect the exact SQL, obtain explicit approval, establish a recovery point, apply one migration at a time, and verify immediately.

## 7. GitHub restoration trace

The restored SQL files and corrected PIN migration are present on `integration/gradifi-primary-2026-11-20`. Their final file commits are:

| File | Commit |
|---|---|
| `20261118085337_public_demo_security_tenant_isolation_trial_controls.sql` | `887d8be80010c073ac8846d07f8ce613ed834759` |
| `20261118085407_qualify_verify_tenant_ownership_policy_columns.sql` | `bd134a5cdda78571999de5c7b2b7c2653d167341` |
| `20261118085447_convert_internal_reporting_views_to_invoker_security.sql` | `ef16a42667436c9617b0e31d95995af84a50cd0c` |
| `20261118091905_verify_private_document_storage_and_upload_records.sql` | `61b24ef0569e95283ad1c6c716cae389e3a2ad99` |
| `20261118092019_tighten_verify_upload_metadata_grants.sql` | `b47c5f31e71a291a91f9dc8a277cb236024cce78` |
| `20261118120306_fix_pin_lockout_extension_20261118.sql` | `7d2c7743a0eeea5b5cd985d078ef8cb1cc54e6e6` |

The auth-projection PR branch was also corrected: the new correctly versioned PIN migration was added in commit `4c4e33b8d1a0eaccbf80d2d553417b944f267c4f`, and the incorrectly versioned `20261118123000` file was deleted in commit `c0f23e47a9d6a3de5afc663156e9cc5bf3404cd5`.

A final read-only comparison confirmed that all six production versioned migration files above exist on the integration branch and that production migration history still records the same six versions. No production migration was applied during this work.

## Evidence classification

- **STATIC:** recovered migration SQL from production logs; repository migration files; candidate PIN and G6 migrations; branch/tree checks; migration inventory.
- **STRUCTURAL:** production catalog columns, constraints, policies, views, grants, bucket metadata, indexes, and function definition; comparison with recovered migration intent.
- **RUNTIME:** not performed in this reconciliation.
- **CERTIFICATION:** not claimed. This report does not certify the end-to-end upload, PIN login, trial controls, G6 correction flow, or tenant isolation at runtime.
