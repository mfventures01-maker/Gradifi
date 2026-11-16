# WP0: Rector onboarding repository and contract baseline

**Inspection date:** 2026-11-16  
**Repository:** `mfventures01-maker/Gradifi`  
**Baseline:** `main` at `f5d0efa1b55cff79a0c996f09f72d4f68a681b7e`  
**Supabase project:** `ehkmfnaqkdgkjmdxxbwj` (read-only inspection)  
**Scope:** repository entry point, onboarding modules, handwritten/generated TypeScript contracts, live public schema and RPC signatures.

## Status

- [x] Resolve the App.tsx wizard import mismatch.
- [x] Identify the actual wizard and the current school-centric journey.
- [x] Identify the live higher-institution bootstrap and actor RPC contracts.
- [x] Compare TypeScript database contracts against live Supabase objects.
- [x] Produce the field-to-column-to-RPC mapping.
- [ ] Run a clean CI/build verification on this branch.
- [ ] Approve and implement a canonical higher-institution contract beyond this baseline.

This report is an inspection artifact, not a production certification. No Supabase writes, migrations, function deployments, merges or releases were performed.

## 1. Frontend entry point

### Finding

`src/App.tsx` imported:

```ts
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
```

The repository tree contains no `src/features/onboarding/OnboardingWizard.tsx`. The actual exported component is:

```ts
src/pages/onboarding/OnboardingWizard.tsx
export const OnboardingWizard
```

### Change made

Updated the import to:

```ts
import { OnboardingWizard } from './pages/onboarding/OnboardingWizard';
```

There is now one resolvable wizard import in `App.tsx`. The app still exposes two distinct entry experiences: `CreateInstitution` at `?view=create-institution` and the 14-step wizard at `?view=onboarding`. They are not equivalent flows and must not be represented as one certified onboarding path.

## 2. Active wizard and journey classification

The active 14-step component is `src/pages/onboarding/OnboardingWizard.tsx`, imported by `App.tsx` after this patch.

The declared step contract is `src/contracts/onboarding.ts`. It describes a school setup journey:

1. Welcome
2. Institution information
3. Administrator profile
4. Authentication
5. Create school
6. School identity and branding
7. Academic structure (JSS 1 to SS 3)
8. Confirm classes
9. Subjects (WAEC/NECO/JAMB)
10. Teachers
11. Students
12. Parent access
13. CBT and AI grading
14. Review and launch

The wizard has hard-coded school/principal demo defaults and assumes school, class, class-subject, teacher and student records. It is not a Rector/higher-institution wizard.

## 3. Canonical backend contracts observed

### 3.1 Higher-institution root bootstrap

The live database contains:

`public.bootstrap_higher_institution`

Arguments:

| Argument | Type |
|---|---|
| p_auth_user_id | uuid |
| p_institution_name | text |
| p_institution_type | text |
| p_registration_number | text |
| p_country | text |
| p_address | text |
| p_phone | text |
| p_website | text |
| p_dean_name | text |
| p_dean_email | text |
| p_dean_phone | text |

Return: `jsonb`.

The deployed `actor-onboarding` Edge Function invokes this RPC for action `bootstrap_higher_institution`. It derives the Auth UID from the verified bearer session, requires the supplied Dean email to match the verified Auth email, rejects an already-provisioned root identity, and then invokes the RPC using service-role credentials.

The RPC validates the higher-institution type against `university`, `polytechnic`, and `college_of_education`. It provisions an institution, a root campus record in `schools`, a `profiles` row with role `dean`, an `identity_actors` row with actor type `dean`, an `institution_onboarding` row and a free subscription row.

**Correction to the preliminary inspection:** `bootstrap_higher_institution` DOES exist in the live public schema. The earlier missing-RPC conclusion was incorrect. The remaining risk is that the browser's school-centric code and handwritten contracts do not represent this live higher-institution contract.

