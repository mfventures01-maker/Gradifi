# Identity and Enrollment Database Forensic Audit

**Audit date:** 2026-11-06  
**Repository branch:** `cbt/commercial-e2e-final`  
**Database project:** `ehkmfnaqkdgkjmdxxbwj`  
**Method:** Read-only PostgreSQL catalog, function, policy, grant, constraint, trigger, index and consistency queries.  
**Mutation status:** NONE. No DDL, DML, migration, Auth user creation/deletion, function execution, or deployment was performed.

## Executive result

**Database contract status: NOT READY FOR EDGE FUNCTION IMPLEMENTATION.**

The live schema supports the intended core identity relationships, but the forensic pass found material blockers that must be handled before implementation:

1. Existing teacher and student rows reuse the same Auth user as the school's principal, and neither has its matching `identity_actors` row.
2. One existing teacher assignment crosses school boundaries; its assignment-level `school_id` is NULL.
3. The student-number sequence for the populated school is inconsistent with its student records and the allocator has an initial-value defect.
4. The assignment table has no foreign key from `teacher_subject_assignments.class_subject_id` to `class_subjects.id`.
5. Relevant tables have RLS enabled but most have no policies; broad table privileges remain granted to anon/authenticated. Current RLS blocks ordinary row access where no policy exists, but this must not be mistaken for a safe provisioning design.
6. Legacy PIN and onboarding SECURITY DEFINER functions are executable by PUBLIC/anon/authenticated, lack pinned search paths, and contain schema/authority defects.
7. The current school principal invariant must be preserved: an active school must have exactly one active principal membership.

These findings mean the database contract document must be revised before a migration is drafted. They are not instructions to repair live data directly.

## 1. Scope and evidence inventory

Inspected:
- `schools`, `classes`, `class_subjects`
- `teachers`, `teacher_subject_assignments`, `students`
- `profiles`, `identity_actors`, `gradifi_school_memberships`
- `student_number_sequences`, `system_activity_logs`
- Related constraints, indexes, triggers, RLS policies, table grants and selected RPC definitions.

The live migration history includes the school principal lifecycle and membership lock-order migrations, the older bulk-student and PIN migrations, and the CBT hardening migrations through `20261106012632_cbt_get_exam_status_owner_authorization_hotfix`. No identity-provisioning migration is present in the live migration list.

## 2. Canonical Auth relationships

Confirmed FK targets:
- `profiles.user_id → auth.users.id`
- `identity_actors.auth_user_id → auth.users.id`
- `gradifi_school_memberships.user_id → auth.users.id`
- `teachers.user_id → auth.users.id`
- `students.user_id → auth.users.id`

All inspected FK constraints were validated.

### Existing data inconsistencies

Read-only reconciliation counts returned:

| Check | Count |
|---|---:|
| Teacher rows with missing Auth user | 0 |
| Student rows with non-null missing Auth user | 0 |
| Profiles with missing Auth user | 0 |
| Identity actors with missing Auth user | 0 |
| Identity actors without a matching profile | 0 |
| Teachers without a matching `identity_actors` record | 1 |
| Students with non-null user but without matching `identity_actors` record | 1 |
| Teacher assignments without a class-subject record | 0 |
| Teacher assignments without a teacher record | 0 |
| Cross-school teacher assignments | 1 |

The unmatched teacher and student both reference the same Auth user that is already used by the active school's `principal_admin` profile and `principal_admin` identity actor. That Auth user therefore has three distinct domain identities attached to it: principal profile/actor, teacher row, and student row.

**Decision:** Do not automatically backfill identity actors for these rows. First determine whether these are test fixtures, legacy imports, or genuine people. The one-Auth-user/one-canonical-identity constraint must be enforced for new provisioning, and existing collisions need a separately approved data-reconciliation plan.

## 3. Teacher assignment integrity

The live `teacher_subject_assignments` table has:
- FK `teacher_id → teachers.id`
- FK `school_id → schools.id`
- NOT NULL `class_subject_id`
- UNIQUE `(teacher_id, class_subject_id)`

It does **not** have an FK from `class_subject_id` to `class_subjects.id`.

The consistency query found one cross-school assignment. The row has a teacher whose school differs from the linked class-subject school, and the assignment's own `school_id` is NULL.

**Required migration design:**
- Reconcile the anomalous row before adding constraints.
- Add the missing FK only after confirming no orphan references exist.
- Enforce school consistency with a composite FK or a transaction-level validation/trigger that checks teacher, assignment and class-subject school IDs together.
- Make `teacher_subject_assignments.school_id` NOT NULL only after existing rows have been reconciled and all write paths populate it.
- The RPC must validate every submitted class-subject ID against the authorized school, not trust a browser-provided class/subject pair.

## 4. Student-number allocator

The current function `public.generate_student_number(uuid)` is SECURITY DEFINER, has no pinned `search_path`, and is executable by PUBLIC, anon, authenticated and service_role.

Its sequence upsert currently inserts a new sequence row with `last_number = 0`, returning that value for the first generated number. Only the conflict/update path increments the value. This allows the first generated identifier to end in `00000`.

