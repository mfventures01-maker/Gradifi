# Gradifi Verify-only permission remediation matrix

**Repository:** mfventures01-maker/Gradifi  
**Branch:** sprint/verify-commercial-mvp-10h  
**Production project:** ehkmfnaqkdgkjmdxxbwj  
**Snapshot:** 2026-11-14  
**Evidence class:** STATIC + STRUCTURAL  
**Runtime certification:** NOT PERFORMED  
**Production changes:** NONE

## Decision rules

1. This is a Verify-only proposal, not an instruction to revoke shared application access blindly.
2. The inspected production Verify UI/server path directly accesses only `public.public_verification_records`.
3. For the other 13 tables, no direct Verify MVP table call was found in the inspected production UI/server call sites. “No call found” is not proof that no other Gradifi module uses a table.
4. Preserve PostgreSQL ownership/admin privileges. The proposed changes below concern API roles (`anon`, `authenticated`) and, where justified, `service_role`.
5. `TRUNCATE`, `TRIGGER`, and `REFERENCES` are not required by any inspected Verify application call site. Remove them from API roles after cross-module dependency checks. RLS does not constrain TRUNCATE.
6. Do not remove privileges from shared tables until their non-Verify call sites, RPCs, views, triggers, jobs and edge functions have been mapped and approved.

## Actual Verify call sites

| Call-site ID | Source | Operation | Database role | Table |
|---|---|---|---|---|
| VERIFY-UI-RUN | `src/pages/verify/GradifiVerifyDemoPage.tsx` → `POST /api/verify/run` | Sends `documentText`; no browser table access | Server process delegates persistence | None directly |
| VERIFY-SERVER-PERSIST | `src/services/verify/server/persistenceServerHandler.ts` | SELECT by `verification_id`, INSERT receipt, re-read; re-select on unique conflict | `service_role` | `public_verification_records` |
| VERIFY-PUBLIC-RECEIPT | `src/services/verify/publicVerificationService.ts` via `src/lib/supabase.ts` | SELECT receipt by `verification_id`; current source uses `SELECT *` | `anon` | `public_verification_records` |
| VERIFY-LEGACY-PERSIST | `api/verify/persist.ts` | Returns HTTP 410; no database access | None | None |
| VERIFY-VITE-LEGACY-PERSIST | `src/services/verify/server/verifyServerPlugin.ts` | Returns HTTP 410; no database access | None | None |
| VERIFY-PIPELINE-AUDIT | `src/services/verify/pipelineAudit.ts` → shared persistence service | Diagnostic/shared call; service rejects browser execution and requires server credentials | No confirmed active production caller | Not established |

## Table-by-table matrix

Privilege shorthand:
- **Full API grant observed** = SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE.
- **Audit grant observed** = SELECT, REFERENCES, TRIGGER.
- **SELECT-only target** = SELECT.
- **No API grant target** = no direct table privileges for anon/authenticated; service-role access only if a separately verified server call requires it.

| Table | Actual inspected Verify call site | Observed API-role grants | Required for inspected Verify path | Proposed removal / target | Disposition |
|---|---|---|---|---|---|
| `public_verification_records` | `persistenceServerHandler.ts` service-role SELECT + INSERT; `publicVerificationService.ts` anon SELECT | anon/authenticated: full API grant; service_role: full API grant | anon: SELECT; authenticated: no distinct need found (the policy currently includes it); service_role: SELECT + INSERT | anon: remove INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES; authenticated: remove all table privileges unless authenticated receipt lookup is an explicitly approved product requirement, otherwise SELECT only; service_role: remove UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES and retain SELECT + INSERT | **P0 Verify-owned boundary** |
| `verification_runs` | No direct Verify MVP table call found. Existing authenticated SELECT policy references `tenant_identity_map` for institution membership. | anon/authenticated: full API grant | None established for current Verify route | Candidate: remove anon/authenticated table grants. Retain no service-role grant absent a verified server call. Preserve/review authenticated SELECT policy only if another approved module uses it. | **HOLD: tenant/institution dependency** |
| `tenant_identity_map` | No direct Verify browser/server table call found. Referenced by policies on `verification_runs` and `billable_events`. | anon/authenticated: full API grant | None established for current Verify route | Candidate: remove anon grants; remove authenticated direct DML, TRUNCATE, TRIGGER, REFERENCES. Keep authenticated SELECT only if tenant identity lookup is an approved app requirement. Service-role access only for confirmed trusted provisioning paths. | **HOLD: shared identity dependency** |
| `documents` | No direct Verify MVP call found | anon/authenticated: full API grant | None established | Candidate: remove all anon/authenticated table grants; remove service_role grants unless a separate trusted document workflow is confirmed. | **HOLD: possible shared document workflow** |
| `plagiarism_checks` | No direct Verify MVP call found | anon/authenticated: full API grant | None established | Candidate: remove all anon/authenticated table grants; remove service_role grants unless another verified plagiarism workflow requires them. | **HOLD: legacy/parallel plagiarism path** |
| `plagiarism_matches` | No direct Verify MVP call found | anon/authenticated: full API grant | None established | Candidate: remove all anon/authenticated table grants; remove service_role grants unless another verified plagiarism workflow requires them. | **HOLD: legacy/parallel plagiarism path** |
| `plagiarism_reports` | No direct Verify MVP call found | anon/authenticated: full API grant | None established | Candidate: remove all anon/authenticated table grants; remove service_role grants unless another verified report workflow requires them. | **HOLD: legacy/parallel plagiarism path** |
| `plagiarism_corrections` | No direct Verify MVP call found | anon/authenticated: full API grant | None established | Candidate: remove all anon/authenticated table grants; remove service_role grants unless a correction workflow is verified. | **HOLD: correction feature dependency** |
| `institution_plagiarism_checks` | No direct Verify MVP call found | anon/authenticated: full API grant | None established | Candidate: remove anon grants; remove authenticated direct DML/TRUNCATE/TRIGGER/REFERENCES. Retain only narrowly scoped authenticated SELECT or trusted service-role writes if institution workflows prove they are needed. | **HOLD: shared institution feature** |
| `services` | No direct Verify execution call found | anon/authenticated: full API grant | None established for Verify execution | Candidate: anon no table privileges; authenticated SELECT only if active service catalogue is intentionally client-readable; remove INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES. Service-role privileges require billing/admin call-site confirmation. | **HOLD: shared billing catalogue** |
| `service_versions` | No direct Verify execution call found | anon/authenticated: full API grant | None established for Verify execution | Candidate: anon no table privileges; authenticated SELECT only if active service-version lookup is a supported product flow; remove all client write/DDL-adjacent privileges. Service-role writes only for verified catalogue administration. | **HOLD: shared billing catalogue** |
| `price_versions` | No direct Verify execution call found | anon/authenticated: full API grant | None established for Verify execution | Candidate: anon no table privileges; authenticated SELECT only if active price lookup is a supported product flow; remove all client write/DDL-adjacent privileges. Service-role writes only for verified pricing administration. | **HOLD: shared billing catalogue** |
| `billable_events` | No direct Verify MVP call found. Authenticated SELECT policy checks tenant membership through `tenant_identity_map`. | anon/authenticated: full API grant | None established for current Verify route | Candidate: remove anon grants; remove authenticated INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES; preserve authenticated SELECT only if tenant billing history is an approved UI requirement. Trusted server writes require a confirmed billing call site and should use service_role or a narrowly authorized RPC. | **HOLD: shared billing event path** |
| `audit_logs` | No Verify-specific write call found. `pipelineAudit.ts` is not confirmed as an active production writer. | anon/authenticated: SELECT, REFERENCES, TRIGGER; service_role: SELECT, REFERENCES, TRIGGER (no INSERT observed) | None established for Verify. No service-role INSERT was observed in the catalog snapshot. | Remove anon/authenticated SELECT, REFERENCES, TRIGGER unless a separately approved public/admin reader exists. Remove service_role REFERENCES/TRIGGER; do not add INSERT until a real audit writer and authorization model are implemented. | **HOLD: shared audit subsystem** |

