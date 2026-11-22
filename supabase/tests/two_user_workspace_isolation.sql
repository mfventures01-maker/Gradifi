-- Requires two real auth.users. Run with the SQL editor/service role; fixtures are rolled back.
-- Fails closed when a second authenticated test identity has not been provisioned.
begin;
do $$
declare
  v_a uuid; v_b uuid; v_ws_a uuid:=gen_random_uuid(); v_ws_b uuid:=gen_random_uuid();
  v_run_a uuid:=gen_random_uuid(); v_run_b uuid:=gen_random_uuid();
  v_upload_a uuid:=gen_random_uuid(); v_upload_b uuid:=gen_random_uuid();
  v_service_version uuid;
begin
  select id into v_a from auth.users order by created_at limit 1;
  select id into v_b from auth.users order by created_at offset 1 limit 1;
  select id into v_service_version from public.service_versions limit 1;
  if v_a is null or v_b is null or v_a=v_b then raise exception 'TWO_AUTHENTICATED_TEST_USERS_REQUIRED'; end if;
  insert into public.workspaces(id,workspace_type,owner_user_id,display_name,status,created_by_user_id)
  values(v_ws_a,'individual',v_a,'Isolation A','active',v_a),(v_ws_b,'individual',v_b,'Isolation B','active',v_b);
  insert into public.workspace_members(workspace_id,user_id,role,status,membership_source)
  values(v_ws_a,v_a,'owner','active','workspace_owner'),(v_ws_b,v_b,'owner','active','workspace_owner');
  insert into public.verify_document_uploads(id,workspace_id,institution_id,owner_user_id,bucket_id,object_path,
    original_filename,content_type,byte_size,source_file_sha256,extraction_status,canonicalization_status)
  values
  (v_upload_a,v_ws_a,null,v_a,'verify-private',v_ws_a::text||'/'||v_a::text||'/'||v_upload_a::text||'/a.pdf','a.pdf','application/pdf',10,repeat('a',64),'uploaded','pending'),
  (v_upload_b,v_ws_b,null,v_b,'verify-private',v_ws_b::text||'/'||v_b::text||'/'||v_upload_b::text||'/b.pdf','b.pdf','application/pdf',10,repeat('b',64),'uploaded','pending');
  insert into public.verification_runs(id,workspace_id,service_version_id,status,attempt,created_by_user_id,source_upload_id)
  values(v_run_a,v_ws_a,v_service_version,'queued',1,v_a,v_upload_a),(v_run_b,v_ws_b,v_service_version,'queued',1,v_b,v_upload_b);
  perform set_config('sefaes.test.user_a',v_a::text,true);
  perform set_config('sefaes.test.user_b',v_b::text,true);
  perform set_config('sefaes.test.workspace_a',v_ws_a::text,true);
  perform set_config('sefaes.test.workspace_b',v_ws_b::text,true);
  perform set_config('sefaes.test.run_a',v_run_a::text,true);
  perform set_config('sefaes.test.run_b',v_run_b::text,true);
  perform set_config('sefaes.test.upload_a',v_upload_a::text,true);
  perform set_config('sefaes.test.upload_b',v_upload_b::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('sefaes.test.user_a'),true);
do $$
begin
  if not exists(select 1 from public.workspaces where id=current_setting('sefaes.test.workspace_a')::uuid) then raise exception 'USER_A_CANNOT_READ_OWN_WORKSPACE'; end if;
  if exists(select 1 from public.workspaces where id=current_setting('sefaes.test.workspace_b')::uuid) then raise exception 'USER_A_READ_USER_B_WORKSPACE'; end if;
  if not exists(select 1 from public.verification_runs where id=current_setting('sefaes.test.run_a')::uuid) then raise exception 'USER_A_CANNOT_READ_OWN_RUN'; end if;
  if exists(select 1 from public.verification_runs where id=current_setting('sefaes.test.run_b')::uuid) then raise exception 'USER_A_READ_USER_B_RUN'; end if;
  if not exists(select 1 from public.verify_document_uploads where id=current_setting('sefaes.test.upload_a')::uuid) then raise exception 'USER_A_CANNOT_READ_OWN_UPLOAD'; end if;
  if exists(select 1 from public.verify_document_uploads where id=current_setting('sefaes.test.upload_b')::uuid) then raise exception 'USER_A_READ_USER_B_UPLOAD'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('sefaes.test.user_b'),true);
do $$
begin
  if not exists(select 1 from public.workspaces where id=current_setting('sefaes.test.workspace_b')::uuid) then raise exception 'USER_B_CANNOT_READ_OWN_WORKSPACE'; end if;
  if exists(select 1 from public.workspaces where id=current_setting('sefaes.test.workspace_a')::uuid) then raise exception 'USER_B_READ_USER_A_WORKSPACE'; end if;
  if not exists(select 1 from public.verification_runs where id=current_setting('sefaes.test.run_b')::uuid) then raise exception 'USER_B_CANNOT_READ_OWN_RUN'; end if;
  if exists(select 1 from public.verification_runs where id=current_setting('sefaes.test.run_a')::uuid) then raise exception 'USER_B_READ_USER_A_RUN'; end if;
  if not exists(select 1 from public.verify_document_uploads where id=current_setting('sefaes.test.upload_b')::uuid) then raise exception 'USER_B_CANNOT_READ_OWN_UPLOAD'; end if;
  if exists(select 1 from public.verify_document_uploads where id=current_setting('sefaes.test.upload_a')::uuid) then raise exception 'USER_B_READ_USER_A_UPLOAD'; end if;
end $$;
rollback;
