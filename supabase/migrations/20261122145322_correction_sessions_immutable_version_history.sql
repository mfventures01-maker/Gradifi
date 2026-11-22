create unique index if not exists verification_runs_id_workspace_uidx on public.verification_runs(id,workspace_id);

create table public.correction_sessions (
  id uuid primary key default gen_random_uuid(),
  verification_run_id uuid not null,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  original_evidence_hash text not null check (original_evidence_hash ~ '^[a-fA-F0-9]{32,128}$'),
  current_version integer not null default 1 check (current_version >= 1),
  status text not null default 'open' check (status in ('open','submitted','closed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (verification_run_id,workspace_id) references public.verification_runs(id,workspace_id) on delete restrict,
  unique (id,workspace_id,owner_user_id),
  unique (verification_run_id,owner_user_id)
);

create table public.correction_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  workspace_id uuid not null,
  owner_user_id uuid not null,
  version_number integer not null check (version_number >= 1),
  version_kind text not null check (version_kind in ('original','correction')),
  content_hash text not null check (content_hash ~ '^[a-fA-F0-9]{32,128}$'),
  content_snapshot jsonb not null,
  change_summary text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (session_id,workspace_id,owner_user_id)
    references public.correction_sessions(id,workspace_id,owner_user_id) on delete restrict,
  unique (session_id,version_number)
);

create index correction_sessions_workspace_created_idx on public.correction_sessions(workspace_id,created_at desc);
create index correction_versions_session_version_idx on public.correction_versions(session_id,version_number desc);
create index correction_versions_workspace_created_idx on public.correction_versions(workspace_id,created_at desc);

create or replace function private.reject_correction_version_mutation()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'CORRECTION_VERSION_IMMUTABLE: create a new version instead';
end;
$$;
drop trigger if exists trg_correction_versions_immutable on public.correction_versions;
create trigger trg_correction_versions_immutable before update or delete on public.correction_versions
for each row execute function private.reject_correction_version_mutation();

create or replace function private.append_correction_version(
  p_session_id uuid,p_actor_user_id uuid,p_content_snapshot jsonb,p_content_hash text,
  p_change_summary text default null,p_version_kind text default 'correction'
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_session public.correction_sessions%rowtype;
  v_next_version integer;
  v_version_id uuid;
begin
  if p_session_id is null or p_actor_user_id is null or p_content_snapshot is null
     or p_content_hash !~ '^[a-fA-F0-9]{32,128}$'
     or p_version_kind not in ('original','correction') then
    raise exception 'CORRECTION_VERSION_INVALID_INPUT';
  end if;
  select * into v_session from public.correction_sessions where id=p_session_id for update;
  if not found then raise exception 'CORRECTION_SESSION_NOT_FOUND'; end if;
  if v_session.owner_user_id<>p_actor_user_id then raise exception 'CORRECTION_ACTOR_MISMATCH'; end if;
  if v_session.status<>'open' then raise exception 'CORRECTION_SESSION_NOT_OPEN'; end if;

  if not exists(select 1 from public.correction_versions where session_id=p_session_id) then
    if p_version_kind<>'original' or lower(p_content_hash)<>lower(v_session.original_evidence_hash) then
      raise exception 'CORRECTION_BASELINE_VERSION_REQUIRED';
    end if;
    v_next_version:=1;
  else
    if p_version_kind<>'correction' then raise exception 'CORRECTION_BASELINE_ALREADY_EXISTS'; end if;
    v_next_version:=v_session.current_version+1;
  end if;

  insert into public.correction_versions(session_id,workspace_id,owner_user_id,version_number,
    version_kind,content_hash,content_snapshot,change_summary,created_by_user_id)
  values(v_session.id,v_session.workspace_id,v_session.owner_user_id,v_next_version,
    p_version_kind,lower(p_content_hash),p_content_snapshot,p_change_summary,p_actor_user_id)
  returning id into v_version_id;
  update public.correction_sessions set current_version=v_next_version,updated_at=now() where id=v_session.id;
  return jsonb_build_object('session_id',v_session.id,'version_id',v_version_id,'version_number',v_next_version);
end;
$$;

revoke all on function private.reject_correction_version_mutation() from public,anon,authenticated;
revoke all on function private.append_correction_version(uuid,uuid,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function private.append_correction_version(uuid,uuid,jsonb,text,text,text) to service_role;

alter table public.correction_sessions enable row level security;
alter table public.correction_versions enable row level security;
create policy correction_sessions_select_member on public.correction_sessions for select to authenticated
using (public.is_current_user_active_workspace_member(workspace_id));
create policy correction_versions_select_member on public.correction_versions for select to authenticated
using (public.is_current_user_active_workspace_member(workspace_id));
revoke all on public.correction_sessions,public.correction_versions from anon,authenticated;
grant select on public.correction_sessions,public.correction_versions to authenticated;
grant all on public.correction_sessions,public.correction_versions to service_role;
