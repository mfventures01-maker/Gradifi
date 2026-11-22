create or replace function private.assert_individual_billing_workspace_owner()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_workspace public.workspaces%rowtype;
begin
  select * into v_workspace from public.workspaces where id=new.workspace_id;
  if not found then raise exception 'INDIVIDUAL_BILLING_WORKSPACE_NOT_FOUND'; end if;
  if v_workspace.workspace_type<>'individual' or v_workspace.owner_user_id is distinct from new.owner_user_id then
    raise exception 'INDIVIDUAL_BILLING_WORKSPACE_OWNER_MISMATCH';
  end if;
  return new;
end;
$$;
revoke all on function private.assert_individual_billing_workspace_owner() from public,anon,authenticated;

drop trigger if exists individual_accounts_workspace_owner_guard on public.individual_accounts;
create trigger individual_accounts_workspace_owner_guard before insert or update of workspace_id,owner_user_id
on public.individual_accounts for each row execute function private.assert_individual_billing_workspace_owner();
drop trigger if exists individual_orders_workspace_owner_guard on public.individual_orders;
create trigger individual_orders_workspace_owner_guard before insert or update of workspace_id,owner_user_id
on public.individual_orders for each row execute function private.assert_individual_billing_workspace_owner();
drop trigger if exists individual_payments_workspace_owner_guard on public.individual_payments;
create trigger individual_payments_workspace_owner_guard before insert or update of workspace_id,owner_user_id
on public.individual_payments for each row execute function private.assert_individual_billing_workspace_owner();
drop trigger if exists individual_entitlements_workspace_owner_guard on public.individual_entitlements;
create trigger individual_entitlements_workspace_owner_guard before insert or update of workspace_id,owner_user_id
on public.individual_entitlements for each row execute function private.assert_individual_billing_workspace_owner();
drop trigger if exists credit_ledger_workspace_owner_guard on public.credit_ledger;
create trigger credit_ledger_workspace_owner_guard before insert or update of workspace_id,owner_user_id
on public.credit_ledger for each row execute function private.assert_individual_billing_workspace_owner();

create or replace function private.append_correction_version(
  p_session_id uuid,p_actor_user_id uuid,p_content_snapshot jsonb,p_content_hash text,
  p_change_summary text default null,p_version_kind text default 'correction'
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_session public.correction_sessions%rowtype;
  v_next_version integer;
  v_version_id uuid;
begin
  if p_session_id is null or p_actor_user_id is null or p_content_snapshot is null
     or p_content_hash !~ '^[a-fA-F0-9]{32,128}$' or p_version_kind not in ('original','correction') then
    raise exception 'CORRECTION_VERSION_INVALID_INPUT';
  end if;
  select * into v_session from public.correction_sessions where id=p_session_id for update;
  if not found then raise exception 'CORRECTION_SESSION_NOT_FOUND'; end if;
  if v_session.owner_user_id<>p_actor_user_id then raise exception 'CORRECTION_ACTOR_MISMATCH'; end if;
  if v_session.status<>'open' then raise exception 'CORRECTION_SESSION_NOT_OPEN'; end if;

  if not exists(select 1 from public.correction_versions where session_id=p_session_id) then
    if p_version_kind<>'original' or lower(p_content_hash)<>lower(v_session.original_evidence_hash) then
      raise exception 'CORRECTION_BASELINE_VERSION_REQUIRED';
    end if;
    v_next_version:=1;
  else
    if p_version_kind<>'correction' then raise exception 'CORRECTION_BASELINE_ALREADY_EXISTS'; end if;
    v_next_version:=v_session.current_version+1;
  end if;

  insert into public.correction_versions(session_id,workspace_id,owner_user_id,version_number,
    version_kind,content_hash,content_snapshot,change_summary,created_by_user_id)
  values(v_session.id,v_session.workspace_id,v_session.owner_user_id,v_next_version,
    p_version_kind,lower(p_content_hash),p_content_snapshot,p_change_summary,p_actor_user_id)
  returning id into v_version_id;
  update public.correction_sessions set current_version=v_next_version,updated_at=now() where id=v_session.id;
  return jsonb_build_object('session_id',v_session.id,'version_id',v_version_id,'version_number',v_next_version);
end;
$$;
revoke all on function private.append_correction_version(uuid,uuid,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function private.append_correction_version(uuid,uuid,jsonb,text,text,text) to service_role;
