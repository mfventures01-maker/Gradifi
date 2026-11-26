# Migration source recovery record: 2026-11-26

## Scope

This record documents migration reconciliation work between the live Supabase project `ehkmfnaqkdgkjmdxxbwj` and the GitHub integration branch.

## Applied migration 20261126062517

Supabase records `20261126062517_individual_bootstrap_workspace_and_truncate_privilege_fix`, but the corresponding SQL file was not present in the integration branch or the other inspected branches. The original migration body could not be recovered from the repository. The live catalog confirms `public.bootstrap_public_individual(text,text)` and `public.ensure_personal_workspace()` exist and are executable by `authenticated`, not `anon`. This is a live-state observation, not proof of the missing migration's exact original SQL.

## Applied migration 20261126074646

Supabase records the name `20261126090000_individual_processing_runtime`. The integration branch contained that SQL under a filename beginning `20261126090000`, which did not match the applied version. The source was retained unchanged and the repository filename was aligned to the applied version `20261126074646`.

## Truncate privilege correction

The live catalog initially showed `TRUNCATE` available to `anon` and/or `authenticated` on numerous existing public tables. Migration `20261126140955` was applied to revoke that privilege from both roles on all existing public tables. A fresh catalog query then returned zero public tables with either role retaining `TRUNCATE`.

Migration `20261126141028` was also recorded for the postgres default-privilege revoke. However, a subsequent catalog inspection still showed the existing schema-level default ACL entries for `postgres` and `supabase_admin` containing `TRUNCATE`. Therefore, the default-privilege correction is **not certified**. The connected database role could not change the `supabase_admin` default ACL, and the attempted postgres default-ACL statement did not produce the expected catalog change. Future-table privilege inheritance remains an open issue.

## Remaining limitations

1. The original SQL for migration `20261126062517` remains unrecovered. Do not represent this report as a byte-for-byte reconstruction.
2. Existing public-table `TRUNCATE` grants have been removed and verified, but default privileges for future tables remain unresolved.
3. The Vercel check for reconciliation commit `b586f34389dc34ae045bb60a7a3058187f54ff44` was pending at the time of this report.
