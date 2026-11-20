# Gradifi Migration Recovery and Reconciliation Packet

**HOEOS:** Edition 2.0  
**Gate ID:** MIG-REC-02  
**Assessment date:** 2026-11-20 (UTC)  
**Repository:** `mfventures01-maker/Gradifi`  
**Recovery branch:** `integration/gradifi-primary-2026-11-20`  
**Supabase project:** `ehkmfnaqkdgkjmdxxbwj`  
**Scope:** Continue the existing migration-lineage recovery. Preserve previous recovery work; restore only the fourteen outstanding production migrations.  
**Change boundary:** GitHub integration branch only. No production SQL, DDL, data mutation, migration replay, or Edge Function deployment.

---

## 1. Gate identity and acceptance criteria

This gate reconciles the canonical migration source files in GitHub with the applied migration versions in Supabase.

Acceptance criteria:

1. Inspect and preserve the historical recovery trail at `7eef760f`, the November 20 five-file recovery, and baseline `d1ce54a`.
2. Preserve the five previously restored November 18 migrations and the corrected PIN migration.
3. Recover the fourteen outstanding November 20 SQL bodies from the existing production migration record, corroborated by PostgreSQL logs.
4. Preserve each original migration version and name. Do not synthesize SQL from the current schema.
5. Restore each outstanding migration as its own file and its own commit.
6. Prove byte-for-byte equality between each recovered file and its source statement body.
7. Prove exact migration-version set parity between the integration branch and the live Supabase ledger.
8. Make no production database changes.

## 2. Targets

| Target | Threshold | Observed |
|---|---:|---:|
| Outstanding November 20 migrations recovered | 14/14 | 14/14 |
| Recovered SQL files equal source statements | 14/14 exact | 14/14 exact |
| Previously recovered November 18 SQL files preserved | 5/5 | 5/5; boundary-newline normalization documented |
| PIN migration version/content preserved | 1/1 exact | 1/1 exact |
| Integration branch migration files | Equal live ledger | 66 files |
| Live Supabase migration versions | Equal integration branch | 66 entries |
| Missing versions after recovery | 0 | 0 |
| Extra migration files after recovery | 0 | 0 |
| Production migrations replayed | 0 | 0 |
| Production DDL/data mutations | 0 | 0 |
| Commits for the fourteen restored migrations | One per migration | 14/14 |

These are source-recovery and inventory-parity targets. They do not measure application runtime behaviour.

## 3. Baseline commit

The pre-recovery integration-branch tip inspected in the November 20 history was:

- `e5d7a072dfc4ed1e72406414d7a938461a431872` — `docs(hoeos): close primary worktree review checkpoint and G6 blockers`.

Immediately before the fourteen-file restoration, the integration branch migration directory contained **52 SQL files**. The live Supabase migration ledger contained **66 applied versions**.

The fourteen restoration commits below were appended to `integration/gradifi-primary-2026-11-20`. The final file commit returned by GitHub was `ef60316679359c9cf68911fda6276d497d7dc8a5`.

The PR feature branch was not rewritten or independently modified. The recovery was applied to its integration base, preserving the existing branch relationship.

## 4. Evidence references and SHA-256 hashes

### 4.1 Historical recovery and baseline references

