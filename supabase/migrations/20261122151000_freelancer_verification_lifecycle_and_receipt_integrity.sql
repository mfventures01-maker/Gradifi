-- Freelancer verification lifecycle, correction-to-run lineage, receipt integrity and credit serialization.
-- Existing historical receipts are intentionally preserved and remain non-resolvable if provenance is incomplete.

create unique index if not exists verification_runs_id_workspace_creator_uidx
  on public.verification_runs(id, workspace_id, created_by_user_id);
create unique index if not exists verify_uploads_id_workspace_owner_uidx
  on public.verify_document_uploads(id, workspace_id, owner_user_id);
create unique index if not exists correction_versions_id_workspace_owner_uidx
  on public.correction_versions(id, workspace_id, owner_user_id);

alter table public.verification_runs
  add column if not exists source_upload_id uuid,
  add column if not exists correction_version_id uuid;

create unique index if not exists verification_runs_correction_version_uidx
  on public.verification_runs(correction_version_id) where correction_version_id is not null;

alter table public.verification_runs
  add constraint verification_runs_source_upload_scope_fk
  foreign key (source_upload_id, workspace_id, created_by_user_id)
  references public.verify_document_uploads(id, workspace_id, owner_user_id) on delete restrict;
alter table public.verification_runs
  add constraint verification_runs_correction_version_scope_fk
  foreign key (correction_version_id, workspace_id, created_by_user_id)
  references public.correction_versions(id, workspace_id, owner_user_id) on delete restrict;
alter table public.verify_document_uploads
  add constraint verify_uploads_run_scope_fk
  foreign key (verification_run_id, workspace_id, owner_user_id)
  references public.verification_runs(id, workspace_id, created_by_user_id) on delete restrict;
alter table public.verification_runs
  add constraint verification_runs_parent_scope_fk
  foreign key (parent_run_id, workspace_id, created_by_user_id)
  references public.verification_runs(id, workspace_id, created_by_user_id) on delete restrict;

create or replace function private.enforce_verification_run_lifecycle()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_workspace public.workspaces%rowtype;
  v_parent public.verification_runs%rowtype;
  v_upload public.verify_document_uploads%rowtype;
  v_correction public.correction_versions%rowtype;
begin
  if tg_op='UPDATE' then
    if old.status in ('succeeded','failed','superseded','cancelled') then raise exception 'VERIFICATION_RUN_TERMINAL_IMMUTABLE'; end if;
    if new.workspace_id is distinct from old.workspace_id
       or new.created_by_user_id is distinct from old.created_by_user_id
       or new.institution_id is distinct from old.institution_id
       or new.school_id is distinct from old.school_id
       or new.source_submission_id is distinct from old.source_submission_id
       or new.parent_run_id is distinct from old.parent_run_id
       or new.attempt is distinct from old.attempt
       or new.service_version_id is distinct from old.service_version_id
       or new.source_upload_id is distinct from old.source_upload_id
       or new.correction_version_id is distinct from old.correction_version_id then
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
    if v_workspace.owner_user_id is distinct from new.created_by_user_id or new.institution_id is not null then raise exception 'VERIFICATION_RUN_INDIVIDUAL_OWNER_MISMATCH'; end if;
  elsif v_workspace.workspace_type='institution' then
    if new.institution_id is distinct from v_workspace.institution_id or not exists(
      select 1 from public.workspace_members wm where wm.workspace_id=new.workspace_id and wm.user_id=new.created_by_user_id and wm.status='active'
    ) then raise exception 'VERIFICATION_RUN_INSTITUTION_MEMBER_MISMATCH'; end if;
  else raise exception 'VERIFICATION_RUN_WORKSPACE_TYPE_INVALID'; end if;
  if new.parent_run_id is not null then
    select * into v_parent from public.verification_runs where id=new.parent_run_id;
    if not found or v_parent.workspace_id<>new.workspace_id or v_parent.created_by_user_id<>new.created_by_user_id or new.attempt<>v_parent.attempt+1 then
      raise exception 'VERIFICATION_RUN_PARENT_LINEAGE_INVALID';
    end if;
  elsif new.attempt<>1 then raise exception 'VERIFICATION_RUN_ROOT_ATTEMPT_INVALID'; end if;
  if new.source_upload_id is not null then
    select * into v_upload from public.verify_document_uploads where id=new.source_upload_id;
    if not found or v_upload.workspace_id<>new.workspace_id or v_upload.owner_user_id<>new.created_by_user_id then raise exception 'VERIFICATION_RUN_UPLOAD_SCOPE_INVALID'; end if;
  end if;
  if new.correction_version_id is not null then
    select * into v_correction from public.correction_versions where id=new.correction_version_id;
    if not found or v_correction.workspace_id<>new.workspace_id or v_correction.owner_user_id<>new.created_by_user_id or v_correction.version_kind<>'correction' then
      raise exception 'VERIFICATION_RUN_CORRECTION_SCOPE_INVALID';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_verification_run_lifecycle() from public,anon,authenticated;
