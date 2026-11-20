# G6/G7/G8 Production Migration Review Packet
Date: 2026-11-20
Target: Gradifi production Supabase project `ehkmfnaqkdgkjmdxxbwj`
Branch: `integration/gradifi-primary-2026-11-20`
Decision: REVIEW ONLY. NOT APPROVED FOR EXECUTION.

## 1. Proposed SQL

`supabase/proposals/G6_CORRECTION_LINEAGE_PUBLIC_RECEIPT_2026-11-20.sql`

The file is outside `supabase/migrations/` deliberately. It must not be applied by CI, Supabase CLI migration replay, deployment hooks, or any automated workflow.

## 2. Production baseline that this proposal addresses

Read-only production inspection established:

- `public_verification_records` has RLS enabled and no row policies.
- The browser has no anon direct SELECT grant; authenticated has an eight-column metadata allowlist. The private `evidence_envelope` is not readable by browser roles.
- `service_role` has INSERT/SELECT on `public_verification_records`, not UPDATE/DELETE.
- There are 68 legacy receipt rows. All 68 have NULL `status`, `verification_run_id`, `result_hash`, `manifest_hash`, and `public_schema_version`.
- Historical `document_hash`/`evidence_hash` lengths are mixed (16 and 64 hex characters); no normalization or backfill is proposed.
- The production `lookup_public_verification(text)` function filters on `status='verified'`, but the table's status constraint permits `VALID`, `REVOKED`, `EXPIRED`, `NOT_FOUND`, and `UNAVAILABLE`. Its additional run/hash/schema requirements are absent from all 68 legacy rows.
- `verification_runs` is empty. It already has a self-referencing `parent_run_id` FK and has an active `SIM-V1` service version.
- `service_role` has UPDATE/DELETE privileges on `verification_runs`, so completed run evidence/lineage needs a database immutability guard.

## 3. Proposed schema/security changes

1. Add `public_verification_records.correction_of_verification_id`.
2. Add a self-reference FK, correction ID format check, no-self-correction check and index.
3. Add the missing FK from receipt `verification_run_id` to `verification_runs.id`.
4. Require a complete run/hash/schema projection whenever a receipt is marked `VALID`.
5. Freeze all non-status fields of succeeded/superseded verification runs and prevent deletion. Permit only the succeeded-to-superseded lifecycle transition.
6. Replace `lookup_public_verification(text)` with a SECURITY DEFINER metadata allowlist that:
   - selects only `status='VALID'` receipts;
   - requires a matching succeeded/superseded run;
   - verifies receipt/run document, evidence, result, manifest, engine and policy parity;
   - verifies correction receipt and run-parent linkage within the same institution/school;
   - returns the correction parent ID as metadata only;
   - never returns `evidence_envelope` or submitted text.
7. Do not grant direct browser SELECT on the correction pointer or evidence envelope.
8. Do not relabel, update, delete, or fabricate metadata for the 68 legacy rows.

## 4. Preconditions before any production approval

The application persistence implementation is deliberately fail-closed (HTTP 503 before service-role client construction or writes). Do not remove that gate until all items below are implemented and independently tested:

- Freeze the exact deterministic serialization and hash algorithms for `result_hash` and `manifest_hash`.
- Resolve the authenticated actor's institution and school scope.
- Resolve the active `SIM-V1` service version from production.
- Create a `verification_runs` row with actor, tenant, service version, status, document/evidence/result/manifest hashes and engine/policy versions.
- For a corrected run, set `verification_runs.parent_run_id` to the original run ID.
- Create the receipt row with `verification_run_id`, `correction_of_verification_id`, `status='VALID'`, result/manifest hashes and approved `public_schema_version`.
- Make run and receipt creation atomic through one service-role-only database RPC or equivalent transactional server-side function.
- Ensure idempotency returns the exact same receipt/run pair and cannot create duplicate lineage.
- Ensure the server comparison checks actor scope and both receipt/run lineage links.
- Keep the browser public lookup on the allowlisted RPC only.

The current repository has not yet frozen the result/manifest hash algorithm or implemented the atomic run-plus-receipt write. The write gate therefore remains disabled.

## 5. Proposed rollout sequence

1. Review the SQL and this packet. Confirm production migration history and catalog have not drifted since this inspection.
2. Complete the deterministic hash and atomic persistence implementation on the same primary branch.
3. Run typecheck, build, G0-G12 unit/structural tests and non-writing browser tests.
4. Review exact final SQL and application diff. Confirm the proposal still matches the live production catalog.
5. Obtain explicit approval for this specific production migration and a separately explicit approval for any production test record creation.
6. Establish and record the production recovery point.
7. Apply the reviewed SQL once to production, in one controlled operation.
8. Verify constraints, trigger, function definition, grants, RLS and indexes immediately.
9. Deploy the matching server code with the persistence gate enabled only after the schema verification passes.
10. Perform a controlled runtime test only after explicit approval to create a production test record. Because receipts and completed runs are immutable, the test record is not assumed to be deletable; its identifier and disposition must be agreed before creation.

## 6. Recovery / rollback position

This is an additive, lineage-preserving schema change. A destructive rollback that drops the correction column, foreign keys, indexes, trigger or completed run rows is not recommended.

If the public lookup contract misbehaves after application:

- revoke EXECUTE on `lookup_public_verification(text)` from `anon` and `authenticated` to fail public resolution closed;
- leave RLS enabled and do not add a browser SELECT policy;
- retain receipt/run lineage columns, FKs and completed-run immutability;
- keep the application persistence gate disabled;
- repair forward with a reviewed migration and re-verify the function definition/grants.

Any rollback or forward repair is itself a production write and requires separate explicit approval.

## 7. Approval checklist

- [ ] Exact SQL reviewed
- [ ] Hash serialization contract frozen
- [ ] Atomic run-plus-receipt write implemented
- [ ] G6 receipt and run parent linkage tested
- [ ] G7 public RPC privacy tests passed
- [ ] G8 persistence integrity tests passed
- [ ] Production catalog rechecked immediately before change
- [ ] Recovery point recorded
- [ ] Explicit approval for the schema migration received
- [ ] Separate explicit approval for any production test write received

No production database changes have been made as part of preparing this packet.
