-- Align the database actor contract with the public and institution-backed Gradifi journeys.
-- Public individuals use profiles.role='individual' and identity_actors.actor_type='individual'.
-- Institution-backed students remain in public.students and retain institution/campus ownership.
begin;

-- 1. Existing legacy student rows have a valid campus but a missing institution_id.
-- Derive only NULL institution IDs from their already-linked campus. Never rewrite a
-- non-NULL cross-tenant value; abort if one exists.
update public.students s
set institution_id = sc.institution_id
from public.schools sc
where sc.id = s.school_id
  and s.institution_id is null
  and sc.institution_id is not null;

do $student_tenant_preflight$
begin
  if exists (
    select 1
    from public.students s
    left join public.schools sc on sc.id = s.school_id
    where s.school_id is null
       or sc.id is null
       or s.institution_id is null
       or s.institution_id is distinct from sc.institution_id
  ) then
    raise exception 'STUDENT_TENANT_PREFLIGHT_FAILED: resolve student institution/campus mismatches before adding constraints';
  end if;

  if exists (
    select 1
    from public.students s
    join public.classes c on c.id = s.class_id
    where c.school_id is distinct from s.school_id
  ) then
    raise exception 'STUDENT_CLASS_CAMPUS_PREFLIGHT_FAILED';
  end if;

  if exists (
    select 1
    from public.lecturers l
    join public.nuc_departments d on d.id = l.department_id
    where l.faculty_id is not null and d.faculty_id is distinct from l.faculty_id
  ) then
    raise exception 'LECTURER_CATALOGUE_PAIR_PREFLIGHT_FAILED';
  end if;
end;
$student_tenant_preflight$;

-- 2. Strengthen the student -> institution/campus/class relationships.
alter table public.schools
  add constraint schools_id_institution_id_key unique (id, institution_id);

alter table public.classes
  add constraint classes_id_school_id_key unique (id, school_id);

alter table public.students
  add constraint students_institution_id_fkey
    foreign key (institution_id) references public.institutions(id) on delete restrict not valid,
  add constraint students_school_institution_fkey
    foreign key (school_id, institution_id)
    references public.schools(id, institution_id) on delete restrict not valid,
  add constraint students_class_school_fkey
    foreign key (class_id, school_id)
    references public.classes(id, school_id) on delete set null (class_id) not valid,
  add constraint students_scope_pair_check
    check (
      (school_id is null and institution_id is null)
      or (school_id is not null and institution_id is not null)
    ) not valid;

alter table public.students validate constraint students_institution_id_fkey;
alter table public.students validate constraint students_school_institution_fkey;
alter table public.students validate constraint students_class_school_fkey;
alter table public.students validate constraint students_scope_pair_check;

-- A class is an assignment, not the student's identity. Preserve student rows on class deletion.
alter table public.students drop constraint if exists students_class_id_fkey;
alter table public.students
  add constraint students_class_id_fkey
  foreign key (class_id) references public.classes(id) on delete set null not valid;
alter table public.students validate constraint students_class_id_fkey;

-- 3. Enforce lecturer NUC catalogue references at the database boundary.
alter table public.lecturers
  add constraint lecturers_nuc_department_id_fkey
    foreign key (department_id) references public.nuc_departments(id) on delete set null not valid,
  add constraint lecturers_nuc_faculty_id_fkey
    foreign key (faculty_id) references public.nuc_faculties(id) on delete set null not valid;
alter table public.lecturers validate constraint lecturers_nuc_department_id_fkey;
alter table public.lecturers validate constraint lecturers_nuc_faculty_id_fkey;

-- HOD pointers are actor-record pointers into public.faculty.
alter table public.nuc_departments
  add constraint nuc_departments_hod_id_fkey
    foreign key (hod_id) references public.faculty(id) on delete set null not valid;
alter table public.nuc_departments validate constraint nuc_departments_hod_id_fkey;

-- 4. Extend the existing identity model for independent public users without creating
-- a fake institution or putting them into institution-backed students.
alter table public.identity_actors alter column institution_id drop not null;
alter table public.identity_actors drop constraint if exists identity_actors_actor_type_check;
alter table public.identity_actors
  add constraint identity_actors_actor_type_check
  check (actor_type = any (array[
    'superadmin','principal_admin','vice_principal','bursar','teacher','student','parent',
    'dean','hod','adviser','lecturer','vice_chancellor','rector','individual'
  ]));
alter table public.identity_actors
  add constraint identity_actors_individual_scope_check
  check (
    (actor_type = 'individual'
      and institution_id is null
      and school_id is null
      and authority_user_id is null
      and auth_method = 'email')
    or
    (actor_type <> 'individual' and institution_id is not null)
  );

