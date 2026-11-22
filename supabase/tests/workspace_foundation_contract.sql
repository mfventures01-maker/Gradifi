-- HOEOS F1 workspace foundation contract checks.
-- Run after applying the universal workspace foundation migration in a test/staging database.
-- Read-only assertions: this script does not create or mutate application rows.

do $workspace_contract$
declare
  v_count bigint;
begin
  if to_regclass('public.workspaces') is null then
    raise exception 'F1_FAIL_WORKSPACES_TABLE_MISSING';
  end if;
  if to_regclass('public.workspace_members') is null then
    raise exception 'F1_FAIL_WORKSPACE_MEMBERS_TABLE_MISSING';
  end if;
  if to_regprocedure('public.ensure_personal_workspace()') is null then
    raise exception 'F1_FAIL_PERSONAL_WORKSPACE_RPC_MISSING';
  end if;
  if to_regprocedure('public.is_current_user_active_workspace_member(uuid)') is null then
    raise exception 'F1_FAIL_WORKSPACE_AUTHORIZATION_FUNCTION_MISSING';
  end if;
  if not has_function_privilege('authenticated', 'public.ensure_personal_workspace()', 'EXECUTE') then
    raise exception 'F1_FAIL_AUTHENTICATED_CANNOT_EXECUTE_PERSONAL_WORKSPACE_RPC';
  end if;
  if has_function_privilege('anon', 'public.ensure_personal_workspace()', 'EXECUTE') then
    raise exception 'F1_FAIL_ANON_CAN_EXECUTE_PERSONAL_WORKSPACE_RPC';
  end if;
  if has_table_privilege('authenticated', 'public.workspaces', 'INSERT')
     or has_table_privilege('authenticated', 'public.workspaces', 'UPDATE')
     or has_table_privilege('authenticated', 'public.workspace_members', 'INSERT')
     or has_table_privilege('authenticated', 'public.workspace_members', 'UPDATE')
     or has_table_privilege('authenticated', 'public.workspace_members', 'DELETE') then
    raise exception 'F1_FAIL_DIRECT_CLIENT_WORKSPACE_MUTATION_GRANT';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspaces' and policyname='workspaces_select_active_member') then
    raise exception 'F1_FAIL_WORKSPACE_SELECT_POLICY_MISSING';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspace_members' and policyname='workspace_members_select_self') then
    raise exception 'F1_FAIL_WORKSPACE_MEMBER_SELF_POLICY_MISSING';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='verification_runs' and policyname='verification_runs_insert_workspace_member_creator') then
    raise exception 'F1_FAIL_VERIFICATION_RUN_INSERT_POLICY_MISSING';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='verify_document_uploads' and policyname='verify_uploads_workspace_member_or_owner_read') then
    raise exception 'F1_FAIL_UPLOAD_WORKSPACE_READ_POLICY_MISSING';
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='verify_private_objects_workspace_member_or_owner_read') then
    raise exception 'F1_FAIL_PRIVATE_STORAGE_WORKSPACE_POLICY_MISSING';
  end if;
  if exists (select 1 from public.institutions i left join public.workspaces w on w.workspace_type='institution' and w.institution_id=i.id where w.id is null) then
    raise exception 'F1_FAIL_INSTITUTION_WORKSPACE_BACKFILL';
  end if;
  if exists (select 1 from public.institution_memberships im join public.workspaces w on w.workspace_type='institution' and w.institution_id=im.institution_id left join public.workspace_members wm on wm.workspace_id=w.id and wm.user_id=im.user_id and wm.source_institution_membership_id=im.id where wm.id is null or wm.status is distinct from im.status or wm.role is distinct from im.role) then
    raise exception 'F1_FAIL_INSTITUTION_MEMBERSHIP_PROJECTION';
  end if;
  if exists (select 1 from public.verification_runs where workspace_id is null) then
    raise exception 'F1_FAIL_VERIFICATION_RUN_WITHOUT_WORKSPACE';
  end if;
  if exists (select 1 from public.verify_document_uploads where workspace_id is null) then
    raise exception 'F1_FAIL_UPLOAD_WITHOUT_WORKSPACE';
  end if;
  if exists (select 1 from public.verification_runs vr join public.workspaces w on w.id=vr.workspace_id where (w.workspace_type='institution' and vr.institution_id is distinct from w.institution_id) or (w.workspace_type='individual' and vr.institution_id is not null)) then
    raise exception 'F1_FAIL_VERIFICATION_RUN_WORKSPACE_SCOPE_MISMATCH';
  end if;
  if exists (select 1 from public.verify_document_uploads u join public.workspaces w on w.id=u.workspace_id where (w.workspace_type='institution' and u.institution_id is distinct from w.institution_id) or (w.workspace_type='individual' and u.institution_id is not null)) then
    raise exception 'F1_FAIL_UPLOAD_WORKSPACE_SCOPE_MISMATCH';
  end if;
  select count(*) into v_count from public.workspaces where workspace_type='individual';
  raise notice 'F1_WORKSPACE_CONTRACT_PASS: personal_workspaces=%', v_count;
end;
$workspace_contract$;
