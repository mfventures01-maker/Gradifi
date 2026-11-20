begin;
revoke all on table public.import_progress_view, public.invites_public, public.pipeline_health,
 public.queue_health, public.result_sheet_view, public.student_sequence_status,
 public.superadmin_fsm_overview from public, anon;
do $$ declare r record; begin
 for r in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef
 loop execute format('revoke execute on function %s from public, anon',r.sig); end loop;
end $$;

create table if not exists public.institution_memberships(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 institution_id uuid not null references public.institutions(id) on delete cascade,
 role text not null, status text not null default 'active'
 check(status in ('active','suspended','revoked')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,institution_id)
);
alter table public.institution_memberships enable row level security;
alter table public.institution_memberships force row level security;
revoke all on public.institution_memberships from public,anon;
grant select on public.institution_memberships to authenticated;
drop policy if exists institution_memberships_select_self on public.institution_memberships;
create policy institution_memberships_select_self on public.institution_memberships
 for select to authenticated using(user_id=(select auth.uid()));
insert into public.institution_memberships(user_id,institution_id,role,status)
select user_id,institution_id,role,'active' from public.profiles
where user_id is not null and institution_id is not null
on conflict(user_id,institution_id) do update set role=excluded.role,status='active',updated_at=now();

create or replace function public.sync_profile_institution_membership()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.user_id is not null and new.institution_id is not null then
  insert into public.institution_memberships(user_id,institution_id,role,status)
  values(new.user_id,new.institution_id,new.role,'active')
  on conflict(user_id,institution_id) do update
  set role=excluded.role,status='active',updated_at=now();
 end if;
 if tg_op='UPDATE' and old.user_id is not null and
   (old.user_id is distinct from new.user_id or old.institution_id is distinct from new.institution_id) then
  update public.institution_memberships set status='revoked',updated_at=now()
  where user_id=old.user_id and institution_id=old.institution_id;
 end if;
 return new;
end $$;
drop trigger if exists profiles_sync_institution_membership on public.profiles;
create trigger profiles_sync_institution_membership after insert or update of user_id,institution_id,role
on public.profiles for each row execute function public.sync_profile_institution_membership();
revoke all on function public.sync_profile_institution_membership() from public,anon,authenticated;

create or replace function public.is_current_user_institution_member(p_institution_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.institution_memberships m
 where m.user_id=(select auth.uid()) and m.institution_id=p_institution_id and m.status='active');
$$;
revoke all on function public.is_current_user_institution_member(uuid) from public,anon;
grant execute on function public.is_current_user_institution_member(uuid) to authenticated;

alter table public.tenants add column if not exists institution_id uuid references public.institutions(id);
create index if not exists tenants_institution_id_idx on public.tenants(institution_id);
alter table public.documents add column if not exists institution_id uuid references public.institutions(id),
 add column if not exists owner_user_id uuid references auth.users(id);
alter table public.submissions add column if not exists institution_id uuid references public.institutions(id),
 add column if not exists owner_user_id uuid references auth.users(id);
update public.submissions s set
 institution_id=coalesce(s.institution_id,(select p.institution_id from public.projects p where p.id=s.project_id)),
 owner_user_id=coalesce(s.owner_user_id,(select st.user_id from public.students st where st.id=s.submitted_by))
where s.institution_id is null or s.owner_user_id is null;
alter table public.verification_runs add column if not exists created_by_user_id uuid references auth.users(id);
update public.verification_runs vr set created_by_user_id=s.owner_user_id
from public.submissions s where vr.source_submission_id=s.id and vr.created_by_user_id is null;
create index if not exists documents_institution_owner_idx on public.documents(institution_id,owner_user_id);
create index if not exists submissions_institution_owner_idx on public.submissions(institution_id,owner_user_id);
create index if not exists verification_runs_institution_creator_idx on public.verification_runs(institution_id,created_by_user_id);

do $$ declare r record; begin
 for r in select policyname from pg_policies where schemaname='public'
 and tablename in ('documents','submissions','verification_runs')
 loop
  execute format('drop policy if exists %I on public.%I',r.policyname,
   (select tablename from pg_policies where schemaname='public' and policyname=r.policyname limit 1));
 end loop;
end $$;
alter table public.documents enable row level security;
alter table public.documents force row level security;
alter table public.submissions enable row level security;
alter table public.submissions force row level security;
alter table public.verification_runs enable row level security;
alter table public.verification_runs force row level security;
revoke all on public.documents,public.submissions,public.verification_runs from public,anon;
grant select,insert,update,delete on public.documents,public.submissions to authenticated;
grant select,insert on public.verification_runs to authenticated;

create policy documents_read_member_owner on public.documents for select to authenticated
using(owner_user_id=(select auth.uid()) or (institution_id is not null and public.is_current_user_institution_member(institution_id)));
create policy documents_insert_member_owner on public.documents for insert to authenticated
with check(owner_user_id=(select auth.uid()) and institution_id is not null
 and public.is_current_user_institution_member(institution_id)
 and exists(select 1 from public.tenants t where t.id=tenant_id and t.institution_id=institution_id));
create policy documents_update_member_owner on public.documents for update to authenticated
using(owner_user_id=(select auth.uid()) and public.is_current_user_institution_member(institution_id))
with check(owner_user_id=(select auth.uid()) and public.is_current_user_institution_member(institution_id)
 and exists(select 1 from public.tenants t where t.id=tenant_id and t.institution_id=institution_id));
