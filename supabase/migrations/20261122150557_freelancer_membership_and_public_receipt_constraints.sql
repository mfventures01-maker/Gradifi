-- Enforce active membership for individual uploads and verification runs, including service-role writes.
create or replace function private.enforce_verification_run_lifecycle()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_workspace public.workspaces%rowtype; v_parent public.verification_runs%rowtype;
  v_upload public.verify_document_uploads%rowtype; v_correction public.correction_versions%rowtype;
begin
  if tg_op='UPDATE' then
    if old.status in ('succeeded','failed','superseded','cancelled') then raise exception 'VERIFICATION_RUN_TERMINAL_IMMUTABLE'; end if;
    if new.workspace_id is distinct from old.workspace_id or new.created_by_user_id is distinct from old.created_by_user_id
      or new.institution_id is distinct from old.institution_id or new.school_id is distinct from old.school_id
      or new.source_submission_id is distinct from old.source_submission_id or new.parent_run_id is distinct from old.parent_run_id
      or new.attempt is distinct from old.attempt or new.service_version_id is distinct from old.service_version_id
      or new.source_upload_id is distinct from old.source_upload_id or new.correction_version_id is distinct from old.correction_version_id then
      raise exception 'VERIFICATION_RUN_IDENTITY_IMMUTABLE';
    end if;
    if old.status='queued' and new.status not in ('queued','running','failed','cancelled') then raise exception 'VERIFICATION_RUN_INVALID_STATUS_TRANSITION'; end if;
    if old.status='running' and new.status not in ('running','succeeded','failed','cancelled') then raise exception 'VERIFICATION_RUN_INVALID_STATUS_TRANSITION'; end if;
    return new;
  end if;
  if new.created_by_user_id is null then raise exception 'VERIFICATION_RUN_CREATOR_REQUIRED'; end if;
  select * into v_workspace from public.workspaces where id=new.workspace_id;
  if not found or v_workspace.status<>'active' then raise exception 'VERIFICATION_RUN_WORKSPACE_NOT_ACTIVE'; end if;
  if v_workspace.workspace_type='individual' then
    if v_workspace.owner_user_id is distinct from new.created_by_user_id or new.institution_id is not null
      or not exists(select 1 from public.workspace_members wm where wm.workspace_id=new.workspace_id and wm.user_id=new.created_by_user_id and wm.status='active') then
      raise exception 'VERIFICATION_RUN_INDIVIDUAL_OWNER_OR_MEMBERSHIP_MISMATCH';
    end if;
  elsif v_workspace.workspace_type='institution' then
    if new.institution_id is distinct from v_workspace.institution_id or not exists(
      select 1 from public.workspace_members wm where wm.workspace_id=new.workspace_id and wm.user_id=new.created_by_user_id and wm.status='active'
    ) then raise exception 'VERIFICATION_RUN_INSTITUTION_MEMBER_MISMATCH'; end if;
  else raise exception 'VERIFICATION_RUN_WORKSPACE_TYPE_INVALID'; end if;
  if new.parent_run_id is not null then
    select * into v_parent from public.verification_runs where id=new.parent_run_id;
    if not found or v_parent.workspace_id<>new.workspace_id or v_parent.created_by_user_id<>new.created_by_user_id or new.attempt<>v_parent.attempt+1 then raise exception 'VERIFICATION_RUN_PARENT_LINEAGE_INVALID'; end if;
  elsif new.attempt<>1 then raise exception 'VERIFICATION_RUN_ROOT_ATTEMPT_INVALID'; end if;
  if new.source_upload_id is not null then
    select * into v_upload from public.verify_document_uploads where id=new.source_upload_id;
    if not found or v_upload.workspace_id<>new.workspace_id or v_upload.owner_user_id<>new.created_by_user_id then raise exception 'VERIFICATION_RUN_UPLOAD_SCOPE_INVALID'; end if;
  end if;
  if new.correction_version_id is not null then
    select * into v_correction from public.correction_versions where id=new.correction_version_id;
    if not found or v_correction.workspace_id<>new.workspace_id or v_correction.owner_user_id<>new.created_by_user_id or v_correction.version_kind<>'correction' then raise exception 'VERIFICATION_RUN_CORRECTION_SCOPE_INVALID'; end if;
  end if;
  return new;
end;
$$;

create or replace function private.validate_verify_upload_workspace_path()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_workspace public.workspaces%rowtype; v_first_segment text;
begin
  if new.bucket_id<>'verify-private' then raise exception 'VERIFY_UPLOAD_BUCKET_INVALID'; end if;
  if new.object_path is null or new.object_path='' or left(new.object_path,1)='/'
    or new.object_path ~ '(^|/)\.\.(/|$)' or split_part(new.object_path,'/',2)<>new.owner_user_id::text
    or split_part(new.object_path,'/',3)<>new.id::text or split_part(new.object_path,'/',4)='' then raise exception 'VERIFY_UPLOAD_OBJECT_PATH_INVALID'; end if;
  select * into v_workspace from public.workspaces where id=new.workspace_id;
  if not found or v_workspace.status<>'active' then raise exception 'VERIFY_UPLOAD_WORKSPACE_NOT_ACTIVE'; end if;
  v_first_segment:=split_part(new.object_path,'/',1);
  if v_workspace.workspace_type='individual' then
    if new.institution_id is not null or v_workspace.owner_user_id<>new.owner_user_id or v_first_segment<>v_workspace.id::text
      or not exists(select 1 from public.workspace_members wm where wm.workspace_id=new.workspace_id and wm.user_id=new.owner_user_id and wm.status='active') then
      raise exception 'VERIFY_UPLOAD_INDIVIDUAL_WORKSPACE_SCOPE_MISMATCH';
    end if;
  elsif v_workspace.workspace_type='institution' then
    if new.institution_id is distinct from v_workspace.institution_id or v_first_segment not in (v_workspace.institution_id::text,v_workspace.id::text)
      or not exists(select 1 from public.workspace_members wm where wm.workspace_id=new.workspace_id and wm.user_id=new.owner_user_id and wm.status='active') then
      raise exception 'VERIFY_UPLOAD_INSTITUTION_WORKSPACE_SCOPE_MISMATCH';
    end if;
  else raise exception 'VERIFY_UPLOAD_WORKSPACE_TYPE_INVALID'; end if;
  return new;
end;
$$;

alter table public.public_verification_records
  add constraint public_verification_records_provenance_state_ck
  check (
    (verification_run_id is null and result_hash is null and manifest_hash is null and status is null and public_schema_version is null)
    or
    (verification_run_id is not null and result_hash ~ '^[a-f0-9]{64}$' and manifest_hash ~ '^[a-f0-9]{64}$'
      and status='VALID' and nullif(trim(public_schema_version),'') is not null)
  ),
  add constraint public_verification_records_hash_format_ck
  check (
    document_hash ~ '^[a-f0-9]{64}$' and evidence_hash ~ '^[a-f0-9]{64}$'
    and result_hash is null or result_hash ~ '^[a-f0-9]{64}$'
  );

create or replace function private.guard_public_verification_receipt()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_run public.verification_runs%rowtype; v_expected_envelope jsonb;
begin
  if tg_op<>'INSERT' then raise exception 'PUBLIC_RECEIPT_APPEND_ONLY'; end if;
  if new.status<>'VALID' or new.verification_run_id is null or new.result_hash is null or new.manifest_hash is null or new.public_schema_version is null then raise exception 'PUBLIC_RECEIPT_REQUIRED_FIELDS_MISSING'; end if;
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