The populated school currently has:
- 12 student rows.
- Sequence prefix `MIC`, `last_number = 0`.
- Student numbers include `MIC-2026-00000`, multiple `STM-...` and `VIC-...` values, a non-standard `stu 0012`, and a free-text value.
- 11 of the 12 student numbers do not match the current sequence prefix/format check.

This is not a safe basis for new commercial student enrollment.

**Required migration design:**
1. Preserve existing student numbers; do not rewrite them automatically.
2. Reconcile the authoritative school prefix with the existing school identity and numbering policy.
3. Initialize the sequence from a verified numeric high-water mark, not simply the row count.
4. Change first allocation to start at the correct next value and keep allocation atomic under concurrent calls.
5. Add a unique constraint scoped to the intended student-number identity domain if the current global uniqueness model is not the desired product contract.
6. Revoke direct client execution of the old allocator after all callers are migrated.
7. Test first insert, conflict increment, concurrent allocation and rollback behavior.

The present sequence table's primary key is `school_id`; it is suitable for one sequence per school, but current stored values require reconciliation.

## 5. RLS, policies and table grants

RLS is enabled on every inspected table. Policy coverage is incomplete:

| Table | RLS | Policies |
|---|---:|---:|
| `schools` | On | 0 |
| `classes` | On | 0 |
| `class_subjects` | On | 0 |
| `teachers` | On | 0 |
| `teacher_subject_assignments` | On | 0 |
| `students` | On | 0 |
| `identity_actors` | On | 0 |
| `student_number_sequences` | On | 0 |
| `system_activity_logs` | On | 0 |
| `profiles` | On | 2 |
| `gradifi_school_memberships` | On | 2 |

The two profile policies are own-profile SELECT and UPDATE. The two membership policies permit own-membership reads and school-admin reads.

Catalog privilege checks show anon and authenticated table privileges such as SELECT/INSERT/UPDATE on several of the RLS-enabled tables, including schools, classes, class-subjects, teachers, students, identity actors and system activity logs. With no applicable RLS policy, those privileges do not by themselves grant ordinary row access; however, the grants are broader than the intended authority model and increase the importance of correct policies and RPC boundaries.

**Required migration/security work:**
- Define the school-scoped SELECT policies required by the repaired teacher/student onboarding screens.
- Keep identity credential hashes and internal actor metadata unavailable to ordinary browser roles.
- Keep audit writes server-side.
- Revoke unnecessary anon/authenticated table privileges, then grant only the minimum required by the intended RLS design.
- Test both anon and authenticated roles, including cross-school reads and writes.
- Do not treat service_role bypass as a substitute for validating the caller in the Edge Function.

## 6. School activation and principal authority

Live school status values are:
- `active`: 1 school.
- `unprovisioned`: 4 schools.

The active school has exactly one active principal membership. All four unprovisioned schools have zero active memberships/principals.

The database has:
- A deferred constraint trigger on `schools` and `gradifi_school_memberships`.
- `gradifi_assert_school_principal_invariant(uuid)`, which requires exactly one active principal when a school is active.
- A partial unique index allowing at most one active principal per school.
- A provisioning-status guard preventing ordinary non-Postgres callers from activating a school directly.
- `has_active_school_role(uuid,text[])`, which checks the authenticated user's active membership and role.

These controls must remain intact. New teacher/student creation must not mutate school provisioning status or principal membership. The gateway's authority check should use the authenticated principal/school-admin membership policy already represented by `has_active_school_role`, with the exact allowed role set explicitly chosen and tested.

## 7. Role constraints and role mapping

Current checks:
- `profiles.role`: `principal_admin`, `teacher`, `student`, `examiner`, `individual`.
- `gradifi_school_memberships.member_role`: `school_admin`, `principal`, `teacher`, `exam_officer`.
- `identity_actors.actor_type`: includes `principal_admin`, `vice_principal`, `bursar`, `teacher`, `student`, plus platform/parent types.

The three tables intentionally or historically use different vocabularies. Do not blindly add VP/Bursar to the membership CHECK. The provisioning contract needs an explicit mapping:
- Principal/admin authority is membership-based.
- Teacher is a school membership role and an identity actor type.
- Student is a domain identity and identity actor type; do not automatically create a staff membership for students.
- VP/Bursar require an explicit decision on whether they are membership-bearing staff roles or are represented by a separate actor/authority mapping. Their actor types exist, but profile and membership constraints do not currently permit them.

The existing principal invariant is compatible with creating teacher records without touching principal membership.

## 8. Audit contract

`system_activity_logs` columns are:
- `id`, `institution_id`, `school_id`, `profile_id`
- required `action_type`, required `resource_type`
- optional `resource_id`, `ip_address`, `user_agent`, `device_info`
- `created_at`

The legacy bulk enrollment function attempts to insert columns named `action` and `details`, which do not exist in this table. That legacy audit insert is incompatible with the live schema.

New provisioning audit events must use `action_type` and `resource_type`; use the real profile ID for `profile_id` when appropriate; and never include plaintext PINs, hashes, magic-link token hashes, or other credentials in audit metadata.

