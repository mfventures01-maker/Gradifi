create or replace function public.sync_verification_workspace_scope()
returns trigger language plpgsql security definer set search_path = 'pg_catalog','public'
as $function$
declare v_workspace_type text; v_workspace_institution_id uuid; v_actor_user_id uuid;
begin
  v_actor_user_id:=coalesce(nullif(to_jsonb(new)->>'owner_user_id','')::uuid,
    nullif(to_jsonb(new)->>'created_by_user_id','')::uuid);
  if tg_op='UPDATE' and new.institution_id is distinct from old.institution_id
     and new.workspace_id is not distinct from old.workspace_id then new.workspace_id:=null; end if;
  if new.workspace_id is null and new.institution_id is not null then
    select w.id into new.workspace_id from public.workspaces w
    where w.workspace_type='institution' and w.institution_id=new.institution_id;
  end if;
  if new.workspace_id is null and new.institution_id is null and v_actor_user_id is not null then
    select w.id into new.workspace_id from public.workspaces w
    where w.workspace_type='individual' and w.owner_user_id=v_actor_user_id and w.status='active';
  end if;
  if new.workspace_id is null then raise exception 'VERIFICATION_WORKSPACE_REQUIRED' using errcode='23502'; end if;
  select w.workspace_type,w.institution_id into v_workspace_type,v_workspace_institution_id
  from public.workspaces w where w.id=new.workspace_id;
  if not found then raise exception 'VERIFICATION_WORKSPACE_NOT_FOUND' using errcode='23503'; end if;
  if v_workspace_type='institution' then
    if new.institution_id is null then new.institution_id:=v_workspace_institution_id;
    elsif new.institution_id is distinct from v_workspace_institution_id then
      raise exception 'VERIFICATION_WORKSPACE_INSTITUTION_MISMATCH' using errcode='23514';
    end if;
  elsif v_workspace_type='individual' then
    if new.institution_id is not null then raise exception 'INDIVIDUAL_WORKSPACE_CANNOT_HAVE_INSTITUTION' using errcode='23514'; end if;
  else raise exception 'VERIFICATION_WORKSPACE_TYPE_INVALID' using errcode='23514'; end if;
  return new;
end;
$function$;
