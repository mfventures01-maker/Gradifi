# WP0 live database type regeneration and higher-institution contract

Date: 2026-11-16

## Source of truth

Generated TypeScript from the linked live Supabase project:
- Project ref: `ehkmfnaqkdgkjmdxxbwj`
- Project URL: `https://ehkmfnaqkdgkjmdxxbwj.supabase.co`
- Generated PostgREST version: `14.1`
- Output committed to `src/types/database.types.ts`
- Generated schema output: 240,499 characters before the repository provenance header.

This was read-only schema introspection. No migration, table write, RPC invocation, deployment, or Supabase branch creation was performed.

## Comparison: generated live RPCs vs handwritten `rpcSignatures.ts`

| RPC | Live generated signature | Handwritten extension | Finding |
|---|---|---|---|
| `bootstrap_higher_institution` | Present; all 11 `p_*` args required; returns `Json` | Missing | No typed higher-ed bootstrap in handwritten extension |
| `bootstrap_school_institution` | Present; all 13 `p_*` args required; returns `Json` | Missing | Existing school RPC is not represented in handwritten extension |
| `complete_actor_onboarding` | Present; 25 named args; `p_school_id` is required; returns `Json` | Missing | Actor provisioning signature was absent |
| `create_institution_account` | Uses 14 required underscore-prefixed args: `_institution_name`, `_institution_type`, `_registration_number`, `_school_type`, `_country`, `_address`, `_state`, `_lga`, `_phone`, `_email`, `_website`, `_principal_name`, `_principal_phone`, `_principal_email` | Uses optional aliases such as `name`, `type`, `country`, `institution_name`, `p_name`, `p_type` | Material mismatch. Existing handwritten Args do not match the live RPC contract. |

The generated live schema also confirms:
- `institutions` includes registration number, address, state, LGA, phone, website URL and institution category.
- `profiles.role` is a database `string`, not the narrow legacy union in the former handwritten database types.
- `identity_actors` uses `auth_user_id`, `actor_type`, `actor_record_id`, `login_identifier`, `auth_method`, and authority fields, not the former `user_id/profile_id/role` shape.
- `schools` includes `provisioning_status`, `slug`, `url_slug`, campus address/phone and a nullable `school_type`.

## Canonical higher-institution contract

Added `src/contracts/higherInstitutionOnboarding.ts` as the single typed browser-to-Edge-Function contract for higher-institution onboarding.

It defines:
- `HigherInstitutionBootstrapRequest`: action and payload accepted by `actor-onboarding`.
- `BootstrapHigherInstitutionRpcArgs`: exact generated live RPC args, including the server-derived Auth UID.
- `HigherInstitutionBootstrapResult`: successful bootstrap response.
- `HigherInstitutionActorOnboardingRequest`: Dean-managed higher-ed actor payload.
- `CompleteActorOnboardingRpcArgs`: exact generated actor RPC args.
- Higher-ed actor and institution type unions.

The browser request intentionally excludes `p_auth_user_id`. The Edge Function derives it from the verified Auth session and requires the Dean email to match the verified Auth email.

## School onboarding preservation

No school onboarding request/interface, school wizard, `bootstrap_school_institution` RPC, or existing school onboarding implementation was edited. The generated database types now expose the live school RPC signature alongside the higher-ed RPCs, but the new higher-institution contract is separate and does not replace the school contract.

## Known constraint retained visibly

The live generated `complete_actor_onboarding` signature requires `p_school_id`, and the deployed Edge Function requires a campus for lecturers. That is a real higher-ed modelling constraint. This contract documents it rather than silently making the database argument optional or inventing a different RPC.

## Verification status

- Live project identity: confirmed by the Supabase project ref used for generation.
- Database type regeneration: completed and committed.
- Handwritten RPC comparison: completed; mismatches documented above.
- Canonical higher-institution contract: added.
- Existing school onboarding contract: untouched by these changes.
- Build/typecheck: not yet run.
- Runtime Edge Function test: not run.
- Production data/schema: unchanged.
- Merge/deploy: not performed.
