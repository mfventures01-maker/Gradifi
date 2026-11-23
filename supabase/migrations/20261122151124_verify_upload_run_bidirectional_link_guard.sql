create or replace function private.guard_verify_upload_run_link()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_run public.verification_runs%rowtype;
begin
  if old.verification_run_id is not null and new.verification_run_id is distinct from old.verification_run_id then
    raise exception 'VERIFY_UPLOAD_RUN_LINK_IMMUTABLE';
  end if;
  if new.verification_run_id is not null then
    select * into v_run from public.verification_runs where id=new.verification_run_id;
    if not found or v_run.source_upload_id is distinct from new.id
       or v_run.workspace_id is distinct from new.workspace_id
       or v_run.created_by_user_id is distinct from new.owner_user_id then
      raise exception 'VERIFY_UPLOAD_RUN_LINK_MISMATCH';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_verify_upload_run_link() from public,anon,authenticated;
drop trigger if exists verify_upload_run_link_guard on public.verify_document_uploads;
create trigger verify_upload_run_link_guard
before update of verification_run_id on public.verify_document_uploads
for each row execute function private.guard_verify_upload_run_link();
