# Supabase production migration lineage reconciliation

## Superseding 90-migration reconciliation addendum (2026-11-26)

This addendum supersedes the earlier 35-version inventory below for the current P0-D baseline. The earlier text is retained as historical evidence and must not be treated as the current migration count.

### Scope and immutable baseline

- Repository: `mfventures01-maker/Gradifi`
- GitHub branch used for inventory: `integration/gradifi-primary-2026-11-20`
- Exact integration commit: `84835632c0818371c07d6b33bbe6b7df6b578d72`
- Supabase project: `ehkmfnaqkdgkjmdxxbwj`
- Live migration ledger: `supabase_migrations.schema_migrations`
- Live applied versions: **90**
- Integration migration files: **89**
- Duplicate versions in either inventory: **0**
- Integration-only migration versions: **0**
- Live versions without an integration file: **1** (`20261126062517`)

No production migration, reset, deployment, merge, or database write was performed during this reconciliation.

### Aggregate classification

| Classification | Count | Meaning |
|---|---:|---|
| Normalized source/ledger match | 81 | SQL matches after comment and whitespace normalization |
| Syntax-equivalent | 2 | Different spelling/qualification with equivalent PostgreSQL behavior |
| Semantic-equivalent | 1 | EXISTS versus COUNT(*) baseline test |
| Superseded by later applied migration | 4 | Historical function behavior replaced by a later migration and verified in current catalog |
| Open source/catalog discrepancy | 1 | TRUNCATE default-privilege statement mismatch and unresolved current default ACL |
| Live source absent from integration | 1 | Exact applied source recovered from another existing branch |
| **Total live versions** | **90** | |

### Six previously flagged substantive or unresolved migration cases

| Version | Classification | Finding |
|---|---|---|
| `20261122145322` | Superseded by `20261122145411` | Applied function's weaker baseline logic was replaced by logic enforcing original version kind and matching original evidence hash. Current function matches the later ledger statement. |
| `20261122145411` | Semantic-equivalent | Source uses `NOT EXISTS`; applied SQL uses `COUNT(*) = 0`. Both make the same baseline-existence decision. Current function matches the applied statement. |
| `20261122145630` | Superseded by `20261122145639` | Later migration adds same-run debit idempotency and a valid unique partial index. Current function and index are present. |
| `20261122150435` | Superseded by `20261122150557` and `20261123111659` | Later migrations restore receipt-envelope validation and strengthen hash, correction-parent and atomic persistence authority. Current catalog functions match the final applied definitions. |
| `20261122150935` | Superseded by `20261122150952` and `20261123111659` | Later migrations fix receipt identity/status guard ordering and replace guard/publication logic with stronger hash-authority implementation. |
| `20261126140955` | **OPEN** | Integration source contains only the existing-table TRUNCATE revoke. Live ledger additionally contains an ALTER DEFAULT PRIVILEGES revoke for anon/authenticated. Current catalog still shows TRUNCATE in default ACLs for public tables created by postgres and supabase_admin. Existing public base tables currently have zero effective TRUNCATE grants. The future-object default privilege boundary is not certified. Migration `20261126141028` targets postgres defaults, but current postgres default ACL still shows TRUNCATE and supabase_admin defaults remain. Do not mark this resolved without explaining the catalog state and the object-creation role behavior. |

### Two non-semantic SQL representation differences

- `20261122145302`: source query uses unqualified `id, owner_user_id`; ledger qualifies these as `w.id, w.owner_user_id` using alias `w`.
- `20261123072217`: source uses `GRANT SELECT ON TABLE`; ledger uses `GRANT SELECT ON`. Both express the same PostgreSQL table privilege grant.

### Missing integration source: `20261126062517`

- Live ledger name: `individual_bootstrap_workspace_and_truncate_privilege_fix`.
- Integration source file: absent.
- Exact source exists on `feat/freelancer-onboarding-wizard-e2e-2026-11-22`.
- Original commit: `a8de2df5bbc912965decd05459e5690d9baef534`.
- File: `supabase/migrations/20261126062517_individual_bootstrap_workspace_and_truncate_privilege_fix.sql`.
- Blob: `7c337a5b099fbfd9563b1a96dd15604f12818197`.
- Recovered source matched the live migration statement after trimming outer whitespace.
- Do not merge the source branch wholesale; it is substantially divergent from integration. Source restoration should be an isolated, reviewed change.