drop trigger if exists verification_run_lifecycle_guard on public.verification_runs;
create trigger verification_run_lifecycle_guard before insert or update on public.verification_runs
for each row execute function private.enforce_verification_run_lifecycle();

create or replace function private.validate_verify_upload_workspace_path()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_workspace public.workspaces%rowtype; v_first_segment text;
begin
  if new.bucket_id<>'verify-private' then raise exception 'VERIFY_UPLOAD_BUCKET_INVALID'; end if;
  if new.object_path is null or new.object_path='' or left(new.object_path,1)='/'
     or new.object_path ~ '(^|/)\.\.(/|$)'
     or split_part(new.object_path,'/',2)<>new.owner_user_id::text
     or split_part(new.object_path,'/',3)<>new.id::text
     or split_part(new.object_path,'/',4)='' then raise exception 'VERIFY_UPLOAD_OBJECT_PATH_INVALID'; end if;
  select * into v_workspace from public.workspaces where id=new.workspace_id;
  if not found or v_workspace.status<>'active' then raise exception 'VERIFY_UPLOAD_WORKSPACE_NOT_ACTIVE'; end if;
  v_first_segment:=split_part(new.object_path,'/',1);
  if v_workspace.workspace_type='individual' then
    if new.institution_id is not null or v_workspace.owner_user_id<>new.owner_user_id or v_first_segment<>v_workspace.id::text then
      raise exception 'VERIFY_UPLOAD_INDIVIDUAL_WORKSPACE_SCOPE_MISMATCH';
    end if;
  elsif v_workspace.workspace_type='institution' then
    if new.institution_id is distinct from v_workspace.institution_id
       or v_first_segment not in (v_workspace.institution_id::text,v_workspace.id::text)
       or not exists(select 1 from public.workspace_members wm where wm.workspace_id=new.workspace_id and wm.user_id=new.owner_user_id and wm.status='active') then
      raise exception 'VERIFY_UPLOAD_INSTITUTION_WORKSPACE_SCOPE_MISMATCH';
    end if;
  else raise exception 'VERIFY_UPLOAD_WORKSPACE_TYPE_INVALID'; end if;
  return new;
end;
$$;

