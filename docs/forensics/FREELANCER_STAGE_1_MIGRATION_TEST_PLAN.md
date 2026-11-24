# FREELANCER_STAGE_1_MIGRATION_TEST_PLAN

**HOEOS work package:** FREELANCER-01A  
**Target:** Gradifi / SEFAES  
**Status:** Specification only. No tests in this file have been executed.  
**Production mutation:** Not authorized.

---

## 1. Test execution rules

1. Run migration tests only on an isolated Supabase development branch or disposable test database.
2. Do not use production identities, documents, receipts or payment events as test fixtures.
3. Use at least two individual Auth users and one institution-backed Auth user.
4. Include one inactive individual actor fixture and one institution-backed actor fixture.
5. Seed only synthetic test data.
6. Never modify the 68 existing production public verification records.
7. Do not use service_role in browser tests. Trusted backend integration tests may use a server-side service credential held only in the test runner.
8. Verify both database state and API response. A passing UI assertion alone is insufficient.
9. Capture SQLSTATE, HTTP status, response body schema, row counts and relevant audit evidence for every negative test.
10. Mark tests A STATIC, B STRUCTURAL, C RUNTIME or D CERTIFICATION. Do not promote a test to certification until an independent run reproduces it.

## 2. Test fixtures

| Fixture | Purpose |
|---|---|
| Individual A | Active freelancer actor, Auth UID A |
| Individual B | Active freelancer actor, Auth UID B |
| Individual C | Suspended individual actor, Auth UID C |
| Institution user I | Active institutional membership, Auth UID I |
| Institution user J | Different institution or no membership |
| Service version | Active SIM version with explicit certified engine/policy/canonicalizer metadata |
| Upload A | Synthetic PDF/TXT/DOCX owned by Individual A |
| Upload I | Synthetic institutional upload |
| Receipt A | Fully valid synthetic run/receipt pair |
| Receipt legacy | Synthetic historical incomplete receipt with NULL projection fields |

Fixtures must not use real documents or live user data.

## 3. Identity and ownership tests

### OWN-01: Existing individual identity contract

- Provision Individual A through the approved onboarding path in the isolated environment.
- Assert exactly one profile exists for Auth UID A.
- Assert profile role is individual and account_type is freelancer.
- Assert exactly one identity actor exists for Auth UID A.
- Assert actor_type is individual, status active, auth_method email.
- Assert institution_id, school_id and authority_user_id are NULL.
- Assert no institution_memberships row was created for Auth UID A.

**Expected:** PASS only when all assertions hold.

### OWN-02: Auth identity uniqueness

- Attempt a second identity actor for the same Auth UID.
- Attempt a second profile for the same Auth UID.

**Expected:** unique constraints reject duplicate identity mappings.

### OWN-03: Institutional identity cannot be silently converted

- Use Institution user I, who already has an institutional profile/actor.
- Call individual bootstrap for the same Auth UID.

**Expected:** bootstrap rejects with the existing conflicting-identity error. No second actor/profile or artificial institution is created.

### OWN-04: Individual verification run ownership

- Create a run through the trusted persistence boundary for Individual A.
- Assert institution_id and school_id are NULL.
- Assert owner_actor_id resolves to A's active individual actor.
- Assert created_by_user_id equals Auth UID A.
- Assert billable_event_id and source_submission_id are NULL unless a separately approved use case explicitly supplies them.

**Expected:** valid individual row is accepted.

### OWN-05: Cross-user run isolation

- Authenticate as Individual B.
- Attempt to SELECT Individual A's run through the authenticated history/data path.

**Expected:** zero rows or explicit authorization denial. No metadata or result leakage.

### OWN-06: Inactive actor rejection

- Set Individual C's actor status to suspended in the isolated test database.
- Attempt run creation and history access.

**Expected:** both are denied even if the Auth session remains valid and created_by_user_id matches the caller.

### OWN-07: Actor/Auth UID mismatch

- Attempt a trusted persistence request that pairs Auth UID A with Individual B's actor ID.

**Expected:** transaction rejects; no run, receipt or usage mutation remains.

### OWN-08: Individual scope tampering