## Recommended target for the only confirmed Verify table

For `public.public_verification_records`, the narrow target justified by the inspected call sites is:

| Role | Target table privileges | Reason |
|---|---|---|
| anon | SELECT | Public QR receipt resolution |
| authenticated | None by default; SELECT only if authenticated receipt lookup is explicitly required | No separate authenticated call-site requirement was established |
| service_role | SELECT, INSERT | Trusted server-side receipt persistence and idempotency lookup |
| postgres / owner | Preserve owner/admin control | Operational ownership, not application-client access |

The public SELECT policy currently applies to both anon and authenticated with `USING (true)`. Before retaining public SELECT, replace the browser's `SELECT *` contract with an explicit field allowlist or a server-shaped public DTO. Column-level exposure must be reviewed independently of row-level policy.

## Cross-module holds

The following are not approved for immediate revocation solely on this Verify review:
- `tenant_identity_map`, `verification_runs`, and `billable_events`: identity and tenant/billing policy dependencies.
- `services`, `service_versions`, and `price_versions`: shared billing catalogue.
- `institution_plagiarism_checks`: institution workflow.
- `documents` and plagiarism tables: possible legacy/parallel plagiarism paths.
- `audit_logs`: shared audit subsystem.

For these tables, the proposed changes are candidate least-privilege targets. A cross-product call-site and RPC dependency inventory is a prerequisite to execution.

## Execution sequence (not executed)

1. Freeze and re-fetch the production grant/policy snapshot immediately before any change.
2. Map every non-Verify source call site, exposed RPC, view, trigger, scheduled job and Edge Function touching each held table.
3. Confirm PostgREST exposed schemas and the effective API role for each call.
4. Build a transaction-safe, table-specific migration. Do not use blanket schema-wide revokes.
5. Apply first to staging; run anon, authenticated and service-role positive/negative tests.
6. Verify receipt creation, idempotent retry, public QR lookup and non-Verify institution/billing/identity flows.
7. Re-query effective table and column privileges, RLS policies, function EXECUTE grants and default ACLs after the change.
8. Only then request explicit production-change approval.

## Required tests before certification

- anon can SELECT only the approved public receipt projection.
- anon cannot INSERT, UPDATE or DELETE receipt rows.
- authenticated cannot INSERT, UPDATE or DELETE receipt rows.
- service_role can SELECT and INSERT receipt rows through the trusted server path.
- duplicate verification_id remains idempotent under concurrent persistence.
- no client role has TRUNCATE or TRIGGER on Verify-owned tables unless a documented, tested requirement exists.
- all held institution, tenant, billing, document and audit workflows pass regression tests.
- direct REST, GraphQL, RPC and Edge Function paths are tested with their real JWT roles.

## HOEOS status

| Evidence class | Status | Meaning |
|---|---|---|
| STATIC | PASS | Source call sites and permission review artifacts inspected |
| STRUCTURAL | PASS | Production catalog grants and policies were inventoried read-only |
| RUNTIME | NOT RUN | No staging or production authorization probes performed for this matrix |
| CERTIFICATION | NOT CLAIMED | Proposed changes are not applied or certified |

**Safety:** This document is a remediation proposal only. No production grants, policies, functions, migrations, data or deployments were changed.
