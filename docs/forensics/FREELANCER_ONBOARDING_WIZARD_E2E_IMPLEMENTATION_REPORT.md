# FREELANCER_ONBOARDING_WIZARD_E2E_IMPLEMENTATION_REPORT

**HOEOS work package:** FREELANCER-01A / UI + trusted provisioning  \
**Repository:** `mfventures01-maker/Gradifi`  \
**Target Supabase project:** `ehkmfnaqkdgkjmdxxbwj`  \
**Implementation branch:** `feat/freelancer-onboarding-wizard-e2e-2026-11-22`  \
**PR:** [#38](https://github.com/mfventures01-maker/Gradifi/pull/38)  \
**Base integration commit:** `e360587c96a3df4f70638e7ab962750596675caf`  \
**Production migration:** `20261126062517_individual_bootstrap_workspace_and_truncate_privilege_fix`  \
**Verdict:** `DATABASE_REPAIR_APPLIED_FRONTEND_CI_AND_LIVE_SIGNUP_PENDING`

---

## 1. Scope

Build the independent/freelancer registration experience inside Gradifi's existing onboarding entrypoint. Preserve institutional onboarding routes. Provision a complete individual identity and personal workspace through one trusted database RPC transaction. Remove authenticated TRUNCATE access from the profiles and verification evidence tables.

## 2. Live Supabase contract and repair

Target project: `ehkmfnaqkdgkjmdxxbwj` (ACTIVE_HEALTHY).

### `public.bootstrap_public_individual(text,text)`

The production function now:

- Derives the user identity exclusively from `auth.uid()`.
- Locks the confirmed `auth.users` row to serialize concurrent confirmation callbacks for the same user.
- Requires a confirmed email and validates the four supported individual account categories.
- Creates or validates the individual profile and identity actor.
- Calls the existing trusted `public.ensure_personal_workspace()` function.
- Verifies an active personal workspace owner membership with role `owner` and source `workspace_owner`.
- Ensures the matching active `individual_accounts` row exists.
- Returns `workspace_id`, `membership_id` and `individual_account_id` alongside the existing identity fields.
- Remains idempotent for the same existing individual identity and rejects partial or conflicting identities.
- Runs all of the above in the single Postgres RPC transaction. Any exception rolls back the identity and workspace writes together.

The browser still sends only `p_full_name` and `p_account_type`. It cannot submit an Auth UID, workspace owner, membership role, institution or school scope.

### TRUNCATE privilege correction

Migration `20261126062517_individual_bootstrap_workspace_and_truncate_privilege_fix` revokes only the `TRUNCATE` privilege from `authenticated` on:

- `public.profiles`
- `public.verification_runs`

The migration asserts both privileges are absent before commit. Existing `service_role` and owner privileges are preserved.

Post-migration live query results:

| Check | Result |
|---|---|
| authenticated TRUNCATE on profiles | `false` |
| authenticated TRUNCATE on verification_runs | `false` |
| service_role TRUNCATE on profiles | `true` |
| service_role TRUNCATE on verification_runs | `true` |
| anon EXECUTE on bootstrap RPC | `false` |
| authenticated EXECUTE on bootstrap RPC | `true` |
| service_role EXECUTE on bootstrap RPC | `true` |

No destructive TRUNCATE statement was executed.

## 3. Existing workspace foundation reused

The repair reuses the already-deployed `ensure_personal_workspace()` function and the existing workspace INSERT trigger that creates `individual_accounts`. It does not add a parallel workspace model, direct browser writes, or duplicate account tables.

The workspace function creates or returns the caller's individual workspace and ensures the active owner membership. The bootstrap RPC verifies the membership and account projections before returning success.

## 4. Frontend contract changes

- `src/services/individualOnboardingService.ts` now requires and validates `workspace_id`, `membership_id` and `individual_account_id` in addition to profile and actor IDs.
- The service continues to send only the two supported RPC arguments.
- The onboarding success path is accepted only when the complete database provisioning response matches the authenticated user and selected account category.
- Institutional onboarding paths remain unchanged.

## 5. Browser contract coverage

File: `e2e/freelancer-onboarding.spec.ts`

The successful mocked onboarding response now includes the workspace, membership and individual account identifiers. The existing tests continue to cover:
1. Freelancer entry routing.
2. Three-step signup and the exact two-argument RPC request.
3. No provisioning before email confirmation.
4. Password mismatch rejection before Supabase Auth.

These Playwright tests use deterministic HTTP stubs. They are not a live Supabase signup test.

## 6. HOEOS evidence classification

| Class | Status | Evidence |
|---|---|---|
| A. STATIC | PASS | Live schema, function definitions, workspace trigger, grants and migration history inspected. |
| B. STRUCTURAL | PASS | Production migration applied; post-migration ACL/function execution query confirms the intended security boundary and bootstrap contract. |
| C. RUNTIME | PENDING | Real confirmed signup, RPC transaction and individual dashboard journey not yet executed. PR CI results for this update are pending. |
| D. CERTIFICATION | BLOCKED / PENDING | Requires successful PR CI and a real staging signup-confirmation-bootstrap-dashboard run. |

## 7. Explicit boundaries

- No Edge Function deployment.
- No payment, pricing, order or credit gate changes.
- No browser-side inserts into identity, workspace, account or membership tables.
- No production test user was created by this migration.
- No claim of live signup or verification runtime certification.
- Existing institutional onboarding logic and workspace membership projection were not rewritten.

## 8. Acceptance conditions still outstanding

- PR typecheck and production build pass.
- Updated freelancer Playwright contract tests pass.
- Existing school and higher-education onboarding entrypoint tests remain green.
- A real confirmed individual signup returns profile, actor, workspace, active owner membership and individual account IDs.
- Dashboard session resolution succeeds for that real user.

The database privilege correction is applied and verified. The database bootstrap contract is deployed and statically verified. Runtime onboarding certification remains pending.
