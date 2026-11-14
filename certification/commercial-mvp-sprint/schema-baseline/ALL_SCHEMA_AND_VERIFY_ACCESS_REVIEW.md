# Gradifi Verify: all-schema census and database permission map

**Branch:** `sprint/verify-commercial-mvp-10h`  
**Production project:** `ehkmfnaqkdgkjmdxxbwj`  
**Evidence:** Static source inspection + read-only production catalog queries  
**Mutations:** None

## 1. All-schema census

The live database exposes nine non-system schemas: `auth`, `extensions`, `graphql`, `graphql_public`, `public`, `realtime`, `storage`, `supabase_migrations`, and `vault`.

| Schema | Relations | Columns | Routines | RLS policies | Ownership classification |
|---|---:|---:|---:|---:|---|
| auth | 27 | 271 | 4 | 0 | Supabase-managed |
| extensions | 2 | 51 | 55 | 0 | Extension support |
| graphql | 0 | 0 | 6 | 0 | Supabase-managed |
| graphql_public | 0 | 0 | 1 | 0 | Supabase-managed |
| public | 130 | 1,305 | 124 | 47 | Application-owned |
| realtime | 3 | 22 | 19 | 0 | Supabase-managed |
| storage | 10 | 91 | 24 | 2 | Supabase-managed |
| supabase_migrations | 1 | 6 | 0 | 0 | Supabase-managed |
| vault | 2 | 17 | 5 | 0 | Supabase-managed |

The public schema's 130 relations comprise 114 tables/partitioned tables, 13 views and 3 materialized views. The whole visible non-system catalog census reports 175 relations, 1,763 relation columns, 650 constraints, 433 indexes, 238 routines, 49 policies, 36 non-internal triggers, 6 sequences, 13 enum types, 6 installed extensions and 24 default-ACL entries.

Detailed public-schema exports remain in `schema-baseline/catalog-tables.json`, `catalog-routines-views-triggers.json` and `security-grants-policies.json`. The machine-readable census records managed-schema relation names and counts. Supabase-managed schemas are inventoried, not proposed for modification.

### Storage

There is one private bucket: `answer-scripts`. It has a 10 MiB limit and allows JPEG, PNG and PDF MIME types. Its two policies allow authenticated teachers to upload and read objects in that bucket. No Verify upload-to-Storage call was found in the inspected code path. Verify currently extracts document text in the browser and posts `documentText` to its server endpoint.

## 2. Verify application call-site map

### Actual receipt lifecycle

1. `src/pages/verify/GradifiVerifyDemoPage.tsx` posts the submitted `documentText` to `POST /api/verify/run`.
2. `api/verify/run.ts` calls `handleTrustedVerifyRun`. The route does not directly use the database.
3. `src/services/verify/server/verifyRunServerHandler.ts` executes the real server-side Verify engine, builds a metadata-only public receipt envelope and delegates persistence.
4. `src/services/verify/server/persistenceServerHandler.ts` uses `SUPABASE_SERVICE_ROLE_KEY` to SELECT by `verification_id`, INSERT into `public.public_verification_records`, and re-read on a unique-key race.
5. `src/services/verify/publicVerificationService.ts` resolves a public QR receipt through the browser anon-key client in `src/lib/supabase.ts`, using `SELECT *` on `public_verification_records`.
6. Both the Vercel and Vite legacy `/api/verify/persist` routes return HTTP 410 and do not write to the database.

### Permission match

| Call site | Role | Database operation | Live permission / RLS result | Assessment |
|---|---|---|---|---|
| Public QR receipt resolution | anon | SELECT receipt by ID | SELECT grant and unconditional anon/authenticated SELECT policy | Works by design; projection is too broad (`*`) |
| Trusted receipt persistence | service_role | SELECT + INSERT receipt | Both grants exist; service_role bypasses RLS | Matches current implementation |
| Legacy client persistence | none | none | Endpoint returns 410 | Blocked as intended |
| Verify run endpoint | service process | No direct table call except delegated receipt persistence | Uses service-role receipt handler | Database write authority stays server-side |

The live `public_verification_records` policy is SELECT-only and applies to anon/authenticated with `USING (true)`. The server's service-role persistence path does not depend on a client INSERT policy.

## 3. Broader Verify-table access review

The 14-table Verify/supporting scope is documented in `schema-baseline/verify-access-review.json`. Source inspection found the current UI/server receipt lifecycle directly uses only `public_verification_records`. No direct Verify call sites were found for `documents`, `verification_runs`, the plagiarism tables, tenant mapping, audit logs, billing tables or service/price catalog tables in the inspected production UI/server path.

Most Verify tables have RLS enabled, but only seven Verify/supporting policies were found. Many other tables have no row policies. The live catalog also reports broad anon/authenticated table grants on most of these tables, including `TRUNCATE` and `TRIGGER`.

**Important:** RLS does not protect `TRUNCATE`. The grant is therefore a high-priority least-privilege gap. This catalog finding alone does not prove an anonymous caller can reach TRUNCATE through PostgREST. No direct SQL or RPC exploitability test was run. The exposed RPC inventory, SQL execution surfaces and schema API exposure must be mapped before remediation.

Do not blanket-revoke privileges. Several tables are shared with institution, identity and billing workflows, and the current sprint is Verify-only.

## 4. Additional application risks

- The public receipt resolver uses `SELECT *`. Replace with a fixed public receipt projection or server-shaped DTO so future columns do not silently enter the public response.
- `api/verify/run.ts` contains no user-authentication check. It uses an in-memory rate limiter of eight requests per minute per IP. Static inspection does not establish effective rate limiting under Vercel serverless concurrency.
- `pipelineAudit.ts` calls the shared persistence service, but that service rejects browser execution and requires server environment credentials. This is not the normal UI persistence route.
- `audit_logs` has no Verify-specific write call site in the inspected path. The live privilege check showed service_role SELECT but not INSERT. Do not assume receipt persistence is audit logged.

## 5. HOEOS evidence status

| Evidence class | Status | What is established |
|---|---|---|
| Static | PASS | Relevant source files and current call-site operations inspected |
| Structural | PASS | Live schemas, grants, policies, RLS flags and service-role privileges catalogued |
| Runtime | NOT RUN | No HTTP authorization probes or deployed Verify persistence run in this inventory |
| Certification | NOT CLAIMED | Runtime behavior and TRUNCATE reachability remain unverified |

## 6. Recommended next work, still without production changes

1. Trace all exposed public RPCs and their SQL bodies for paths that can invoke privileged DDL/DML or dynamic SQL.
2. Confirm PostgREST exposed schemas and whether any direct SQL execution surface is enabled.
3. Replace public `SELECT *` with a fixed receipt projection and test the receipt contract.
4. Design a narrow permission diff for the Verify-owned tables only, with shared-table owner sign-off before any grant or policy change.
5. Add runtime tests for anon receipt SELECT, anon receipt INSERT denial, authenticated receipt INSERT denial, service-role receipt INSERT, and the intended public result fields.
6. Decide whether `/api/verify/run` is an intentionally anonymous demo endpoint or requires authenticated commercial access, then test durable rate limiting.

**No migrations, DDL, grants, policies, application code or production data were changed during this inventory.**
