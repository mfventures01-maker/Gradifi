-- Apply the canonical Dean actor allowlist to the live function.
begin;
create or replace function public.complete_actor_onboarding(
  p_auth_user_id uuid,
  p_authority_user_id uuid,
  p_expected_authority_role text,
  p_actor_type text,
  p_school_id uuid,
  p_institution_id uuid,
  p_full_name text,
  p_pin text,
  p_email text default null,
  p_phone text default null,
  p_student_id uuid default null,
  p_class_id uuid default null,
  p_class_subject_ids uuid[] default null,
  p_gender text default null,
  p_date_of_birth date default null,
  p_relationship text default 'Parent',
  p_is_primary boolean default true,
  p_faculty_id uuid default null,
  p_department_id uuid default null,
  p_title text default null,
  p_rank text default null,
  p_specialization text default null,
  p_is_graduate_student_supervisor boolean default false,
  p_max_students integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $complete_actor_body$
declare
  v_prefix text;
  v_login_id text;
  v_profile_id uuid;
  v_actor_record_id uuid;
  v_student_number text;
  v_first_name text;
  v_last_name text;
  v_effective_school_id uuid := p_school_id;
  v_authority public.profiles%rowtype;
  v_expected_actor_roles text[];
begin
  if p_auth_user_id is null or p_authority_user_id is null then
    raise exception 'AUTH_USER_AND_AUTHORITY_REQUIRED';
  end if;
  if p_auth_user_id = p_authority_user_id then raise exception 'SELF_PROVISIONING_DENIED'; end if;
  select * into v_authority
  from public.profiles
  where user_id = p_authority_user_id;
  if not found then raise exception 'AUTHORITY_PROFILE_NOT_FOUND'; end if;
  if v_authority.role <> p_expected_authority_role then raise exception 'INVALID_AUTHORITY_ROLE'; end if;
  if v_authority.institution_id is distinct from p_institution_id then
    raise exception 'CROSS_INSTITUTION_AUTHORITY_DENIED';
  end if;
  if p_expected_authority_role = 'principal_admin' then
    v_expected_actor_roles := array['vice_principal','bursar','teacher','student','parent'];
    if v_authority.school_id is distinct from p_school_id then
      raise exception 'CROSS_SCHOOL_AUTHORITY_DENIED';
    end if;
    if not exists (
      select 1 from public.identity_actors ia
      where ia.auth_user_id = p_authority_user_id
        and ia.actor_type = 'principal_admin'
        and ia.status = 'active'
    ) then raise exception 'ACTIVE_PRINCIPAL_ACTOR_REQUIRED'; end if;
  elsif p_expected_authority_role = 'dean' then
    v_expected_actor_roles := array['student','hod','adviser','lecturer'];
  else
    raise exception 'UNSUPPORTED_AUTHORITY_ROLE';
  end if;
  if p_actor_type is null or not (p_actor_type = any(v_expected_actor_roles)) then
    raise exception 'ACTOR_ROLE_NOT_ALLOWED_FOR_AUTHORITY';
  end if;
  if p_actor_type not in ('vice_principal','bursar','teacher','student','parent','hod','adviser','lecturer') then
    raise exception 'UNSUPPORTED_ACTOR_TYPE';
  end if;
  if nullif(trim(p_full_name), '') is null then raise exception 'FULL_NAME_REQUIRED'; end if;
  if p_pin is null
     or length(p_pin) <> (case when p_actor_type in ('student','parent') then 4 else 6 end)
     or translate(p_pin, '0123456789', '') <> '' then
    raise exception 'INVALID_PIN_LENGTH';
  end if;
  if not exists (select 1 from public.institutions i where i.id = p_institution_id) then
    raise exception 'INSTITUTION_NOT_FOUND';
  end if;
  if p_school_id is not null and not exists (
    select 1 from public.schools s where s.id = p_school_id and s.institution_id = p_institution_id
  ) then raise exception 'SCHOOL_INSTITUTION_MISMATCH'; end if;

  if p_actor_type in ('vice_principal','bursar','teacher','student','lecturer') and p_school_id is null then raise exception 'SCHOOL_REQUIRED'; end if;

  v_prefix := case p_actor_type
    when 'vice_principal' then 'VP'
    when 'bursar' then 'BUR'
    when 'teacher' then 'TCH'
    when 'student' then 'STU'
    when 'parent' then 'PAR'
    when 'dean' then 'DEAN'
    when 'hod' then 'HOD'
    when 'adviser' then 'ADV'
    when 'lecturer' then 'LEC'
  end;
  v_login_id := v_prefix || '-' || lpad(nextval('public.actor_login_id_seq')::text, 8, '0');

  if p_actor_type = 'teacher' and coalesce(cardinality(p_class_subject_ids), 0) > 0 then
    if exists (
      select 1
      from unnest(p_class_subject_ids) requested(class_subject_id)
      where not exists (
        select 1 from public.class_subjects cs
        where cs.id = requested.class_subject_id
          and cs.school_id = p_school_id
          and (cs.institution_id is null or cs.institution_id = p_institution_id)
      )
    ) then raise exception 'CLASS_SUBJECT_NOT_IN_SCHOOL'; end if;
  end if;

  if p_actor_type = 'student' then
    if length(trim(p_full_name)) <= length(split_part(trim(p_full_name), ' ', 1)) then raise exception 'STUDENT_LAST_NAME_REQUIRED'; end if;
    if p_class_id is null or not exists (
      select 1 from public.classes c where c.id = p_class_id and c.school_id = p_school_id
    ) then raise exception 'CLASS_NOT_IN_SCHOOL'; end if;
  end if;

  if p_actor_type = 'parent' then
    select s.school_id into v_effective_school_id
    from public.students s
    where s.id = p_student_id
      and s.institution_id = p_institution_id
      and (p_school_id is null or s.school_id = p_school_id);
    if p_student_id is null or not found then raise exception 'LINKED_STUDENT_NOT_FOUND'; end if;
  end if;

  insert into public.profiles (
    user_id, institution_id, school_id, full_name, role, email, phone,
    authentication_method, pin, pin_hash, pin_type, pin_requires_change,
    pin_changed_at, failed_attempts, locked_until
  ) values (
    p_auth_user_id, p_institution_id, v_effective_school_id, trim(p_full_name), p_actor_type,
    nullif(trim(p_email), ''), nullif(trim(p_phone), ''),
    'pin', null, crypt(p_pin, gen_salt('bf')), 
    case when p_actor_type in ('student','parent') then '4-digit' else '6-digit' end,
    true, null, 0, null
  ) returning id into v_profile_id;

  if p_actor_type = 'teacher' then
    insert into public.teachers(user_id, institution_id, school_id, name, email, phone)
    values (p_auth_user_id, p_institution_id, p_school_id, trim(p_full_name),
      nullif(trim(p_email), ''), nullif(trim(p_phone), ''))
    returning id into v_actor_record_id;
    if coalesce(cardinality(p_class_subject_ids), 0) > 0 then
      insert into public.teacher_subject_assignments(school_id, teacher_id, class_subject_id)
      select p_school_id, v_actor_record_id, requested.class_subject_id
      from (
        select distinct unnest(p_class_subject_ids) as class_subject_id
      ) requested;
    end if;
  elsif p_actor_type = 'vice_principal' then
    insert into public.vice_principals(profile_id, school_id, full_name, email, phone)
    values (v_profile_id, p_school_id, trim(p_full_name),
      nullif(trim(p_email), ''), nullif(trim(p_phone), ''))
    returning id into v_actor_record_id;
  elsif p_actor_type = 'bursar' then
    insert into public.bursars(profile_id, school_id, full_name, email, phone)
    values (v_profile_id, p_school_id, trim(p_full_name),
      nullif(trim(p_email), ''), nullif(trim(p_phone), ''))
    returning id into v_actor_record_id;
  elsif p_actor_type = 'student' then
    v_student_number := 'GRD/' || to_char(now(), 'YYYY') || '/' || lpad(nextval('public.student_number_seq')::text, 6, '0');
    insert into public.students(
      user_id, institution_id, school_id, class_id, student_number,
      first_name, last_name, gender, date_of_birth, email, phone
    ) values (
      p_auth_user_id, p_institution_id, p_school_id, p_class_id, v_student_number,
      split_part(trim(p_full_name), ' ', 1),
      nullif(btrim(substr(trim(p_full_name), length(split_part(trim(p_full_name), ' ', 1)) + 2)), ''),
      p_gender, p_date_of_birth, nullif(trim(p_email), ''), nullif(trim(p_phone), '')
    ) returning id into v_actor_record_id;
  elsif p_actor_type in ('dean','hod','adviser') then
    if p_actor_type = 'dean' then
      if p_faculty_id is null or not exists (
        select 1 from public.nuc_faculties nf where nf.id = p_faculty_id and nf.institution_id = p_institution_id
      ) then raise exception 'NUC_FACULTY_NOT_IN_INSTITUTION'; end if;
    elsif p_actor_type = 'hod' then
      if p_department_id is null or not exists (
        select 1 from public.nuc_departments nd where nd.id = p_department_id and nd.institution_id = p_institution_id
      ) then raise exception 'NUC_DEPARTMENT_NOT_IN_INSTITUTION'; end if;
    elsif p_department_id is not null and not exists (
      select 1 from public.departments d where d.id = p_department_id and d.institution_id = p_institution_id
    ) then raise exception 'DEPARTMENT_NOT_IN_INSTITUTION'; end if;

    insert into public.faculty(institution_id, department_id, full_name, email, role)
    values (p_institution_id, case when p_actor_type = 'adviser' then p_department_id else null end,
      trim(p_full_name), coalesce(nullif(trim(p_email), ''), v_login_id || '@accounts.sefaes.invalid'), p_actor_type)
    returning id into v_actor_record_id;

    if p_actor_type = 'dean' then
      update public.nuc_faculties
      set dean_id = v_actor_record_id, dean_name = trim(p_full_name),
          dean_email = nullif(trim(p_email), ''), updated_at = now()
      where id = p_faculty_id and institution_id = p_institution_id;
    elsif p_actor_type = 'hod' then
      update public.nuc_departments
      set hod_id = v_actor_record_id, hod_name = trim(p_full_name),
          hod_email = nullif(trim(p_email), ''), updated_at = now()
      where id = p_department_id and institution_id = p_institution_id;
    end if;
  elsif p_actor_type = 'lecturer' then
    if length(trim(p_full_name)) <= length(split_part(trim(p_full_name), ' ', 1)) then
      raise exception 'LECTURER_LAST_NAME_REQUIRED';
    end if;
    if p_department_id is not null and not exists (
      select 1 from public.nuc_departments d where d.id = p_department_id and d.institution_id = p_institution_id
    ) then raise exception 'NUC_DEPARTMENT_NOT_IN_INSTITUTION'; end if;
    if p_faculty_id is not null and not exists (
      select 1 from public.nuc_faculties f where f.id = p_faculty_id and f.institution_id = p_institution_id
    ) then raise exception 'NUC_FACULTY_NOT_IN_INSTITUTION'; end if;
    if nullif(trim(p_email), '') is null then raise exception 'LECTURER_EMAIL_REQUIRED'; end if;
    insert into public.lecturers(
      school_id, user_id, title, first_name, last_name, email, phone,
      department_id, faculty_id, rank, specialization,
      is_graduate_student_supervisor, max_students
    ) values (
      p_school_id, p_auth_user_id, nullif(trim(p_title), ''),
      split_part(trim(p_full_name), ' ', 1),
      nullif(btrim(substr(trim(p_full_name), length(split_part(trim(p_full_name), ' ', 1)) + 2)), ''),
      trim(p_email), nullif(trim(p_phone), ''), p_department_id, p_faculty_id,
      nullif(trim(p_rank), ''), nullif(trim(p_specialization), ''),
      coalesce(p_is_graduate_student_supervisor, false), p_max_students
    ) returning id into v_actor_record_id;
  elsif p_actor_type = 'parent' then
    insert into public.parents(institution_id, profile_id, child_student_id)
    values (p_institution_id, v_profile_id, p_student_id)
    returning id into v_actor_record_id;
    insert into public.student_parents(student_id, parent_id, relationship, is_primary)
    values (p_student_id, v_actor_record_id, coalesce(nullif(trim(p_relationship), ''), 'Parent'), coalesce(p_is_primary, true));
    insert into public.student_parent_relationships(
      institution_id, school_id, student_id, parent_id, relationship_type, is_primary
    ) values (
      p_institution_id, v_effective_school_id, p_student_id, v_actor_record_id,
      case lower(coalesce(nullif(trim(p_relationship), ''), 'other'))
        when 'father' then 'father'
        when 'mother' then 'mother'
        when 'guardian' then 'guardian'
        else 'other'
      end,
      coalesce(p_is_primary, true)
    );
  end if;

  insert into public.identity_actors(
    auth_user_id, institution_id, school_id, actor_type, actor_record_id,
    login_identifier, auth_method, status, pin_hash, pin_changed_at, failed_attempts
  ) values (
    p_auth_user_id, p_institution_id, v_effective_school_id, p_actor_type, v_actor_record_id,
    v_login_id, 'pin', 'active', crypt(p_pin, gen_salt('bf')), null, 0
  );

  update public.profiles
  set authority_user_id = p_authority_user_id
  where user_id = p_auth_user_id;
  update public.identity_actors
  set authority_user_id = p_authority_user_id
  where auth_user_id = p_auth_user_id;

  return jsonb_build_object(
    'success', true, 'login_id', v_login_id, 'user_id', p_auth_user_id,
    'profile_id', v_profile_id, 'actor_type', p_actor_type,
    'institution_id', p_institution_id, 'school_id', v_effective_school_id,
    'actor_record_id', v_actor_record_id,
    'full_name', trim(p_full_name),
    'email', nullif(trim(p_email), ''),
    'phone', nullif(trim(p_phone), ''),
    'student_number', v_student_number,
    'pin_requires_change', true
  );
end;
$complete_actor_body$;
commit;
