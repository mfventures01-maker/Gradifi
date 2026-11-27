# HOEOS G8 Persistence and CMVP Runtime Evidence

**Assessment date:** 2026-11-23  
**Repository:** `mfventures01-maker/Gradifi`  
**Primary anchor:** `integration/gradifi-primary-2026-11-20`  
**CMVP anchor:** `fix/cmvp01-public-commercial-gate-2026-11-22`  
**Decision:** implementation and controlled runtime evidence verified; full authenticated production persistence golden path remains open.

## 1. Live `upload-document` source reconciliation

- Live Supabase Edge Function: `upload-document`, deployed version **9**.
- Live deployment bundle SHA-256: `da0b6b61eba4658d0b2c1179769137e91ce6ac06ef8f5653f2495e1a81de6598`.
- Live `index.ts` was fetched from the connected Supabase project.
- The complete live source content matched `supabase/functions/upload-document/index.ts` on the CMVP branch byte-for-byte.
- CMVP branch provenance was corrected in commit `002d95d0abdf82bc3cea34619f1c69bd629c898f`; the manifest now records version 9, bundle SHA-256, and `LIVE_V9_SOURCE_EXACT_MATCH`.
- No Edge Function deployment or replacement was performed.

CMVP provenance CI: [run 45172031703](https://github.com/mfventures01-maker/Gradifi/actions/runs/45172031703) — **PASS**.

## 2. Deployed trial-token issuance and consumption

The deployed `trial` Edge Function is version **8**, with `verify_jwt=false`. A controlled PowerShell canary reached the deployed Edge Function and completed both actions.

| Evidence | Result |
|---|---|
| `POST /functions/v1/trial` start | HTTP 200 |
| `start_public_trial_session` RPC | HTTP 200 |
| Initial allowance | 3 checks |
| `POST /functions/v1/trial` consume | HTTP 200 |
| `consume_public_trial_session` RPC | HTTP 200 |
| Persisted `used_checks` | 1 |
| Persisted `checks_remaining` | 2 |

The live row contained a SHA-256 token hash, not the raw token. The raw token was not included in repository files or this report. The persisted session expiry was 24 hours after issuance.

Correlated Edge Function requests:
- Start: `01a20823-7ef7-7817-916b-d550248ee529`
- Consume: `01a20823-867e-7112-89fd-865b3428a32d`

This proves the deployed token issue-and-consume path and the database decrement. It does not certify the complete public verification engine or the authenticated receipt-persistence path.

## 3. Authoritative verification-run and receipt-hash implementation

The primary integration contains:
- `api/verify/persist.ts`: authenticated POST boundary.
- `src/services/verify/server/persistenceServerHandler.ts`: session validation, active identity actor check, workspace and service-version resolution, then service-role RPC call.
- `public.persist_verification_run_and_receipt(...)`: service-role-only public wrapper.
- `private.persist_verification_run_and_receipt(...)`: atomic run creation, SHA-256 result/evidence/manifest hashes, receipt publication, idempotency and post-write integrity check.
- `private.verification_run_hashes_match(uuid)`: independent hash/manifest validation.
- `public.lookup_public_verification(text)`: fail-closed public receipt resolution.

The live migration history contains both:
- `20261123111659_verification_run_atomic_receipt_hash_authority`
- `20261123111708_verification_run_hash_helper_snapshot_safety`

Database privilege inspection confirmed:
- The public persistence wrapper is executable by `service_role`, not `anon` or `authenticated`.
- The private persistence implementation and hash helper are not directly executable by `anon`, `authenticated`, or `service_role`.
- The server handler is the intended authenticated identity gate before service-role persistence.

### Rollback-only live database canary

A synthetic canary was executed inside a database exception subtransaction and deliberately rolled back after verifying:
1. First call returned `CREATED`.
2. A `verification_runs` row and linked public receipt were created atomically inside the test transaction.
3. The hash helper validated the run's document, evidence, result, and manifest hashes.
4. Public lookup returned the receipt with matching result and manifest hashes.
5. A repeated identical call returned `IDEMPOTENT_EXISTS`.
6. The deliberate rollback removed the canary writes.

Post-test live counts remained unchanged:
- `verification_runs`: 0
- `public_verification_records`: 68 legacy rows
- `verify_document_uploads`: 0

The legacy receipts are not linked to verification runs and do not have the new authoritative hashes; none were rewritten by this canary.

### Automated G8 acceptance

Added `tests/verificationRunPersistenceServer.test.ts` to cover:
- authenticated session and actor/workspace/service-version gates;
- invocation of the atomic run-plus-receipt RPC;
- rejection of tampered evidence hashes before Supabase client creation;
- fail-closed behavior without an active identity actor;
- idempotent receipt response.

The primary G8 workflow now includes this test. Full G0-G12 workflow run [45172355635](https://github.com/mfventures01-maker/Gradifi/actions/runs/45172355635) on commit `550f42fb8bcb2cc0800673f7f6095667cb5490f4` completed **PASS**, including G8.

## 4. Remaining certification boundary

The following is **not yet certified**:
- A real authenticated browser session traversing `/api/verify/persist` end-to-end against the deployed Vercel runtime.
- A committed production `verification_runs` row and receipt read back through the public route/QR.
- Production Vercel environment parity for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

CI deliberately uses placeholder Supabase credentials and performs no production writes. The rollback-only database canary verifies the database authority, not the full Vercel authentication boundary. Final G8 runtime certification therefore remains **CONDITIONAL / OPEN** pending one explicitly approved authenticated production golden-path write and readback.

### Supabase security-advisor note

The current security advisor reports GraphQL schema visibility warnings for `verification_runs` and `verify_document_uploads` to the authenticated role. Direct policy inspection confirmed RLS is enabled and forced on both tables, with workspace-member/creator-scoped SELECT policies. `public_verification_records` has RLS enabled and an explicit deny policy for `anon` and `authenticated`. These findings do not demonstrate cross-workspace row access, but the authenticated GraphQL schema visibility is a separate exposure-surface review item. No grants or RLS policies were changed during this work.

## 5. Change-control statement

- No new Git branch was created.
- No Supabase migration was applied during this assessment; the two persistence migrations were already present in live migration history.
- No Edge Function was deployed or replaced.
- The only persistent production write during runtime verification was the controlled trial session issuance and one-check consumption described above.
- The synthetic verification-run/receipt canary was rolled back; no test receipt remains in production.