create policy documents_delete_member_owner on public.documents for delete to authenticated
using(owner_user_id=(select auth.uid()) and public.is_current_user_institution_member(institution_id));

create policy submissions_read_member_owner on public.submissions for select to authenticated
using(owner_user_id=(select auth.uid()) or (institution_id is not null and public.is_current_user_institution_member(institution_id)));
create policy submissions_insert_member_owner on public.submissions for insert to authenticated
with check(owner_user_id=(select auth.uid()) and institution_id is not null
 and public.is_current_user_institution_member(institution_id)
 and exists(select 1 from public.projects p where p.id=project_id and p.institution_id=institution_id));
create policy submissions_update_member_owner on public.submissions for update to authenticated
using(owner_user_id=(select auth.uid()) and public.is_current_user_institution_member(institution_id))
with check(owner_user_id=(select auth.uid()) and public.is_current_user_institution_member(institution_id)
 and exists(select 1 from public.projects p where p.id=project_id and p.institution_id=institution_id));
create policy submissions_delete_member_owner on public.submissions for delete to authenticated
using(owner_user_id=(select auth.uid()) and public.is_current_user_institution_member(institution_id));

create policy verification_runs_read_member_creator on public.verification_runs for select to authenticated
using(created_by_user_id=(select auth.uid()) or public.is_current_user_institution_member(institution_id));
create policy verification_runs_insert_member_creator on public.verification_runs for insert to authenticated
with check(created_by_user_id=(select auth.uid()) and public.is_current_user_institution_member(institution_id)
 and (source_submission_id is null or exists(select 1 from public.submissions s
 where s.id=source_submission_id and s.institution_id=verification_runs.institution_id)));

drop policy if exists "Public Verification Record Select Policy" on public.public_verification_records;
revoke all on public.public_verification_records from public,anon;
create or replace function public.lookup_public_verification(p_verification_id text)
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select jsonb_build_object('verificationId',r.verification_id,'documentHash',r.document_hash,
 'evidenceHash',r.evidence_hash,'resultHash',r.result_hash,'manifestHash',r.manifest_hash,
 'engineVersion',r.engine_version,'policyVersion',r.policy_version,
 'overallSimilarity',r.overall_similarity,'sourceCount',r.total_sources_found,
 'createdAt',r.created_at,'schemaVersion',r.public_schema_version)
 from public.public_verification_records r
 where r.verification_id=p_verification_id and r.status='verified'
 and r.verification_run_id is not null and r.result_hash is not null
 and r.manifest_hash is not null and r.public_schema_version is not null limit 1;
$$;
revoke all on function public.lookup_public_verification(text) from public;
grant execute on function public.lookup_public_verification(text) to anon,authenticated;

create table if not exists public.public_trial_sessions(
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
 ip_hash text not null check(ip_hash ~ '^[0-9a-f]{64}$'),
 checks_remaining integer not null default 3 check(checks_remaining between 0 and 3),
 used_checks integer not null default 0 check(used_checks between 0 and 3),
 created_at timestamptz not null default now(), last_used_at timestamptz,
 expires_at timestamptz not null default(now()+interval '24 hours')
);
create index if not exists public_trial_sessions_ip_created_idx on public.public_trial_sessions(ip_hash,created_at desc);
alter table public.public_trial_sessions enable row level security;
alter table public.public_trial_sessions force row level security;
revoke all on public.public_trial_sessions from public,anon,authenticated;

create or replace function public.start_public_trial_session(p_token_hash text,p_ip_hash text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare n integer;
begin
 if p_token_hash !~ '^[0-9a-f]{64}$' or p_ip_hash !~ '^[0-9a-f]{64}$' then
  return jsonb_build_object('success',false,'code','INVALID_TRIAL_IDENTITY'); end if;
 select count(*) into n from public.public_trial_sessions
 where ip_hash=p_ip_hash and created_at>now()-interval '1 hour';
 if n>=5 then return jsonb_build_object('success',false,'code','TRIAL_START_RATE_LIMITED'); end if;
 insert into public.public_trial_sessions(token_hash,ip_hash) values(p_token_hash,p_ip_hash);
 return jsonb_build_object('success',true,'checksRemaining',3,'expiresAt',now()+interval '24 hours');
end $$;
create or replace function public.consume_public_trial_session(p_token_hash text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare n integer;
begin
 update public.public_trial_sessions set checks_remaining=checks_remaining-1,
 used_checks=used_checks+1,last_used_at=now()
 where token_hash=p_token_hash and expires_at>now() and checks_remaining>0
 returning checks_remaining into n;
 if n is null then return jsonb_build_object('success',false,'code','TRIAL_EXHAUSTED_OR_EXPIRED'); end if;
 return jsonb_build_object('success',true,'checksRemaining',n);
end $$;
revoke all on function public.start_public_trial_session(text,text) from public,anon,authenticated;
revoke all on function public.consume_public_trial_session(text) from public,anon,authenticated;
grant execute on function public.start_public_trial_session(text,text) to service_role;
grant execute on function public.consume_public_trial_session(text) to service_role;
revoke all on function public.use_public_trial(text) from public,anon,authenticated;
commit;
;
