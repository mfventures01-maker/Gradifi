create or replace function private.validate_verify_upload_workspace_path()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_workspace public.workspaces%rowtype;
  v_first_segment text;
begin
  if new.bucket_id<>'verify-private' then raise exception 'VERIFY_UPLOAD_BUCKET_INVALID'; end if;
  if new.object_path is null or new.object_path='' or left(new.object_path,1)='/'
     or new.object_path ~ '(^|/)\.\.(/|$)'
     or split_part(new.object_path,'/',2)<>new.owner_user_id::text
     or split_part(new.object_path,'/',3)<>new.id::text
     or split_part(new.object_path,'/',4)='' then
    raise exception 'VERIFY_UPLOAD_OBJECT_PATH_INVALID';
  end if;

  select * into v_workspace from public.workspaces where id=new.workspace_id;
  if not found then raise exception 'VERIFY_UPLOAD_WORKSPACE_NOT_FOUND'; end if;
  v_first_segment:=split_part(new.object_path,'/',1);

  if v_workspace.workspace_type='individual' then
    if new.institution_id is not null or v_workspace.owner_user_id<>new.owner_user_id
       or v_first_segment<>v_workspace.id::text then
      raise exception 'VERIFY_UPLOAD_INDIVIDUAL_WORKSPACE_SCOPE_MISMATCH';
    end if;
  elsif v_workspace.workspace_type='institution' then
    if new.institution_id is distinct from v_workspace.institution_id
       or v_first_segment not in (v_workspace.institution_id::text,v_workspace.id::text) then
      raise exception 'VERIFY_UPLOAD_INSTITUTION_WORKSPACE_SCOPE_MISMATCH';
    end if;
  else
    raise exception 'VERIFY_UPLOAD_WORKSPACE_TYPE_INVALID';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_verify_upload_workspace_path() from public,anon,authenticated;
drop trigger if exists verify_upload_workspace_path_guard on public.verify_document_uploads;
create trigger verify_upload_workspace_path_guard
before insert or update of id,workspace_id,institution_id,owner_user_id,bucket_id,object_path
on public.verify_document_uploads for each row
execute function private.validate_verify_upload_workspace_path();
