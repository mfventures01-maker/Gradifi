-- Public receipt lookup must work for anon without direct table SELECT.
-- The test receipt and run are rolled back.
begin;
do $$
declare
  v_user uuid;
  v_workspace uuid;
  v_run uuid:=gen_random_uuid();
  v_service_version uuid;
begin
  select id into v_user from auth.users order by created_at limit 1;
  select id into v_workspace from public.workspaces
    where workspace_type='individual' and owner_user_id=v_user limit 1;
  select id into v_service_version from public.service_versions limit 1;
  if v_user is null or v_workspace is null or v_service_version is null then
    raise exception 'PUBLIC_RECEIPT_TEST_FIXTURE_MISSING';
  end if;

  update public.workspaces set status='active' where id=v_workspace;
  update public.individual_accounts set account_status='active' where workspace_id=v_workspace;
  insert into public.workspace_members(workspace_id,user_id,role,status,membership_source)
  values(v_workspace,v_user,'owner','active','workspace_owner')
  on conflict(workspace_id,user_id) do update
    set status='active',role='owner',membership_source='workspace_owner';

  insert into public.verification_runs(id,workspace_id,service_version_id,status,attempt,created_by_user_id)
  values(v_run,v_workspace,v_service_version,'queued',1,v_user);
  update public.verification_runs set status='running',
    document_hash=repeat('a',64),evidence_hash=repeat('b',64),
    result_hash=repeat('c',64),manifest_hash=repeat('d',64),
    engine_version='G5-DETERMINISTIC-v1',policy_version='G3-POLICY-v1',started_at=now()
  where id=v_run;
  update public.verification_runs set status='succeeded',completed_at=now() where id=v_run;

  perform private.publish_public_verification_receipt(
    v_run,'ANON-LOOKUP-'||v_run::text,42.0,2,'SEFAES-PUBLIC-RECEIPT-v1'
  );
  perform set_config('sefaes.test.public_receipt_id','ANON-LOOKUP-'||v_run::text,true);
end $$;

set local role anon;
do $$
declare v_receipt jsonb;
begin
  v_receipt:=public.lookup_public_verification(current_setting('sefaes.test.public_receipt_id'));
  if v_receipt is null then raise exception 'ANON_PUBLIC_RECEIPT_LOOKUP_FAILED'; end if;
  if v_receipt ? 'evidenceEnvelope' or v_receipt ? 'ownerUserId' or v_receipt ? 'workspaceId' then
    raise exception 'PUBLIC_RECEIPT_EXPOSED_PRIVATE_FIELDS';
  end if;
  if has_table_privilege('anon','public.public_verification_records','SELECT') then
    raise exception 'ANON_DIRECT_RECEIPT_TABLE_READ_GRANTED';
  end if;
end $$;
rollback;
