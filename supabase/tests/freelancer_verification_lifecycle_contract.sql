-- Transaction-scoped runtime contract test. All fixtures are rolled back.
begin;
do $$
declare
  v_user uuid; v_workspace uuid; v_upload uuid:=gen_random_uuid();
  v_root_run uuid:=gen_random_uuid(); v_session uuid:=gen_random_uuid(); v_correction_version uuid;
  v_correction_run uuid; v_order uuid:=gen_random_uuid(); v_payment uuid:=gen_random_uuid();
  v_credit_run uuid:=gen_random_uuid(); v_debit uuid; v_service_version uuid;
  v_result jsonb; v_rejected boolean;
begin
  select id into v_user from auth.users order by created_at limit 1;
  select id into v_service_version from public.service_versions limit 1;
  if v_user is null or v_service_version is null then raise exception 'TEST_FIXTURE_MISSING'; end if;
  select id into v_workspace from public.workspaces where workspace_type='individual' and owner_user_id=v_user limit 1;
  if v_workspace is null then
    v_workspace:=gen_random_uuid();
    insert into public.workspaces(id,workspace_type,owner_user_id,display_name,status,created_by_user_id)
    values(v_workspace,'individual',v_user,'Freelancer lifecycle test','active',v_user);
  else
    update public.workspaces set status='active' where id=v_workspace;
    update public.individual_accounts set account_status='active',updated_at=now() where workspace_id=v_workspace;
  end if;
  insert into public.workspace_members(workspace_id,user_id,role,status,membership_source)
  values(v_workspace,v_user,'owner','active','workspace_owner')
  on conflict(workspace_id,user_id) do update set role='owner',status='active',membership_source='workspace_owner';
  insert into public.verify_document_uploads(id,workspace_id,institution_id,owner_user_id,bucket_id,object_path,
    original_filename,content_type,byte_size,source_file_sha256,extraction_status,canonicalization_status)
  values(v_upload,v_workspace,null,v_user,'verify-private',v_workspace::text||'/'||v_user::text||'/'||v_upload::text||'/source.pdf',
    'source.pdf','application/pdf',12,repeat('a',64),'uploaded','pending');
  insert into public.verification_runs(id,workspace_id,service_version_id,status,attempt,created_by_user_id,source_upload_id)
  values(v_root_run,v_workspace,v_service_version,'queued',1,v_user,v_upload);
  update public.verify_document_uploads set verification_run_id=v_root_run where id=v_upload;
  update public.verification_runs set status='running',document_hash=repeat('1',64),canonical_document_hash=repeat('1',64),
    evidence_hash=repeat('2',64),manifest_hash=repeat('3',64),result_hash=repeat('4',64),
    engine_version='G5-DETERMINISTIC-v1',policy_version='G3-POLICY-v1',
    result='{"overallSimilarity":12.5}'::jsonb,started_at=now() where id=v_root_run;
  update public.verification_runs set status='succeeded',completed_at=now() where id=v_root_run;
  v_result:=private.publish_public_verification_receipt(v_root_run,'TEST-'||v_root_run::text,12.5,1,'SEFAES-PUBLIC-RECEIPT-v1');
  if v_result->>'status'<>'VALID' or public.lookup_public_verification('TEST-'||v_root_run::text) is null then raise exception 'RECEIPT_PUBLICATION_OR_LOOKUP_FAILED'; end if;
  v_result:=private.publish_public_verification_receipt(v_root_run,'TEST-'||v_root_run::text,12.5,1,'SEFAES-PUBLIC-RECEIPT-v1');
  if v_result->>'status'<>'already_published' then raise exception 'RECEIPT_PUBLISH_NOT_IDEMPOTENT'; end if;
  v_rejected:=false;
  begin update public.public_verification_records set result_hash=repeat('f',64) where verification_run_id=v_root_run;
  exception when others then if sqlerrm like 'PUBLIC_RECEIPT_IDENTITY_IMMUTABLE%' then v_rejected:=true; else raise; end if; end;
  if not v_rejected then raise exception 'PUBLIC_RECEIPT_HASH_MUTATION_NOT_BLOCKED'; end if;
  update public.public_verification_records set status='REVOKED' where verification_run_id=v_root_run;
  if public.lookup_public_verification('TEST-'||v_root_run::text) is not null then raise exception 'REVOKED_RECEIPT_STILL_LOOKUPABLE'; end if;
  insert into public.correction_sessions(id,verification_run_id,workspace_id,owner_user_id,original_evidence_hash)
  values(v_session,v_root_run,v_workspace,v_user,repeat('a',64));
  perform private.append_correction_version(v_session,v_user,'{"evidence":"original"}'::jsonb,repeat('a',64),'Original','original');
  v_result:=private.append_correction_version(v_session,v_user,'{"evidence":"corrected"}'::jsonb,repeat('b',64),'Correction 1','correction');
  v_correction_version:=(v_result->>'version_id')::uuid;
  v_result:=private.create_correction_verification_run(v_correction_version,v_user,v_service_version,null);
  v_correction_run:=(v_result->>'verification_run_id')::uuid;
  if v_result->>'status'<>'queued' or (v_result->>'attempt')::integer<>2
    or not exists(select 1 from public.verification_runs where id=v_correction_run and parent_run_id=v_root_run
      and correction_version_id=v_correction_version and workspace_id=v_workspace and created_by_user_id=v_user and attempt=2) then
    raise exception 'CORRECTION_RUN_LINEAGE_FAILED';
  end if;
  v_rejected:=false;
  begin update public.verification_runs set result_hash=repeat('f',64) where id=v_root_run;
  exception when others then if sqlerrm like 'VERIFICATION_RUN_TERMINAL_IMMUTABLE%' then v_rejected:=true; else raise; end if; end;
  if not v_rejected then raise exception 'TERMINAL_RUN_MUTATION_NOT_BLOCKED'; end if;
  insert into public.individual_orders(id,workspace_id,owner_user_id,idempotency_key,product_code,credits_quantity,amount_minor,currency)
  values(v_order,v_workspace,v_user,'lifecycle-order-'||v_order::text,'test-pack',4,400,'NGN');
  insert into public.individual_payments(id,order_id,workspace_id,owner_user_id,provider,provider_payment_ref,amount_minor,currency)
  values(v_payment,v_order,v_workspace,v_user,'test-provider','lifecycle-ref-'||v_payment::text,400,'NGN');
  v_result:=private.confirm_individual_payment(v_payment,'lifecycle-event-'||v_payment::text,'lifecycle-ref-'||v_payment::text,400,'NGN','{"test":true}'::jsonb);
  if v_result->>'status'<>'confirmed' then raise exception 'TEST_PAYMENT_CONFIRMATION_FAILED'; end if;
  insert into public.verification_runs(id,workspace_id,service_version_id,status,attempt,created_by_user_id)
  values(v_credit_run,v_workspace,v_service_version,'queued',1,v_user);
  v_result:=private.consume_individual_credit(v_workspace,v_user,v_credit_run,'lifecycle-consume:'||v_credit_run::text);
  if v_result->>'status'<>'consumed' or (v_result->>'balance')::integer<>3 then raise exception 'TEST_CREDIT_CONSUMPTION_FAILED'; end if;
  v_debit:=(v_result->>'entry_id')::uuid;
  v_result:=private.consume_individual_credit(v_workspace,v_user,v_credit_run,'lifecycle-consume:'||v_credit_run::text);
  if v_result->>'status'<>'already_consumed' then raise exception 'TEST_CREDIT_DEBIT_IDEMPOTENCY_FAILED'; end if;
  v_result:=private.reverse_individual_credit(v_debit,'lifecycle-reversal:'||v_debit::text,'test reversal');
  if v_result->>'status'<>'reversed' or (v_result->>'balance')::integer<>4 then raise exception 'TEST_CREDIT_REVERSAL_FAILED'; end if;
  v_result:=private.reverse_individual_credit(v_debit,'lifecycle-reversal:'||v_debit::text,'test reversal');
  if v_result->>'status'<>'already_reversed' then raise exception 'TEST_CREDIT_REVERSAL_IDEMPOTENCY_FAILED'; end if;
end $$;
rollback;
