# FREELANCER_ONBOARDING_WIZARD_E2E_IMPLEMENTATION_REPORT

**HOEOS work package:** FREELANCER-01A / UI implementation  
**Repository:** `mfventures01-maker/Gradifi`  
**Target Supabase project:** `ehkmfnaqkdgkjmdxxbwj`  
**Implementation branch:** `feat/freelancer-onboarding-wizard-e2e-2026-11-22`  
**PR:** [#38](https://github.com/mfventures01-maker/Gradifi/pull/38)  
**Base integration commit:** `e360587c96a3df4f70638e7ab962750596675caf`  
**Current implementation commit at report creation:** `6e113204050f7a8760f197b8ab130e9769e4883c`  
**Verdict:** `IMPLEMENTED_PENDING_RUNTIME`

---

## 1. Scope

Build the independent/freelancer registration experience inside Gradifi's existing onboarding entrypoint. Preserve the institutional onboarding routes and use the currently deployed Supabase identity contract. No payment functionality is introduced.

## 2. Live Supabase contract inspected

Read-only inspection of the live project established:

### `public.profiles`
- `user_id` references `auth.users(id)` and is unique.
- `role` permits `individual`.
- `account_type` exists and permits `freelancer`, `independent_student`, `independent_professional`, and `other_individual` for individual profiles.
- `institution_id` and `school_id` are nullable.
- Authenticated profile reads and updates are self-scoped; the profile authority guard protects role, account category and authority fields.

### `public.identity_actors`
- `auth_user_id` is required, unique and references `auth.users(id)`.
- `actor_type` permits `individual`.
- `institution_id`, `school_id`, and `authority_user_id` are nullable.
- Individual scope requires no institution, school or authority and `auth_method='email'`.
- Authenticated users can select their own actor row. Actor creation is performed by trusted database code.

### `public.bootstrap_public_individual(text,text)`
- Arguments are exactly `p_full_name` and `p_account_type`.
- The function derives identity from `auth.uid()`; it accepts no client-supplied Auth UID, role, actor type, institution or school ID.
- It requires an email-confirmed Auth user and validates the four supported account categories.
- It creates the individual profile and identity actor and returns `success`, `user_id`, `profile_id`, `actor_id`, `role`, `account_type`, `institution_id` and `school_id`.
- It is executable by authenticated users, not anon.

### Workspace boundary
The live project also contains `workspaces`, `workspace_members`, and `individual_accounts`. Authenticated clients have SELECT privileges only on these workspace/account tables. The deployed `bootstrap_public_individual` function does not create a workspace or workspace membership. This implementation deliberately does not attempt direct browser INSERTs or claim that a workspace is provisioned.

If the freelancer MVP requires a workspace at registration time, a trusted server-side provisioning contract and migration are still required.

## 3. Implemented frontend changes

- `src/pages/onboarding/OnboardingWizard.tsx`: added the public `?view=individual` branch to the existing shared onboarding wizard; the institutional and higher-education paths remain separate and unchanged.
- `src/pages/onboarding/IndividualRegistration.tsx`: replaced the single-screen form with a three-step wizard:
  1. Account category, defaulting to Freelancer.
  2. Full name and email.
  3. Password confirmation and registration review.
- Email confirmation is required before the database bootstrap call is made.
- Pending recovery metadata contains only full name, email and account category. The password is never persisted in local storage.
- Confirmation return can recover the registration details from the Auth user's metadata when local browser storage is unavailable.
- An in-flight/completed user guard prevents duplicate bootstrap calls from the page's session hydration and auth-state listener.
- Successful provisioning is accepted only when the RPC response matches the authenticated user, selected account type, individual role and null institution/school scope.
- `src/services/individualOnboardingService.ts`: centralizes the exact RPC contract.
- `src/pages/onboarding/OnboardingStart.tsx`: routes the freelancer/independent-user card into `/onboarding?view=individual`.
- `src/types/database.types.ts`: aligns the relevant profile and actor types and declares the bootstrap RPC contract.
- `.github/workflows/gradifi-primary-g0-g12.yml`: adds the new freelancer browser spec to G11.

## 4. E2E coverage added

File: `e2e/freelancer-onboarding.spec.ts`

1. Verify the onboarding-start freelancer card routes into the shared wizard.
2. Complete the three-step freelancer wizard, verify the exact RPC payload, then verify the individual dashboard renders.
3. Verify that an email-confirmation-required signup does not call the identity bootstrap RPC prematurely.
4. Verify mismatched passwords are rejected before calling Supabase Auth.

These tests use deterministic HTTP stubs at the Supabase Auth and PostgREST boundaries. They are browser-level frontend/contract E2E tests, not a live production database execution.

## 5. HOEOS evidence classification

| Class | Status | Evidence |
|---|---|---|
| A. STATIC | PASS | Live schema metadata, constraints, grants, RLS policies, trigger definitions and deployed RPC definition inspected. |
| B. STRUCTURAL | PASS | Frontend sends only the two supported RPC arguments and validates the returned identity/scope contract. |
| C. RUNTIME | PENDING | PR CI browser, typecheck and production build results have not yet been observed. |
| D. CERTIFICATION | BLOCKED / PENDING | Requires successful CI plus a separate live staging Supabase signup-confirmation-bootstrap-dashboard run. |

## 6. Explicit exclusions

- No production DDL, DML, migration application or policy changes.
- No Edge Function deployment.
- No payment, pricing, order or credit gate.
- No browser-side inserts into identity, workspace, account or membership tables.
- No claim that the freelancer workspace is provisioned.
- No claim of live Supabase E2E certification.

## 7. Acceptance conditions

The UI work package may be accepted when:
- TypeScript typecheck passes.
- Production build passes.
- All three new Playwright browser contract tests pass.
- Existing school and higher-education onboarding entrypoint tests remain green.
- A separate staging run confirms email confirmation, live bootstrap RPC, profile/actor persistence and dashboard identity resolution.

The commercial onboarding work package must additionally close the trusted workspace provisioning gap before it claims that a freelancer workspace is ready for billing or credit-backed verification.
