do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'individual_accounts','individual_orders','individual_payments',
    'individual_entitlements','credit_ledger','correction_sessions','correction_versions'
  ] loop
    if to_regclass('public.'||v_table) is null then
      raise exception 'SCHEMA_TABLE_MISSING: %',v_table;
    end if;
    if not (select c.relrowsecurity from pg_class c where c.oid=to_regclass('public.'||v_table)) then
      raise exception 'RLS_NOT_ENABLED: %',v_table;
    end if;
    if has_table_privilege('authenticated','public.'||v_table,'INSERT')
       or has_table_privilege('authenticated','public.'||v_table,'UPDATE')
       or has_table_privilege('authenticated','public.'||v_table,'DELETE') then
      raise exception 'CLIENT_MUTATION_GRANT_PRESENT: %',v_table;
    end if;
  end loop;

  if has_function_privilege('authenticated','private.confirm_individual_payment(uuid,text,text,bigint,text,jsonb)','EXECUTE')
     or not has_function_privilege('service_role','private.confirm_individual_payment(uuid,text,text,bigint,text,jsonb)','EXECUTE') then
    raise exception 'PAYMENT_CONFIRMATION_FUNCTION_PRIVILEGE_MISMATCH';
  end if;

  if has_function_privilege('authenticated','private.append_correction_version(uuid,uuid,jsonb,text,text,text)','EXECUTE')
     or not has_function_privilege('service_role','private.append_correction_version(uuid,uuid,jsonb,text,text,text)','EXECUTE') then
    raise exception 'CORRECTION_APPEND_FUNCTION_PRIVILEGE_MISMATCH';
  end if;

  if not exists(select 1 from pg_trigger where tgrelid='public.credit_ledger'::regclass
    and tgname='trg_credit_ledger_immutable' and not tgisinternal and tgenabled<>'D') then
    raise exception 'CREDIT_LEDGER_IMMUTABILITY_TRIGGER_MISSING';
  end if;

  if not exists(select 1 from pg_trigger where tgrelid='public.correction_versions'::regclass
    and tgname='trg_correction_versions_immutable' and not tgisinternal and tgenabled<>'D') then
    raise exception 'CORRECTION_VERSION_IMMUTABILITY_TRIGGER_MISSING';
  end if;

  if not exists(select 1 from pg_trigger where tgrelid='public.verify_document_uploads'::regclass
    and tgname='verify_upload_workspace_path_guard' and not tgisinternal and tgenabled<>'D') then
    raise exception 'UPLOAD_WORKSPACE_PATH_GUARD_MISSING';
  end if;

  if not exists(select 1 from storage.buckets where id='verify-private' and public=false) then
    raise exception 'VERIFY_PRIVATE_BUCKET_NOT_PRIVATE';
  end if;

  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects'
    and policyname='verify_private_objects_workspace_member_or_owner_read' and cmd='SELECT') then
    raise exception 'WORKSPACE_AWARE_STORAGE_READ_POLICY_MISSING';
  end if;
end
$$;
