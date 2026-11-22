-- F1: Universal workspace foundation and institutional compatibility.
-- Draft reviewed against live Supabase schema on 2026-11-22.
-- IMPORTANT: Do not deploy until repository/live migration history is reconciled.
-- Scope: workspace tables, institutional workspace/member backfill, verification ownership.
-- Explicitly excludes RLS, Edge Functions, Storage, receipts, billing and application code.

begin;

-- Capture historical row identities and evidence hashes before any data changes.
create temporary table f1_verification_runs_before on commit drop as
select id, document_hash, canonical_document_hash, evidence_hash, manifest_hash, result_hash
from public.verification_runs;

create temporary table f1_verify_uploads_before on commit drop as
select id, source_file_sha256, extracted_text_sha256, canonical_document_hash
from public.verify_document_uploads;

create temporary table f1_institutions_before on commit drop as
select id, name, status, type from public.institutions;

create temporary table f1_institution_memberships_before on commit drop as
select id, user_id, institution_id, role, status
from public.institution_memberships;

-- 1. Universal workspace root.
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_type text not null,
  institution_id uuid null references public.institutions(id) on delete restrict,
  owner_user_id uuid null references auth.users(id) on delete restrict,
  display_name text not null,
  status text not null default 'active',
  created_by_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_type_check
    check (workspace_type in ('individual','institution')),
  constraint workspaces_status_check
    check (status in ('pending','active','suspended','rejected','archived')),
  constraint workspaces_identity_shape_check check (
    (workspace_type = 'individual'
      and owner_user_id is not null
      and institution_id is null)
    or
    (workspace_type = 'institution'
      and institution_id is not null
      and owner_user_id is null)
  ),
  constraint workspaces_display_name_nonempty_check
    check (length(btrim(display_name)) > 0)
);

create unique index workspaces_one_institution_uidx
  on public.workspaces(institution_id)
  where workspace_type = 'institution';

create unique index workspaces_one_individual_owner_uidx
  on public.workspaces(owner_user_id)
  where workspace_type = 'individual';

create index workspaces_status_type_idx
  on public.workspaces(status, workspace_type);

-- 2. Universal workspace membership projection.
create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  membership_source text not null,
  source_institution_membership_id uuid null
    references public.institution_memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_members_status_check
    check (status in ('active','suspended','revoked')),
  constraint workspace_members_source_check
    check (membership_source in ('workspace_owner','institution_membership','manual')),
  constraint workspace_members_role_nonempty_check
    check (length(btrim(role)) > 0),
  constraint workspace_members_workspace_user_key unique (workspace_id,user_id)
);

create unique index workspace_members_source_institution_membership_uidx
  on public.workspace_members(source_institution_membership_id)
  where source_institution_membership_id is not null;

create index workspace_members_user_status_idx
  on public.workspace_members(user_id,status);

create index workspace_members_workspace_status_idx
  on public.workspace_members(workspace_id,status);

-- 3. One institutional workspace per existing institution.
-- Preserve institution identity and status, including 'rejected'.
insert into public.workspaces (
  workspace_type, institution_id, owner_user_id,
  display_name, status, created_at, updated_at
)
select
  'institution',
  i.id,
  null,
  i.name,
  i.status,
  coalesce(i.created_at, now()),
  now()
from public.institutions i
on conflict (institution_id) where workspace_type = 'institution'
do update set
  display_name = excluded.display_name,
  status = excluded.status,
  updated_at = now();

-- 4. Backfill current institutional membership rows without activating revoked
-- or suspended memberships and without changing the legacy source table.
insert into public.workspace_members (
  workspace_id, user_id, role, status, membership_source,
  source_institution_membership_id, created_at, updated_at
)
select
  w.id,
  im.user_id,
  im.role,
  im.status,
  'institution_membership',
  im.id,
  im.created_at,
  im.updated_at