## 9. Legacy SECURITY DEFINER RPC findings

The following legacy functions are SECURITY DEFINER and have no pinned `search_path`; their ACLs include PUBLIC/anon/authenticated/service_role:
- `auth_pin_login(text,text)`
- `bulk_enroll_students(jsonb,uuid,uuid)`
- both `create_teacher` overloads
- `enroll_student(uuid,date,text,text,text,text)`
- `generate_student_number(uuid)`
- `reset_user_pin(uuid,uuid)`
- `set_pin(uuid,text,boolean)`

Confirmed defects:
- `auth_pin_login` references `profiles.email` and `teachers.staff_id`, neither of which exists in the live schema. It uses `LIMIT 1` without ambiguity handling and authenticates against `profiles` rather than canonical `identity_actors`.
- `bulk_enroll_students` uses `RANDOM()` for PINs, stores `profiles.user_id = student.id` instead of an Auth user ID, returns plaintext PINs, and writes non-existent `system_activity_logs.action/details` columns.
- `create_teacher(text,text,text,uuid,uuid)` inserts a teacher without the required `teachers.user_id`; it does not create an Auth identity.
- The other `create_teacher` overload accepts caller-supplied principal identity, writes to a legacy `sub_accounts` path and attempts a teacher insert without the required Auth user ID.
- `enroll_student` accepts a class UUID and optional caller-supplied student number without school-authority validation and does not provision a real Auth identity.
- `set_pin` trusts a caller-supplied user ID and updates the legacy profile hash only.
- `reset_user_pin` trusts caller-supplied `p_reset_by`, uses `RANDOM()`, returns the plaintext reset PIN and updates the profile hash only.

**Required action:** Before the Edge Function goes live, revoke PUBLIC/anon/authenticated execution from these unsafe legacy functions after dependency/call-site audit and a controlled cutover plan. Do not drop them until all callers and dependencies have been traced. The new internal transaction RPC must have a pinned search path, schema-qualified references and service_role-only execution.

## 10. PIN-state contract

`profiles.pin_requires_change` exists and is nullable. `identity_actors.pin_requires_change` does not exist. The one existing principal profile has `pin_requires_change = false`; its identity actor currently has no corresponding flag.

The migration must add the canonical flag to `identity_actors`, backfill only after actor/profile mapping is resolved, set a non-null default for newly provisioned PIN actors, and keep the profile value synchronized during the compatibility period. Do not infer the value for mismatched legacy actor rows.

The legacy `profiles.pin` plaintext column and unique index still exist. The new gateway must never write plaintext PINs there. Removal or deprecation of this legacy field is a separate reviewed migration after all legacy consumers are identified.

## 11. Required blockers before migration implementation

| Priority | Blocker | Required evidence/action |
|---|---|---|
| P0 | Existing Auth identity collision | Reconcile the principal/teacher/student records sharing one Auth UID; no automatic repair |
| P0 | Cross-school assignment | Identify intended school and class-subject relationship; repair only under approved data plan |
| P0 | RLS and grants | Build exact access matrix and least-privilege policy/grant plan |
| P0 | Legacy SECURITY DEFINER RPCs | Dependency audit, cutover plan, revoke public client execution |
| P0 | Student-number sequence | Decide canonical prefix, inspect all existing IDs, repair high-water mark safely |
| P1 | Missing assignment FK | Add FK and school-scope invariant after data cleanup |
| P1 | PIN change flag | Add canonical identity actor field and controlled backfill |
| P1 | Audit schema mismatch | Use actual system_activity_logs columns |
| P1 | Staff role mapping | Decide profile/membership/identity mapping for VP and Bursar |
| P1 | Onboarding read policies | Provide school-scoped class and class-subject reads for authorized school users |

## 12. Contract decisions supported by this audit

1. Use `identity_actors` as the canonical credential/actor lookup table.
2. Use real Auth users and the verified Auth foreign keys for all new teacher/student provisioning.
3. One Auth user must map to one canonical actor identity; reject collisions.
4. Derive institution from the authoritative school row.
5. Teacher assignments must reference actual `class_subjects.id` and be school-consistent.
6. Student numbers must be allocated by a corrected, concurrency-safe server-side sequence.
7. Keep school activation and principal membership lifecycle separate from staff/student provisioning.
8. Use the live `system_activity_logs` schema for audit.
9. Treat legacy SECURITY DEFINER functions as unsafe and unavailable to the new frontend flow.
10. Do not create the Edge Function until the migration and authorization design have addressed the P0 items.

## 13. Explicit non-actions

- No SQL writes were run.
- No RLS policy, grant, constraint, index, trigger or function was changed.
- No legacy rows were repaired or deleted.
- No Auth users were created, modified or removed.
- No migration was applied.
- No Edge Function was implemented or deployed.

**Disposition:** Forensic inspection of the identity/enrollment database contract is complete for the scoped tables and functions above. The live database is **not certified for provisioning**. The next authorized engineering artifact should be a reviewed, additive migration proposal plus a data-reconciliation plan, not an Edge Function.
