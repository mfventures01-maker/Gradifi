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