### Complete 90-version register

The source-presence and SQL-classification columns below refer to the exact integration commit stated above and the live ledger read during this audit.

| Version | Live migration name | Integration source | Classification | Evidence / disposition |
|---|---|---|---|---|
| `20260819` | `phase3_dashboard_rpcs` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `2026082101` | `ai_grading_review_functions` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `2026082102` | `ai_grading_workflow` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `2026082103` | `bulk_student_import` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `2026082104` | `create_parent_rpcs` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `2026082105` | `create_vp_bursar_rpcs` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `2026082106` | `pin_authentication_enhancement` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `2026091200` | `public_verification_records` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261004073941` | `sim_v1_persistence_spine` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261102072830` | `cbt_multi_attempt_contract_v1` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261102072842` | `cbt_attempt_timeout_atomicity_fix` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261102072907` | `cbt_session_integrity_guards_v1` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261102073009` | `cbt_rpc_execute_privileges_v1` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261102083959` | `gradifi_question_bank_public_school_onboarding_v1` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261105103635` | `gradifi_school_principal_lifecycle_audit_v1` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261105103718` | `gradifi_membership_lock_order_v1` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261105115914` | `cbt_mvp_question_authoring_and_session_policy_hardening` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261105120550` | `cbt_stage1_school_authorized_exam_lifecycle` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261105121052` | `cbt_snapshot_lifecycle_and_idempotent_finalization` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261105121114` | `cbt_membership_visibility_and_attempt_gate` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261105121142` | `cbt_results_rpc_authorization_hardening` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261105220809` | `cbt_prod_anon_view_and_legacy_rpc_lockdown_20261105` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261105221315` | `cbt_session_rpc_persistence_path_v1` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261106012632` | `cbt_get_exam_status_owner_authorization_hotfix` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261107144418` | `20261107090000_canonical_actor_onboarding` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261107144420` | `20261107150000_dean_auth_authority_contract` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261107144421` | `20261107153000_exclude_dean_from_pin_auth` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261107144805` | `20261107160000_sefaes_actor_dashboard_scope_v1` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261107153522` | `20261107170000_sefaes_root_authority_bootstrap` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261107153751` | `20261107171000_sefaes_dean_subaccount_allowlist` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261107153841` | `20261107172000_sefaes_remove_legacy_auth_and_dean_provisioning` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261107153958` | `20261107173000_sefaes_institution_locality` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261107195950` | `p0_1_canonical_candidate_ownership` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261114105153` | `verify_receipt_least_privilege_20261114` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261114105314` | `verify_receipt_column_allowlist_20261114` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261116082730` | `verify_receipt_evidence_privacy_repair` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261116122851` | `vc_rector_higher_ed_authority` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261116165351` | `deterministic_hod_adviser_departments` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261116165356` | `higher_ed_student_class_optional` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261116171713` | `higher_ed_dean_catalog_read_policies` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261116181553` | `actor_lifecycle_integrity_and_public_individuals` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261116181907` | `bind_actor_provisioning_to_actual_authority` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261117115033` | `onboarding_identity_surface_hardening` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261117115518` | `school_teacher_assignment_authority` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261117115738` | `class_subject_setup_authority` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261117165144` | `oir01_actor_provisioning_recovery_ledger` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261118085337` | `public_demo_security_tenant_isolation_trial_controls` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261118085407` | `qualify_verify_tenant_ownership_policy_columns` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261118085447` | `convert_internal_reporting_views_to_invoker_security` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261118091905` | `verify_private_document_storage_and_upload_records` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261118092019` | `tighten_verify_upload_metadata_grants` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261118120306` | `fix_pin_lockout_extension_20261118` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120163051` | `p2_institution_identity_slug_status_tenant_rls_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120163114` | `p2_institution_status_gate_existing_dean_policies_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120163149` | `p2_restrict_internal_application_trigger_function_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120163222` | `p2_harden_institution_scoped_security_definer_rpcs_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120164319` | `r1_higher_ed_bootstrap_integrity_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120164407` | `r1_bootstrap_use_profile_membership_trigger_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120165418` | `r2_require_active_higher_ed_authority_membership_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120172919` | `r3_01_credential_receipt_schema_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120172942` | `r3_01b_receipt_event_append_only_privileges_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120175328` | `security_hardening_explicit_rls_and_function_search_paths_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120175437` | `security_hardening_private_graphql_surfaces_and_trigger_rpcs_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120175520` | `security_hardening_revoke_unsafe_legacy_definer_rpcs_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120175539` | `security_hardening_invoker_views_and_private_operational_views_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261120175620` | `security_hardening_disable_legacy_placeholder_activity_rpc_20261120` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261122143459` | `universal_workspace_foundation_personal_membership_authorization` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261122145302` | `individual_billing_credit_ledger_foundation` | Present | Syntax-equivalent | Alias qualification only: source uses unqualified workspace columns; ledger qualifies through alias `w`. |
| `20261122145322` | `correction_sessions_immutable_version_history` | Present | Superseded | Applied function's weaker baseline branch is replaced by 20261122145411, which enforces original-version kind and original evidence hash. |
| `20261122145356` | `workspace_scoped_private_upload_path_guard` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261122145411` | `individual_billing_owner_and_correction_baseline_guards` | Present | Semantic-equivalent | Source uses NOT EXISTS; applied statement uses COUNT(*) = 0. Both implement the same baseline-existence decision. |
| `20261122145630` | `individual_credit_consumption_and_reversal_rpcs` | Present | Superseded | 20261122145639 replaces consume_individual_credit and adds a valid unique debit-per-verification-run index. |
| `20261122145639` | `individual_credit_consumption_run_idempotency_guard` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261122150435` | `freelancer_verification_lifecycle_and_receipt_integrity` | Present | Superseded | 20261122150557 replaces receipt guard with envelope allowlist validation; 20261123111659 adds hash and correction-parent authority. |
| `20261122150557` | `freelancer_membership_and_public_receipt_constraints` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261122150607` | `public_receipt_hash_format_constraint_fix` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261122150935` | `public_receipt_lifecycle_and_publish_idempotency` | Present | Superseded | 20261122150952 fixes receipt identity/status check ordering; 20261123111659 replaces the guard and publication function with atomic hash-authority versions. |
| `20261122150952` | `public_receipt_identity_guard_order_fix` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261122151011` | `public_receipt_revocation_state_constraint` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261122151124` | `verify_upload_run_bidirectional_link_guard` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261122151208` | `freelancer_lifecycle_foreign_key_indexes` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261122151235` | `infer_personal_workspace_for_verification_rows` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261122151253` | `verification_run_workspace_scope_trigger_order` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261123072217` | `grant_authenticated_select_identity_actors` | Present | Syntax-equivalent | GRANT SELECT ON TABLE versus GRANT SELECT ON; same PostgreSQL privilege grant. |
| `20261123111659` | `verification_run_atomic_receipt_hash_authority` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261123111708` | `verification_run_hash_helper_snapshot_safety` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261126062517` | `individual_bootstrap_workspace_and_truncate_privilege_fix` | Absent | Missing on integration; recovered | Applied live migration. Exact source recovered from feat/freelancer-onboarding-wizard-e2e-2026-11-22, commit a8de2df5bbc912965decd05459e5690d9baef534; blob matched live statement after trimming outer whitespace. |
| `20261126074646` | `20261126090000_individual_processing_runtime` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |
| `20261126140955` | `revoke_public_api_truncate_privileges` | Present | Open discrepancy | Integration source omits the applied ALTER DEFAULT PRIVILEGES statement. Current catalog still shows TRUNCATE in default ACLs for anon/authenticated for public tables created as postgres and supabase_admin. Existing public base tables currently have zero effective TRUNCATE grants. Future-object default remains unresolved; 20261126141028 does not remove the supabase_admin default ACL and current postgres default ACL still shows TRUNCATE. |
| `20261126141028` | `revoke_public_truncate_default_for_postgres` | Present | Normalized match | Source migration exists in integration and matched live recorded SQL after comment/whitespace normalization. |

### TRUNCATE default-privilege evidence and unresolved boundary

The live ledger statement for `20261126140955` contains both:

1. `REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated`
2. `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE ON TABLES FROM anon, authenticated`

The integration source file contains only the first statement.

Read-only catalog inspection found:

- No existing public base table grants TRUNCATE to `anon` or `authenticated` (count: 0).
- The default ACL for owner `postgres` in `public` still contains TRUNCATE for both roles.
- The default ACL for owner `supabase_admin` in `public` also contains TRUNCATE for both roles.
- `supabase_admin` is a superuser and has CREATE on `public`.
- The later `20261126141028` migration is recorded in the live ledger, but the current `pg_default_acl` still shows TRUNCATE for the postgres owner in public.
- This is a future-object privilege configuration concern, not proof that any existing public table is currently exposed.

This requires a separate, read-only platform/role-creation-path investigation before proposing a corrective migration. No corrective SQL was applied.

### P0-D status

- 90-version inventory: completed.
- Source presence: 89/90 on integration; one exact source recovered elsewhere.
- SQL comparison: 81 normalized matches, 2 syntax-equivalent differences, 1 semantic-equivalent difference, 4 superseded historical differences, 1 open discrepancy.
- Current catalog checks for the four superseded function cases: completed.
- TRUNCATE default-privilege reconciliation: **OPEN**.
- Full GitHub/Supabase/Vercel parity certification: **NOT CERTIFIED**.
- Edge Function source/deployment parity: still open.
- Vercel production alias and deployed commit identity: still unverified.

### Safety boundary

- No production migration or SQL write was executed.
- No Supabase reset, branch merge, or deployment was performed.
- No integration branch files were changed by this audit.
- This addendum is documentation only. Any source restoration or database correction must be separately reviewed and approved.


---

## Historical 35-version reconciliation snapshot (superseded)

Project: Sentiment and Emotional Free Assessment System
Project ref: `ehkmfnaqkdgkjmdxxbwj`

This branch restores the repository's migration history to the versions recorded in the live Supabase `supabase_migrations.schema_migrations` table. This is a source-control reconciliation only. It does not apply SQL to the live database.

## Evidence

- The live migration history currently contains 35 versions.
- The original 8 migration files on the verification baseline were checked against the live stored statements and matched after SQL comment/whitespace normalization.
- The 16 later CBT / production-lineage migration files were checked against the live stored statements and matched after SQL comment/whitespace normalization.
- Seven canonical actor migration files matched the live stored statements after SQL comment/whitespace normalization.
- The first canonical actor onboarding migration differed: the repository branch omitted the live dean actor-role allowlist members `vice_principal`, `bursar`, and `teacher`. This file is reconstructed from the exact statement stored for live version `20261107144418`.
- The P0.1 canonical candidate ownership migration was absent from the inspected repository branches. Its file is reconstructed from the exact statement stored for live version `20261107195950`.
- The eight canonical actor migration files use the exact live migration version prefixes, not the earlier local filename timestamps. This prevents accidental duplicate execution under mismatched versions.
- Two later live receipt-security migrations were not present in the prior 33-version reconciliation baseline. Their SQL files have now been restored from the exact statements stored in the live migration history:
  - `20261114105153_verify_receipt_least_privilege_20261114`
  - `20261114105314_verify_receipt_column_allowlist_20261114`
- These two receipt migrations must remain in version order. The first establishes table-level grants after revoking prior privileges; the second removes table-level SELECT for `anon` and `authenticated` and grants the explicit column allowlist. Reversing the order would change the intended privilege boundary.

## Safety boundary

- Do not run `supabase db push`, `supabase migration up`, reset, or repair commands against production as part of this reconciliation.
- The files represent already-applied production history. They are being restored to source control so future diffs can be evaluated against the real baseline.
- The live project has not been modified by this branch.
- Any new schema change must be introduced as a new migration after this baseline is merged and reviewed.
- The two restored receipt migrations are historical source files only. They must not be replayed against production.

## Reconciled migration inventory

The `supabase/migrations` directory is intended to contain all 35 live versions: the original 8, 16 production-lineage recovery migrations, 8 canonical actor migrations, P0.1 canonical candidate ownership, and the 2 receipt-security migrations from 14 November 2026.
