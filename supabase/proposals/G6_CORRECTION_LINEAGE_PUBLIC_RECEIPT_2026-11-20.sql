-- =============================================================================
-- REVIEW-ONLY PROPOSAL. DO NOT APPLY.
-- Gradifi HOEOS G6/G7 receipt lineage reconciliation against production baseline.
-- Target project: ehkmfnaqkdgkjmdxxbwj
--
-- This file is intentionally under supabase/proposals/, NOT supabase/migrations/.
-- It must be reviewed, approved and assigned a production migration version before
-- it is moved into the migration stream. No production SQL was executed to create it.
--
-- Preconditions:
-- 1. The trusted server persistence path creates a succeeded verification_runs row.
-- 2. It computes result_hash and manifest_hash using a separately approved,
--    deterministic application hash contract.
-- 3. It inserts a public_verification_records row linked to that run and sets
--    status='VALID' plus a non-empty public_schema_version.
-- 4. For corrections, it sets BOTH receipt.correction_of_verification_id and
--    child_run.parent_run_id to the same parent receipt/run pair.
-- 5. The service-role write path remains INSERT/SELECT only on
--    public_verification_records. No browser role receives direct table access.
--
-- Existing production rows are deliberately NOT backfilled. Production currently
-- has 68 receipt rows, all with NULL status, verification_run_id, result_hash,
-- manifest_hash and public_schema_version. No integrity metadata is fabricated.
-- =============================================================================

begin;

-- Fail closed if the expected production objects or existing constraints differ.
do $preflight$
begin
  if to_regclass('public.public_verification_records') is null then
    raise exception 'G6_PRECHECK_FAILED: public_verification_records is missing';
  end if;
  if to_regclass('public.verification_runs') is null then
    raise exception 'G6_PRECHECK_FAILED: verification_runs is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.public_verification_records'::regclass
      and conname = 'public_verification_records_verification_id_key'
      and contype = 'u'
  ) then
    raise exception 'G6_PRECHECK_FAILED: verification_id unique constraint is missing';
  end if;

  if exists (
    select 1
    from public.public_verification_records r
    where r.verification_run_id is not null
      and not exists (
        select 1 from public.verification_runs vr where vr.id = r.verification_run_id
      )
  ) then
    raise exception 'G6_PRECHECK_FAILED: orphan verification_run_id values exist';
  end if;

  if exists (
    select 1
    from public.public_verification_records r
    where r.status is not null
      and r.status not in ('VALID','REVOKED','EXPIRED','NOT_FOUND','UNAVAILABLE')
  ) then
    raise exception 'G6_PRECHECK_FAILED: unexpected receipt status value exists';
  end if;
end
$preflight$;

-- G6 receipt lineage: a corrected receipt points to its immutable parent receipt.
alter table public.public_verification_records
  add column if not exists correction_of_verification_id text null;

-- Bind every non-null receipt run ID to an actual canonical verification run.
-- The production column is currently nullable and existing rows are all NULL.
do $run_fk$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.public_verification_records'::regclass
      and conname = 'public_verification_records_verification_run_id_fkey'
  ) then
    alter table public.public_verification_records
      add constraint public_verification_records_verification_run_id_fkey
      foreign key (verification_run_id)
      references public.verification_runs(id)
      on update restrict
      on delete restrict
      not valid;
  end if;
end
$run_fk$;

-- Correction parent must be an existing receipt, must have a valid public ID,
-- and must not point to the same receipt.
do $correction_constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.public_verification_records'::regclass
      and conname = 'public_verification_records_correction_parent_fkey'
  ) then
    alter table public.public_verification_records
      add constraint public_verification_records_correction_parent_fkey
      foreign key (correction_of_verification_id)
      references public.public_verification_records(verification_id)
      on update restrict
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.public_verification_records'::regclass
      and conname = 'public_verification_records_correction_parent_format_ck'
  ) then
    alter table public.public_verification_records
      add constraint public_verification_records_correction_parent_format_ck
      check (
        correction_of_verification_id is null
        or correction_of_verification_id ~ '^VRF-[0-9A-F]{12}$'
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.public_verification_records'::regclass
      and conname = 'public_verification_records_no_self_correction_ck'
  ) then
    alter table public.public_verification_records
      add constraint public_verification_records_no_self_correction_ck
      check (
        correction_of_verification_id is null
        or upper(correction_of_verification_id) <> upper(verification_id)
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.public_verification_records'::regclass
      and conname = 'public_verification_records_correction_requires_run_ck'
  ) then
    alter table public.public_verification_records
      add constraint public_verification_records_correction_requires_run_ck
      check (
        correction_of_verification_id is null
        or verification_run_id is not null
      )
      not valid;
  end if;
end
$correction_constraints$;

-- A receipt may be marked VALID only when it has the complete run/hash projection
-- required by the public receipt RPC. Existing NULL-status legacy rows remain intact.
do $valid_receipt_ck$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.public_verification_records'::regclass
      and conname = 'public_verification_records_valid_requires_run_hashes_ck'
  ) then
    alter table public.public_verification_records
      add constraint public_verification_records_valid_requires_run_hashes_ck
      check (
        status is distinct from 'VALID'
        or (
          verification_run_id is not null
          and nullif(btrim(result_hash), '') is not null
          and nullif(btrim(manifest_hash), '') is not null
          and nullif(btrim(public_schema_version), '') is not null
        )
      )
      not valid;
  end if;
end
$valid_receipt_ck$;

