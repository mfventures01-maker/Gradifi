# Dashboard Restoration and Authentication Review

Date: 2026-11-16

## Scope

This change restores the missing public landing route and school administration dashboard, and introduces a separate higher-institution Rector/Dean dashboard surface. It does not merge or deploy the branch, change database schema, or modify the existing school onboarding wizard or its contract.

## Deleted-component recovery

The deleted implementations were inspected from Git history at commit `4a86942`:

- `src/features/home/HomePage.tsx`
- `src/features/dashboard/DashboardLayout.tsx`

The school dashboard implementation was restored from that historical version and adapted to accept an explicit `institutionId` and `initialTab`.

The public landing page was reimplemented as a smaller, current landing surface rather than restoring its original demo-login behaviour. Its sign-in actions now route into the guarded dashboard.

## Current identity contract evidence

The generated live database types define `identity_actors.auth_user_id`, `actor_type`, `institution_id`, `school_id`, and `status`. Identity resolution now queries the active actor by `auth_user_id = auth.users.id`. The profile lookup remains scoped by `profiles.user_id`.

School dashboard routing requires an active actor, institution scope, and school scope. Higher-institution routing is separate and currently recognises `dean` and `rector` actor types. The deployed higher-institution bootstrap evidence establishes `dean`; a live Rector bootstrap/actor contract has not been independently verified.

## PIN authentication blocker

The repository's `supabase/functions/pin-login/index.ts` was inspected. It currently assigns `linkData.properties.action_link` to `access_token` and falls back to fabricated `jwt_...` and `ref_...` values. An action URL is not a Supabase access token, and fabricated strings are not a refresh token.

The frontend no longer accepts synthetic tokens or falls back to direct RPC data as if it were a Supabase session. It requires the Edge Function to return a real access/refresh token pair and verifies that `supabase.auth.setSession` establishes a user session. Consequently, PIN sign-in will fail closed until the Edge Function is redesigned to issue a genuine Supabase session. Email/password sign-in remains available through Supabase Auth.

Do not repair this by returning an action URL as a JWT, fabricating tokens, trusting client-supplied actor IDs, or weakening RLS.

## Higher-institution dashboard boundary

The new Rector/Dean dashboard displays only the authenticated profile name, actor type, and institution ID resolved from the active actor record. It deliberately does not call school-campus APIs or display fabricated counts. Faculty, department, programme, lecturer and student operations remain pending verified higher-ed data contracts and permissions.

## Build and type validation

A GitHub Actions workflow was added to run `npm run build` and `npm run lint` as separate steps. The repository has no package lock file, so CI uses `npm install`.

The workflow is present on this feature branch. A successful CI run has not yet been observed. Prior local baseline checks reported TypeScript errors in unrelated legacy files; those checks must be rerun against this branch. No production build, runtime authentication, or end-to-end certification is claimed by this report.

## Files changed

- `src/features/home/HomePage.tsx`
- `src/features/dashboard/DashboardLayout.tsx`
- `src/features/higher-ed/RectorDeanDashboard.tsx`
- `src/App.tsx`
- `src/services/authService.ts`
- `src/components/AuthGuard.tsx`
- `package.json`
- `.github/workflows/dashboard-restoration-verification.yml`

## Explicitly not done

- No merge to the WP0 baseline branch or main.
- No deployment.
- No Supabase migrations or production data writes.
- No change to the existing school onboarding wizard or school onboarding contract.