- Attempt to create or mutate an individual run with institution_id, school_id or an institutional authority pointer populated.
- Attempt to create an institutional run with owner_actor_id populated.

**Expected:** scope constraint or trusted ownership validator rejects both invalid combinations.

## 4. Institutional regression tests

### INST-01: Institutional run creation

- Create a run using Institution user I and a valid institution membership.
- Assert institution_id is NOT NULL and owner_actor_id is NULL.
- Preserve existing source_submission_id/institution matching rules.

**Expected:** existing institutional creation path remains functional.

### INST-02: Institutional run visibility

- Institution user I reads its permitted run.
- Institution user J attempts to read it.

**Expected:** I sees only authorized institutional rows; J cannot read the row.

### INST-03: Institutional upload

- Upload a synthetic file through the institutional path.
- Assert institution_id, owner_user_id, bucket_id and object_path retain current semantics.
- Assert tenant/institution consistency checks remain active when tenant_id is supplied.

**Expected:** institutional upload behaviour remains unchanged.

### INST-04: Institutional Storage access

- Institution owner/member reads the authorized object.
- Unrelated user attempts object read and listing.

**Expected:** authorized access works; unrelated access fails.

### INST-05: No artificial institution

- Provision an individual and create an individual upload/run.
- Query institutions, institution_memberships and tenant mappings for that Auth UID.

**Expected:** no institution, school, tenant or membership is synthesized for the individual.

## 5. Upload ownership and Storage tests

### UP-01: Individual upload metadata

- Upload as Individual A.
- Assert owner_user_id equals Auth UID A.
- Assert owner_actor_id equals A's active individual actor.
- Assert institution_id and tenant_id are NULL.
- Assert source_file_sha256 matches server-calculated bytes.
- Assert bucket is verify-private and path is server-generated.

**Expected:** metadata persists with the individual scope.

### UP-02: Cross-user metadata read

- Individual B requests upload A metadata.

**Expected:** no row returned.

### UP-03: Cross-user object read

- Individual B attempts to read or download upload A's Storage object.

**Expected:** denied by storage.objects RLS.

### UP-04: Inactive owner object read

- Suspend Individual A after upload.
- Attempt metadata and Storage read.

**Expected:** denied if the approved active-actor policy requires active status. This test must be aligned with the final lifecycle policy contract.

### UP-05: Client metadata forgery

- Submit a request containing a forged owner_user_id, owner_actor_id, institution_id or object_path.

**Expected:** server ignores/rejects caller-supplied ownership values and derives identity/path from authenticated server context.

### UP-06: Invalid file

- Test unsupported extension/MIME, invalid PDF signature, invalid DOCX package signature, non-UTF-8 TXT, empty file and over-limit file.

**Expected:** rejected before persistent metadata is created.

### UP-07: Storage/metadata compensation

- Force metadata insert failure after object upload in the isolated environment.

**Expected:** uploaded object is removed or placed into a recoverable cleanup queue; no orphan is silently treated as a valid upload.

### UP-08: Upload/run binding

- Attempt to bind an individual upload to a run owned by another actor.

**Expected:** trusted transaction rejects the mismatch.

## 6. Entitlement and usage tests

### ENT-01: Free plan bootstrap

- Provision Individual A.
- Assert exactly one active Free entitlement is provisioned.
- Retry bootstrap with the same user and same account type.

**Expected:** one entitlement only; idempotent response.

### ENT-02: Account type conflict

- Attempt to re-bootstrap an existing freelancer identity as independent_student.

**Expected:** existing conflicting identity rejection; no second entitlement or actor.

### ENT-03: Free attempt cap

- Reserve three attempts in the same quota period.
- Attempt a fourth.

**Expected:** fourth reservation denied.

### ENT-04: Per-submission word cap

- Submit canonical text at the Free per-submission limit and one word above it.

**Expected:** limit accepted; over-limit rejected before G5 execution or receipt creation.

### ENT-05: Student and Professional monthly quota

- Test Student monthly allowance of 100,000 words.
- Test Professional monthly allowance of 300,000 words.
- Test period boundary reset and timezone handling.

**Expected:** server-calculated canonical word counts are aggregated correctly.

### ENT-06: Browser word-count forgery

