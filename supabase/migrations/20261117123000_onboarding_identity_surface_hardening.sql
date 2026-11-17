-- Close onboarding identity leaks and make the school onboarding RPC authority-bound.
begin;

-- identity_actors contains PIN hashes and lockout counters. A Dean needs no
-- institution-wide read of this credential table; clients resolve only their own
-- actor and only through a non-secret column allowlist.
drop policy if exists dean_read_own_institution_actors on public.identity_actors;
revoke all on table public.identity_actors from public, anon, authenticated;
grant select (
  id, auth_user_id, institution_id, school_id, actor_type, actor_record_id,
  login_identifier, auth_method, status, pin_changed_at, authority_user_id,
  created_at, updated_at, last_login_at
) on table public.identity_actors to authenticated;

-- A profile owner may edit ordinary profile details, but must not be able to
-- alter their own authentication material, PIN lifecycle, lockout state or role.
create or replace function public.gradifi_guard_profile_authority_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if current_user in ('anon','authenticated') and (
    new.user_id is distinct from old.user_id
    or new.role is distinct from old.role
    or new.school_id is distinct from old.school_id
    or new.institution_id is distinct from old.institution_id
    or new.authority_user_id is distinct from old.authority_user_id
    or new.account_type is distinct from old.account_type
    or new.pin is distinct from old.pin
    or new.pin_type is distinct from old.pin_type
    or new.authentication_method is distinct from old.authentication_method
    or new.pin_hash is distinct from old.pin_hash
    or new.pin_changed_at is distinct from old.pin_changed_at
    or new.pin_requires_change is distinct from old.pin_requires_change
    or new.failed_attempts is distinct from old.failed_attempts
    or new.locked_until is distinct from old.locked_until
    or new.last_login_at is distinct from old.last_login_at
  ) then
    raise exception 'Profile authority and authentication fields are managed by trusted server functions';
  end if;
  return new;
end;
$function$;

-- The old function was SECURITY DEFINER and executable by anon. It accepted
-- any school UUID and inserted classes without checking the caller's authority.
-- It now permits only the authenticated Principal assigned to that school.
create or replace function public.initialize_secondary_classes(p_school_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  inserted_count integer := 0;
  v_classes jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'principal_admin'
      and p.school_id = p_school_id
  ) then
    raise exception 'PRINCIPAL_SCHOOL_AUTHORITY_REQUIRED';
  end if;

  with levels(name, sort_order) as (
    values
      ('JSS 1',1),('JSS 2',2),('JSS 3',3),
      ('SS 1',4),('SS 2',5),('SS 3',6)
  ),
  inserted as (
    insert into public.classes (school_id, name)
    select p_school_id, levels.name
    from levels
    where not exists (
      select 1
      from public.classes c
      where c.school_id = p_school_id
        and c.name = levels.name
    )
    returning id, name
  )
  select count(*)::integer into inserted_count from inserted;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by
      case c.name
        when 'JSS 1' then 1 when 'JSS 2' then 2 when 'JSS 3' then 3
        when 'SS 1' then 4 when 'SS 2' then 5 when 'SS 3' then 6
      end
    ),
    '[]'::jsonb
  )
  into v_classes
  from public.classes c
  where c.school_id = p_school_id
    and c.name in ('JSS 1','JSS 2','JSS 3','SS 1','SS 2','SS 3');

  return jsonb_build_object(
    'success', true,
    'classes_created', inserted_count,
    'classes', v_classes,
    'message', format('Created %s new classes', inserted_count)
  );
end;
$function$;

revoke all on function public.initialize_secondary_classes(uuid) from public, anon;
grant execute on function public.initialize_secondary_classes(uuid) to authenticated, service_role;

-- This helper returns only a boolean, but it is not a public capability oracle.
create or replace function public.can_manage_secondary_users(p_institution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
  select auth.uid() is not null and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.institution_id = p_institution_id
      and p.role = 'principal_admin'
  );
$function$;

revoke all on function public.can_manage_secondary_users(uuid) from public, anon;
grant execute on function public.can_manage_secondary_users(uuid) to authenticated, service_role;

-- Align the persisted onboarding progress model with the client contract.
alter table public.institution_onboarding
  add column if not exists current_step integer not null default 1,
  add column if not exists completed_at timestamptz;

alter table public.institution_onboarding
  drop constraint if exists institution_onboarding_current_step_check;
alter table public.institution_onboarding
  add constraint institution_onboarding_current_step_check
  check (current_step >= 1);

drop policy if exists institution_onboarding_read_own_authority on public.institution_onboarding;
create policy institution_onboarding_read_own_authority
on public.institution_onboarding
for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.institution_id = institution_onboarding.institution_id
      and p.role in ('principal_admin','vice_chancellor','rector','dean')
  )
);

drop policy if exists institution_onboarding_insert_own_authority on public.institution_onboarding;
create policy institution_onboarding_insert_own_authority
on public.institution_onboarding
for insert to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.institution_id = institution_onboarding.institution_id
      and p.role in ('principal_admin','vice_chancellor','rector','dean')
  )
);

drop policy if exists institution_onboarding_update_own_authority on public.institution_onboarding;
create policy institution_onboarding_update_own_authority
on public.institution_onboarding
for update to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.institution_id = institution_onboarding.institution_id
      and p.role in ('principal_admin','vice_chancellor','rector','dean')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.institution_id = institution_onboarding.institution_id
      and p.role in ('principal_admin','vice_chancellor','rector','dean')
  )
);

-- Remove anonymous access to private onboarding state. Authenticated access is
-- limited by the institution-scoped policies above.
revoke all on table public.institution_onboarding from anon;
revoke all on table public.profiles from anon;

commit;