from public.institution_memberships im
join public.workspaces w
  on w.workspace_type = 'institution'
 and w.institution_id = im.institution_id
on conflict (workspace_id,user_id)
do update set
  role = excluded.role,
  status = excluded.status,
  membership_source = 'institution_membership',
  source_institution_membership_id = excluded.source_institution_membership_id,
  updated_at = excluded.updated_at;

-- 5. Keep future institution_memberships writes reflected in workspace_members.
create or replace function public.sync_institution_membership_to_workspace()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_workspace_id uuid;
begin
  if tg_op = 'UPDATE'
     and old.institution_id is distinct from new.institution_id then
    select w.id into v_workspace_id
    from public.workspaces w
    where w.workspace_type = 'institution'
      and w.institution_id = old.institution_id;

    if v_workspace_id is not null then
      update public.workspace_members
      set status = 'revoked',
          source_institution_membership_id = null,
          updated_at = now()
      where workspace_id = v_workspace_id
        and user_id = old.user_id
        and membership_source = 'institution_membership';
    end if;
  end if;

  if tg_op = 'DELETE' then
    select w.id into v_workspace_id
    from public.workspaces w
    where w.workspace_type = 'institution'
      and w.institution_id = old.institution_id;

    if v_workspace_id is not null then
      update public.workspace_members
      set status = 'revoked',
          source_institution_membership_id = null,
          updated_at = now()
      where workspace_id = v_workspace_id
        and user_id = old.user_id
        and membership_source = 'institution_membership';
    end if;
    return old;
  end if;

  select w.id into v_workspace_id
  from public.workspaces w
  where w.workspace_type = 'institution'
    and w.institution_id = new.institution_id;

  if v_workspace_id is null then
    raise exception 'WORKSPACE_INSTITUTION_MAPPING_MISSING'
      using errcode = '23503';
  end if;

  insert into public.workspace_members (
    workspace_id, user_id, role, status, membership_source,
    source_institution_membership_id, created_at, updated_at
  ) values (
    v_workspace_id, new.user_id, new.role, new.status,
    'institution_membership', new.id, new.created_at, new.updated_at
  )
  on conflict (workspace_id,user_id)
  do update set
    role = excluded.role,
    status = excluded.status,
    membership_source = 'institution_membership',
    source_institution_membership_id = excluded.source_institution_membership_id,
    updated_at = now();

  return new;
end;
$function$;

revoke all on function public.sync_institution_membership_to_workspace()
  from public, anon, authenticated;

drop trigger if exists institution_memberships_sync_workspace
  on public.institution_memberships;

create trigger institution_memberships_sync_workspace
after insert or update or delete on public.institution_memberships
for each row
execute function public.sync_institution_membership_to_workspace();

-- 6. Add nullable workspace references first, then backfill and validate.
alter table public.verification_runs
  add column workspace_id uuid;

alter table public.verify_document_uploads
  add column workspace_id uuid;

alter table public.verification_runs
  add constraint verification_runs_workspace_id_fkey
  foreign key (workspace_id) references public.workspaces(id) on delete restrict
  not valid;

alter table public.verify_document_uploads
  add constraint verify_document_uploads_workspace_id_fkey
  foreign key (workspace_id) references public.workspaces(id) on delete restrict
  not valid;

-- Backfill only from the existing institution_id. Never infer individual ownership.
update public.verification_runs vr
set workspace_id = w.id
from public.workspaces w
where w.workspace_type = 'institution'
  and w.institution_id = vr.institution_id
  and vr.workspace_id is null;

update public.verify_document_uploads u
set workspace_id = w.id
from public.workspaces w
where w.workspace_type = 'institution'
  and w.institution_id = u.institution_id
  and u.workspace_id is null;

-- 7. Compatibility trigger for both legacy institutional writes and future
-- individual workspace rows. It validates the pair; it does not authorize users.
create or replace function public.sync_verification_workspace_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_workspace_type text;
  v_workspace_institution_id uuid;
