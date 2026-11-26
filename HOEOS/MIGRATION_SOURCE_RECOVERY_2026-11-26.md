# Migration source recovery record: 2026-11-26

## Scope

This record documents two migration reconciliation discrepancies found between the live Supabase project `ehkmfnaqkdgkjmdxxbwj` and the GitHub integration branch.

## Applied migration 20261126062517

Supabase records `20261126062517_individual_bootstrap_workspace_and_truncate_privilege_fix`, but the corresponding SQL file was not present in the integration branch or the other inspected branches. The original migration body could not be recovered from the repository. The live catalog confirms `public.bootstrap_public_individual(text,text)` and `public.ensure_personal_workspace()` exist and are executable by `authenticated`, not `anon`. This is a live-state observation, not proof of the missing migration's exact original SQL.

## Applied migration 20261126074646

Supabase records the name `20261126090000_individual_processing_runtime`. The integration branch contained that SQL under a filename beginning `20261126090000`, which does not match the applied version. The source was retained unchanged and the repository filename was aligned to the applied version `20261126074646`.

## Truncate privilege correction

A live catalog query found `TRUNCATE` granted to `anon` and/or `authenticated` on numerous existing public tables. A forward migration was applied to revoke that privilege from both roles on all existing public tables. A second default-privilege statement was applied for objects created by `postgres`; its effect must be confirmed by testing future-table defaults and reviewing Supabase's `supabase_admin` default ACL, which the connected role could not modify.

## Remaining limitation

The original SQL for migration `20261126062517` remains unrecovered. Do not represent this report as a byte-for-byte reconstruction or as proof that every default-privilege source has been corrected.
