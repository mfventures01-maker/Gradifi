# Identity and Enrollment Database Contract

**Status:** Contract baseline finalized from a read-only inspection of the live Supabase schema on 2026-11-06.  
**Scope:** Teacher creation, individual student enrollment, bulk student enrollment, and the shared identity provisioning gateway.  
**Deployment status:** Documentation only. No production schema or data was changed.

## 1. Authority and request model

The browser submits intent only. The server is authoritative for:

- Auth user creation and Auth user ID.
- School and institution relationship.
- Actor type and school authority.
- Staff login identifier and student number allocation.
- Temporary PIN generation and hashing.
- Class and class-subject validation.
- Profile, actor and domain-record linkage.
- Idempotency, audit and row-level outcomes.

The gateway accepts these operations:

| Operation | Actor | Input |
|---|---|---|
| `create` | `teacher` | Full name, optional email/phone, zero or more real `class_subjects.id` values |
| `create` | `student` | First/last name, existing school class UUID, gender, optional date of birth |
| `bulk_students` | `student` rows | Row ID, first/last name, gender, optional date of birth, class name |

The caller must not supply `institution_id`, generated actor IDs, Auth IDs, student numbers, staff IDs, PINs or PIN hashes as authority-bearing values. The server derives institution from the selected `schools` record and validates the caller's active authority for that school.

## 2. Live schema facts verified

Read-only catalog inspection confirmed the following live columns and constraints:

| Table | Relevant live columns / constraints |
|---|---|
| `schools` | `id uuid PK`, `institution_id uuid nullable`, `provisioning_status text NOT NULL DEFAULT 'unprovisioned'` |
| `classes` | `id uuid PK`, `school_id uuid NOT NULL FK schools.id`, `name text NOT NULL` |
| `class_subjects` | `id uuid PK`, `school_id uuid NOT NULL FK schools.id`, `class_id uuid nullable FK classes.id`, `subject_id uuid nullable FK subject_catalog.id` |
| `teachers` | `id uuid PK`, `user_id uuid NOT NULL`, `school_id uuid nullable FK schools.id`, `institution_id uuid nullable`, `name text NOT NULL`, email/phone nullable |
| `teacher_subject_assignments` | `id uuid PK`, `teacher_id uuid nullable FK teachers.id`, `class_subject_id uuid NOT NULL`, `school_id uuid nullable FK schools.id` |
| `students` | `id uuid PK`, `user_id uuid nullable`, `class_id uuid nullable FK classes.id`, `school_id uuid nullable`, `institution_id uuid nullable`, first/last name NOT NULL, `student_number` nullable |
| `profiles` | `id uuid PK`, `user_id uuid nullable`, `institution_id`, `school_id`, `full_name`, `role`, `pin_hash`, `pin_requires_change boolean DEFAULT false` |
| `identity_actors` | `id uuid PK`, `auth_user_id uuid NOT NULL`, `institution_id uuid NOT NULL`, `school_id uuid nullable`, `actor_type`, `actor_record_id uuid nullable`, unique non-null `login_identifier`, `pin_hash` |
| `gradifi_school_memberships` | `school_id uuid NOT NULL FK schools.id`, `user_id uuid NOT NULL`, `member_role text NOT NULL`, status defaults to invited |
| `student_number_sequences` | `school_id uuid PK/FK schools.id`, `last_number integer DEFAULT 0`, `prefix text nullable` |

Additional catalog inspection confirmed:
- `profiles.role` currently has a CHECK constraint that does not include `vice_principal` or `bursar`.
- `gradifi_school_memberships.member_role` currently has a CHECK constraint that does not include `vice_principal` or `bursar`.
- `identity_actors.actor_type` already permits `vice_principal`, `bursar`, `teacher` and `student`.
- `class_subjects` has FKs to `classes`, `schools` and `subject_catalog`.
- `teachers.user_id` is NOT NULL. `students.user_id` is nullable in the present schema.
- The inspected schema does not expose a direct FK from `teachers.user_id`, `students.user_id`, `profiles.user_id`, `identity_actors.auth_user_id`, or `gradifi_school_memberships.user_id` to `auth.users.id`. The gateway must still verify Auth IDs through Supabase Auth Admin and use the intended FK/trigger model after migration review.

## 3. Canonical identity invariant

Every successful teacher or student provisioning must leave these linked records:

1. One real `auth.users` user.
2. One `profiles` row linked to that Auth user, with the existing role vocabulary respected.
3. One `identity_actors` row linked to the same Auth user and school/institution, with unique login identifier and PIN hash.
4. One domain record in `teachers` or `students`, linked to the same Auth user.
5. For teachers, zero or more `teacher_subject_assignments` rows referencing actual `class_subjects.id` values belonging to the same school.
6. For students, one real `classes.id` belonging to the same school and a server-generated student number.
7. An audit event containing actor, school, operation, outcome and correlation/request ID, but never a plaintext PIN.

The actor record ID in `identity_actors.actor_record_id` must identify the corresponding `teachers.id` or `students.id`.

## 4. PIN and credential rules

- Staff temporary PIN: six numeric digits.
- Student temporary PIN: four numeric digits.
- The browser never generates a PIN or hash.
- Store only a server-generated salted password hash in the canonical identity record.
- Do not write plaintext to `profiles.pin`.
- Add `identity_actors.pin_requires_change boolean NOT NULL DEFAULT true` in the additive migration. This becomes the canonical first-login flag.
- Keep `profiles.pin_requires_change` as a compatibility mirror during transition; both values must be updated in the same database transaction. Do not allow either field to independently override the canonical actor flag.
- Return plaintext temporary PIN only in the initial successful provisioning response. Do not persist it or replay it on idempotent retry.
- Student login identifier remains the generated student number. Staff login identifier is generated from the authoritative school code and a locked per-school/per-role sequence.