alter table public.profiles add column if not exists account_type text;
alter table public.profiles
  add constraint profiles_account_type_check
  check (
    account_type is null
    or (role = 'individual' and account_type = any(array[
      'freelancer','independent_student','independent_professional','other_individual'
    ]))
  );

-- Prevent a signed-in individual from changing their own account category or authority scope.
create or replace function public.gradifi_guard_profile_authority_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is not null and (
    new.user_id is distinct from old.user_id
    or new.role is distinct from old.role
    or new.school_id is distinct from old.school_id
    or new.institution_id is distinct from old.institution_id
    or new.authority_user_id is distinct from old.authority_user_id
    or new.account_type is distinct from old.account_type
  ) then
    raise exception 'Profile authority fields can only be changed by trusted onboarding administration';
  end if;
  return new;
end;
$function$;

-- Authenticated, verified self-registration only. No client-supplied Auth UID,
-- institution ID, school ID, role, actor type or authority root is accepted.
create or replace function public.bootstrap_public_individual(
  p_full_name text,
  p_account_type text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_profile_id uuid;
  v_actor_id uuid;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_full_name), '') is null then raise exception 'FULL_NAME_REQUIRED'; end if;
  if p_account_type not in (
    'freelancer','independent_student','independent_professional','other_individual'
  ) then raise exception 'INVALID_PUBLIC_ACCOUNT_TYPE'; end if;

  select lower(trim(u.email))
    into v_email
  from auth.users u
  where u.id = v_user_id
    and u.email_confirmed_at is not null;

  if v_email is null then raise exception 'VERIFIED_EMAIL_REQUIRED'; end if;

  if exists (select 1 from public.profiles p where p.user_id = v_user_id)
     or exists (select 1 from public.identity_actors ia where ia.auth_user_id = v_user_id) then
    if exists (
      select 1 from public.profiles p
      join public.identity_actors ia on ia.auth_user_id = p.user_id
      where p.user_id = v_user_id
        and p.role = 'individual'
        and p.account_type = p_account_type
        and ia.actor_type = 'individual'
        and ia.institution_id is null
        and ia.school_id is null
    ) then
      select p.id into v_profile_id from public.profiles p where p.user_id = v_user_id;
      select ia.id into v_actor_id from public.identity_actors ia where ia.auth_user_id = v_user_id;
      return jsonb_build_object(
        'success',true,'user_id',v_user_id,'profile_id',v_profile_id,
        'actor_id',v_actor_id,'role','individual','account_type',p_account_type,
        'institution_id',null,'school_id',null
      );
    end if;
    raise exception 'AUTH_IDENTITY_ALREADY_PROVISIONED';
  end if;

  insert into public.profiles (
    user_id,institution_id,school_id,full_name,role,email,
    authentication_method,pin,pin_hash,pin_type,pin_requires_change,
    failed_attempts,locked_until,authority_user_id,account_type
  ) values (
    v_user_id,null,null,trim(p_full_name),'individual',v_email,
    'email',null,null,null,false,0,null,null,p_account_type
  ) returning id into v_profile_id;

  insert into public.identity_actors (
    auth_user_id,institution_id,school_id,actor_type,actor_record_id,
    login_identifier,auth_method,status,pin_hash,pin_changed_at,
    failed_attempts,authority_user_id
  ) values (
    v_user_id,null,null,'individual',null,
    v_email,'email','active',null,now(),0,null
  ) returning id into v_actor_id;

  return jsonb_build_object(
    'success',true,'user_id',v_user_id,'profile_id',v_profile_id,
    'actor_id',v_actor_id,'role','individual','account_type',p_account_type,
    'institution_id',null,'school_id',null
  );
end;
$function$;

revoke all on function public.bootstrap_public_individual(text,text) from public, anon;
grant execute on function public.bootstrap_public_individual(text,text) to authenticated;

-- 5. Patch the live actor RPC without replacing its existing school path or
-- higher-ed optional-class / deterministic HOD-Adviser logic.
do $actor_rpc_alignment$
declare
  v_function regprocedure :=
    'public.complete_actor_onboarding(uuid,uuid,text,text,uuid,uuid,text,text,text,text,uuid,uuid,uuid[],text,date,text,boolean,uuid,uuid,text,text,text,boolean,integer)'::regprocedure;
  v_definition text;
  v_old_authority text := $old$
    v_expected_actor_roles := array['dean','student','hod','adviser','lecturer'];
$old$;
  v_new_authority text := $new$
    v_expected_actor_roles := array['dean'];