- Submit a deliberately false client word count.

**Expected:** server ignores it; canonical text extraction determines count.

### ENT-07: Concurrent reservation

- Launch parallel reservations whose combined usage exceeds the plan limit.

**Expected:** row-lock/transaction semantics allow only reservations within quota. No oversubscription.

### ENT-08: Reservation release

- Reserve quota, then force extraction/G5/persistence failure before successful commit.

**Expected:** reservation is released according to the approved failure-charging policy. No accidental consumption.

### ENT-09: Usage ledger immutability

- Attempt authenticated UPDATE/DELETE of ledger entries.

**Expected:** denied. Corrections are append-only compensating events, not edits.

### ENT-10: Payment webhook replay

- Submit the same valid provider event twice.
- Submit an invalid signature.
- Submit the same event ID with a different payload.

**Expected:** valid replay is idempotent; invalid signature is rejected; changed payload is rejected and audited.

## 7. Idempotency and atomic persistence tests

### PERSIST-01: Same idempotency key, same payload

- Submit the same individual verification request twice with the same actor, upload and idempotency key.

**Expected:** exactly one run and one receipt; retry returns the same committed result.

### PERSIST-02: Same idempotency key, changed payload

- Reuse the key with a changed document hash or actor.

**Expected:** conflict; no second run or receipt.

### PERSIST-03: Atomic rollback after run insert

- Inject a controlled failure after the run insert and before receipt insert.

**Expected:** transaction rollback removes the uncommitted run and releases the reservation.

### PERSIST-04: Atomic rollback after receipt insert

- Inject a controlled failure before transaction commit after receipt creation.

**Expected:** no partial receipt/run pair survives.

### PERSIST-05: Service version validation

- Submit a retired, missing or mismatched service version.

**Expected:** persistence rejects. Only the approved active service version is accepted.

### PERSIST-06: Server authority

- Attempt to forge overallSimilarity, highestSourceMatch, source evidence, document word count, engine version, policy version, hashes, payment state or entitlement in browser payload.

**Expected:** trusted backend recalculates or validates every authoritative value. Browser payload is not the authority.

## 8. Receipt integrity tests

### REC-01: Run/receipt linkage

- Commit a successful synthetic verification.
- Assert receipt.verification_run_id references the exact run.
- Assert unique run linkage.

**Expected:** exactly one receipt per run.

### REC-02: Hash parity

Assert equality between run and receipt for:

- verification_id
- document_hash
- evidence_hash
- result_hash
- manifest_hash
- engine_version
- policy_version

**Expected:** all required values match.

### REC-03: Receipt completeness

Attempt to commit a receipt missing result_hash, manifest_hash, public_schema_version or valid status.

**Expected:** rejected.

### REC-04: Public status semantics

- Commit status VALID.
- Attempt lowercase verified.
- Attempt unknown status.

**Expected:** VALID accepted; incompatible or unknown statuses rejected.

### REC-05: Historical receipt preservation

- Record a before snapshot of all 68 historical production records only in the approved read-only evidence capture.
- On an isolated copy, apply proposed constraints.
- Assert historical NULL values remain unchanged and the NOT VALID constraint does not force fabricated backfills.

**Expected:** all historical values unchanged. No production test write.

### REC-06: Receipt immutability

- Attempt to UPDATE or DELETE a committed receipt through client roles and ordinary server APIs.

**Expected:** denied. Revocation/expiry is represented by a separately authorized state/event contract, not destructive editing.

## 9. Public lookup tests

### LOOKUP-01: Valid receipt resolves

- Request a valid verification ID.

**Expected:** safe allowlisted receipt projection returned.

### LOOKUP-02: Incomplete legacy receipt does not resolve

- Request a legacy receipt with NULL run/hash/schema/status fields.

**Expected:** no valid receipt is returned.

### LOOKUP-03: Wrong status

- Request a receipt with REVOKED, EXPIRED, NOT_FOUND or UNAVAILABLE status.

**Expected:** no VALID receipt projection.

### LOOKUP-04: Run mismatch

- Construct a synthetic receipt whose linked run has a different document hash, result hash or verification ID.

**Expected:** lookup fails closed.

