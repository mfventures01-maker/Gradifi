# G4-D Non-Production Runtime Test Plan

Status: DESIGNED, NOT EXECUTED
Target: disposable Supabase development branch only
Production project: ehkmfnaqkdgkjmdxxbwj (DO NOT USE FOR TEST EXECUTION)

## Preconditions

1. Create or select an isolated Supabase development branch/project with the same migration history through the new G4-D idempotent-authorization migration.
2. Confirm the project ref is not the production ref above.
3. Apply migrations only to that disposable project.
4. Seed two users (A and B), two active workspaces (WA and WB), active memberships, one active service version, and canonicalized uploads.
5. Use a server-side service-role client to call the public RPC. Never put service_role credentials in a browser test.
6. Capture pre/post row counts for verification_runs, public_verification_records, and verify_document_uploads.
7. Run every test in a transaction or reset the disposable project between scenarios. No test may touch production.

## Canonical RPC contract

RPC: public.persist_verification_run_and_receipt

Arguments:
- p_workspace_id uuid
- p_created_by_user_id uuid
- p_service_version_id uuid
- p_school_id uuid | null
- p_source_upload_id uuid | null
- p_correction_of_verification_id text | null
- p_raw_text text
- p_result jsonb
- p_public_schema_version text

Result:
- status: CREATED | IDEMPOTENT_EXISTS
- record: receipt metadata (id, verification_id, document_hash, evidence_hash,
  engine_version, policy_version, overall_similarity, total_sources_found,
  verification_run_id, result_hash, manifest_hash, status,
  public_schema_version, created_at)

The BFF route POST /api/verify/persist accepts { result, envelope,
correctionOfVerificationId?, sourceUploadId? } plus a bearer token. It returns
{ record, status }. The browser service currently forwards correctionOfVerificationId
but does not forward sourceUploadId; source-upload persistence must remain explicitly
unsupported from that browser call path until its caller is wired and tested.

## Runtime scenarios

### RT-01 Successful persistence
- User A, workspace WA, active membership, active service version.
- No source upload and no correction parent.
- Call the RPC once with a valid deterministic result and canonical raw text.
- Expect status CREATED; exactly one successful verification_runs row and one
  VALID public_verification_records row; run and receipt IDs/hashes match; hash
  helper returns true.
- Repeat reads confirm no orphan run and receipt.

### RT-02 Exact duplicate submission
- Repeat RT-01 with byte-identical arguments, same workspace, actor, service
  version, raw text, result and schema version.
- Expect IDEMPOTENT_EXISTS and the exact same receipt_id, verification_run_id,
  verification_id and hashes.
- Assert counts do not increase: no second run and no second receipt.

### RT-03 Existing receipt conflict / collision
- In the disposable database only, seed a controlled conflicting state for the
  same derived verification_id (e.g. a receipt bound to a different run/hash or
  an orphaned run). If a trigger prevents fixture setup, prepare the fixture as
  database owner before enabling the guard for this isolated test.
- Call the RPC with the otherwise valid payload.
- Expect a deterministic conflict error, mapped by the BFF to HTTP 409.
- Assert no new run/receipt was committed and no existing row was mutated.
- Do not weaken or disable production triggers. This fixture technique is test-only.

### RT-04 Invalid or inactive workspace
- Call with a nonexistent workspace, then with an inactive workspace, then
  with a workspace where User A has no active membership.
- Expect VERIFICATION_WORKSPACE_NOT_ACTIVE or the corresponding individual /
  institution scope error. Through the BFF, expect HTTP 403.
- Assert no run, receipt or upload link was created.

### RT-05 Invalid source upload
Test each independently:
- upload ID does not exist;
- upload belongs to WB or User B;
- extraction_status is not extracted;
- canonicalization_status is not completed;
- canonical_document_hash differs from the submitted raw text hash;
- retry supplies a different upload ID from the one bound to the existing run.
Expect VERIFICATION_SOURCE_UPLOAD_NOT_CANONICALIZED_OR_OUT_OF_SCOPE or
PUBLIC_RECEIPT_ID_COLLISION_OR_EXISTING_INTEGRITY_FAILURE on retry. BFF maps
authorization/scope cases to HTTP 403 and collision cases to HTTP 409.
Assert no run/receipt changes.

### RT-06 Correction lineage
Positive:
- Persist parent receipt for User A in WA.
- Persist a distinct corrected child with correctionOfVerificationId set to
  parent's verification_id.
- Expect CREATED; child run parent_run_id points to parent's run; attempt increments;
  child receipt and run hashes validate.
- Retry exact child arguments. Expect IDEMPOTENT_EXISTS and same child receipt/run.

Negative:
- nonexistent parent;
- revoked/expired parent;
- parent belongs to User B or WB;
- child run parent_run_id does not match the referenced parent run;
- correction ID equals the child's own derived verification ID.
Expect the corresponding VERIFICATION_CORRECTION_PARENT_* or
VERIFICATION_CANNOT_CORRECT_ITSELF error; BFF maps lineage errors to HTTP 409.
Assert no child run/receipt persists.

## BFF / frontend contract assertions

- Valid bearer token required; invalid/missing token rejected before service-role client use.
- BFF resolves identity actor and active workspace before RPC.
- Exact nine RPC argument names and values asserted, including null normalization.
- RPC response must be an object with status CREATED or IDEMPOTENT_EXISTS and a
  complete receipt record. Unknown status or missing fields returns HTTP 500.
- BFF returns { record, status } with correction lineage echoed only from the
  validated request/RPC path, never inferred from an unrelated receipt.
- HTTP mapping: workspace/source authorization 403; collision/correction lineage
  409; invalid payload 400; auth 401; unavailable service configuration/version 503.

## Evidence and certification rules

- STATIC: migration source and test source reviewed.
- STRUCTURAL: function signature, grants, triggers and handler/RPC call graph verified.
- RUNTIME: RT-01 through RT-06 executed against the disposable Supabase project,
  with SQL snapshots and BFF request/response logs (redacted).
- CERTIFICATION: only after all runtime cases pass, CI is green, RPC privileges are
  rechecked, and a fresh read-only production comparison confirms the deployed
  migration/function version. Applying the migration to production is a separate
  explicitly authorized operation.

Current state: migration authored on the isolated GitHub repair branch. No migration
has been applied to any database. No runtime scenario has been executed. G4-D remains
NOT CERTIFIED.