### 3.2 School root bootstrap

The live database also contains `public.bootstrap_school_institution`, invoked by the same Edge Function for `bootstrap_school_institution`. It provisions a principal-admin root identity and is distinct from the higher-institution root path.

### 3.3 Actor provisioning

The live database contains `public.complete_actor_onboarding`, returning `jsonb`. It accepts 25 parameters covering identity, authority, actor type, school/institution scope, student/parent relationships, faculty/department linkage and lecturer attributes.

The Edge Function creates an Auth user, then calls this RPC with the new Auth UID and the caller's authority UID. It removes the newly created Auth user if provisioning fails.

The RPC permits:
- `principal_admin` authority: vice principal, bursar, teacher, student, parent.
- `dean` authority: student, HOD, adviser, lecturer.

The RPC currently requires a non-null `p_school_id` for lecturer as well as school actors. Its lecturer record is inserted into `public.lecturers` with `school_id`, despite also accepting faculty and department IDs. This is a higher-institution modelling gap to resolve in a later work package, not a reason to change this live function during WP0.

## 4. Field-to-column-to-RPC mapping

### 4.1 Higher-institution registration

| UI/domain field | Edge Function request field | RPC argument | Live destination |
|---|---|---|---|
| Institution name | institution_name | p_institution_name | institutions.name |
| Institution type | institution_type | p_institution_type | institutions.type, institution_category |
| Registration number | registration_number | p_registration_number | institutions.registration_number |
| Country | country | p_country | institutions.country |
| Address | address | p_address | institutions.address; schools.address/campus_address |
| Phone | phone | p_phone | institutions.phone; schools.phone/campus_phone |
| Website | website | p_website | institutions.website_url |
| Dean full name | dean_name | p_dean_name | profiles.full_name |
| Dean email | dean_email | p_dean_email | profiles.email; identity_actors.login_identifier |
| Dean phone | dean_phone | p_dean_phone | profiles.phone |

The verified Auth identity is sourced from the bearer token by the Edge Function and passed as `p_auth_user_id`; the browser must not choose this value.

Bootstrap also creates:
- `schools` root campus with `school_type='tertiary'` and `provisioning_status='unprovisioned'`.
- `profiles.role='dean'`.
- `identity_actors.actor_type='dean'`.
- `institution_onboarding` initial state.
- `tenant_subscriptions` free active record.

### 4.2 Actor provisioning

| UI/domain field | Edge Function request field | RPC argument | Live destination |
|---|---|---|---|
| Auth user | Server-created Auth user | p_auth_user_id | profiles.user_id; identity_actors.auth_user_id |
| Authority | Derived from caller profile | p_authority_user_id | profiles.authority_user_id; identity_actors.authority_user_id |
| Authority role | Derived from caller profile | p_expected_authority_role | Validated against profiles.role |
| Actor role | actor_type | p_actor_type | profiles.role; identity_actors.actor_type |
| Institution | institution_id / caller profile | p_institution_id | profiles.institution_id; identity_actors.institution_id |
| Campus/school | school_id, role-dependent | p_school_id | profiles.school_id; identity_actors.school_id |
| Full name | full_name | p_full_name | profiles.full_name and actor-specific record |
| Initial PIN | Generated server-side | p_pin | bcrypt hashes in profiles.pin_hash and identity_actors.pin_hash |
| Email / phone | email / phone | p_email / p_phone | profiles and actor-specific record |
| Student record | student_id, class_id, gender, date_of_birth | p_student_id / p_class_id / p_gender / p_date_of_birth | students / parent relationship records |
| Faculty / department | faculty_id / department_id | p_faculty_id / p_department_id | nuc_faculties / nuc_departments validation; faculty/lecturers records |
| Lecturer details | title / rank / specialization / supervisor flags | p_title / p_rank / p_specialization / p_is_graduate_student_supervisor / p_max_students | lecturers |

### 4.3 School onboarding legacy contract

