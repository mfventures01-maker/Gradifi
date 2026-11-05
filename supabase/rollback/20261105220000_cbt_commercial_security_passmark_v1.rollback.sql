-- CBT-02 controlled rollback.
-- Preconditions:
--   1. Roll back the frontend to a version that no longer calls
--      persist_cbt_session_snapshot.
--   2. Confirm no deployed client depends on the RPC.
--
-- This rollback deliberately retains the security hardening. It does NOT
-- restore direct client writes or execution of the obsolete start_cbt_exam_v2.
-- It also retains percentage pass-mark semantics because reverting to raw marks
-- would make authoring, publishing and result calculation inconsistent again.

begin;

drop function if exists public.persist_cbt_session_snapshot(uuid,integer,integer);

revoke insert, update, delete on public.cbt_sessions from anon, authenticated;
revoke insert, update, delete on public.cbt_session_snapshots from anon, authenticated;
revoke all on function public.start_cbt_exam_v2(uuid,uuid) from public, anon, authenticated, service_role;

commit;

-- The publication function remains percentage-based by design.
-- Commercial tables, orders, entitlements and payment records are not dropped.
-- Do not execute a blanket grant or schema rollback that reopens the old
-- client-side write paths.
