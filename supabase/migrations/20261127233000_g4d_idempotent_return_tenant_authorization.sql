-- G4-D: an idempotent receipt return must prove tenant/actor ownership.
-- Additive replacement only. Do not replay the historical authority migration.
create or replace function private.persist_verification_run_and_receipt(
  p_workspace_id uuid,
  p_created_by_user_id uuid,
  p_service_version_id uuid,
  p_school_id uuid,
  p_source_upload_id uuid,
  p_correction_of_verification_id text,
  p_raw_text text,
  p_result jsonb,
  p_public_schema_version text default 'SEFAES-PUBLIC-RECEIPT-v1'
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $function$
declare
  v_workspace public.workspaces%rowtype;
  v_service public.service_versions%rowtype;
  v_parent_receipt public.public_verification_records%rowtype;
  v_parent_run public.verification_runs%rowtype;
  v_run public.verification_runs%rowtype;
  v_existing public.public_verification_records%rowtype;
  v_existing_run public.verification_runs%rowtype;
  v_existing_workspace public.workspaces%rowtype;
  v_receipt public.public_verification_records%rowtype;
  v_document_hash text;
  v_evidence_hash text;
  v_result_hash text;
  v_manifest_hash text;
  v_verification_id text;
  v_manifest jsonb;
  v_correction text;
  v_attempt integer := 1;
  v_score numeric;
  v_source_count integer;
begin
  if p_workspace_id is null or p_created_by_user_id is null or p_service_version_id is null
     or p_raw_text is null or length(p_raw_text) = 0 or length(p_raw_text) > 3500000
     or p_result is null or jsonb_typeof(p_result) is distinct from 'object'
     or jsonb_typeof(p_result->'similarityAnalysis'->'findings') is distinct from 'array'
     or p_result->>'documentHash' is null or p_result->>'documentHash' !~ '^[a-f0-9]{16}$'
     or p_result->>'evidenceHash' is null or p_result->>'evidenceHash' !~ '^[a-f0-9]{16}$'
     or nullif(p_result->>'engineVersion','') is null
     or nullif(p_result->>'policyVersion','') is null
     or nullif(trim(p_public_schema_version),'') is null then
    raise exception 'VERIFICATION_PERSISTENCE_INVALID_INPUT';
  end if;

  v_score := (p_result->>'overallSimilarity')::numeric;
  v_source_count := (p_result->>'totalSourcesFound')::integer;
  if v_score is null or v_score < 0 or v_score > 100 or v_source_count is null or v_source_count < 0 then
    raise exception 'VERIFICATION_PERSISTENCE_RESULT_RANGE_INVALID';
  end if;

  v_correction := nullif(trim(p_correction_of_verification_id),'');
  if v_correction is not null and v_correction !~ '^VRF-[0-9A-F]{12}$' then
    raise exception 'VERIFICATION_CORRECTION_PARENT_ID_INVALID';
  end if;

  v_document_hash := encode(extensions.digest(convert_to(p_raw_text,'UTF8'),'sha256'),'hex');
  v_result_hash := encode(extensions.digest(convert_to(p_result::text,'UTF8'),'sha256'),'hex');
  v_evidence_hash := encode(
    extensions.digest(convert_to(jsonb_build_object(
      'documentHash', v_document_hash,
      'deterministicResult', p_result,
      'correctionOfVerificationId', v_correction
    )::text,'UTF8'),'sha256'),
    'hex'
  );
  v_verification_id := 'VRF-' || upper(substr(v_document_hash,1,8) || substr(v_evidence_hash,1,4));

  perform pg_catalog.pg_advisory_xact_lock(0, pg_catalog.hashtext(v_verification_id));

  select * into v_existing from public.public_verification_records
  where verification_id = v_verification_id;
  if found then
    -- Idempotency is not an authorization shortcut. Re-authorize the supplied
    -- tenant/actor and bind the existing receipt to the exact persisted run.
    select * into v_existing_workspace
    from public.workspaces
    where id = p_workspace_id
    for share;
    if not found or v_existing_workspace.status <> 'active' then
      raise exception 'VERIFICATION_WORKSPACE_NOT_ACTIVE';
    end if;

    if v_existing_workspace.workspace_type = 'individual' then
      if v_existing_workspace.owner_user_id is distinct from p_created_by_user_id
         or v_existing_workspace.institution_id is not null
         or not exists(select 1 from public.workspace_members wm
           where wm.workspace_id=p_workspace_id and wm.user_id=p_created_by_user_id
             and wm.status='active' and wm.role='owner') then
        raise exception 'VERIFICATION_INDIVIDUAL_WORKSPACE_SCOPE_INVALID';
      end if;
    elsif v_existing_workspace.workspace_type = 'institution' then
      if v_existing_workspace.institution_id is null
         or not exists(select 1 from public.workspace_members wm
           where wm.workspace_id=p_workspace_id and wm.user_id=p_created_by_user_id
             and wm.status='active') then
        raise exception 'VERIFICATION_INSTITUTION_WORKSPACE_SCOPE_INVALID';
      end if;
    else
      raise exception 'VERIFICATION_WORKSPACE_TYPE_INVALID';
    end if;

    if v_existing.verification_run_id is null then
      raise exception 'PUBLIC_RECEIPT_ID_COLLISION_OR_EXISTING_INTEGRITY_FAILURE';
    end if;

    select * into v_existing_run
    from public.verification_runs
    where id = v_existing.verification_run_id;

    if not found
       or v_existing_run.workspace_id is distinct from p_workspace_id
       or v_existing_run.created_by_user_id is distinct from p_created_by_user_id
       or v_existing_run.service_version_id is distinct from p_service_version_id
       or v_existing_run.source_upload_id is distinct from p_source_upload_id
       or v_existing_run.result->>'correctionOfVerificationId' is distinct from v_correction
       or v_existing_run.status <> 'succeeded'
       or not private.verification_run_hashes_match(v_existing_run.id) then
      raise exception 'PUBLIC_RECEIPT_ID_COLLISION_OR_EXISTING_INTEGRITY_FAILURE';
    end if;

    if p_source_upload_id is not null and not exists(
      select 1 from public.verify_document_uploads u
      where u.id=p_source_upload_id and u.workspace_id=p_workspace_id
        and u.owner_user_id=p_created_by_user_id and u.extraction_status='extracted'
        and u.canonicalization_status='completed'
        and u.canonical_document_hash=v_document_hash
        and u.verification_run_id=v_existing_run.id
    ) then
      raise exception 'VERIFICATION_SOURCE_UPLOAD_NOT_CANONICALIZED_OR_OUT_OF_SCOPE';
    end if;

    if v_correction is not null then
      select * into v_parent_receipt from public.public_verification_records
      where verification_id=v_correction and status='VALID';
      if not found or v_parent_receipt.verification_run_id is null
         or v_existing_run.parent_run_id is distinct from v_parent_receipt.verification_run_id
         or not private.verification_run_hashes_match(v_parent_receipt.verification_run_id) then
        raise exception 'VERIFICATION_CORRECTION_PARENT_NOT_VALID';
      end if;
      select * into v_parent_run from public.verification_runs
      where id=v_parent_receipt.verification_run_id;
      if not found or v_parent_run.workspace_id is distinct from p_workspace_id
         or v_parent_run.created_by_user_id is distinct from p_created_by_user_id then
        raise exception 'VERIFICATION_CORRECTION_PARENT_SCOPE_INVALID';
      end if;
    elsif v_existing_run.parent_run_id is not null then
      raise exception 'VERIFICATION_CORRECTION_PARENT_SCOPE_INVALID';
    end if;

    if v_existing.status <> 'VALID'
       or v_existing.document_hash is distinct from v_document_hash
       or v_existing.evidence_hash is distinct from v_evidence_hash
       or v_existing.result_hash is distinct from v_result_hash
       or v_existing.engine_version is distinct from p_result->>'engineVersion'
       or v_existing.policy_version is distinct from p_result->>'policyVersion'
       or v_existing.overall_similarity is distinct from v_score
       or v_existing.total_sources_found is distinct from v_source_count
       or v_existing.verification_run_id is null
       or not private.verification_run_hashes_match(v_existing.verification_run_id) then
      raise exception 'PUBLIC_RECEIPT_ID_COLLISION_OR_EXISTING_INTEGRITY_FAILURE';
    end if;
    return jsonb_build_object('status','IDEMPOTENT_EXISTS','record',jsonb_build_object(
      'id',v_existing.id,'verification_id',v_existing.verification_id,
      'document_hash',v_existing.document_hash,'evidence_hash',v_existing.evidence_hash,
      'engine_version',v_existing.engine_version,'policy_version',v_existing.policy_version,
      'overall_similarity',v_existing.overall_similarity,'total_sources_found',v_existing.total_sources_found,
      'verification_run_id',v_existing.verification_run_id,'result_hash',v_existing.result_hash,
      'manifest_hash',v_existing.manifest_hash,'status',v_existing.status,
      'public_schema_version',v_existing.public_schema_version,'created_at',v_existing.created_at
    ));
  end if;

  if exists(select 1 from public.verification_runs where verification_id = v_verification_id) then
    raise exception 'VERIFICATION_RUN_ORPHANED_WITHOUT_RECEIPT';
  end if;

  select * into v_workspace from public.workspaces where id = p_workspace_id for share;
  if not found or v_workspace.status <> 'active' then
    raise exception 'VERIFICATION_WORKSPACE_NOT_ACTIVE';
  end if;

  if v_workspace.workspace_type = 'individual' then
    if v_workspace.owner_user_id is distinct from p_created_by_user_id
       or v_workspace.institution_id is not null
       or not exists(select 1 from public.workspace_members wm
         where wm.workspace_id=p_workspace_id and wm.user_id=p_created_by_user_id
           and wm.status='active' and wm.role='owner') then
      raise exception 'VERIFICATION_INDIVIDUAL_WORKSPACE_SCOPE_INVALID';
    end if;
  elsif v_workspace.workspace_type = 'institution' then
    if v_workspace.institution_id is null
       or not exists(select 1 from public.workspace_members wm
         where wm.workspace_id=p_workspace_id and wm.user_id=p_created_by_user_id and wm.status='active') then
      raise exception 'VERIFICATION_INSTITUTION_WORKSPACE_SCOPE_INVALID';
    end if;
  else
    raise exception 'VERIFICATION_WORKSPACE_TYPE_INVALID';
  end if;

  select sv.* into v_service
  from public.service_versions sv
  join public.services s on s.id=sv.service_id
  where sv.id=p_service_version_id and sv.status='active' and s.status='active'
    and sv.engine_version=p_result->>'engineVersion'
    and sv.policy_version=p_result->>'policyVersion';
  if not found then raise exception 'VERIFICATION_SERVICE_VERSION_NOT_ACTIVE_OR_MISMATCHED'; end if;

  if p_school_id is not null and (
    v_workspace.workspace_type <> 'institution'
    or not exists(select 1 from public.schools s
      where s.id=p_school_id and s.institution_id=v_workspace.institution_id)
  ) then
    raise exception 'VERIFICATION_SCHOOL_WORKSPACE_SCOPE_INVALID';
  end if;

  if p_source_upload_id is not null and not exists(
    select 1 from public.verify_document_uploads u
    where u.id=p_source_upload_id and u.workspace_id=p_workspace_id
      and u.owner_user_id=p_created_by_user_id and u.extraction_status='extracted'
      and u.canonicalization_status='completed'
      and u.canonical_document_hash=v_document_hash
  ) then
    raise exception 'VERIFICATION_SOURCE_UPLOAD_NOT_CANONICALIZED_OR_OUT_OF_SCOPE';
  end if;

  if v_correction is not null then
    select * into v_parent_receipt from public.public_verification_records
    where verification_id=v_correction and status='VALID';
    if not found or v_parent_receipt.verification_run_id is null
       or not private.verification_run_hashes_match(v_parent_receipt.verification_run_id) then
      raise exception 'VERIFICATION_CORRECTION_PARENT_NOT_VALID';
    end if;
    select * into v_parent_run from public.verification_runs where id=v_parent_receipt.verification_run_id;
    if not found or v_parent_run.workspace_id is distinct from p_workspace_id
       or v_parent_run.created_by_user_id is distinct from p_created_by_user_id then
      raise exception 'VERIFICATION_CORRECTION_PARENT_SCOPE_INVALID';
    end if;
    v_attempt := v_parent_run.attempt + 1;
  end if;

  if v_verification_id = v_correction then
    raise exception 'VERIFICATION_CANNOT_CORRECT_ITSELF';
  end if;

  insert into public.verification_runs(
    workspace_id,institution_id,school_id,service_version_id,verification_id,
    status,attempt,parent_run_id,created_by_user_id,source_upload_id
  )
  values(
    p_workspace_id,v_workspace.institution_id,p_school_id,p_service_version_id,v_verification_id,
    'queued',v_attempt,case when v_correction is null then null else v_parent_run.id end,
    p_created_by_user_id,p_source_upload_id
  )
  returning * into v_run;

  update public.verification_runs set status='running',started_at=now() where id=v_run.id;

  v_manifest := jsonb_build_object(
    'verificationRunId',v_run.id,'verificationId',v_verification_id,
    'documentHash',v_document_hash,'evidenceHash',v_evidence_hash,'resultHash',v_result_hash,
    'engineVersion',p_result->>'engineVersion','policyVersion',p_result->>'policyVersion',
    'overallSimilarity',v_score,'sourceCount',v_source_count,
    'correctionOfVerificationId',v_correction,'publicSchemaVersion',p_public_schema_version
  );
  v_manifest_hash := encode(extensions.digest(convert_to(v_manifest::text,'UTF8'),'sha256'),'hex');

  update public.verification_runs set
    status='succeeded',document_hash=v_document_hash,canonical_document_hash=v_document_hash,
    evidence_hash=v_evidence_hash,result_hash=v_result_hash,manifest_hash=v_manifest_hash,
    engine_version=p_result->>'engineVersion',policy_version=p_result->>'policyVersion',
    result=jsonb_build_object('deterministicResult',p_result,
      'correctionOfVerificationId',v_correction,'publicSchemaVersion',p_public_schema_version),
    completed_at=now()
  where id=v_run.id;

  if p_source_upload_id is not null then
    update public.verify_document_uploads set verification_run_id=v_run.id where id=p_source_upload_id;
  end if;

  perform private.publish_public_verification_receipt(
    v_run.id,v_verification_id,v_score,v_source_count,p_public_schema_version
  );

  select * into v_receipt from public.public_verification_records where verification_id=v_verification_id;
  if not found or not private.verification_run_hashes_match(v_run.id) then
    raise exception 'VERIFICATION_RUN_RECEIPT_POST_WRITE_INTEGRITY_FAILED';
  end if;

  return jsonb_build_object('status','CREATED','record',jsonb_build_object(
    'id',v_receipt.id,'verification_id',v_receipt.verification_id,
    'document_hash',v_receipt.document_hash,'evidence_hash',v_receipt.evidence_hash,
    'engine_version',v_receipt.engine_version,'policy_version',v_receipt.policy_version,
    'overall_similarity',v_receipt.overall_similarity,'total_sources_found',v_receipt.total_sources_found,
    'verification_run_id',v_receipt.verification_run_id,'result_hash',v_receipt.result_hash,
    'manifest_hash',v_receipt.manifest_hash,'status',v_receipt.status,
    'public_schema_version',v_receipt.public_schema_version,'created_at',v_receipt.created_at
  ));
end;
$function$;