The existing browser service calls `create_institution_account` using argument names such as `name`, `type`, `country`, `institution_name`, `p_name` and others.

The live function signature is instead:

`_institution_name, _institution_type, _registration_number, _school_type, _country, _address, _state, _lga, _phone, _email, _website, _principal_name, _principal_phone, _principal_email`.

The current service therefore does not match the live function signature. It also falls back to a direct `institutions` insert, which is not equivalent to the atomic RPC and must not be used as a success fallback.

## 5. Generated TypeScript database contract drift

Files inspected:
- `src/types/database.types.ts`
- `src/contracts/rpcSignatures.ts`
- `src/contracts/rpc.ts`
- `src/contracts/schema.ts`
- `src/lib/supabase.ts`

Confirmed drift:

1. `database.types.ts` describes a legacy `identity_actors` shape with `user_id`, `profile_id`, `role`, but the live table uses `auth_user_id`, `actor_type`, `actor_record_id`, `login_identifier`, `auth_method`, `pin_hash`, `authority_user_id`.
2. Generated `profiles.role` is restricted to `admin | principal | teacher | student | parent`; live role data and RPC authority logic include `principal_admin`, `dean`, `hod`, `adviser`, `lecturer`, `vice_principal`, and `bursar`.
3. Generated `institutions` omits live columns including registration number, address, phone, website URL, state, LGA and institution category.
4. Generated `schools` omits live fields including `slug` and `provisioning_status`, and its school type union does not include the live tertiary campus value.
5. The generated file does not define the live higher-ed academic tables `faculties`, `departments`, `programs`, `nuc_faculties`, `nuc_departments`, or the live `lecturers` contract.
6. `rpcSignatures.ts` defines the legacy `create_institution_account` signature as optional mixed aliases. It does not include `bootstrap_higher_institution`, `bootstrap_school_institution`, or `complete_actor_onboarding`.
7. `src/lib/supabase.ts` constructs `SupabaseClient<any>`, so the imported `Database` generic is not enforcing compile-time schema contracts.

The current `database.types.ts` is therefore not a trustworthy generated representation of the live project. It should be regenerated from the correct project/schema, then reviewed and reconciled with intentional application-level RPC result types. Do not hand-edit it to guess the live schema.

## 6. Canonical contract decision for subsequent work

For the Rector/higher-institution flow, use these existing live boundaries as the source of truth:

1. Root registration: `actor-onboarding` Edge Function action `bootstrap_higher_institution`.
2. Root identity: Supabase Auth verified user, not a browser-supplied UID.
3. Root authority: `profiles.role='dean'` plus `identity_actors.actor_type='dean'`.
4. Actor creation: `actor-onboarding` action with `complete_actor_onboarding`.
5. Academic hierarchy: live `institutions`, `faculties`, `departments`, `programs`, plus the separate NUC structures. Canonical relationship and ownership constraints still require a dedicated mapping decision.
6. Legacy school wizard: keep isolated from the higher-institution path. Do not overload its school/principal contract to represent a Rector/Dean.

## 7. WP0 exit assessment

| Exit condition | Result |
|---|---|
| One verified frontend wizard import | **PASS** after App.tsx import repair |
| Actual wizard identified | **PASS** |
| Existing institution/actor backend contract identified | **PASS** |
| TypeScript generated contract matches live schema | **FAIL** |
| One canonical Rector frontend contract exists | **FAIL** |
| Field-to-column-to-RPC mapping produced | **PASS** |
| Build/CI on repair branch | **NOT RUN** |

WP0 is partially complete. The import mismatch is repaired and the baseline mapping is documented. The overall WP0 exit gate remains **BLOCKED** until database types are regenerated and the higher-institution frontend contract is defined and verified.

## 8. Safety and scope

This branch contains only the import repair and this baseline report. No production database mutation, migration, Edge Function deployment, merge or release was performed.
