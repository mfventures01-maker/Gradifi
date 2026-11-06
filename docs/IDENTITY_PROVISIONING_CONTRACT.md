# Gradifi Identity Provisioning Contract v1

Status: frontend contract committed; backend implementation pending validation.
Scope: principal-led creation of vice principals, bursars, teachers and students; PIN login; PIN changes and resets.

## Authority boundary

The browser submits user intent and form data only. The backend derives institution scope from the authenticated principal's active identity and membership. It must not trust client-supplied institution IDs, role grants, actor IDs, profile IDs, Auth user IDs, login identifiers, PINs, or permission claims.

The provisioning Edge Function must:
1. Require a valid Supabase access token and resolve it with `auth.getUser(token)`.
2. Confirm the caller has an active `principal_admin` identity and active principal membership for the target school.
3. Resolve the school's institution ID from `public.schools`.
4. Validate the requested actor type and all school-scoped references.
5. Generate credentials server-side using a cryptographically secure random source.
6. Create the Auth user with Auth Admin, then call one service-role-only database transaction RPC.
7. If the database transaction fails, delete only the Auth user created by this request.
8. Return credentials once. Never persist plaintext PINs, log them, or return them on idempotent replay.

## Provisioning endpoint

Function: `provision-identity`

JWT verification: enabled. Function must independently validate the bearer token.

### Create one identity

Request discriminator: `operation: "create"`

Required common fields:
- `request_id`: caller-generated UUID idempotency key
- `actor_type`: `vice_principal | bursar | teacher | student`
- `school_id`: target school UUID
- `full_name`: display name
- `email?`, `phone?`: optional contact data; neither is a login credential

Teacher-specific:
- `teacher.class_subject_ids?`: IDs must belong to the same school.

Student-specific:
- `student.class_id`: must belong to the target school.
- `student.first_name`, `student.last_name`, `student.gender`, `student.date_of_birth?`.

The server must reject missing role-specific data and unexpected role-specific payloads.

### Create many students

Request discriminator: `operation: "bulk_students"`

Required:
- `request_id`: UUID idempotency key for the batch
- `school_id`
- `students[]`: each row has a stable `row_id`, names, gender, optional date of birth and class name.

The server resolves every class name against the target school. Each row reports its own success/failure. Batch success is true only when every row succeeds. Partial success must be represented with exact counts and per-row outcomes, never collapsed into an all-success response.

## Credential rules

| Actor | Login identifier | Initial PIN |
|---|---|---|
| Vice Principal | Generated `VP-<SCHOOLCODE>-<SEQUENCE>` | Six digits |
| Bursar | Generated `BUR-<SCHOOLCODE>-<SEQUENCE>` | Six digits |
| Teacher | Generated `TCH-<SCHOOLCODE>-<SEQUENCE>` | Six digits |
| Student | Existing authoritative student-number format | Four digits |

School code is derived from the authoritative school record, normalized server-side, and must not be supplied by the client. Sequence allocation must be atomic and unique per school and actor type. Staff phone and email remain optional.

Temporary PINs are generated with a cryptographically secure random generator, hashed server-side with an approved password-hashing/KDF implementation, and marked for mandatory change on first successful login. The API returns a temporary PIN only in the first successful response to the request. It must not return plaintext credentials on retries or replay.

## Provisioning response

Single-create success:
- `success: true`
- `request_id`
- `credential.actor_type`
- `credential.actor_id`
- `credential.profile_id`
- `credential.auth_user_id`
- `credential.login_identifier`
- `credential.temporary_pin`
- `credential.requires_pin_change: true`

Bulk response:
- `success` true only when all rows succeeded
- `request_id`
- `total_submitted`, `success_count`, `failed_count`
- `results[]` with `row_id`, `success`, optional credential, and stable error code/message.

## PIN authentication

Function: `pin-login`

Request:
- `identifier`: staff ID or student number
- `pin`: exactly six digits for staff or four digits for students

Server behavior:
1. Normalize identifier and resolve exactly one active `identity_actors` record.
2. Reject ambiguous, suspended, disabled, locked, missing, or malformed identities with a generic credential error.
3. Verify the stored PIN hash server-side; atomically increment failures and apply lockout.
4. On success, reset failure counters and create a short-lived, one-time Supabase Auth magic-link token for that Auth user.
5. Return only the token hash, token type `magiclink`, expiry and first-login PIN-change flag. Do not return a fabricated JWT or refresh token.

The frontend exchanges the one-time token hash through `supabase.auth.verifyOtp({ token_hash, type: "magiclink" })`. The resulting session must be a real Supabase Auth session.

## PIN change and reset

- `change-pin` requires a valid authenticated Supabase session; target user ID is derived from `auth.uid()`, never accepted from the browser.
- Staff PINs must be six digits; student PINs must be four digits.
- A successful change updates the canonical identity hash, synchronizes any explicitly retained compatibility field, clears `pin_requires_change`, and writes an audit event.
- `reset-pin` requires an authenticated principal with active school authority for the target identity. The reset PIN is generated and returned once; the account is marked for mandatory change. A caller-supplied `reset_by` value is not trusted.

## Database transaction contract

Only the Edge Function service-role client may invoke the internal transaction RPC. The RPC must:
- use `SECURITY DEFINER` with a pinned, minimal `search_path` and schema-qualified references;
- verify requester/school/institution linkage independently of browser input;
- atomically create profile, role-specific actor record, identity actor, membership and audit record;
- use actual live columns: `system_activity_logs.action_type`, `resource_type`, `resource_id`;
- satisfy existing deferred school-principal invariant;
- store only PIN hashes in canonical identity storage;
- validate class and class-subject references against the same school;
- enforce unique login identifiers and idempotency;
- revoke execution from `PUBLIC`, `anon`, and `authenticated`, granting only `service_role`.

## Stable error envelope

All errors use:
```ts
{
  success: false,
  error: {
    code: string,
    message: string,
    retryable: boolean
  }
}
```

Never convert an RPC, network, Auth, validation, or database error into a successful-looking ID, PIN, user, session, or enrollment result.

## Known live-schema compatibility requirements

- `profiles.role` currently excludes `vice_principal` and `bursar`.
- `gradifi_school_memberships.member_role` currently excludes `vice_principal` and `bursar`.
- `identity_actors.actor_type` already permits both roles.
- `teachers.user_id` is NOT NULL.
- `students.user_id` is nullable.
- `profiles` has no `email` column in the inspected live schema.
- Audit columns are `action_type` and `resource_type`, not `action` and `details`.
- RLS is enabled on all inspected identity/actor tables.

These are blockers for backend implementation until the additive migration resolves the role constraints and the transaction function is validated against the live schema.

## Rollout order

1. Contract and type checks.
2. Additive migration draft and static SQL validation.
3. Database transaction RPC and permission review.
4. Edge Function implementation and local tests.
5. Frontend onboarding/auth migration to this contract.
6. TypeScript, unit, Playwright, and live runtime certification.
7. Only then request approval for live migration and Edge Function deployment.