begin
  if new.workspace_id is null and new.institution_id is not null then
    select w.id into new.workspace_id
    from public.workspaces w
    where w.workspace_type = 'institution'
      and w.institution_id = new.institution_id;
  end if;

  if new.workspace_id is null then
    raise exception 'VERIFICATION_WORKSPACE_REQUIRED'
      using errcode = '23502';
  end if;

  select w.workspace_type, w.institution_id
    into v_workspace_type, v_workspace_institution_id
  from public.workspaces w
  where w.id = new.workspace_id;

  if not found then
    raise exception 'VERIFICATION_WORKSPACE_NOT_FOUND'
      using errcode = '23503';
  end if;

  if v_workspace_type = 'institution' then
    if new.institution_id is null then
      new.institution_id := v_workspace_institution_id;
    elsif new.institution_id is distinct from v_workspace_institution_id then
      raise exception 'VERIFICATION_WORKSPACE_INSTITUTION_MISMATCH'
        using errcode = '23514';
    end if;
  elsif v_workspace_type = 'individual' then
    if new.institution_id is not null then
      raise exception 'INDIVIDUAL_WORKSPACE_CANNOT_HAVE_INSTITUTION'
        using errcode = '23514';
    end if;
  else
    raise exception 'VERIFICATION_WORKSPACE_TYPE_INVALID'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function public.sync_verification_workspace_scope()
  from public, anon, authenticated;

drop trigger if exists verification_runs_workspace_scope
  on public.verification_runs;

create trigger verification_runs_workspace_scope
before insert or update of workspace_id, institution_id
on public.verification_runs
for each row
execute function public.sync_verification_workspace_scope();

drop trigger if exists verify_document_uploads_workspace_scope
  on public.verify_document_uploads;

create trigger verify_document_uploads_workspace_scope
before insert or update of workspace_id, institution_id
on public.verify_document_uploads
for each row
execute function public.sync_verification_workspace_scope();

