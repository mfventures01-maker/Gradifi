create unique index if not exists credit_ledger_single_reversal_per_debit_uidx
on public.credit_ledger(reference_type,reference_id)
where entry_type='refund_reversal' and reference_type='credit_ledger_entry';

create or replace function private.consume_individual_credit(
  p_workspace_id uuid,p_owner_user_id uuid,p_verification_run_id uuid,p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_account public.individual_accounts%rowtype;
  v_existing public.credit_ledger%rowtype;
  v_balance bigint;
  v_entry_id uuid;
begin
  if p_workspace_id is null or p_owner_user_id is null or p_verification_run_id is null
     or nullif(trim(p_idempotency_key),'') is null then raise exception 'CREDIT_CONSUMPTION_INVALID_INPUT'; end if;
  select * into v_account from public.individual_accounts
  where workspace_id=p_workspace_id and owner_user_id=p_owner_user_id for update;
  if not found or v_account.account_status<>'active' then raise exception 'INDIVIDUAL_ACCOUNT_NOT_ACTIVE'; end if;

  select * into v_existing from public.credit_ledger where idempotency_key=p_idempotency_key;
  if found then
    if v_existing.workspace_id<>p_workspace_id or v_existing.entry_type<>'verification_debit'
       or v_existing.reference_id<>p_verification_run_id then raise exception 'CREDIT_IDEMPOTENCY_KEY_REUSED'; end if;
    select coalesce(sum(delta),0) into v_balance from public.credit_ledger where workspace_id=p_workspace_id;
    return jsonb_build_object('status','already_consumed','entry_id',v_existing.id,'balance',v_balance);
  end if;

  select * into v_existing from public.credit_ledger
  where workspace_id=p_workspace_id and entry_type='verification_debit'
    and reference_type='verification_run' and reference_id=p_verification_run_id;
  if found then
    select coalesce(sum(delta),0) into v_balance from public.credit_ledger where workspace_id=p_workspace_id;
    return jsonb_build_object('status','already_consumed','entry_id',v_existing.id,'balance',v_balance);
  end if;

  if not exists(select 1 from public.verification_runs
    where id=p_verification_run_id and workspace_id=p_workspace_id and created_by_user_id=p_owner_user_id) then
    raise exception 'VERIFICATION_RUN_WORKSPACE_OWNER_MISMATCH';
  end if;
  select coalesce(sum(delta),0) into v_balance from public.credit_ledger where workspace_id=p_workspace_id;
  if v_balance<1 then raise exception 'INSUFFICIENT_VERIFICATION_CREDITS'; end if;

  insert into public.credit_ledger(workspace_id,owner_user_id,entry_type,delta,reference_type,reference_id,idempotency_key,description)
  values(p_workspace_id,p_owner_user_id,'verification_debit',-1,'verification_run',p_verification_run_id,p_idempotency_key,'Credit consumed for verification')
  returning id into v_entry_id;
  return jsonb_build_object('status','consumed','entry_id',v_entry_id,'balance',v_balance-1);
end;
$$;

create or replace function private.reverse_individual_credit(
  p_debit_entry_id uuid,p_idempotency_key text,p_reason text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_debit public.credit_ledger%rowtype;
  v_existing public.credit_ledger%rowtype;
  v_entry_id uuid;
  v_balance bigint;
begin
  if p_debit_entry_id is null or nullif(trim(p_idempotency_key),'') is null
     or nullif(trim(p_reason),'') is null then raise exception 'CREDIT_REVERSAL_INVALID_INPUT'; end if;
  select * into v_debit from public.credit_ledger
  where id=p_debit_entry_id and entry_type='verification_debit' for update;
  if not found then raise exception 'VERIFICATION_CREDIT_DEBIT_NOT_FOUND'; end if;
  perform 1 from public.individual_accounts
  where workspace_id=v_debit.workspace_id and owner_user_id=v_debit.owner_user_id for update;
  if not found then raise exception 'INDIVIDUAL_ACCOUNT_NOT_FOUND'; end if;

  select * into v_existing from public.credit_ledger where idempotency_key=p_idempotency_key;
  if found then
    if v_existing.entry_type<>'refund_reversal' or v_existing.reference_id<>p_debit_entry_id then
      raise exception 'CREDIT_IDEMPOTENCY_KEY_REUSED';
    end if;
    select coalesce(sum(delta),0) into v_balance from public.credit_ledger where workspace_id=v_debit.workspace_id;
    return jsonb_build_object('status','already_reversed','entry_id',v_existing.id,'balance',v_balance);
  end if;

  select * into v_existing from public.credit_ledger
  where entry_type='refund_reversal' and reference_type='credit_ledger_entry' and reference_id=p_debit_entry_id;
  if found then
    select coalesce(sum(delta),0) into v_balance from public.credit_ledger where workspace_id=v_debit.workspace_id;
    return jsonb_build_object('status','already_reversed','entry_id',v_existing.id,'balance',v_balance);
  end if;

  insert into public.credit_ledger(workspace_id,owner_user_id,entry_type,delta,reference_type,reference_id,idempotency_key,description)
  values(v_debit.workspace_id,v_debit.owner_user_id,'refund_reversal',abs(v_debit.delta),
    'credit_ledger_entry',v_debit.id,p_idempotency_key,left(p_reason,500))
  returning id into v_entry_id;
  select coalesce(sum(delta),0) into v_balance from public.credit_ledger where workspace_id=v_debit.workspace_id;
  return jsonb_build_object('status','reversed','entry_id',v_entry_id,'balance',v_balance);
end;
$$;

revoke all on function private.consume_individual_credit(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function private.reverse_individual_credit(uuid,text,text) from public,anon,authenticated;
grant execute on function private.consume_individual_credit(uuid,uuid,uuid,text) to service_role;
grant execute on function private.reverse_individual_credit(uuid,text,text) to service_role;
