# Verify receipt permission reduction: production execution record

**Production project:** ehkmfnaqkdgkjmdxxbwj  
**Region:** eu-west-1  
**Database:** PostgreSQL 17.6.1  
**Execution date:** 2026-11-14  
**Scope:** public.public_verification_records only  
**Production migration:** 20261114105153 / verify_receipt_least_privilege_20261114

## Change applied

The production migration executed successfully.

```sql
REVOKE ALL PRIVILEGES
ON TABLE public.public_verification_records
FROM anon, authenticated, service_role;

GRANT SELECT
ON TABLE public.public_verification_records
TO anon, authenticated;

GRANT SELECT, INSERT
ON TABLE public.public_verification_records
TO service_role;
```

This removed the direct table grants for INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES and PostgreSQL 17 MAINTAIN from anon, authenticated and service_role. It retained SELECT for anon/authenticated and SELECT+INSERT for service_role. The table owner postgres was not changed. RLS remained enabled and the existing SELECT policy remained unchanged.

## Pre-change snapshot

- RLS enabled.
- Table owner: postgres.
- 68 receipt rows.
- No table triggers.
- Existing policy: Public Verification Record Select Policy, roles anon/authenticated, command SELECT, USING true.
- anon/authenticated/service_role had all table privileges including TRUNCATE, TRIGGER and PostgreSQL 17 MAINTAIN.

## Post-change privilege verification

Effective privilege checks returned:

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | TRIGGER | REFERENCES | MAINTAIN |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| anon | yes | no | no | no | no | no | no | no |
| authenticated | yes | no | no | no | no | no | no | no |
| service_role | yes | yes | no | no | no | no | no | no |

## Database-role positive and negative tests

Executed with transaction-local role simulation using SET LOCAL ROLE. These are PostgreSQL authorization tests, not HTTP/PostgREST tests.

| Test | Result | Evidence |
|---|---|---|
| anon SELECT | PASS | Query succeeded; 68 visible rows |
| authenticated SELECT | PASS | Query succeeded; 68 visible rows |
| anon INSERT | PASS | Rejected with SQLSTATE 42501 permission denied |
| authenticated INSERT | PASS | Rejected with SQLSTATE 42501 permission denied |
| anon UPDATE | PASS | Rejected with SQLSTATE 42501 permission denied |
| anon DELETE | PASS | Rejected with SQLSTATE 42501 permission denied |
| authenticated UPDATE | PASS | Rejected with SQLSTATE 42501 permission denied |
| authenticated DELETE | PASS | Rejected with SQLSTATE 42501 permission denied |
| service_role INSERT | PASS | Insert succeeded inside transaction; transaction rolled back |
| Test residue | PASS | Row count remained 68; all synthetic test IDs absent |

TRUNCATE and trigger creation were not attempted because those actions are destructive or structurally invasive. Their effective privileges were verified false using has_table_privilege.

## Application code change

Commit: 3fe9e94d337ee67655041196ba5aa3e84da4a25d

Updated `src/services/verify/publicVerificationService.ts` to request the explicit public receipt projection:
- verification_id
- document_hash
- evidence_hash
- engine_version
- policy_version
- overall_similarity
- total_sources_found
- evidence_envelope
- created_at

This change is committed to `sprint/verify-commercial-mvp-10h`. It has not been merged or deployed by this operation. The currently deployed browser bundle may therefore still use SELECT * until this source change is merged and deployed.

The trusted server persistence handler still uses SELECT * and insert().select() with service_role. That remains within the service_role SELECT+INSERT privilege target; its response contract should be reviewed separately before narrowing server projections.

## Repository migration artifact

A matching SQL migration file was committed:
`supabase/migrations/20261114105153_verify_receipt_least_privilege_20261114.sql`

Repository commit: fd17bcc330c0cec00211ad92e3cdf54f80f1aef4

The Supabase migration ledger reports version 20261114105153 with name verify_receipt_least_privilege_20261114.

## Evidence classification

| Class | Status | Limits |
|---|---|---|
| STATIC | PASS | Source projection change inspected and committed |
| STRUCTURAL | PASS | Production effective privileges and policy state queried after migration |
| RUNTIME | PARTIAL PASS | Real PostgreSQL role checks succeeded; no HTTP/PostgREST JWT test or deployed browser test run |
| CERTIFICATION | NOT CLAIMED | App code has not been merged/deployed; public QR receipt flow and production HTTP behavior remain to be exercised |

## Safety and rollback

No receipt rows were modified. Synthetic insert was rolled back. No other tables, policies, functions, default ACLs or application data were changed.

If rollback is required, the previous API role grants can be restored with table-specific GRANT statements, but this should only be done after confirming the incident or regression and obtaining an explicit rollback decision. Do not restore broad TRUNCATE/TRIGGER/MAINTAIN privileges merely as a convenience.

**Important remaining risk:** the public SELECT policy still exposes every row to anon/authenticated, while the table-level SELECT grant remains necessary for QR receipt lookup. The committed browser projection narrows the normal application query after deployment, but it does not prevent a caller from requesting other columns through the Data API. A true column-level allowlist or server-shaped public receipt endpoint is still required to enforce field-level confidentiality against direct API clients.


## Column-level public receipt allowlist follow-up

A second production migration was applied after recognizing that a browser-side SELECT projection alone does not stop direct Data API callers from requesting other table columns.

Migration ledger: 20261114105314 / verify_receipt_column_allowlist_20261114.

The migration revoked table-level SELECT from anon and authenticated, then granted SELECT only on the nine public receipt columns listed above. service_role retains table-level SELECT and INSERT for the trusted server persistence handler.

Post-change role simulation:
- anon SELECT of the nine allowlisted columns: PASS.
- authenticated SELECT of the nine allowlisted columns: PASS.
- anon SELECT of hidden column `status`: denied with SQLSTATE 42501.
- authenticated SELECT of hidden column `status`: denied with SQLSTATE 42501.
- Effective privilege inspection: anon/authenticated have no table-level SELECT; they have column SELECT on `verification_id` and no column SELECT on `status`; service_role retains table SELECT and INSERT.

This closes the direct-column privilege gap at the PostgreSQL grant layer, subject to the Data API honoring the same database roles as expected. HTTP/PostgREST requests with real JWT/API credentials have not yet been exercised.