-- 8. Historical integrity gate before enforcing NOT NULL.
do $f1_backfill_assertions$
begin
  if exists (
    select 1
    from public.institutions i
    left join public.workspaces w
      on w.workspace_type = 'institution'
     and w.institution_id = i.id
    where w.id is null
  ) then
    raise exception 'F1_FAIL_INSTITUTION_WORKSPACE_MISSING';
  end if;

  if exists (
    select 1
    from public.workspaces w
    where w.workspace_type = 'institution'
      and not exists (
        select 1 from public.institutions i where i.id = w.institution_id
      )
  ) then
    raise exception 'F1_FAIL_ORPHAN_INSTITUTION_WORKSPACE';
  end if;

  if exists (
    select 1
    from public.institution_memberships im
    left join public.workspaces w
      on w.workspace_type = 'institution'
     and w.institution_id = im.institution_id
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = im.user_id
     and wm.source_institution_membership_id = im.id
    where wm.id is null
       or wm.role is distinct from im.role
       or wm.status is distinct from im.status
  ) then
    raise exception 'F1_FAIL_INSTITUTION_MEMBERSHIP_BACKFILL';
  end if;

  if exists (
    select 1 from public.verification_runs
    where workspace_id is null
  ) then
    raise exception 'F1_FAIL_VERIFICATION_RUN_WORKSPACE_BACKFILL';
  end if;

  if exists (
    select 1 from public.verification_runs vr
    join public.workspaces w on w.id = vr.workspace_id
    where w.workspace_type <> 'institution'
       or w.institution_id is distinct from vr.institution_id
  ) then
    raise exception 'F1_FAIL_VERIFICATION_RUN_SCOPE_MISMATCH';
  end if;

  if exists (
    select 1 from public.verify_document_uploads
    where workspace_id is null
  ) then
    raise exception 'F1_FAIL_VERIFY_UPLOAD_WORKSPACE_BACKFILL';
  end if;

  if exists (
    select 1 from public.verify_document_uploads u
    join public.workspaces w on w.id = u.workspace_id
    where w.workspace_type <> 'institution'
       or w.institution_id is distinct from u.institution_id
  ) then
    raise exception 'F1_FAIL_VERIFY_UPLOAD_SCOPE_MISMATCH';
  end if;

  if exists (
    select 1
    from f1_verification_runs_before b
    full join public.verification_runs a using (id)
    where b.id is null or a.id is null
       or row(b.document_hash,b.canonical_document_hash,b.evidence_hash,b.manifest_hash,b.result_hash)
          is distinct from
          row(a.document_hash,a.canonical_document_hash,a.evidence_hash,a.manifest_hash,a.result_hash)
  ) then
    raise exception 'F1_FAIL_VERIFICATION_RUN_HASH_OR_ID_CHANGED';
  end if;

  if exists (
    select 1
    from f1_verify_uploads_before b
    full join public.verify_document_uploads a using (id)
    where b.id is null or a.id is null
       or row(b.source_file_sha256,b.extracted_text_sha256,b.canonical_document_hash)
          is distinct from
          row(a.source_file_sha256,a.extracted_text_sha256,a.canonical_document_hash)
  ) then
    raise exception 'F1_FAIL_UPLOAD_HASH_OR_ID_CHANGED';
  end if;

  if exists (
    select 1
    from f1_institutions_before b
    full join public.institutions a using (id)
    where b.id is null or a.id is null
       or row(b.name,b.status,b.type) is distinct from row(a.name,a.status,a.type)
  ) then
    raise exception 'F1_FAIL_INSTITUTION_IDENTITY_CHANGED';
  end if;

  if exists (
    select 1
    from f1_institution_memberships_before b
    full join public.institution_memberships a using (id)
    where b.id is null or a.id is null
       or row(b.user_id,b.institution_id,b.role,b.status)
          is distinct from row(a.user_id,a.institution_id,a.role,a.status)
  ) then
    raise exception 'F1_FAIL_LEGACY_MEMBERSHIP_CHANGED';
  end if;
end;
$f1_backfill_assertions$;

alter table public.verification_runs
  validate constraint verification_runs_workspace_id_fkey;

alter table public.verify_document_uploads
  validate constraint verify_document_uploads_workspace_id_fkey;

alter table public.verification_runs
  alter column workspace_id set not null;

alter table public.verify_document_uploads
  alter column workspace_id set not null;

-- institution_id remains available for legacy institutional joins, but is nullable
-- so an individual workspace can be represented without a fabricated institution.
alter table public.verification_runs
  alter column institution_id drop not null;

alter table public.verify_document_uploads
  alter column institution_id drop not null;

create index verification_runs_workspace_created_idx
  on public.verification_runs(workspace_id, created_at desc);

create index verify_uploads_workspace_created_idx
  on public.verify_document_uploads(workspace_id, created_at desc);

-- Final row-count assertions: legacy source rows must still exist unchanged.
do $f1_final_counts$
begin
  if (select count(*) from public.institutions)
     <> (select count(*) from f1_institutions_before) then
    raise exception 'F1_FAIL_INSTITUTION_ROW_COUNT_CHANGED';
  end if;

  if (select count(*) from public.institution_memberships)
     <> (select count(*) from f1_institution_memberships_before) then
    raise exception 'F1_FAIL_INSTITUTION_MEMBERSHIP_ROW_COUNT_CHANGED';
  end if;

  if (select count(*) from public.verification_runs)
     <> (select count(*) from f1_verification_runs_before) then
    raise exception 'F1_FAIL_VERIFICATION_RUN_ROW_COUNT_CHANGED';
  end if;

  if (select count(*) from public.verify_document_uploads)
     <> (select count(*) from f1_verify_uploads_before) then
    raise exception 'F1_FAIL_UPLOAD_ROW_COUNT_CHANGED';
  end if;
end;
$f1_final_counts$;

commit;