### LOOKUP-05: Public allowlist

- Inspect the returned JSON keys.

**Expected:** no owner IDs, actor IDs, upload path, source passages, raw evidence envelope, private result JSON, payment data or entitlement data.

### LOOKUP-06: Direct table access

- Attempt direct SELECT as anon and authenticated.

**Expected:** direct access remains denied. Public lookup works only through the restricted RPC.

## 10. Correction event tests

### CORR-01: Correction creates a new run

- Submit a corrected document with parent_run_id referencing the prior run.

**Expected:** new run and new receipt; prior run and receipt remain immutable.

### CORR-02: Parent ownership

- Individual B attempts to reference Individual A's parent run.

**Expected:** rejected.

### CORR-03: Parent lifecycle

- Attempt correction against missing, unrelated or invalid parent run.

**Expected:** rejected according to the approved correction contract.

### CORR-04: History ordering

- Create multiple correction events.

**Expected:** history is deterministic, parent-linked and preserves original-to-correction chronology.

## 11. Security and privilege tests

### SEC-01: Authenticated TRUNCATE privilege

- Inspect table ACLs for verification_runs and profiles in the isolated test database.
- Assert authenticated lacks TRUNCATE.
- Do not attempt a destructive TRUNCATE against production.

**Expected:** privilege is absent after a separately approved remediation.

### SEC-02: Least-privilege table grants

- Inspect authenticated, anon and service_role grants for all new tables.
- Assert anon has no access to private entitlement, payment or usage tables.
- Assert authenticated receives only the exact privileges required by RLS policies.
- Assert service_role is never exposed to the browser.

**Expected:** least-privilege grants.

### SEC-03: RLS branch correctness

- Verify institutional branch and individual branch are mutually exclusive.
- Verify no permissive legacy OR policy bypasses actor status or owner_actor_id.
- Verify UPDATE/DELETE have no accidental client policy.

**Expected:** cross-scope and inactive actor reads are denied.

### SEC-04: SECURITY DEFINER function boundary

- Inspect owner, search_path, security_definer flag and EXECUTE grants.
- Attempt invocation using anon/authenticated/service_role according to the approved contract.

**Expected:** only intended roles can invoke each function; fixed search_path; auth.uid()/actor ownership checks enforced where required.

## 12. Acceptance gates

| Gate | Required result |
|---|---|
| G1 Identity | Individual identity reuses profiles and identity_actors; no institution |
| G2 Ownership | Runs and uploads have explicit owner_actor_id and Auth UID parity |
| G3 Institutional regression | Existing institutional run/upload tests pass unchanged |
| G4 RLS | No cross-user or inactive actor access |
| G5 Upload | Individual upload and private Storage access work |
| G6 Entitlements | Plan and usage limits are atomic and concurrency-safe |
| G7 Persistence | Run, receipt and usage commit atomically |
| G8 Receipt | Hash parity, uniqueness, immutable history |
| G9 Public lookup | VALID receipt resolves; invalid/incomplete receipts fail closed |
| G10 Corrections | New immutable correction event, parent ownership enforced |
| G11 Security | Least-privilege ACL and function grants verified |
| G12 Certification | Independent end-to-end freelancer golden path reproduced |

A gate is not PASS merely because the corresponding migration applies. Each gate requires positive and negative tests.

## 13. Evidence record template

For every executed test, record:

- Test ID
- Environment and Supabase project/branch
- Migration versions applied
- Commit SHA
- Fixture identifiers (synthetic only)
- Exact command or request
- Expected result
- Actual result
- SQLSTATE/HTTP status
- Before/after row counts
- Relevant logs
- Evidence class (A/B/C/D)
- Tester and independent reviewer
- Timestamp
- PASS / FAIL / BLOCKED

## 14. Current execution status

All tests in this file are **SPECIFIED, NOT EXECUTED**.

Current evidence state:

- A. STATIC: live schema, migrations, function source, ACLs and deployed Edge Function source inspected.
- B. STRUCTURAL: ownership constraints, policy composition and migration dependencies established.
- C. RUNTIME: not executed.
- D. CERTIFICATION: not achieved.

Do not represent this test plan as a passing test suite.