## 5. School authority and tenant checks

Before provisioning, the server must:

1. Validate the bearer JWT and resolve the caller through Supabase Auth.
2. Load the target `schools` row by UUID.
3. Derive `institution_id` from `schools.institution_id`; reject a missing or inconsistent relationship.
4. Verify the school is in an allowed provisioning state. The exact allowed `provisioning_status` values must be read from the existing application workflow and DB constraints before migration implementation.
5. Verify the caller has an active, authorized school relationship and a permitted role for this operation.
6. Never trust a client-supplied principal ID, institution ID, role, staff ID, student number, or class label as proof of authority.

For each teacher assignment, resolve the submitted `class_subjects.id` and verify its `school_id` matches the authorized school. Also verify its `class_id` belongs to that school and its subject reference is valid.

For each student, resolve the class by UUID for single enrollment or by a normalized exact class name within the authorized school for bulk enrollment. Reject ambiguous class-name matches; do not silently choose one.

## 6. Transaction and idempotency design

The Edge Function creates the Auth user using the Admin API, then calls one restricted database transaction RPC. Auth Admin and PostgreSQL cannot share one atomic transaction. Therefore:

- The database RPC must be atomic for all Postgres records for a single row.
- If the database RPC fails after Auth user creation, the Edge Function must delete only the Auth user created by that invocation.
- If compensation fails, record a reconciliation incident without claiming success.
- Bulk processing returns one independently verified result per submitted row. A failed row must not be represented as successful.
- Bulk row processing may be per-row transactional so one invalid row does not erase unrelated successful rows. The response must report exact committed successes and failures.

Idempotency:
- Require a client-generated UUID `request_id` and bind it to the authenticated requester and operation.
- Persist a unique idempotency key for each request/row in a dedicated ledger or an equivalent reviewed schema.
- Persist only non-secret result metadata and identifiers, never plaintext PINs or token hashes.
- On replay, return a non-secret already-processed outcome; never return the original temporary PIN again.
- Reject reuse of a request ID with a different payload hash.

## 7. Required additive schema work before Edge Function implementation

The following migration work is required but has NOT been applied:

1. Add `identity_actors.pin_requires_change` with a safe backfill from `profiles.pin_requires_change`.
2. Define the idempotency ledger with unique requester/operation/request/row keys and payload hash.
3. Define or correct explicit Auth-user linkage constraints after auditing existing orphan rows and trigger behavior.
4. Confirm whether the existing role CHECK constraints need additive values or whether the canonical role-to-membership mapping intentionally keeps VP/Bursar outside `gradifi_school_memberships`. Do not expand role checks until the authorization helpers and RLS policies have been reviewed.
5. Confirm the `system_activity_logs` insert contract and required fields for provisioning audit events.
6. Review and harden the existing student-number sequence allocator for concurrency. Use the existing `student_number_sequences` table; do not introduce a second sequence mechanism.
7. Add a staff identifier sequence keyed by school and staff actor type, with row locking/atomic increment.
8. Ensure the internal provisioning RPC is executable only by `service_role`, uses `SECURITY DEFINER` only where required, pins `search_path`, schema-qualifies relations, and validates every foreign key/tenant boundary.

## 8. Required transaction RPC contract

The Edge Function should call a private/internal RPC with a narrowly scoped payload containing only server-verified values:

- operation/actor type;
- authoritative school and institution IDs;
- Auth user ID created by the current invocation;
- normalized actor name and optional contact fields;
- validated class UUID or validated class-subject UUID list;
- server-generated login identifier;
- server-generated PIN hash;
- request/idempotency identifiers;
- server-generated audit metadata.

The RPC must create the domain row, profile row, identity actor row, assignments/membership mapping where applicable, sequence consumption and audit record atomically. It must return generated database IDs and non-secret metadata. The Edge Function adds the one-time plaintext PIN to the response only after the database transaction commits.

## 9. Explicit non-goals and safety constraints

- Do not deploy an Edge Function until this contract's schema prerequisites and authorization mapping are implemented and tested.
- Do not apply a production migration as part of frontend work.
- Do not revive `create_teacher`, `enroll_student` or `bulk_enroll_students` as fallback paths.
- Do not create fake classes, fake subject IDs, synthetic student numbers, or fabricated success responses.
- Do not claim that a browser response proves a DB transaction unless the returned IDs can be read back and reconciled.
- Keep the separate G0 security gate open until the relevant RLS, grants, SECURITY DEFINER functions and tenant authorization paths are certified.

## 10. Evidence still required before migration approval

- Full CHECK/UNIQUE/FK/trigger/index inventory for the affected tables and their referenced Auth relationships.
- RLS policy and helper-function review for profile, actor, membership, teacher, student and audit tables.
- Existing orphan/mismatch counts across Auth IDs, profile IDs, actor IDs and domain record IDs.
- Exact school provisioning status lifecycle and allowed values.
- Existing student-number allocator function body and concurrency behavior.
- Existing staff ID format/sequence requirements and school-code source.
- Existing onboarding UI callers and TypeScript compatibility checks after migration to the gateway.

**Decision:** This document fixes the target contract. It does not certify that the live schema already satisfies it. The schema migration and Edge Function remain blocked until the evidence in section 10 is collected and the additive migration is reviewed.
