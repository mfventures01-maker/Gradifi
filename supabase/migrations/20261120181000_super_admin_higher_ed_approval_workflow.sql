-- Gradifi: Super Admin review and activation for higher-education onboarding.
-- Depends on the live P2/R1/R2 schema: institutions.status/slug, institution_memberships,
-- identity_actors superadmin actor type, and actor_provisioning_jobs.

begin;

create table if not exists public.institution_approval_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected')),
  reason text not null check (length(btrim(reason)) >= 10),
  reviewed_by_user_id uuid not null references auth.users(id) on delete restrict,
  previous_status text not null,
  resulting_status text not null,
  institution_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists institution_approval_events_institution_created_idx
  on public.institution_approval_events (institution_id, created_at desc);

alter table public.institution_approval_events enable row level security;
revoke all on public.institution_approval_events from public, anon, authenticated;
grant select, insert on public.institution_approval_events to service_role;

create or replace function public.reject_institution_approval_event_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'INSTITUTION_APPROVAL_EVENT_APPEND_ONLY';
end;
$$;

revoke all on function public.reject_institution_approval_event_mutation() from public, anon, authenticated, service_role;

drop trigger if exists institution_approval_events_append_only on public.institution_approval_events;
create trigger institution_approval_events_append_only
before update or delete on public.institution_approval_events
for each row execute function public.reject_institution_approval_event_mutation();

create or replace function public.is_current_user_super_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.identity_actors a
    where a.auth_user_id = (select auth.uid())
      and a.actor_type = 'superadmin'
      and a.institution_id is null
      and a.status = 'active'
      and a.auth_method = 'email'
  );
$$;

revoke all on function public.is_current_user_super_admin() from public, anon;
grant execute on function public.is_current_user_super_admin() to authenticated;

