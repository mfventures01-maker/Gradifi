create or replace function private.publish_public_verification_receipt(
  p_verification_run_id uuid,p_verification_id text,p_overall_similarity numeric,p_total_sources_found integer,
  p_public_schema_version text default 'SEFAES-PUBLIC-RECEIPT-v1'
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_run public.verification_runs%rowtype; v_record_id uuid; v_existing public.public_verification_records%rowtype;
begin
  if p_verification_run_id is null or nullif(trim(p_verification_id),'') is null
     or p_overall_similarity is null or p_overall_similarity<0 or p_overall_similarity>100
     or p_total_sources_found is null or p_total_sources_found<0 or nullif(trim(p_public_schema_version),'') is null then
    raise exception 'PUBLIC_RECEIPT_INVALID_INPUT';
  end if;
  select * into v_run from public.verification_runs where id=p_verification_run_id for update;
  if not found or v_run.status<>'succeeded' then raise exception 'VERIFICATION_RUN_NOT_SUCCESSFUL'; end if;
  if v_run.document_hash is null or v_run.evidence_hash is null or v_run.result_hash is null
     or v_run.manifest_hash is null or v_run.engine_version is null or v_run.policy_version is null then
    raise exception 'VERIFICATION_RUN_HASH_PROVENANCE_INCOMPLETE';
  end if;
  insert into public.public_verification_records(verification_id,document_hash,evidence_hash,engine_version,policy_version,
    overall_similarity,total_sources_found,evidence_envelope,verification_run_id,result_hash,manifest_hash,status,public_schema_version)
  values(trim(p_verification_id),v_run.document_hash,v_run.evidence_hash,v_run.engine_version,v_run.policy_version,
    p_overall_similarity,p_total_sources_found,
    jsonb_build_object('schemaVersion',p_public_schema_version,'verificationId',trim(p_verification_id),
      'resultHash',v_run.result_hash,'manifestHash',v_run.manifest_hash,'engineVersion',v_run.engine_version,
      'policyVersion',v_run.policy_version,'overallSimilarity',p_overall_similarity,'sourceCount',p_total_sources_found),
    v_run.id,v_run.result_hash,v_run.manifest_hash,'VALID',trim(p_public_schema_version))
  on conflict(verification_id) do nothing returning id into v_record_id;
  if v_record_id is null then
    select * into v_existing from public.public_verification_records where verification_id=trim(p_verification_id);
    if not found or v_existing.verification_run_id<>v_run.id or v_existing.document_hash<>v_run.document_hash
       or v_existing.evidence_hash<>v_run.evidence_hash or v_existing.result_hash<>v_run.result_hash
       or v_existing.manifest_hash<>v_run.manifest_hash or v_existing.status<>'VALID' then
      raise exception 'PUBLIC_RECEIPT_ID_ALREADY_USED';
    end if;
    return jsonb_build_object('receipt_id',v_existing.id,'verification_id',v_existing.verification_id,
      'verification_run_id',v_run.id,'status','already_published','public_schema_version',v_existing.public_schema_version);
  end if;
  return jsonb_build_object('receipt_id',v_record_id,'verification_id',trim(p_verification_id),
    'verification_run_id',v_run.id,'status','VALID','public_schema_version',p_public_schema_version);
end;
$$;

create or replace function private.guard_public_verification_receipt()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_run public.verification_runs%rowtype; v_expected_envelope jsonb;
begin
  if tg_op='DELETE' then raise exception 'PUBLIC_RECEIPT_DELETE_PROHIBITED'; end if;
  if tg_op='UPDATE' then
    if new.id is distinct from old.id or new.verification_id is distinct from old.verification_id
       or new.document_hash is distinct from old.document_hash or new.evidence_hash is distinct from old.evidence_hash
       or new.engine_version is distinct from old.engine_version or new.policy_version is distinct from old.policy_version
       or new.overall_similarity is distinct from old.overall_similarity or new.total_sources_found is distinct from old.total_sources_found
       or new.evidence_envelope is distinct from old.evidence_envelope or new.verification_run_id is distinct from old.verification_run_id
       or new.result_hash is distinct from old.result_hash or new.manifest_hash is distinct from old.manifest_hash
       or new.public_schema_version is distinct from old.public_schema_version or new.created_at is distinct from old.created_at then
      raise exception 'PUBLIC_RECEIPT_IDENTITY_IMMUTABLE';
    end if;
    if old.status<>'VALID' or new.status not in ('REVOKED','EXPIRED') then raise exception 'PUBLIC_RECEIPT_INVALID_STATUS_TRANSITION'; end if;
    return new;
  end if;
  if new.status<>'VALID' or new.verification_run_id is null or new.result_hash is null
     or new.manifest_hash is null or new.public_schema_version is null then raise exception 'PUBLIC_RECEIPT_REQUIRED_FIELDS_MISSING'; end if;
  select * into v_run from public.verification_runs where id=new.verification_run_id;
  if not found or v_run.status<>'succeeded' or v_run.document_hash is distinct from new.document_hash
     or v_run.evidence_hash is distinct from new.evidence_hash or v_run.result_hash is distinct from new.result_hash
     or v_run.manifest_hash is distinct from new.manifest_hash or v_run.engine_version is distinct from new.engine_version
     or v_run.policy_version is distinct from new.policy_version then raise exception 'PUBLIC_RECEIPT_RUN_OR_HASH_MISMATCH'; end if;
  v_expected_envelope:=jsonb_build_object('schemaVersion',new.public_schema_version,'verificationId',new.verification_id,
    'resultHash',new.result_hash,'manifestHash',new.manifest_hash,'engineVersion',new.engine_version,
    'policyVersion',new.policy_version,'overallSimilarity',new.overall_similarity,'sourceCount',new.total_sources_found);
  if new.evidence_envelope is distinct from v_expected_envelope then raise exception 'PUBLIC_RECEIPT_ENVELOPE_NOT_ALLOWLISTED'; end if;
  return new;
end;
$$;