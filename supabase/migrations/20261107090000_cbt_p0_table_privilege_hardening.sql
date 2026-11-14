-- CBT P0-01: remove direct client writes and dangerous table privileges.
--
-- This migration intentionally fails closed when its schema prerequisites are
-- absent. The target branch currently lacks several production-applied CBT
-- migrations that create these relations and persist_cbt_session_snapshot().
-- Reconcile that migration lineage before attempting to apply this migration.
--
-- Scope: anon/authenticated table ACLs only. service_role grants and table
-- ownership are deliberately untouched. RLS policies remain the row boundary
-- for the SELECT privileges restored below.

do $preflight$
begin
  if to_regprocedure('public.persist_cbt_session_snapshot(uuid,integer,integer)') is null then
    raise exception
      'CBT P0-01 prerequisite missing: public.persist_cbt_session_snapshot(uuid,integer,integer). Reconcile CBT migration lineage before applying.';
  end if;

  if to_regclass('public.cbt_sessions') is null
     or to_regclass('public.cbt_session_snapshots') is null
     or to_regclass('public.gradifi_exam_question_map') is null
     or to_regclass('public.gradifi_exam_question_snapshots') is null
     or to_regclass('public.gradifi_question_bank_answer_keys') is null
     or to_regclass('public.gradifi_question_bank_items') is null
     or to_regclass('public.gradifi_question_bank_options') is null
     or to_regclass('public.gradifi_question_bank_versions') is null
     or to_regclass('public.cbt_public_candidate_profiles') is null
     or to_regclass('public.cbt_public_offers') is null
     or to_regclass('public.cbt_public_orders') is null
     or to_regclass('public.cbt_public_entitlements') is null then
    raise exception
      'CBT P0-01 prerequisite relations are missing. Reconcile CBT migration lineage before applying.';
  end if;
end;
$preflight$;

-- Remove stale direct-write policies. The corresponding table privileges are
-- also revoked below, so a policy alone can never restore write access.
drop policy if exists cbt_sessions_student_insert on public.cbt_sessions;
drop policy if exists cbt_sessions_student_update on public.cbt_sessions;
drop policy if exists cbt_snapshots_student_insert on public.cbt_session_snapshots;

-- Protected session state: authenticated users retain policy-filtered reads,
-- while all direct table writes and structural privileges are removed.
revoke all privileges on table public.cbt_sessions
  from public, anon, authenticated;
revoke all privileges on table public.cbt_session_snapshots
  from public, anon, authenticated;
grant select on table public.cbt_sessions,
  public.cbt_session_snapshots to authenticated;

-- Question-to-exam mappings, immutable exam snapshots, and answer keys are
-- accessed only through the authorized server-side RPC paths.
revoke all privileges on table public.gradifi_exam_question_map
  from public, anon, authenticated;
revoke all privileges on table public.gradifi_exam_question_snapshots
  from public, anon, authenticated;
revoke all privileges on table public.gradifi_question_bank_answer_keys
  from public, anon, authenticated;

-- Published question-bank content remains readable under its existing RLS
-- policies. Client-side INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER are
-- removed; authoring continues through the existing RPC boundary.
revoke all privileges on table public.gradifi_question_bank_items
  from public, anon, authenticated;
revoke all privileges on table public.gradifi_question_bank_options
  from public, anon, authenticated;
revoke all privileges on table public.gradifi_question_bank_versions
  from public, anon, authenticated;
grant select on table public.gradifi_question_bank_items,
  public.gradifi_question_bank_options,
  public.gradifi_question_bank_versions to anon, authenticated;

-- Commercial CBT tables are created by the branch's CBT commercial-core
-- migration. Restore only the SELECT grants explicitly required by its
-- existing owner/listed-row policies.
revoke all privileges on table public.cbt_public_candidate_profiles
  from public, anon, authenticated;
revoke all privileges on table public.cbt_public_offers
  from public, anon, authenticated;
revoke all privileges on table public.cbt_public_orders
  from public, anon, authenticated;
revoke all privileges on table public.cbt_public_entitlements
  from public, anon, authenticated;

grant select on table public.cbt_public_candidate_profiles,
  public.cbt_public_orders,
  public.cbt_public_entitlements to authenticated;
grant select on table public.cbt_public_offers to anon, authenticated;