create or replace function private.create_correction_verification_run(
  p_correction_version_id uuid,p_actor_user_id uuid,p_service_version_id uuid,p_source_upload_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_version public.correction_versions%rowtype;
  v_session public.correction_sessions%rowtype;
  v_parent public.verification_runs%rowtype;
  v_new_run_id uuid;
begin
  if p_correction_version_id is null or p_actor_user_id is null or p_service_version_id is null then raise exception 'CORRECTION_RUN_INVALID_INPUT'; end if;
  select * into v_version from public.correction_versions where id=p_correction_version_id for update;
  if not found then raise exception 'CORRECTION_VERSION_NOT_FOUND'; end if;
  if v_version.version_kind<>'correction' then raise exception 'CORRECTION_VERSION_REQUIRED'; end if;
  select * into v_session from public.correction_sessions where id=v_version.session_id for update;
  if not found or v_session.owner_user_id<>p_actor_user_id then raise exception 'CORRECTION_SESSION_OWNER_MISMATCH'; end if;
  if v_session.status<>'open' then raise exception 'CORRECTION_SESSION_NOT_OPEN'; end if;
  if v_version.version_number<>v_session.current_version then raise exception 'CORRECTION_VERSION_NOT_CURRENT'; end if;
  if exists(select 1 from public.verification_runs where correction_version_id=v_version.id) then raise exception 'CORRECTION_VERSION_ALREADY_HAS_RUN'; end if;
  select * into v_parent from public.verification_runs where id=v_session.verification_run_id;
  if not found or v_parent.workspace_id<>v_session.workspace_id or v_parent.created_by_user_id<>v_session.owner_user_id then raise exception 'CORRECTION_PARENT_RUN_SCOPE_INVALID'; end if;
  if p_source_upload_id is not null and not exists(select 1 from public.verify_document_uploads u where u.id=p_source_upload_id and u.workspace_id=v_session.workspace_id and u.owner_user_id=v_session.owner_user_id) then
    raise exception 'CORRECTION_UPLOAD_SCOPE_INVALID';
  end if;
  insert into public.verification_runs(workspace_id,institution_id,school_id,service_version_id,source_submission_id,status,attempt,parent_run_id,created_by_user_id,source_upload_id,correction_version_id)
  values(v_parent.workspace_id,v_parent.institution_id,v_parent.school_id,p_service_version_id,v_parent.source_submission_id,'queued',v_parent.attempt+1,v_parent.id,v_session.owner_user_id,p_source_upload_id,v_version.id)
  returning id into v_new_run_id;
  return jsonb_build_object('verification_run_id',v_new_run_id,'parent_run_id',v_parent.id,'correction_version_id',v_version.id,'attempt',v_parent.attempt+1,'status','queued');
end;
$$;
revoke all on function private.create_correction_verification_run(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function private.create_correction_verification_run(uuid,uuid,uuid,uuid) to service_role;

create or replace function private.lock_individual_account_for_credit_ledger()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.individual_accounts where workspace_id=new.workspace_id and owner_user_id=new.owner_user_id and account_status='active' for update;
  if not found then raise exception 'CREDIT_LEDGER_ACCOUNT_NOT_ACTIVE'; end if;
  return new;
end;
$$;
revoke all on function private.lock_individual_account_for_credit_ledger() from public,anon,authenticated;
drop trigger if exists credit_ledger_account_lock on public.credit_ledger;
create trigger credit_ledger_account_lock before insert on public.credit_ledger
for each row execute function private.lock_individual_account_for_credit_ledger();

create unique index if not exists public_verification_records_run_uidx
  on public.public_verification_records(verification_run_id) where verification_run_id is not null;

create or replace function private.guard_public_verification_receipt()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_run public.verification_runs%rowtype;
begin
  if tg_op<>'INSERT' then raise exception 'PUBLIC_RECEIPT_APPEND_ONLY'; end if;
  if new.status<>'VALID' or new.verification_run_id is null or new.result_hash is null or new.manifest_hash is null or new.public_schema_version is null then
    raise exception 'PUBLIC_RECEIPT_REQUIRED_FIELDS_MISSING';
  end if;
  select * into v_run from public.verification_runs where id=new.verification_run_id;
  if not found or v_run.status<>'succeeded' or v_run.document_hash is distinct from new.document_hash
     or v_run.evidence_hash is distinct from new.evidence_hash or v_run.result_hash is distinct from new.result_hash
     or v_run.manifest_hash is distinct from new.manifest_hash or v_run.engine_version is distinct from new.engine_version
     or v_run.policy_version is distinct from new.policy_version then raise exception 'PUBLIC_RECEIPT_RUN_OR_HASH_MISMATCH'; end if;
  return new;
end;
$$;
revoke all on function private.guard_public_verification_receipt() from public,anon,authenticated;
drop trigger if exists public_verification_receipt_guard on public.public_verification_records;
create trigger public_verification_receipt_guard before insert or update or delete on public.public_verification_records
for each row execute function private.guard_public_verification_receipt();

create or replace function private.publish_public_verification_receipt(
  p_verification_run_id uuid,p_verification_id text,p_overall_similarity numeric,p_total_sources_found integer,
  p_public_schema_version text default 'SEFAES-PUBLIC-RECEIPT-v1'
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_run public.verification_runs%rowtype; v_record_id uuid;
begin
  if p_verification_run_id is null or nullif(trim(p_verification_id),'') is null
     or p_overall_similarity is null or p_overall_similarity<0 or p_overall_similarity>100
     or p_total_sources_found is null or p_total_sources_found<0 or nullif(trim(p_public_schema_version),'') is null then
    raise exception 'PUBLIC_RECEIPT_INVALID_INPUT';
  end if;
  select * into v_run from public.verification_runs where id=p_verification_run_id for update;
  if not found or v_run.status<>'succeeded' then raise exception 'VERIFICATION_RUN_NOT_SUCCESSFUL'; end if;
  if v_run.document_hash is null or v_run.evidence_hash is null or v_run.result_hash is null or v_run.manifest_hash is null
     or v_run.engine_version is null or v_run.policy_version is null then raise exception 'VERIFICATION_RUN_HASH_PROVENANCE_INCOMPLETE'; end if;
  insert into public.public_verification_records(verification_id,document_hash,evidence_hash,engine_version,policy_version,
    overall_similarity,total_sources_found,evidence_envelope,verification_run_id,result_hash,manifest_hash,status,public_schema_version)
  values(trim(p_verification_id),v_run.document_hash,v_run.evidence_hash,v_run.engine_version,v_run.policy_version,
    p_overall_similarity,p_total_sources_found,
    jsonb_build_object('schemaVersion',p_public_schema_version,'verificationId',trim(p_verification_id),
      'resultHash',v_run.result_hash,'manifestHash',v_run.manifest_hash,'engineVersion',v_run.engine_version,
      'policyVersion',v_run.policy_version,'overallSimilarity',p_overall_similarity,'sourceCount',p_total_sources_found),
    v_run.id,v_run.result_hash,v_run.manifest_hash,'VALID',trim(p_public_schema_version))
  returning id into v_record_id;
  return jsonb_build_object('receipt_id',v_record_id,'verification_id',trim(p_verification_id),
    'verification_run_id',v_run.id,'status','VALID','public_schema_version',p_public_schema_version);
end;
$$;
revoke all on function private.publish_public_verification_receipt(uuid,text,numeric,integer,text) from public,anon,authenticated;
grant execute on function private.publish_public_verification_receipt(uuid,text,numeric,integer,text) to service_role;

create or replace function public.lookup_public_verification(p_verification_id text)
returns jsonb language sql stable security definer set search_path = 'pg_catalog','public'
as $function$
  select jsonb_build_object('verificationId',r.verification_id,'documentHash',r.document_hash,
    'evidenceHash',r.evidence_hash,'resultHash',r.result_hash,'manifestHash',r.manifest_hash,
    'engineVersion',r.engine_version,'policyVersion',r.policy_version,'overallSimilarity',r.overall_similarity,
    'sourceCount',r.total_sources_found,'createdAt',r.created_at,'schemaVersion',r.public_schema_version)
  from public.public_verification_records r
  join public.verification_runs vr on vr.id=r.verification_run_id
  where r.verification_id=trim(p_verification_id) and r.status='VALID' and vr.status='succeeded'
    and r.verification_run_id is not null and r.document_hash is not null and r.evidence_hash is not null
    and r.result_hash is not null and r.manifest_hash is not null and r.public_schema_version is not null
    and r.result_hash=vr.result_hash and r.manifest_hash=vr.manifest_hash
  limit 1;
$function$;
revoke all on function public.lookup_public_verification(text) from public,anon,authenticated;
grant execute on function public.lookup_public_verification(text) to anon,authenticated;
revoke all on public.public_verification_records from public,anon,authenticated;