-- verification_runs has service_role UPDATE/DELETE privileges in production.
-- Preserve queued/running lifecycle updates, but freeze evidence and lineage once
-- a run reaches succeeded/superseded. A correction creates a new child run; it
-- never edits the original run's evidence or parent pointer.
create or replace function public.guard_completed_verification_run_immutability()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if tg_op = 'DELETE' then
    if old.status in ('succeeded', 'superseded') then
      raise exception 'COMPLETED_VERIFICATION_RUN_IMMUTABLE';
    end if;
    return old;
  end if;

  if old.status in ('succeeded', 'superseded') then
    if new.status not in (old.status, 'superseded')
       or row(
         new.institution_id,
         new.school_id,
         new.service_version_id,
         new.verification_id,
         new.source_submission_id,
         new.document_hash,
         new.canonical_document_hash,
         new.evidence_hash,
         new.manifest_hash,
         new.result_hash,
         new.engine_version,
         new.policy_version,
         new.parent_run_id,
         new.result
       ) is distinct from row(
         old.institution_id,
         old.school_id,
         old.service_version_id,
         old.verification_id,
         old.source_submission_id,
         old.document_hash,
         old.canonical_document_hash,
         old.evidence_hash,
         old.manifest_hash,
         old.result_hash,
         old.engine_version,
         old.policy_version,
         old.parent_run_id,
         old.result
       ) then
      raise exception 'COMPLETED_VERIFICATION_RUN_IMMUTABLE';
    end if;
  end if;

  return new;
end
$function$;

revoke all on function public.guard_completed_verification_run_immutability()
  from public, anon, authenticated;

drop trigger if exists verification_runs_completed_immutability
  on public.verification_runs;

create trigger verification_runs_completed_immutability
before update or delete on public.verification_runs
for each row
execute function public.guard_completed_verification_run_immutability();

-- The production preflight above guarantees existing non-null run references are
-- valid. Validate the new constraints before committing the proposal.
alter table public.public_verification_records
  validate constraint public_verification_records_verification_run_id_fkey;
alter table public.public_verification_records
  validate constraint public_verification_records_correction_parent_fkey;
alter table public.public_verification_records
  validate constraint public_verification_records_correction_parent_format_ck;
alter table public.public_verification_records
  validate constraint public_verification_records_no_self_correction_ck;
alter table public.public_verification_records
  validate constraint public_verification_records_correction_requires_run_ck;
alter table public.public_verification_records
  validate constraint public_verification_records_valid_requires_run_hashes_ck;

create index if not exists idx_pvr_correction_parent
  on public.public_verification_records(correction_of_verification_id)
  where correction_of_verification_id is not null;

create index if not exists idx_pvr_verification_run
  on public.public_verification_records(verification_run_id)
  where verification_run_id is not null;

create index if not exists idx_verification_runs_parent_run
  on public.verification_runs(parent_run_id)
  where parent_run_id is not null;

comment on column public.public_verification_records.correction_of_verification_id is
  'G6 lineage pointer to the immutable parent receipt; public exposure is via lookup_public_verification only.';

-- Public receipt lookup is a SECURITY DEFINER allowlist. Do not grant anon or
-- authenticated direct SELECT on evidence_envelope or the correction column.
-- Legacy rows with NULL run/hash/schema metadata remain NOT_FOUND by design.
create or replace function public.lookup_public_verification(p_verification_id text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'verificationId', r.verification_id,
    'documentHash', r.document_hash,
    'evidenceHash', r.evidence_hash,
    'resultHash', r.result_hash,
    'manifestHash', r.manifest_hash,
    'engineVersion', r.engine_version,
    'policyVersion', r.policy_version,
    'overallSimilarity', r.overall_similarity,
    'sourceCount', r.total_sources_found,
    'createdAt', r.created_at,
    'schemaVersion', r.public_schema_version,
    'correctionOfVerificationId', r.correction_of_verification_id
  )
  from public.public_verification_records r
  join public.verification_runs vr
    on vr.id = r.verification_run_id
  where r.verification_id = p_verification_id
    and r.status = 'VALID'
    and r.verification_run_id is not null
    and nullif(btrim(r.result_hash), '') is not null
    and nullif(btrim(r.manifest_hash), '') is not null
    and nullif(btrim(r.public_schema_version), '') is not null
    and vr.status in ('succeeded', 'superseded')
    and vr.verification_id = r.verification_id
    and vr.document_hash = r.document_hash
    and vr.evidence_hash = r.evidence_hash
    and vr.result_hash = r.result_hash
    and vr.manifest_hash = r.manifest_hash
    and (
      r.correction_of_verification_id is null
      or exists (
        select 1
        from public.public_verification_records parent
        join public.verification_runs parent_run
          on parent_run.id = parent.verification_run_id
        where parent.verification_id = r.correction_of_verification_id
          and parent.status = 'VALID'
          and parent.verification_run_id is not null
          and parent_run.status in ('succeeded', 'superseded')
          and vr.parent_run_id = parent_run.id
      )
    )
  limit 1;
$function$;

revoke all on function public.lookup_public_verification(text)
  from public, anon, authenticated;
grant execute on function public.lookup_public_verification(text)
  to anon, authenticated;

-- Explicitly do not add direct column SELECT grants for
-- correction_of_verification_id, evidence_envelope, or other private columns.
-- Existing public_verification_records RLS remains enabled with no browser SELECT
-- policy. The RPC is the sole public resolution path.

commit;