$new$;
  v_old_lecturer text := $old$
    if p_department_id is not null and not exists (
      select 1 from public.nuc_departments d where d.id = p_department_id and d.institution_id = p_institution_id
    ) then raise exception 'NUC_DEPARTMENT_NOT_IN_INSTITUTION'; end if;
    if p_faculty_id is not null and not exists (
      select 1 from public.nuc_faculties f where f.id = p_faculty_id and f.institution_id = p_institution_id
    ) then raise exception 'NUC_FACULTY_NOT_IN_INSTITUTION'; end if;
$old$;
  v_new_lecturer text := $new$
    if p_department_id is not null then
      if p_faculty_id is null or not exists (
        select 1
        from public.nuc_departments d
        join public.nuc_faculties f
          on f.id = d.faculty_id
         and (f.institution_id is null or f.institution_id = p_institution_id)
        where d.id = p_department_id
          and d.institution_id = p_institution_id
          and d.faculty_id = p_faculty_id
      ) then raise exception 'NUC_DEPARTMENT_NOT_IN_SELECTED_FACULTY'; end if;
    elsif p_faculty_id is not null and not exists (
      select 1 from public.nuc_faculties f
      where f.id = p_faculty_id
        and (f.institution_id is null or f.institution_id = p_institution_id)
    ) then raise exception 'NUC_FACULTY_NOT_IN_INSTITUTION'; end if;
$new$;
begin
  select pg_get_functiondef(v_function) into v_definition;
  if position(v_old_authority in v_definition) = 0 then
    raise exception 'ACTOR_RPC_AUTHORITY_PATCH_TARGET_NOT_FOUND';
  end if;
  if position(v_old_lecturer in v_definition) = 0 then
    raise exception 'ACTOR_RPC_LECTURER_PATCH_TARGET_NOT_FOUND';
  end if;
  v_definition := replace(v_definition,v_old_authority,v_new_authority);
  v_definition := replace(v_definition,v_old_lecturer,v_new_lecturer);
  execute v_definition;
end;
$actor_rpc_alignment$;

-- 6. Student onboarding completion must work when a higher-ed student has no class.
create or replace function public.mark_students_created()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  v_institution_id uuid := new.institution_id;
begin
  if v_institution_id is null and new.school_id is not null then
    select s.institution_id into v_institution_id
    from public.schools s
    where s.id = new.school_id;
  end if;

  if v_institution_id is not null then
    update public.institution_onboarding
    set students_created = true,
        updated_at = now()
    where institution_id = v_institution_id;
  end if;

  return new;
end;
$function$;

-- 7. Institution-scoped read paths needed by the Dean workspace.
drop policy if exists dean_read_own_institution_profiles on public.profiles;
create policy dean_read_own_institution_profiles on public.profiles
for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.user_id = (select auth.uid())
    and p.role = 'dean'
    and p.institution_id = profiles.institution_id
));

drop policy if exists dean_read_own_institution_actors on public.identity_actors;
create policy dean_read_own_institution_actors on public.identity_actors
for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.user_id = (select auth.uid())
    and p.role = 'dean'
    and p.institution_id = identity_actors.institution_id
));

drop policy if exists dean_read_own_institution_faculty_actors on public.faculty;
create policy dean_read_own_institution_faculty_actors on public.faculty
for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.user_id = (select auth.uid())
    and p.role = 'dean'
    and p.institution_id = faculty.institution_id
));

drop policy if exists dean_read_own_institution_academic_staff on public.academic_staff;
create policy dean_read_own_institution_academic_staff on public.academic_staff
for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.user_id = (select auth.uid())
    and p.role = 'dean'
    and p.institution_id = academic_staff.institution_id
));

drop policy if exists dean_read_own_institution_classes on public.classes;
create policy dean_read_own_institution_classes on public.classes
for select to authenticated
using (exists (
  select 1
  from public.profiles p
  join public.schools s on s.institution_id = p.institution_id
  where p.user_id = (select auth.uid())
    and p.role = 'dean'
    and s.id = classes.school_id
));

drop policy if exists dean_read_own_institution_programs on public.programs;
create policy dean_read_own_institution_programs on public.programs
for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.user_id = (select auth.uid())
    and p.role = 'dean'
    and p.institution_id = programs.institution_id
));

drop policy if exists dean_read_own_institution_students on public.students;
create policy dean_read_own_institution_students on public.students
for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.user_id = (select auth.uid())
    and p.role = 'dean'
    and p.institution_id = students.institution_id
));

drop policy if exists dean_read_own_institution_lecturers on public.lecturers;
create policy dean_read_own_institution_lecturers on public.lecturers
for select to authenticated
using (exists (
  select 1 from public.profiles p
  join public.schools s on s.id = lecturers.school_id
  where p.user_id = (select auth.uid())
    and p.role = 'dean'
    and p.institution_id = s.institution_id
));

commit;