| Evidence | Reference | Finding |
|---|---|---|
| November 17 cleanup | [`7eef760f`](https://github.com/mfventures01-maker/Gradifi/commit/7eef760f822ed7784f38d1c10d1d4ccde3955828) | Removed a duplicate pre-ledger migration filename; not the original recovery commit |
| Parent of cleanup | `84bf40c8d46e804d1456c1e34b8df5548bad919e` | Contained the duplicate locality migration path |
| November 18 baseline | [`d1ce54a`](https://github.com/mfventures01-maker/Gradifi/commit/d1ce54a49b7650f534dfe1f8873d1dde5638d4f7) | Read-only baseline; 46 applied versions at that point |
| Historical lineage restoration | [`bc442bc`](https://github.com/mfventures01-maker/Gradifi/commit/bc442bc1d21d622ff07b00fe84c5556b9befb9c7) | November 14 production migration-lineage restoration commit, referenced by PR #9 |
| November 20 five-file recovery report update | [`4dbff3e`](https://github.com/mfventures01-maker/Gradifi/commit/4dbff3e6870f07993a5675b42d05517fd2a3f11c) | Records recovery of original SQL for five November 18 migrations |
| November 20 provenance update | [`e26cf7a`](https://github.com/mfventures01-maker/Gradifi/commit/e26cf7a427e581f206d1aff90216fb254b33147c) | Records per-file commits and restoration provenance |
| Primary worktree register update | [`84d6df8`](https://github.com/mfventures01-maker/Gradifi/commit/84d6df84df0de9ad104a90e2a35effcd9cd891b1) | Records the five restored files, PIN correction, and read-only production boundary |

The November 18 baseline recorded 46 live versions. The five November 18 files plus the corrected PIN migration brought the repository lineage to 52. The fourteen November 20 files restored in this gate bring the integration branch and live ledger to 66.

### 4.2 Previously recovered November 18 migrations

The five files were recovered during the earlier November 20 operation from production PostgreSQL logs. Their individual GitHub file commits are recorded in `e26cf7a`.

| Version | File | Recovery commit | SHA-256 of GitHub-equivalent file content |
|---|---|---|---|
| 20261118085337 | `20261118085337_public_demo_security_tenant_isolation_trial_controls.sql` | `887d8be80010c073ac8846d07f8ce613ed834759` | `c0c8499d89f19a42cdf83c39ad13b2691908697d3cb6acdfed47c63e8cfe42b4` |
| 20261118085407 | `20261118085407_qualify_verify_tenant_ownership_policy_columns.sql` | `bd134a5cdda78571999de5c7b2b7c2653d167341` | `743d10a8f74b3babd6076390b756fa12040be3d1359903aa332ac65dac55bce1` |
| 20261118085447 | `20261118085447_convert_internal_reporting_views_to_invoker_security.sql` | `ef16a42667436c9617b0e31d95995af84a50cd0c` | `322c765a33f45c4b2afb0e7a7b39dc117377bc03d49a67098eb6c9f4bf015f4e` |
| 20261118091905 | `20261118091905_verify_private_document_storage_and_upload_records.sql` | `61b24ef0569e95283ad1c6c716cae389e3a2ad99` | `497213767edcbede4f2913400bc83e5868dd3ef3c92bfa377abea0fa95e3468a` |
| 20261118092019 | `20261118092019_tighten_verify_upload_metadata_grants.sql` | `b47c5f31e71a291a91f9dc8a277cb236024cce78` | `f01a4500ef611798b295ef88741ea77676152731f71b066f6aa641d7aee35841` |

Comparison against the live `schema_migrations.statements[1]` values found only a one-character boundary newline difference: the first four stored statements have one leading LF not present in the GitHub files; the fifth GitHub file has one trailing LF not present in the stored statement. After that single boundary normalization, all five bodies match. The hashes above are for the GitHub-equivalent normalized file contents, not the raw stored statement strings.

The PIN migration was corrected to the actual production version:

| Version | File | Commit | SHA-256 | Comparison |
|---|---|---|---|---|
| 20261118120306 | `20261118120306_fix_pin_lockout_extension_20261118.sql` | `7d2c7743a0eeea5b5cd985d078ef8cb1cc54e6e6` | `5183778f9410914baef9413c7cae59dd34e0e0007fec92c3e3fb6ccda4053ef0` | Exact match |

### 4.3 Fourteen outstanding migrations restored by this gate

For each row, SHA-256 was computed from the source statement retrieved from Supabase. The GitHub file was then fetched again and compared byte-for-byte with that source statement. All fourteen comparisons returned `exact_match = true`.

| Version | Restored file | Bytes | Source SHA-256 | GitHub file commit |
|---|---|---:|---|---|
| 20261120163051 | `20261120163051_p2_institution_identity_slug_status_tenant_rls_20261120.sql` | 8711 | `2e8d5e76c9f36c172162965498d1372236711bd7a65212d7be62fbd59b8519c5` | `8e3d3f0a591acc51ee72e9efe6cde94ed820e822` |
| 20261120163114 | `20261120163114_p2_institution_status_gate_existing_dean_policies_20261120.sql` | 936 | `7cbf7a75af4b9a33034d63f29986afd032c16dab66a33aa0f0b9ee78751022fb` | `ea6f9fa7eae87fd7fff7c7f848adefd9d3dc6f89` |
| 20261120163149 | `20261120163149_p2_restrict_internal_application_trigger_function_20261120.sql` | 116 | `11e7a194159f12c08d75b2251a543c6db22b89c89bdce0a55b496d3131e61b75` | `9d3744cea99f96347a920b82097d5fb148ab9e38` |
| 20261120163222 | `20261120163222_p2_harden_institution_scoped_security_definer_rpcs_20261120.sql` | 10030 | `6b12d2ca22b430ef5e48669298b0a51a9bad08fd9056b75238c61cfc3a11b053` | `682fceb06d14b9775a309a860bcb8497afac53a7` |
| 20261120164319 | `20261120164319_r1_higher_ed_bootstrap_integrity_20261120.sql` | 7771 | `e67b5a87561befc58b9f40d4a45827826dce94b72c43bf4bd933be7864799ef8` | `4d26f38fdd8ae1dca1bbf4b916a874cde821234c` |
| 20261120164407 | `20261120164407_r1_bootstrap_use_profile_membership_trigger_20261120.sql` | 6809 | `ace208ed44a8794cd9ed69e609fc40be71ed993301237e26e3e29eeb51b607c4` | `4e23647aea8efeed59ca7d3d1fb247d589628578` |
| 20261120165418 | `20261120165418_r2_require_active_higher_ed_authority_membership_20261120.sql` | 2539 | `c08e0414eba6ca79d014f78f956a24b2903cb8f655284d8859d7f74573f0ace2` | `b15d12210f90cf0ce538eb8817cc4aaa9f233e5c` |
| 20261120172919 | `20261120172919_r3_01_credential_receipt_schema_20261120.sql` | 5045 | `6da06a5754f2d10b0e7e4f81495c688246395fa8f038ec78be309a60410e944c` | `66cf789c5694f6a4f099ec9941665257cd830cbc` |
| 20261120172942 | `20261120172942_r3_01b_receipt_event_append_only_privileges_20261120.sql` | 174 | `100f8fb747bced1e0ea3333b3fa20b9ed08be64e9f4c970066860367a23424bb` | `cbeb89ade53dc512beb020cb2214487c1a4a8fc7` |
| 20261120175328 | `20261120175328_security_hardening_explicit_rls_and_function_search_paths_20261120.sql` | 1309 | `e00f094ecfdd4db3a470f615c6961747f89cb18220ff6f26e03016e2ac421c1e` | `c02f29b65aaac2f6c47a527554661c478c56fbd9` |
| 20261120175437 | `20261120175437_security_hardening_private_graphql_surfaces_and_trigger_rpcs_20261120.sql` | 1349 | `7f7b2124b41ea12098b81aacdfd47c0028aa9b0df8e320de2e6e771b3f7fca42` | `4852224147a34c745c0c6ff55a049fc6bce85f69` |
| 20261120175520 | `20261120175520_security_hardening_revoke_unsafe_legacy_definer_rpcs_20261120.sql` | 2572 | `d6e5b82e85f6e2d2a5a38769d6e5c13239a0f9402491725aec81153a52f3ce3f` | `31861293fb01f3d34ef967303750c3ea87974908` |
| 20261120175539 | `20261120175539_security_hardening_invoker_views_and_private_operational_views_20261120.sql` | 646 | `5193c2e2af5074903872b651ac80b34528bf18cf2a63821b93c7617eb416a26f` | `bd497e3f5c18e96f8dc657bf84fd5c98cad3db44` |
| 20261120175620 | `20261120175620_security_hardening_disable_legacy_placeholder_activity_rpc_20261120.sql` | 275 | `433f6186940fae71e3719e5a818e8819f6d980abf4c55f33d4752b72533b6c94` | `ef60316679359c9cf68911fda6276d497d7dc8a5` |

The fourteen files were created as fourteen separate commits. No migration versions were renamed or re-timestamped.

## 5. Files and functions inspected (STATIC)

- `supabase/migrations/` on `integration/gradifi-primary-2026-11-20`.
- The five November 18 migration files and the PIN migration.
- All fourteen restored November 20 migration files.
- `supabase_migrations.schema_migrations` version, name, and statement records.
- PostgreSQL log events for 2026-11-20, 16:20–18:10 UTC.
- `HOEOS/PRODUCTION_MIGRATION_RECONCILIATION_2026-11-20.md`.
- `HOEOS/GRADIFI_PRIMARY_WORKTREE_REGISTER.md`.
- Commit `7eef760f822ed7784f38d1c10d1d4ccde3955828` and its parent.
- Baseline commit `d1ce54a49b7650f534dfe1f8873d1dde5638d4f7`.

### 7eef760f cleanup finding

Commit `7eef760f` deleted `supabase/migrations/20261107173000_sefaes_institution_locality.sql`. The deleted file's Git blob SHA was `82656aea97810940a0fe9bf0168d5e896138a8ef`. The canonical file `20261107153958_20261107173000_sefaes_institution_locality.sql` on the integration branch has the same blob SHA and identical 5,159-byte content. The cleanup removed a duplicate filename; it did not discard the canonical SQL body.

## 6. Commands and queries actually executed

Read-only GitHub operations:

- Fetch commit metadata and diffs for `7eef760f`, `d1ce54a`, `4dbff3e`, `e26cf7a`, and `84d6df8`.
- Fetch PR #9 commit and file inventories.
- Fetch the integration-branch migration directory before and after restoration.
- Fetch all fourteen restored files after creation and compare returned content to the Supabase source strings.
- Fetch the six previously recovered files and compare their contents with the Supabase statement records.

Read-only Supabase operations:

- List all applied migrations for project `ehkmfnaqkdgkjmdxxbwj`.
- Select `version`, `name`, and `statements` from `supabase_migrations.schema_migrations` for the fourteen outstanding versions and six earlier recovered versions.
- Compute SHA-256 using `extensions.digest(convert_to(statement, 'UTF8'), 'sha256')`.
- Query PostgreSQL logs for the 2026-11-20 recovery window, 16:20–18:10 UTC, filtering for the applied DDL, policy, grant, revoke, and function statements.

No local PowerShell command, local Git operation, production write, migration apply, or deployment was executed as part of this remote recovery.

## 7. Raw results and runtime artefacts

### Static results

- Fourteen source rows were retrieved for the outstanding migration versions.
- Fourteen GitHub files were created on the integration branch.
- Fourteen post-write fetches returned content exactly equal to the source statement strings: **14/14 exact**.
- The SHA-256 for each source statement is recorded in Section 4.3.
- The five earlier November 18 files match the stored source body after the one-character boundary newline normalization described in Section 4.2.
- The PIN migration matches the stored source body exactly.
- The duplicate locality filename removed by `7eef760f` is byte-identical to the canonical locality migration file.

### Structural results

- Before recovery: integration branch migration directory = **52 files**.
- After recovery: integration branch migration directory = **66 files**.
- Current Supabase migration ledger = **66 versions**.
- Exact set comparison: **no missing versions; no extra files**.

### Runtime and certification

- Runtime production-path execution: **not performed**.
- Independent third-party certification: **not claimed**.
- The result is a STATIC/STRUCTURAL source-recovery and migration-inventory reconciliation.

## 8. Back-of-envelope register

Not applicable. This gate restores migration source history and verifies inventory parity; it does not depend on workload, traffic, storage-growth, or capacity estimates.

## 9. Consistency declaration

- **Applied-version authority:** Supabase production migration ledger.
- **Canonical source-history authority:** GitHub integration branch.
- **Reconciliation invariant:** each applied version maps to exactly one migration file with the same version prefix and recovered source body.
- **Observed consistency result:** 66/66 version-set parity after restoration.
- **Read-after-write check:** each of the fourteen newly written GitHub files was fetched from the integration branch and compared with its Supabase source statement.
- **Boundary:** this is a point-in-time comparison across two systems. No distributed transaction is claimed.

## 10. Resilience evidence

No timeout, retry, circuit-breaker, provider-failure, or recovery tests were run. Those tests are not required to establish migration source identity, and this packet does not claim remote API resilience. GitHub and Supabase read/write calls used for this recovery completed successfully.

## 11. Defect statement and demonstrated root cause

**Defect:** Supabase production contained fourteen applied November 20 migration versions whose original SQL files were absent from the inspected integration branch before this recovery.

**Demonstrated root cause:** production migration execution and repository source-history updates had diverged. The production migration ledger and PostgreSQL logs retained the applied migration statements even though the corresponding files were missing from GitHub.

**Historical distinction:** the November 18 five-file recovery was already completed and documented before this gate. The November 20 fourteen-file gap was a separate, later discrepancy. Commit `7eef760f` was a duplicate-filename cleanup, not the five-file restoration itself.

## 12. Proposed and authorised change

The user authorised continuation of the existing migration recovery and explicitly directed that only outstanding files be recovered.

Executed change:

- Restored the fourteen original SQL statement bodies from the existing Supabase migration records.
- Used the original production version and migration name for every file.
- Created one GitHub commit per migration on `integration/gradifi-primary-2026-11-20`.
- Did not modify the five earlier recovery files or the PIN migration.
- Did not write to Supabase production.

## 13. Before/after comparison

| Item | Before | After |
|---|---:|---:|
| Integration branch migration files | 52 | 66 |
| Live Supabase applied versions | 66 | 66 |
| Missing applied versions in integration branch | 14 | 0 |
| Extra migration files vs ledger | 0 | 0 |
| Newly restored SQL files | 0 | 14 |
| Production migration replays | 0 | 0 |
| Production DDL/data mutations | 0 | 0 |

## 14. Regression results and negative controls

| Control | Expected | Observed |
|---|---|---|
| Every recovered file preserves original version | Exact version prefix | 14/14 |
| Every recovered SQL body equals its source statement | Exact content | 14/14 |
| Earlier five recovered files remain present | No loss | 5/5 present; normalized body matches |
| Corrected PIN migration remains exact | Exact content | 1/1 |
| No duplicate locality migration body lost by cleanup | Canonical body retained | Same Git blob SHA on canonical path |
| No migration version omitted from GitHub | 0 missing | 0 missing |
| No unrecorded migration file added | 0 extra | 0 extra |
| No production migration replay | 0 | 0 |
| No production DDL or data mutation | 0 | 0 |

Negative controls were inventory and content-integrity controls. No application runtime negative controls were executed.

## 15. Unresolved risks

1. The local workstation clone has not been inspected in this remote operation. Local uncommitted changes, local HEAD, and local migration-directory parity remain unknown.
2. No migration was replayed or tested against a disposable database. This was intentional: all fourteen versions are already applied in production.
3. The earlier five November 18 files have single-character boundary newline differences from the raw `schema_migrations.statements` values. The normalized bodies match, and the distinction is recorded rather than described as literal byte-for-byte equality.
4. The feature branch was not rewritten. It relies on the integration base containing these restored files.
5. This packet does not close unrelated runtime, G6, upload, onboarding, or public-receipt defects.

## 16. Decision

**PASS**

This decision applies only to the **STATIC/STRUCTURAL migration source recovery and inventory parity gate**:

- all fourteen outstanding migration files recovered;
- all fourteen exact source comparisons passed;
- all 66 live migration versions have matching files on the integration branch;
- previous recovery work preserved;
- no production mutation or migration replay.

This is not a RUNTIME or CERTIFICATION decision for Gradifi application behaviour or production readiness.

## 17. Exact evidence needed to advance

1. On the local workstation, capture `git status --short`, local HEAD, and the remote integration-branch HEAD without switching branches or overwriting local work.
2. Confirm the local migration directory contains the same 66 versioned SQL files.
3. Run static filename ordering and duplicate-version checks against the local directory.
4. Review the fourteen restored SQL files as historical source. Do not apply them to production.
5. Reconcile the feature branch against the updated integration base through the normal reviewed PR workflow.
6. Keep runtime and certification gates separate. Any later database change requires its own reviewed migration, explicit production approval, one-responsibility commit, and immediate verification.

---

## Evidence classification summary

| Class | Result |
|---|---|
| STATIC | **PASS** — source SQL, file contents, versions, SHA-256 hashes, Git commits |
| STRUCTURAL | **PASS** — 66 GitHub migration files equal 66 Supabase applied versions |
| RUNTIME | **NOT PERFORMED** |
| CERTIFICATION | **NOT CLAIMED** |

**Production safety declaration:** no Supabase production migration was applied, no DDL was executed, no production data was changed, and no Edge Function was deployed during this recovery.
