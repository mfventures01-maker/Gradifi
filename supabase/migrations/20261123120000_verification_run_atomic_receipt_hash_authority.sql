-- HOEOS G8: one trusted transaction creates the authoritative run and public receipt.
-- G5's 16-character deterministic fingerprints remain in the submitted result.
-- The database independently creates 64-character SHA-256 hashes for the durable record.

create or replace function private.verification_run_hashes_match(p_run_id uuid)
returns boolean
language plpgsql stable security definer
set search_path = ''
as $function$
declare
  v_run public.verification_runs%rowtype;
  v_result jsonb;
  v_correction text;
  v_schema text;
  v_result_hash text;
  v_evidence_hash text;
  v_manifest jsonb;
  v_manifest_hash text;
begin
  select * into v_run from public.verification_runs where id = p_run_id;
  if not found or v_run.status <> 'succeeded' or v_run.result is null
     or jsonb_typeof(v_run.result->'deterministicResult') is distinct from 'object'
     or not (v_run.result ? 'correctionOfVerificationId') then
    return false;
  end if;

  v_result := v_run.result->'deterministicResult';
  v_correction := v_run.result->>'correctionOfVerificationId';
  v_schema := v_run.result->>'publicSchemaVersion';

  if v_schema is null
     or v_run.document_hash !~ '^[a-f0-9]{64}$'
     or v_run.canonical_document_hash is distinct from v_run.document_hash
     or v_run.evidence_hash !~ '^[a-f0-9]{64}$'
     or v_run.result_hash !~ '^[a-f0-9]{64}$'
     or v_run.manifest_hash !~ '^[a-f0-9]{64}$'
     or v_run.engine_version is distinct from v_result->>'engineVersion'
     or v_run.policy_version is distinct from v_result->>'policyVersion'
     or v_run.verification_id is distinct from
        ('VRF-' || upper(substr(v_run.document_hash,1,8) || substr(v_run.evidence_hash,1,4))) then
    return false;
  end if;

  v_result_hash := encode(
    extensions.digest(convert_to(v_result::text, 'UTF8'), 'sha256'), 'hex'
  );
  v_evidence_hash := encode(
    extensions.digest(
      convert_to(jsonb_build_object(
        'documentHash', v_run.document_hash,
        'deterministicResult', v_result,
        'correctionOfVerificationId', v_correction
      )::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  v_manifest := jsonb_build_object(
    'verificationRunId', v_run.id,
    'verificationId', v_run.verification_id,
    'documentHash', v_run.document_hash,
    'evidenceHash', v_run.evidence_hash,
    'resultHash', v_run.result_hash,
    'engineVersion', v_run.engine_version,
    'policyVersion', v_run.policy_version,
    'overallSimilarity', (v_result->>'overallSimilarity')::numeric,
    'sourceCount', (v_result->>'totalSourcesFound')::integer,
    'correctionOfVerificationId', v_correction,
    'publicSchemaVersion', v_schema
  );
  v_manifest_hash := encode(
    extensions.digest(convert_to(v_manifest::text, 'UTF8'), 'sha256'), 'hex'
  );

  return v_run.result_hash = v_result_hash
     and v_run.evidence_hash = v_evidence_hash
     and v_run.manifest_hash = v_manifest_hash;
exception when others then
  return false;
end;
$function$;

revoke all on function private.verification_run_hashes_match(uuid)
  from public, anon, authenticated;

create or replace function private.guard_public_verification_receipt()
returns trigger
language plpgsql security definer
set search_path = ''
as $function$
declare
  v_run public.verification_runs%rowtype;
  v_parent public.public_verification_records%rowtype;
  v_parent_run public.verification_runs%rowtype;
  v_correction text;
  v_expected jsonb;
begin
  if tg_op = 'DELETE' then
    raise exception 'PUBLIC_RECEIPT_DELETE_PROHIBITED';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.verification_id is distinct from old.verification_id
       or new.document_hash is distinct from old.document_hash
       or new.evidence_hash is distinct from old.evidence_hash
       or new.engine_version is distinct from old.engine_version
       or new.policy_version is distinct from old.policy_version
       or new.overall_similarity is distinct from old.overall_similarity
       or new.total_sources_found is distinct from old.total_sources_found
       or new.evidence_envelope is distinct from old.evidence_envelope
       or new.verification_run_id is distinct from old.verification_run_id
       or new.result_hash is distinct from old.result_hash
       or new.manifest_hash is distinct from old.manifest_hash
       or new.public_schema_version is distinct from old.public_schema_version
       or new.created_at is distinct from old.created_at then
      raise exception 'PUBLIC_RECEIPT_IDENTITY_IMMUTABLE';
    end if;
    if old.status <> 'VALID' or new.status not in ('REVOKED','EXPIRED') then
      raise exception 'PUBLIC_RECEIPT_INVALID_STATUS_TRANSITION';
    end if;
    return new;
  end if;

  if new.status <> 'VALID' or new.verification_run_id is null
     or new.result_hash is null or new.manifest_hash is null
     or new.public_schema_version is null then
    raise exception 'PUBLIC_RECEIPT_REQUIRED_FIELDS_MISSING';
  end if;

  select * into v_run from public.verification_runs where id = new.verification_run_id;
  if not found or v_run.status <> 'succeeded'
     or v_run.document_hash is distinct from new.document_hash
     or v_run.evidence_hash is distinct from new.evidence_hash
     or v_run.result_hash is distinct from new.result_hash
     or v_run.manifest_hash is distinct from new.manifest_hash
     or v_run.engine_version is distinct from new.engine_version
     or v_run.policy_version is distinct from new.policy_version
     or not private.verification_run_hashes_match(v_run.id) then
    raise exception 'PUBLIC_RECEIPT_RUN_OR_HASH_MISMATCH';
  end if;

  v_correction := v_run.result->>'correctionOfVerificationId';
  if v_correction is not null then
    select * into v_parent
    from public.public_verification_records
    where verification_id = v_correction and status = 'VALID';
    if not found or v_parent.verification_run_id is null
       or v_run.parent_run_id is distinct from v_parent.verification_run_id then
      raise exception 'PUBLIC_RECEIPT_CORRECTION_PARENT_INVALID';
    end if;
    select * into v_parent_run from public.verification_runs where id = v_parent.verification_run_id;
    if not found or v_parent_run.workspace_id is distinct from v_run.workspace_id
       or v_parent_run.created_by_user_id is distinct from v_run.created_by_user_id
       or not private.verification_run_hashes_match(v_parent_run.id) then
      raise exception 'PUBLIC_RECEIPT_CORRECTION_PARENT_SCOPE_INVALID';
    end if;
  elsif v_run.parent_run_id is not null then
    raise exception 'PUBLIC_RECEIPT_CORRECTION_PARENT_MISSING';
  end if;

  v_expected := jsonb_build_object(
    'schemaVersion', new.public_schema_version,
    'verificationId', new.verification_id,
    'resultHash', new.result_hash,
    'manifestHash', new.manifest_hash,
    'engineVersion', new.engine_version,
    'policyVersion', new.policy_version,
    'overallSimilarity', new.overall_similarity,
    'sourceCount', new.total_sources_found,
    'correctionOfVerificationId', v_correction
  );
  if new.evidence_envelope is distinct from v_expected then
    raise exception 'PUBLIC_RECEIPT_ENVELOPE_NOT_ALLOWLISTED';
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_public_verification_receipt()
  from public, anon, authenticated;

create or replace function private.publish_public_verification_receipt(
  p_verification_run_id uuid,
  p_verification_id text,
  p_overall_similarity numeric,
  p_total_sources_found integer,
  p_public_schema_version text default 'SEFAES-PUBLIC-RECEIPT-v1'
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $function$
declare
  v_run public.verification_runs%rowtype;
  v_record_id uuid;
  v_existing public.public_verification_records%rowtype;
  v_correction text;
  v_envelope jsonb;
begin
  if p_verification_run_id is null or nullif(trim(p_verification_id),'') is null
     or p_overall_similarity is null or p_overall_similarity < 0 or p_overall_similarity > 100
     or p_total_sources_found is null or p_total_sources_found < 0
     or nullif(trim(p_public_schema_version),'') is null then
    raise exception 'PUBLIC_RECEIPT_INVALID_INPUT';
  end if;

  select * into v_run from public.verification_runs
  where id = p_verification_run_id for update;
  if not found or v_run.status <> 'succeeded'
     or not private.verification_run_hashes_match(v_run.id) then
    raise exception 'VERIFICATION_RUN_NOT_SUCCESSFUL_OR_HASH_INVALID';
  end if;

  if (v_run.result->'deterministicResult'->>'overallSimilarity')::numeric
       is distinct from p_overall_similarity
     or (v_run.result->'deterministicResult'->>'totalSourcesFound')::integer
       is distinct from p_total_sources_found
     or v_run.result->>'publicSchemaVersion' is distinct from p_public_schema_version then
    raise exception 'PUBLIC_RECEIPT_RESULT_OR_MANIFEST_MISMATCH';
  end if;

  v_correction := v_run.result->>'correctionOfVerificationId';
  v_envelope := jsonb_build_object(
    'schemaVersion', p_public_schema_version,
    'verificationId', trim(p_verification_id),
    'resultHash', v_run.result_hash,
    'manifestHash', v_run.manifest_hash,
    'engineVersion', v_run.engine_version,
    'policyVersion', v_run.policy_version,
    'overallSimilarity', p_overall_similarity,
    'sourceCount', p_total_sources_found,
    'correctionOfVerificationId', v_correction
  );

  insert into public.public_verification_records(
    verification_id, document_hash, evidence_hash, engine_version, policy_version,
    overall_similarity, total_sources_found, evidence_envelope, verification_run_id,
    result_hash, manifest_hash, status, public_schema_version
  )
  values(
    trim(p_verification_id), v_run.document_hash, v_run.evidence_hash,
    v_run.engine_version, v_run.policy_version, p_overall_similarity,
    p_total_sources_found, v_envelope, v_run.id, v_run.result_hash,
    v_run.manifest_hash, 'VALID', p_public_schema_version
  )
  on conflict (verification_id) do nothing
  returning id into v_record_id;

  if v_record_id is null then
    select * into v_existing from public.public_verification_records
    where verification_id = trim(p_verification_id);
    if not found or v_existing.verification_run_id is distinct from v_run.id
       or v_existing.document_hash is distinct from v_run.document_hash
       or v_existing.evidence_hash is distinct from v_run.evidence_hash
       or v_existing.result_hash is distinct from v_run.result_hash
       or v_existing.manifest_hash is distinct from v_run.manifest_hash
       or v_existing.status <> 'VALID' then
      raise exception 'PUBLIC_RECEIPT_ID_ALREADY_USED';
    end if;
    return jsonb_build_object('receipt_id', v_existing.id,
      'verification_id', v_existing.verification_id,
      'verification_run_id', v_run.id, 'status', 'already_published',
      'public_schema_version', v_existing.public_schema_version);
  end if;

  return jsonb_build_object('receipt_id', v_record_id,
    'verification_id', trim(p_verification_id),
    'verification_run_id', v_run.id, 'status', 'VALID',
    'public_schema_version', p_public_schema_version);
end;
$function$;

revoke all on function private.publish_public_verification_receipt(uuid,text,numeric,integer,text)
  from public, anon, authenticated;
grant execute on function private.publish_public_verification_receipt(uuid,text,numeric,integer,text)
  to service_role;

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

revoke all on function private.persist_verification_run_and_receipt(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,text)
  from public, anon, authenticated;

create or replace function public.persist_verification_run_and_receipt(
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
returns jsonb language sql security definer set search_path = ''
as $function$
  select private.persist_verification_run_and_receipt(
    p_workspace_id,p_created_by_user_id,p_service_version_id,p_school_id,
    p_source_upload_id,p_correction_of_verification_id,p_raw_text,p_result,p_public_schema_version
  );
$function$;

revoke all on function public.persist_verification_run_and_receipt(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,text)
  from public, anon, authenticated;
grant execute on function public.persist_verification_run_and_receipt(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,text)
  to service_role;

create or replace function public.lookup_public_verification(p_verification_id text)
returns jsonb language sql stable security definer set search_path = ''
as $function$
  select jsonb_build_object(
    'verificationId',r.verification_id,'documentHash',r.document_hash,
    'evidenceHash',r.evidence_hash,'engineVersion',r.engine_version,
    'policyVersion',r.policy_version,'overallSimilarity',r.overall_similarity,
    'sourceCount',r.total_sources_found,'resultHash',r.result_hash,
    'manifestHash',r.manifest_hash,'schemaVersion',r.public_schema_version,
    'correctionOfVerificationId',vr.result->>'correctionOfVerificationId',
    'createdAt',r.created_at
  )
  from public.public_verification_records r
  join public.verification_runs vr on vr.id=r.verification_run_id
  where r.verification_id=upper(trim(p_verification_id))
    and r.status='VALID'
    and r.document_hash=vr.document_hash
    and r.evidence_hash=vr.evidence_hash
    and r.result_hash=vr.result_hash
    and r.manifest_hash=vr.manifest_hash
    and r.engine_version=vr.engine_version
    and r.policy_version=vr.policy_version
    and r.evidence_envelope=jsonb_build_object(
      'schemaVersion',r.public_schema_version,'verificationId',r.verification_id,
      'resultHash',r.result_hash,'manifestHash',r.manifest_hash,
      'engineVersion',r.engine_version,'policyVersion',r.policy_version,
      'overallSimilarity',r.overall_similarity,'sourceCount',r.total_sources_found,
      'correctionOfVerificationId',vr.result->>'correctionOfVerificationId'
    )
    and private.verification_run_hashes_match(vr.id)
  limit 1;
$function$;

revoke all on function public.lookup_public_verification(text)
  from public, anon, authenticated;
grant execute on function public.lookup_public_verification(text)
  to anon, authenticated, service_role;