-- Retire the legacy arbitrary-user lookup. It is retained only for compatibility,
-- but it can no longer answer questions about another user's authority.
create or replace function public.resolve_superadmin_context(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select jsonb_build_object(
    'is_superadmin',
    p_user_id = (select auth.uid()) and public.is_current_user_super_admin(),
    'role',
    case
      when p_user_id = (select auth.uid()) and public.is_current_user_super_admin()
      then 'superadmin'
      else null
    end
  );
$$;

revoke all on function public.resolve_superadmin_context(uuid) from public, anon, authenticated, service_role;

create or replace function public.get_pending_higher_ed_institution_approvals()
returns table (
  institution_id uuid,
  institution_name text,
  institution_type text,
  institution_category text,
  registration_number text,
  country text,
  institution_address text,
  institution_phone text,
  website_url text,
  institution_slug text,
  submitted_at timestamptz,
  authority_user_id uuid,
  authority_name text,
  authority_email text,
  authority_role text,
  authority_membership_status text,
  authority_actor_status text,
  dean_user_id uuid,
  dean_name text,
  dean_status text,
  dean_membership_status text,
  dean_job_status text,
  campus_id uuid,
  campus_name text,
  can_approve boolean,
  readiness_reason text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if not public.is_current_user_super_admin() then
    raise exception 'SUPER_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    i.id,
    i.name,
    i.type,
    i.institution_category,
    i.registration_number,
    i.country,
    i.address,
    i.phone,
    i.website_url,
    i.slug,
    i.created_at,
    root.user_id,
    root.full_name,
    root.email,
    root.role,
    root.membership_status,
    root.actor_status,
    dean.auth_user_id,
    dean.full_name,
    dean.status,
    dean.membership_status,
    dean_job.status,
    campus.id,
    campus.school_name,
    (
      root.user_id is not null
      and root.membership_status = 'active'
      and root.actor_status = 'active'
      and dean.auth_user_id is not null
      and dean.status = 'active'
      and dean.membership_status = 'active'
      and dean_job.status = 'active'
      and campus.id is not null
      and campus.slug = i.slug
      and campus.url_slug = i.slug
    ) as can_approve,
    case
      when root.user_id is null then 'Missing VC/Rector profile'
      when root.membership_status is distinct from 'active' then 'VC/Rector membership is not active'
      when root.actor_status is distinct from 'active' then 'VC/Rector identity actor is not active'
      when dean.auth_user_id is null then 'Initial Dean identity is missing'
      when dean.status is distinct from 'active' then 'Initial Dean identity is not active'
      when dean.membership_status is distinct from 'active' then 'Initial Dean institution membership is not active'
      when dean_job.status is distinct from 'active' then 'Initial Dean provisioning job is not complete'
      when campus.id is null then 'Bootstrap campus is missing'
      when campus.slug is distinct from i.slug or campus.url_slug is distinct from i.slug then 'Campus and institution slugs do not match'
      else 'Ready for approval'
    end as readiness_reason
  from public.institutions i
  left join lateral (
    select
      p.user_id,
      p.full_name,
      p.email,
      p.role,
      m.status as membership_status,
      a.status as actor_status
    from public.profiles p
    left join public.institution_memberships m
      on m.user_id = p.user_id and m.institution_id = i.id and m.role = p.role
    left join public.identity_actors a
      on a.auth_user_id = p.user_id
      and a.institution_id = i.id
      and a.actor_type = p.role
    where p.institution_id = i.id
      and p.role in ('vice_chancellor', 'rector')
    order by p.created_at asc
    limit 1
  ) root on true
  left join lateral (
    select a.auth_user_id, p.full_name, a.status, a.id, m.status as membership_status
    from public.identity_actors a
    left join public.profiles p
      on p.user_id = a.auth_user_id
      and p.institution_id = a.institution_id
      and p.role = 'dean'
    left join public.institution_memberships m
      on m.user_id = a.auth_user_id
      and m.institution_id = a.institution_id
      and m.role = 'dean'
    where a.institution_id = i.id
      and a.actor_type = 'dean'
      and a.authority_user_id = root.user_id
    order by a.created_at asc
    limit 1
  ) dean on true
  left join lateral (
    select j.status
    from public.actor_provisioning_jobs j
    where j.institution_id = i.id
      and j.actor_type = 'dean'
      and j.target_auth_user_id = dean.auth_user_id
      and j.identity_actor_id = dean.id
    order by j.created_at desc
    limit 1
  ) dean_job on true
  left join lateral (
    select s.id, s.school_name, s.slug, s.url_slug
    from public.schools s
    where s.institution_id = i.id
    order by s.created_at asc
    limit 1
  ) campus on true
  where i.status = 'pending'
    and i.type in ('university', 'polytechnic', 'college_of_education')
  order by i.created_at asc;
end;
$$;

revoke all on function public.get_pending_higher_ed_institution_approvals() from public, anon;
grant execute on function public.get_pending_higher_ed_institution_approvals() to authenticated;

create or replace function public.review_higher_ed_institution(
  p_institution_id uuid,
  p_decision text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_institution public.institutions%rowtype;
  v_root_user_id uuid;
  v_dean_user_id uuid;
  v_campus_id uuid;
  v_next_status text;
  v_snapshot jsonb;
begin
  if not public.is_current_user_super_admin() then
    raise exception 'SUPER_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_INSTITUTION_DECISION';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 10 then
    raise exception 'INSTITUTION_DECISION_REASON_REQUIRED';
  end if;

  select * into v_institution
  from public.institutions
  where id = p_institution_id
  for update;

  if not found then
    raise exception 'INSTITUTION_NOT_FOUND';
  end if;
  if v_institution.status <> 'pending' then
    raise exception 'INSTITUTION_NOT_PENDING';
  end if;
  if v_institution.type not in ('university', 'polytechnic', 'college_of_education') then
    raise exception 'HIGHER_ED_INSTITUTION_REQUIRED';
  end if;

  if p_decision = 'approved' then
    select p.user_id into v_root_user_id
    from public.profiles p
    join public.identity_actors a
      on a.auth_user_id = p.user_id
      and a.institution_id = p.institution_id
      and a.actor_type = p.role
      and a.status = 'active'
      and a.auth_method = 'email'
    join public.institution_memberships m
      on m.user_id = p.user_id
      and m.institution_id = p.institution_id
      and m.status = 'active'
      and m.role = p.role
    where p.institution_id = p_institution_id
      and p.role in ('vice_chancellor', 'rector')
    order by p.created_at asc
    limit 1;

    if v_root_user_id is null then
      raise exception 'APPROVAL_BLOCKED_ROOT_AUTHORITY_NOT_READY';
    end if;

    select a.auth_user_id into v_dean_user_id
    from public.identity_actors a
    join public.profiles p on p.user_id = a.auth_user_id and p.role = 'dean'
      and p.institution_id = a.institution_id
    join public.institution_memberships dm
      on dm.user_id = a.auth_user_id
      and dm.institution_id = a.institution_id
      and dm.role = 'dean'
      and dm.status = 'active'
    join public.actor_provisioning_jobs j
      on j.institution_id = a.institution_id
      and j.actor_type = 'dean'
      and j.target_auth_user_id = a.auth_user_id
      and j.identity_actor_id = a.id
      and j.status = 'active'
    where a.institution_id = p_institution_id
      and a.actor_type = 'dean'
      and a.authority_user_id = v_root_user_id
      and a.status = 'active'
    order by a.created_at asc
    limit 1;

    if v_dean_user_id is null then
      raise exception 'APPROVAL_BLOCKED_INITIAL_DEAN_NOT_READY';
    end if;

    select s.id into v_campus_id
    from public.schools s
    where s.institution_id = p_institution_id
      and s.slug = v_institution.slug
      and s.url_slug = v_institution.slug
    order by s.created_at asc
    limit 1;

    if v_campus_id is null then
      raise exception 'APPROVAL_BLOCKED_BOOTSTRAP_CAMPUS_NOT_READY';
    end if;
  end if;

  v_next_status := case when p_decision = 'approved' then 'active' else 'rejected' end;
  v_snapshot := jsonb_build_object(
    'institution_name', v_institution.name,
    'institution_type', v_institution.type,
    'institution_category', v_institution.institution_category,
    'registration_number', v_institution.registration_number,
    'country', v_institution.country,
    'slug', v_institution.slug,
    'authority_user_id', v_root_user_id,
    'dean_user_id', v_dean_user_id,
    'campus_id', v_campus_id
  );

  insert into public.institution_approval_events (
    institution_id, decision, reason, reviewed_by_user_id,
    previous_status, resulting_status, institution_snapshot
  ) values (
    v_institution.id, p_decision, btrim(p_reason), (select auth.uid()),
    v_institution.status, v_next_status, v_snapshot
  );

  update public.institutions
  set status = v_next_status
  where id = v_institution.id;

  return jsonb_build_object(
    'success', true,
    'institution_id', v_institution.id,
    'decision', p_decision,
    'previous_status', v_institution.status,
    'status', v_next_status,
    'reviewed_at', now()
  );
end;
$$;

revoke all on function public.review_higher_ed_institution(uuid, text, text) from public, anon;
grant execute on function public.review_higher_ed_institution(uuid, text, text) to authenticated;

comment on table public.institution_approval_events is
  'Append-only Super Admin decisions for higher-education institution onboarding. Client roles have no direct access.';

commit;
