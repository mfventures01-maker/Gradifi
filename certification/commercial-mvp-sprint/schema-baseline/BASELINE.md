# Gradifi Verify | Production Supabase schema baseline

**Snapshot date:** 2026-11-14  
**Project ref:** `ehkmfnaqkdgkjmdxxbwj`  
**Database:** PostgreSQL 17.6.1  
**Region:** `eu-west-1`  
**Environment:** Production, inspected read-only  
**Product scope:** Gradifi Verify only. The complete public-schema catalog is retained to preserve shared dependencies and avoid silently omitting cross-product objects.

## Safety declaration

This baseline was generated from read-only PostgreSQL catalog queries and GitHub repository reads. No production migration, schema DDL, grant, policy, data write, deployment, reset, or migration repair was executed. The documentation commit is on `docs/verify-supabase-canonical-baseline`, branched from `sprint/verify-commercial-mvp-10h`.

## Complete public catalog inventory

| Object | Count |
|---|---:|
| Tables / partitioned tables | 114 |
| Table columns | 1,190 |
| All relation columns (tables, views, materialized views, foreign tables) | 1,305 |
| Constraints | 506 |
| Indexes | 290 |
| Views | 13 |
| Materialized views | 3 |
| Triggers | 37 |
| Functions / routines | 124 |
| RLS policies | 47 |
| RLS-enabled tables with no policy | 79 |
| Table privilege entries | 3,408 |
| Table/grantee privilege groups | 497 |
| Default privilege entries | 24 |

## Machine-readable inventory

- `catalog-tables.json`: all 114 public tables with columns, PostgreSQL types, defaults, nullability, identity/generated metadata, constraints, indexes, owner and RLS flags.
- `catalog-routines-views-triggers.json`: all 13 views, 3 materialized views, 37 triggers and 124 public routines, including function definitions and execution metadata.
- `security-grants-policies.json`: grouped table grants, default privileges and all 47 public RLS policies.
- `verify-access-review.json`: Verify-specific tables and their columns, table grants, RLS policies and matching verification/document/tenant/audit RPC definitions.
- `migration-reconciliation.json`: production migration versions and repository branch comparisons.

## Verify-specific review

The Verify persistence and supporting boundary includes these named tables:

`documents`, `verification_runs`, `public_verification_records`, `plagiarism_checks`, `plagiarism_matches`, `plagiarism_reports`, `plagiarism_corrections`, `institution_plagiarism_checks`, `tenant_identity_map`, `audit_logs`, `services`, `service_versions`, `price_versions`, and `billable_events`.

The Verify-specific access export contains 14 tables, 56 table/grantee grant groups, 7 policies and 7 matching routines. This is a focused access review, not an assertion that those are the only objects used by the application. Shared identity, institution, profile, submission, storage and Auth dependencies still require call-site mapping before any policy/grant changes.

### Confirmed review flags

1. `public_verification_records` has a public SELECT policy with an unconditional predicate (`USING (true)`). The table contains fields including document/evidence hashes, similarity, engine/policy versions and an evidence envelope. The public API contract must be checked against this row-level exposure before launch.
2. Verify-named tables have broad table-level grants to `anon` and `authenticated`, including combinations of SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER. RLS and grants are separate controls; these privileges require role-by-role minimization after application call sites are mapped.
3. The production policy catalog contains 7 policies across the 14-table Verify/supporting subset. Several tables in this subset have no policy. The absence of a policy is not by itself proof of exposure; effective grants, views, RPCs, ownership and service-role paths must be evaluated together.
4. The historical migration `2026091200_public_verification_records.sql` defines a public SELECT policy and an authenticated/service-role INSERT policy. The current catalog pass observed the public SELECT policy but did not observe the migration's named INSERT policy. This is a live-vs-migration policy discrepancy requiring explanation before schema changes.
5. Public routine inventory contains security-definer functions and routines without explicit per-function `search_path` configuration. Do not revoke or rewrite them wholesale: trace call sites, effective execute grants and authorization logic first.

## Migration lineage summary

- Production migration ledger: 33 applied versions.
- `main`: 1 migration file, 32 production versions absent.
- `sprint/verify-commercial-mvp-10h`: 8 migration files, 25 production versions absent.
- `chore/supabase-production-lineage-reconciliation`: 33 migration files; version set matches the production ledger.
- The lineage recovery branch is PR #9 and is not merged. Its previously observed comparison with `main` was divergent (244 commits ahead, 1 behind). It must not be merged wholesale into the Verify sprint.
- The JSON report compares version prefixes and filenames. It does not claim a fresh byte-for-byte SQL body comparison in this snapshot.

## Evidence limits and follow-up

This is a catalog-level static baseline. It does not certify runtime authorization, API exposure, public receipt response shaping, storage bucket policies, Edge Function authorization, or application-level use of every RPC. The next step is a call-site map for Verify frontend/API access and then a read-only privilege/RLS risk classification. No remediation migration should be drafted until that mapping is complete.
