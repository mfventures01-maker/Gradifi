-- SEFAES: Dean Auth authority and explicit subordinate authority binding
begin;

alter table public.profiles
  add column if not exists authority_user_id uuid references auth.users(id) on delete restrict;

alter table public.identity_actors
  add column if not exists authority_user_id uuid references auth.users(id) on delete restrict;

create index if not exists profiles_authority_user_id_idx
  on public.profiles(authority_user_id);
create index if not exists identity_actors_authority_user_id_idx
  on public.identity_actors(authority_user_id);

-- Dean is an email/password Supabase Auth identity, not a PIN actor.
create or replace function public.complete_dean_onboarding(
  p_auth_user_id uuid,
  p_institution_id uuid,
  p_faculty_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile_id uuid;
  v_faculty_record_id uuid;
begin
  if p_auth_user_id is null or p_institution_id is null then
    raise exception 'AUTH_USER_AND_INSTITUTION_REQUIRED';
  end if;
  if nullif(trim(p_full_name), '') is null or nullif(trim(p_email), '') is null then
    raise exception 'DEAN_NAME_AND_EMAIL_REQUIRED';
  end if;
  if not exists (
    select 1 from public.institutions i where i.id = p_institution_id
  ) then raise exception 'INSTITUTION_NOT_FOUND'; end if;
  if not exists (
    select 1 from auth.users u where u.id = p_auth_user_id
      and lower(u.email) = lower(trim(p_email))
  ) then raise exception 'DEAN_AUTH_EMAIL_MISMATCH'; end if;
  if exists (
    select 1 from public.nuc_faculties f
    where f.id = p_faculty_id and f.institution_id = p_institution_id and f.dean_id is not null
  ) then raise exception 'FACULTY_ALREADY_HAS_DEAN'; end if;
  if not exists (
    select 1 from public.nuc_faculties f
    where f.id = p_faculty_id and f.institution_id = p_institution_id
  ) then raise exception 'NUC_FACULTY_NOT_IN_INSTITUTION'; end if;
  if exists (select 1 from public.profiles p where p.user_id = p_auth_user_id) then
    raise exception 'PROFILE_ALREADY_EXISTS';
  end if;

  insert into public.profiles(
    user_id, institution_id, school_id, full_name, role, email,
    authentication_method, pin, pin_hash, pin_type, pin_requires_change,
    failed_attempts, locked_until
  ) values (
    p_auth_user_id, p_institution_id, null, trim(p_full_name), 'dean',
    lower(trim(p_email)), 'email', null, null, null, false, 0, null
  ) returning id into v_profile_id;

  insert into public.faculty(institution_id, department_id, full_name, email, role)
  values (p_institution_id, null, trim(p_full_name), lower(trim(p_email)), 'dean')
  returning id into v_faculty_record_id;

  update public.nuc_faculties
  set dean_id = v_faculty_record_id,
      dean_name = trim(p_full_name),
      dean_email = lower(trim(p_email)),
      updated_at = now()
  where id = p_faculty_id and institution_id = p_institution_id;

  return jsonb_build_object(
    'success', true, 'user_id', p_auth_user_id, 'profile_id', v_profile_id,
    'actor_type', 'dean', 'institution_id', p_institution_id,
    'faculty_id', p_faculty_id, 'faculty_record_id', v_faculty_record_id,
    'authentication_method', 'email'
  );
end;
$$;

revoke all on function public.complete_dean_onboarding(uuid,uuid,uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.complete_dean_onboarding(uuid,uuid,uuid,text,text,text)
  to service_role;

-- Actor authority is bound atomically inside complete_actor_onboarding.
-- Retire any previously deployed split-phase binder.
drop function if exists public.bind_actor_authority(uuid,uuid,text);

commit;
