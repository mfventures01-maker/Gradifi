-- Gradifi deterministic onboarding v1
-- Additive only. All writes are performed through authenticated, tenant-scoped RPCs.

alter table public.profiles add column if not exists email text;
alter table public.schools add column if not exists state text;
alter table public.schools add column if not exists lga text;

alter table public.institution_onboarding
  add column if not exists current_step smallint not null default 1,
  add column if not exists is_completed boolean not null default false,
  add column if not exists completed_at timestamptz,
  add column if not exists last_error text;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['principal_admin','teacher','student','examiner','individual','vice_principal','bursar','vp','parent']::text[]));

alter table public.gradifi_school_memberships drop constraint if exists gradifi_school_memberships_member_role_check;
alter table public.gradifi_school_memberships add constraint gradifi_school_memberships_member_role_check
  check (member_role = any (array['school_admin','principal','teacher','exam_officer','vice_principal','bursar']::text[]));

create or replace function public.gradifi_bootstrap_institution(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_institution_id uuid;
  v_school_id uuid;
  v_profile_id uuid;
  v_slug text;
  v_class_name text;
  v_subject_name text;
  v_class_id uuid;
  v_subject_id uuid;
  v_classes jsonb;
  v_existing record;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;

  select lower(u.email) into v_user_email
  from auth.users u
  where u.id = v_user_id and u.email_confirmed_at is not null;

  if v_user_email is null then
    raise exception 'CONFIRMED_PRINCIPAL_EMAIL_REQUIRED' using errcode = '28000';
  end if;

  if lower(coalesce(p_payload->>'principal_email','')) <> v_user_email then
    raise exception 'PRINCIPAL_EMAIL_MUST_MATCH_AUTHENTICATED_USER' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_payload->>'institution_name',''))) < 3 then
    raise exception 'INSTITUTION_NAME_REQUIRED' using errcode = '22023';
  end if;

  if coalesce(p_payload->>'institution_type','secondary') not in ('secondary','polytechnic','university','enterprise') then
    raise exception 'UNSUPPORTED_INSTITUTION_TYPE' using errcode = '22023';
  end if;

  -- Idempotent recovery after a client/network interruption.
  select p.id as profile_id, p.institution_id, p.school_id, p.role
    into v_existing
  from public.profiles p
  where p.user_id = v_user_id;

  if found then
    if v_existing.institution_id is null or v_existing.school_id is null
       or v_existing.role <> 'principal_admin'
       or not exists (
         select 1 from public.gradifi_school_memberships m
         join public.schools s on s.id=m.school_id
         where m.user_id = v_user_id and m.school_id = v_existing.school_id
           and m.member_role = 'principal' and m.status = 'active'
           and s.provisioning_status = 'active'
       )
       or exists (
         select 1 from public.identity_actors a
         where a.auth_user_id=v_user_id
           and (a.school_id<>v_existing.school_id or a.actor_type<>'principal_admin' or a.status<>'active')
       ) then
      raise exception 'EXISTING_IDENTITY_NOT_A_VALID_PRINCIPAL' using errcode = '23514';
    end if;

    insert into public.identity_actors
      (auth_user_id,institution_id,school_id,actor_type,actor_record_id,login_identifier,auth_method,status)
    select v_user_id,v_existing.institution_id,v_existing.school_id,'principal_admin',
      v_existing.profile_id,v_user_email,'email','active'
    where not exists(select 1 from public.identity_actors a where a.auth_user_id=v_user_id)
    on conflict do nothing;

    select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name) order by c.name)
      into v_classes
    from public.classes c where c.school_id = v_existing.school_id;

    return jsonb_build_object(
      'success',true,'recovered',true,'institution_id',v_existing.institution_id,
      'school_id',v_existing.school_id,'profile_id',v_existing.profile_id,
      'classes',coalesce(v_classes,'[]'::jsonb)
    );
  end if;

  v_class_name := trim(coalesce(p_payload->>'class_name','JSS 1'));
  v_subject_name := trim(coalesce(p_payload->>'subject','Mathematics'));

  insert into public.institutions
    (name,type,country,registration_number,address,phone,website_url,institution_category)
  values
    (trim(p_payload->>'institution_name'),
     coalesce(p_payload->>'institution_type','secondary'),
     coalesce(nullif(trim(p_payload->>'country'),''),'Nigeria'),
     nullif(trim(p_payload->>'registration_number'),''),
     nullif(trim(p_payload->>'address'),''),
     nullif(trim(p_payload->>'phone'),''),
     nullif(trim(p_payload->>'website'),''),
     coalesce(p_payload->>'institution_type','secondary'))
  returning id into v_institution_id;

  v_slug := trim(both '-' from regexp_replace(lower(trim(p_payload->>'institution_name')),'[^a-z0-9]+','-','g'));
  if exists(select 1 from public.schools s where s.url_slug = v_slug or s.slug = v_slug) then
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);
  end if;

  insert into public.schools
    (institution_id,school_name,principal_name,principal_email,email,phone,address,state,lga,
     campus_address,campus_phone,school_type,url_slug,slug,provisioning_status)
  values
    (v_institution_id,trim(p_payload->>'institution_name') || ' Main Campus',
     trim(p_payload->>'principal_name'),v_user_email,v_user_email,
     nullif(trim(p_payload->>'phone'),''),
     nullif(trim(p_payload->>'address'),''),
     nullif(trim(p_payload->>'state'),''),
     nullif(trim(p_payload->>'lga'),''),
     nullif(trim(p_payload->>'address'),''),
     nullif(trim(p_payload->>'phone'),''),
     coalesce(nullif(trim(p_payload->>'school_type'),''),'private'),
     v_slug,v_slug,'unprovisioned')
  returning id into v_school_id;

  insert into public.profiles
    (user_id,institution_id,school_id,full_name,email,phone,role,authentication_method)
  values
    (v_user_id,v_institution_id,v_school_id,trim(p_payload->>'principal_name'),
     v_user_email,nullif(trim(p_payload->>'principal_phone'),''),'principal_admin','email')
  returning id into v_profile_id;

  insert into public.identity_actors
    (auth_user_id,institution_id,school_id,actor_type,actor_record_id,login_identifier,auth_method,status)
  values
    (v_user_id,v_institution_id,v_school_id,'principal_admin',v_profile_id,v_user_email,'email','active');

  insert into public.gradifi_school_memberships
    (school_id,user_id,member_role,status,invited_by,activated_at)
  values
    (v_school_id,v_user_id,'principal','active',v_user_id,now());

  -- Seed real class records, including the user-selected first class.
  insert into public.classes (school_id,name)
  select v_school_id,n.name
  from (values ('JSS 1'),('JSS 2'),('JSS 3'),('SS 1'),('SS 2'),('SS 3'),(v_class_name)) n(name)
  where not exists (
    select 1 from public.classes c where c.school_id=v_school_id and lower(c.name)=lower(n.name)
  );

  select c.id into v_class_id
  from public.classes c
  where c.school_id=v_school_id and lower(c.name)=lower(v_class_name)
  order by c.created_at nulls first limit 1;

  insert into public.subject_catalog(name)
  values (v_subject_name)
  on conflict (name) do update set name=excluded.name
  returning id into v_subject_id;

  insert into public.class_subjects (school_id,class_id,subject_id,institution_id)
  values (v_school_id,v_class_id,v_subject_id,v_institution_id)
  on conflict (school_id,class_id,subject_id) do nothing;

  insert into public.institution_onboarding
    (institution_id,institution_created,school_created,classes_created,subjects_created,
     teachers_created,students_created,completed,current_step,is_completed)
  values (v_institution_id,true,true,true,true,false,false,false,8,false)
  on conflict (institution_id) do update set
    institution_created=true,school_created=true,classes_created=true,
    subjects_created=true,current_step=8,is_completed=false,updated_at=now();

  -- The deferred principal invariant is satisfied before the transaction commits.
  update public.schools set provisioning_status='active' where id=v_school_id;

  select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name) order by c.name)
    into v_classes
  from public.classes c where c.school_id=v_school_id;

  return jsonb_build_object(
    'success',true,'recovered',false,'institution_id',v_institution_id,
    'school_id',v_school_id,'profile_id',v_profile_id,'classes',coalesce(v_classes,'[]'::jsonb),
    'subject_id',v_subject_id,'class_subject_id',(
      select cs.id from public.class_subjects cs
      where cs.school_id=v_school_id and cs.class_id=v_class_id and cs.subject_id=v_subject_id
      limit 1
    )
  );
end;
$function$;

create or replace function public.gradifi_get_school_classes(p_school_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
begin
  if auth.uid() is null or not public.has_active_school_role(p_school_id,array['principal','school_admin','teacher','exam_officer']) then
    raise exception 'SCHOOL_ACCESS_DENIED' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id',c.id,'school_id',c.school_id,'name',c.name) order by c.name)
    from public.classes c where c.school_id=p_school_id
  ),'[]'::jsonb);
end;
$function$;

create or replace function public.gradifi_create_student(
  p_class_id uuid,p_first_name text,p_last_name text,p_gender text,p_date_of_birth date default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_school_id uuid;
  v_institution_id uuid;
  v_student_id uuid;
  v_student_number text;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
  select c.school_id,s.institution_id into v_school_id,v_institution_id
  from public.classes c join public.schools s on s.id=c.school_id
  where c.id=p_class_id and s.provisioning_status='active';
  if v_school_id is null then raise exception 'CLASS_NOT_FOUND' using errcode='P0002'; end if;
  if not public.has_active_school_role(v_school_id,array['principal','school_admin']) then
    raise exception 'SCHOOL_ACCESS_DENIED' using errcode='42501';
  end if;
  if length(trim(coalesce(p_first_name,'')))=0 or length(trim(coalesce(p_last_name,'')))=0 then
    raise exception 'STUDENT_NAME_REQUIRED' using errcode='22023';
  end if;
  if p_gender not in ('male','female') then raise exception 'INVALID_GENDER' using errcode='22023'; end if;

  v_student_number := public.generate_student_number(v_school_id);
  insert into public.students
    (class_id,student_number,first_name,last_name,gender,date_of_birth,school_id,institution_id)
  values
    (p_class_id,v_student_number,trim(p_first_name),trim(p_last_name),p_gender,p_date_of_birth,v_school_id,v_institution_id)
  returning id into v_student_id;

  update public.institution_onboarding
  set students_created=true,current_step=greatest(current_step,11),updated_at=now()
  where institution_id=v_institution_id;

  return jsonb_build_object('success',true,'student_id',v_student_id,
    'student_number',v_student_number,'class_id',p_class_id,'enrolled_at',now());
end;
$function$;

create or replace function public.gradifi_create_staff_profile(
  p_user_id uuid,p_role text,p_name text,p_email text,p_phone text,p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_school_id uuid;
  v_institution_id uuid;
  v_profile_id uuid;
  v_teacher_id uuid;
  v_user_email text;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
  if p_role not in ('teacher','vice_principal','bursar') then raise exception 'INVALID_STAFF_ROLE' using errcode='22023'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then raise exception 'INVALID_STAFF_PIN' using errcode='22023'; end if;
  select m.school_id,s.institution_id into v_school_id,v_institution_id
  from public.gradifi_school_memberships m
  join public.schools s on s.id=m.school_id
  where m.user_id=auth.uid() and m.member_role='principal' and m.status='active'
    and s.provisioning_status='active'
  limit 1;
  if v_school_id is null then raise exception 'ACTIVE_PRINCIPAL_REQUIRED' using errcode='42501'; end if;
  select lower(email) into v_user_email from auth.users where id=p_user_id and lower(email)=lower(p_email);
  if v_user_email is null then raise exception 'STAFF_AUTH_USER_EMAIL_MISMATCH' using errcode='23503'; end if;
  if exists(select 1 from public.profiles where user_id=p_user_id)
     or exists(select 1 from public.identity_actors where auth_user_id=p_user_id) then
    raise exception 'STAFF_IDENTITY_ALREADY_PROVISIONED' using errcode='23505';
  end if;

  insert into public.profiles
    (user_id,institution_id,school_id,full_name,email,phone,role,pin_hash,pin_type,
     authentication_method,pin_requires_change)
  values
    (p_user_id,v_institution_id,v_school_id,trim(p_name),lower(trim(p_email)),
     nullif(trim(p_phone),''),p_role,crypt(p_pin,gen_salt('bf',12)),'6-digit','pin',true)
  returning id into v_profile_id;

  insert into public.identity_actors
    (auth_user_id,institution_id,school_id,actor_type,actor_record_id,login_identifier,auth_method,status,pin_hash)
  values
    (p_user_id,v_institution_id,v_school_id,p_role,v_profile_id,lower(trim(p_email)),'pin','active',
     crypt(p_pin,gen_salt('bf',12)));

  insert into public.gradifi_school_memberships
    (school_id,user_id,member_role,status,invited_by,activated_at)
  values (v_school_id,p_user_id,p_role,'active',auth.uid(),now());

  if p_role='teacher' then
    insert into public.teachers (user_id,school_id,institution_id,name,email,phone)
    values (p_user_id,v_school_id,v_institution_id,trim(p_name),lower(trim(p_email)),nullif(trim(p_phone),'' ))
    returning id into v_teacher_id;
  end if;

  update public.institution_onboarding
  set teachers_created = teachers_created or p_role='teacher',
      current_step=greatest(current_step,10),updated_at=now()
  where institution_id=v_institution_id;

  return jsonb_build_object('success',true,'profile_id',v_profile_id,'user_id',p_user_id,
    'role',p_role,'full_name',trim(p_name),'email',lower(trim(p_email)),'teacher_id',v_teacher_id);
end;
$function$;

create or replace function public.gradifi_update_onboarding_progress(
  p_institution_id uuid,p_current_step smallint,p_is_completed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare v_school_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
  if p_current_step < 1 or p_current_step > 14 then raise exception 'INVALID_ONBOARDING_STEP' using errcode='22023'; end if;
  select s.id into v_school_id from public.schools s
  where s.institution_id=p_institution_id
    and public.has_active_school_role(s.id,array['principal','school_admin'])
  limit 1;
  if v_school_id is null then raise exception 'SCHOOL_ACCESS_DENIED' using errcode='42501'; end if;
  update public.institution_onboarding
  set current_step=p_current_step,is_completed=p_is_completed,
      completed=p_is_completed,completed_at=case when p_is_completed then now() else null end,
      updated_at=now(),last_error=null
  where institution_id=p_institution_id;
  if not found then raise exception 'ONBOARDING_STATE_NOT_FOUND' using errcode='P0002'; end if;
  return jsonb_build_object('success',true,'institution_id',p_institution_id,
    'current_step',p_current_step,'is_completed',p_is_completed);
end;
$function$;


-- Read access remains tenant-scoped. Mutations continue through the SECURITY DEFINER RPCs above.
drop policy if exists profiles_select_own_identity on public.profiles;
create policy profiles_select_own_identity on public.profiles
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.has_active_school_role(school_id,array['principal','school_admin'])
);

drop policy if exists identity_actors_select_own on public.identity_actors;
create policy identity_actors_select_own on public.identity_actors
for select to authenticated
using (
  auth_user_id = (select auth.uid())
  or public.has_active_school_role(school_id,array['principal','school_admin'])
);

drop policy if exists schools_select_active_school_admin on public.schools;
create policy schools_select_active_school_admin on public.schools
for select to authenticated
using (public.has_active_school_role(id,array['principal','school_admin']));

drop policy if exists institutions_select_active_school_admin on public.institutions;
create policy institutions_select_active_school_admin on public.institutions
for select to authenticated
using (exists (
  select 1 from public.schools s
  where s.institution_id=institutions.id
    and public.has_active_school_role(s.id,array['principal','school_admin'])
));

drop policy if exists gradifi_school_memberships_select_scoped on public.gradifi_school_memberships;
create policy gradifi_school_memberships_select_scoped on public.gradifi_school_memberships
for select to authenticated
using (
  user_id=(select auth.uid())
  or public.has_active_school_role(school_id,array['principal','school_admin'])
);

drop policy if exists teachers_select_scoped on public.teachers;
create policy teachers_select_scoped on public.teachers
for select to authenticated
using (
  user_id=(select auth.uid())
  or public.has_active_school_role(school_id,array['principal','school_admin'])
);

drop policy if exists students_select_scoped on public.students;
create policy students_select_scoped on public.students
for select to authenticated
using (
  user_id=(select auth.uid())
  or public.has_active_school_role(school_id,array['principal','school_admin'])
);

drop policy if exists class_subjects_select_active_school_member on public.class_subjects;
create policy class_subjects_select_active_school_member on public.class_subjects
for select to authenticated
using (public.has_active_school_role(school_id,array['principal','school_admin','teacher','exam_officer']));

-- Class reads are available to active school members; all writes use RPCs.
drop policy if exists classes_select_active_school_member on public.classes;
create policy classes_select_active_school_member on public.classes
for select to authenticated using (public.has_active_school_role(school_id,array['principal','school_admin','teacher','exam_officer']));

-- Retire unsafe anonymous/client-callable legacy onboarding RPCs.
revoke execute on function public.create_institution_account(text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke execute on function public.initialize_secondary_classes(uuid) from public, anon, authenticated;
revoke execute on function public.enroll_student(uuid,date,text,text,text,text) from public, anon, authenticated;
revoke execute on function public.create_teacher(text,text,text,uuid,uuid) from public, anon, authenticated;
revoke execute on function public.create_teacher(uuid,uuid,text,text,text,text,uuid) from public, anon, authenticated;
revoke execute on function public.create_vp(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke execute on function public.create_vp(uuid,uuid,text,text,text,text,uuid) from public, anon, authenticated;
revoke execute on function public.create_bursar(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke execute on function public.create_bursar(uuid,uuid,text,text,text,text,uuid) from public, anon, authenticated;

revoke all on function public.gradifi_bootstrap_institution(jsonb) from public, anon;
revoke all on function public.gradifi_get_school_classes(uuid) from public, anon;
revoke all on function public.gradifi_create_student(uuid,text,text,text,date) from public, anon;
revoke all on function public.gradifi_create_staff_profile(uuid,text,text,text,text,text) from public, anon;
revoke all on function public.gradifi_update_onboarding_progress(uuid,smallint,boolean) from public, anon;
grant execute on function public.gradifi_bootstrap_institution(jsonb) to authenticated;
grant execute on function public.gradifi_get_school_classes(uuid) to authenticated;
grant execute on function public.gradifi_create_student(uuid,text,text,text,date) to authenticated;
grant execute on function public.gradifi_create_staff_profile(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.gradifi_update_onboarding_progress(uuid,smallint,boolean) to authenticated;


-- Keep PIN authentication aligned with the actual profiles/teachers/students schema.
-- The previous implementation referenced teachers.staff_id, which is not a live column.
create or replace function public.auth_pin_login(p_identifier text,p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_profile public.profiles%rowtype;
  v_required_length integer;
begin
  select p.* into v_profile
  from public.profiles p
  left join public.students s on s.user_id=p.user_id
  where lower(coalesce(p.phone,''))=lower(coalesce(p_identifier,''))
     or lower(coalesce(p.email,''))=lower(coalesce(p_identifier,''))
     or s.student_number=p_identifier
  order by p.created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('success',false,'error','Invalid credentials');
  end if;
  if v_profile.pin_hash is null then
    return jsonb_build_object('success',false,'error','PIN not configured for this account');
  end if;
  if v_profile.locked_until is not null and v_profile.locked_until>now() then
    return jsonb_build_object('success',false,'error','Account temporarily locked');
  end if;

  if v_profile.role in ('vice_principal','vp','bursar','teacher') then
    v_required_length:=6;
  elsif v_profile.role in ('student','parent') then
    v_required_length:=4;
  else
    return jsonb_build_object('success',false,'error','Invalid role for PIN login');
  end if;

  if length(coalesce(p_pin,''))<>v_required_length
     or v_profile.pin_hash<>crypt(p_pin,v_profile.pin_hash) then
    update public.profiles
    set failed_attempts=coalesce(failed_attempts,0)+1,
        locked_until=case when coalesce(failed_attempts,0)+1>=5 then now()+interval '30 minutes' else null end
    where id=v_profile.id;
    return jsonb_build_object('success',false,'error','Invalid PIN');
  end if;

  update public.profiles
  set failed_attempts=0,locked_until=null,last_login_at=now(),authentication_method='pin'
  where id=v_profile.id;

  return jsonb_build_object(
    'success',true,'profile_id',v_profile.id,'user_id',v_profile.user_id,
    'role',v_profile.role,'institution_id',v_profile.institution_id,
    'school_id',v_profile.school_id,'full_name',v_profile.full_name,
    'email',v_profile.email,'requires_change',v_profile.pin_requires_change
  );
end;
$function$;

drop policy if exists institution_onboarding_select_member on public.institution_onboarding;
create policy institution_onboarding_select_member on public.institution_onboarding
for select to authenticated
using (exists (
  select 1 from public.schools s
  where s.institution_id=institution_onboarding.institution_id
    and public.has_active_school_role(s.id,array['principal','school_admin'])
));

revoke all on function public.auth_pin_login(text,text) from public;
grant execute on function public.auth_pin_login(text,text) to anon,authenticated;
create or replace function public.gradifi_update_onboarding_progress(
  p_institution_id uuid,p_current_step smallint,p_is_completed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare v_school_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
  if p_current_step < 1 or p_current_step > 14 then raise exception 'INVALID_ONBOARDING_STEP' using errcode='22023'; end if;
  select s.id into v_school_id from public.schools s
  where s.institution_id=p_institution_id
    and public.has_active_school_role(s.id,array['principal','school_admin'])
  limit 1;
  if v_school_id is null then raise exception 'SCHOOL_ACCESS_DENIED' using errcode='42501'; end if;
  update public.institution_onboarding
  set current_step=p_current_step,is_completed=p_is_completed,
      completed=p_is_completed,completed_at=case when p_is_completed then now() else null end,
      updated_at=now(),last_error=null
  where institution_id=p_institution_id;
  if not found then raise exception 'ONBOARDING_STATE_NOT_FOUND' using errcode='P0002'; end if;
  return jsonb_build_object('success',true,'institution_id',p_institution_id,
    'current_step',p_current_step,'is_completed',p_is_completed);
end;
$function$;

-- RLS read paths for the authenticated owner and active school members.
drop policy if exists profiles_select_own_identity on public.profiles;
create policy profiles_select_own_identity on public.profiles
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists identity_actors_select_own on public.identity_actors;
create policy identity_actors_select_own on public.identity_actors
for select to authenticated using (auth_user_id = (select auth.uid()));

drop policy if exists classes_select_active_school_member on public.classes;
create policy classes_select_active_school_member on public.classes
for select to authenticated using (public.has_active_school_role(school_id,array['principal','school_admin','teacher','exam_officer']));

-- Retire unsafe anonymous/client-callable legacy onboarding RPCs.
revoke execute on function public.create_institution_account(text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke execute on function public.initialize_secondary_classes(uuid) from public, anon, authenticated;
revoke execute on function public.enroll_student(uuid,date,text,text,text,text) from public, anon, authenticated;
revoke execute on function public.create_teacher(text,text,text,uuid,uuid) from public, anon, authenticated;
revoke execute on function public.create_teacher(uuid,uuid,text,text,text,text,uuid) from public, anon, authenticated;
revoke execute on function public.create_vp(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke execute on function public.create_vp(uuid,uuid,text,text,text,text,uuid) from public, anon, authenticated;
revoke execute on function public.create_bursar(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke execute on function public.create_bursar(uuid,uuid,text,text,text,text,uuid) from public, anon, authenticated;

revoke all on function public.gradifi_bootstrap_institution(jsonb) from public, anon;
revoke all on function public.gradifi_get_school_classes(uuid) from public, anon;
revoke all on function public.gradifi_create_student(uuid,text,text,text,date) from public, anon;
revoke all on function public.gradifi_create_staff_profile(uuid,text,text,text,text,text) from public, anon;
revoke all on function public.gradifi_update_onboarding_progress(uuid,smallint,boolean) from public, anon;
grant execute on function public.gradifi_bootstrap_institution(jsonb) to authenticated;
grant execute on function public.gradifi_get_school_classes(uuid) to authenticated;
grant execute on function public.gradifi_create_student(uuid,text,text,text,date) to authenticated;
grant execute on function public.gradifi_create_staff_profile(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.gradifi_update_onboarding_progress(uuid,smallint,boolean) to authenticated;


-- Keep PIN authentication aligned with the actual profiles/teachers/students schema.
-- The previous implementation referenced teachers.staff_id, which is not a live column.
create or replace function public.auth_pin_login(p_identifier text,p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_profile public.profiles%rowtype;
  v_required_length integer;
begin
  select p.* into v_profile
  from public.profiles p
  left join public.students s on s.user_id=p.user_id
  where lower(coalesce(p.phone,''))=lower(coalesce(p_identifier,''))
     or lower(coalesce(p.email,''))=lower(coalesce(p_identifier,''))
     or s.student_number=p_identifier
  order by p.created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('success',false,'error','Invalid credentials');
  end if;
  if v_profile.pin_hash is null then
    return jsonb_build_object('success',false,'error','PIN not configured for this account');
  end if;
  if v_profile.locked_until is not null and v_profile.locked_until>now() then
    return jsonb_build_object('success',false,'error','Account temporarily locked');
  end if;

  if v_profile.role in ('vice_principal','vp','bursar','teacher') then
    v_required_length:=6;
  elsif v_profile.role in ('student','parent') then
    v_required_length:=4;
  else
    return jsonb_build_object('success',false,'error','Invalid role for PIN login');
  end if;

  if length(coalesce(p_pin,''))<>v_required_length
     or v_profile.pin_hash<>crypt(p_pin,v_profile.pin_hash) then
    update public.profiles
    set failed_attempts=coalesce(failed_attempts,0)+1,
        locked_until=case when coalesce(failed_attempts,0)+1>=5 then now()+interval '30 minutes' else null end
    where id=v_profile.id;
    return jsonb_build_object('success',false,'error','Invalid PIN');
  end if;

  update public.profiles
  set failed_attempts=0,locked_until=null,last_login_at=now(),authentication_method='pin'
  where id=v_profile.id;

  return jsonb_build_object(
    'success',true,'profile_id',v_profile.id,'user_id',v_profile.user_id,
    'role',v_profile.role,'institution_id',v_profile.institution_id,
    'school_id',v_profile.school_id,'full_name',v_profile.full_name,
    'email',v_profile.email,'requires_change',v_profile.pin_requires_change
  );
end;
$function$;

drop policy if exists institution_onboarding_select_member on public.institution_onboarding;
create policy institution_onboarding_select_member on public.institution_onboarding
for select to authenticated
using (exists (
  select 1 from public.schools s
  where s.institution_id=institution_onboarding.institution_id
    and public.has_active_school_role(s.id,array['principal','school_admin'])
));

revoke all on function public.auth_pin_login(text,text) from public;
grant execute on function public.auth_pin_login(text,text) to anon,authenticated;


create or replace function public.gradifi_initialize_secondary_classes(p_school_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare v_institution_id uuid; v_classes jsonb;
begin
  if auth.uid() is null or not public.has_active_school_role(p_school_id,array['principal','school_admin']) then
    raise exception 'SCHOOL_ACCESS_DENIED' using errcode='42501';
  end if;
  select institution_id into v_institution_id from public.schools
  where id=p_school_id and provisioning_status='active';
  if v_institution_id is null then raise exception 'ACTIVE_SCHOOL_NOT_FOUND' using errcode='P0002'; end if;

  insert into public.classes(school_id,name)
  select p_school_id,n.name
  from (values ('JSS 1'),('JSS 2'),('JSS 3'),('SS 1'),('SS 2'),('SS 3')) n(name)
  where not exists(select 1 from public.classes c where c.school_id=p_school_id and lower(c.name)=lower(n.name));

  select jsonb_agg(jsonb_build_object('id',c.id,'school_id',c.school_id,'name',c.name) order by c.name)
  into v_classes from public.classes c where c.school_id=p_school_id;

  update public.institution_onboarding
  set classes_created=true,current_step=greatest(current_step,8),updated_at=now()
  where institution_id=v_institution_id;

  return jsonb_build_object('success',true,'classes',coalesce(v_classes,'[]'::jsonb),
    'classes_created',jsonb_array_length(coalesce(v_classes,'[]'::jsonb)));
end;
$function$;

revoke all on function public.gradifi_initialize_secondary_classes(uuid) from public,anon;
grant execute on function public.gradifi_initialize_secondary_classes(uuid) to authenticated;


-- Secure bulk roster import. School and institution authority are derived from the caller's membership.
create or replace function public.gradifi_bulk_create_students(p_students jsonb,p_school_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_school_id uuid;
  v_institution_id uuid;
  v_student jsonb;
  v_class_id uuid;
  v_student_id uuid;
  v_student_number text;
  v_results jsonb := '[]'::jsonb;
  v_success_count integer := 0;
  v_failed_count integer := 0;
  v_total integer;
  v_gender text;
  v_dob date;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
  if jsonb_typeof(p_students)<>'array' then raise exception 'STUDENT_ROWS_MUST_BE_AN_ARRAY' using errcode='22023'; end if;
  v_total:=jsonb_array_length(p_students);
  if v_total<1 or v_total>500 then raise exception 'BULK_IMPORT_LIMIT_IS_500' using errcode='22023'; end if;

  select m.school_id,s.institution_id into v_school_id,v_institution_id
  from public.gradifi_school_memberships m
  join public.schools s on s.id=m.school_id
  where m.user_id=auth.uid() and m.member_role in ('principal','school_admin')
    and m.status='active' and s.provisioning_status='active'
    and (p_school_id is null or m.school_id=p_school_id)
  limit 1;
  if v_school_id is null then raise exception 'SCHOOL_ACCESS_DENIED' using errcode='42501'; end if;

  for v_student in select value from jsonb_array_elements(p_students)
  loop
    begin
      if length(trim(coalesce(v_student->>'first_name','')))=0
         or length(trim(coalesce(v_student->>'last_name','')))=0
         or length(trim(coalesce(v_student->>'class_name','')))=0 then
        raise exception 'FIRST_NAME_LAST_NAME_AND_CLASS_ARE_REQUIRED';
      end if;

      select c.id into v_class_id from public.classes c
      where c.school_id=v_school_id and lower(c.name)=lower(trim(v_student->>'class_name'))
      limit 1;
      if v_class_id is null then
        raise exception 'CLASS_NOT_FOUND: %',trim(v_student->>'class_name');
      end if;

      v_gender:=case lower(trim(coalesce(v_student->>'gender','')))
        when 'male' then 'Male' when 'female' then 'Female'
        when '' then null else initcap(trim(v_student->>'gender')) end;
      v_dob:=nullif(trim(coalesce(v_student->>'date_of_birth','')),'')::date;
      v_student_number:=public.generate_student_number(v_school_id);

      insert into public.students
        (first_name,last_name,student_number,class_id,school_id,institution_id,gender,date_of_birth)
      values
        (trim(v_student->>'first_name'),trim(v_student->>'last_name'),v_student_number,
         v_class_id,v_school_id,v_institution_id,v_gender,v_dob)
      returning id into v_student_id;

      v_success_count:=v_success_count+1;
      v_results:=v_results||jsonb_build_array(jsonb_build_object(
        'student_id',v_student_id,'student_number',v_student_number,
        'first_name',trim(v_student->>'first_name'),'last_name',trim(v_student->>'last_name'),
        'class',trim(v_student->>'class_name'),'status','success'
      ));
    exception when others then
      v_failed_count:=v_failed_count+1;
      v_results:=v_results||jsonb_build_array(jsonb_build_object(
        'first_name',v_student->>'first_name','last_name',v_student->>'last_name',
        'class',v_student->>'class_name','error',sqlerrm,'status','failed'
      ));
    end;
  end loop;

  if v_success_count>0 then
    update public.institution_onboarding
    set students_created=true,current_step=greatest(current_step,11),updated_at=now()
    where institution_id=v_institution_id;
  end if;

  return jsonb_build_object('success',true,'total_submitted',v_total,
    'success_count',v_success_count,'failed_count',v_failed_count,'results',v_results);
end;
$function$;

-- Parent linking is school-authorized and uses the real Auth identity created by the Edge Function.
create or replace function public.gradifi_create_parent_profile(
  p_user_id uuid,p_student_id uuid,p_parent_name text,p_parent_phone text,
  p_parent_email text,p_relationship text,p_is_primary boolean,p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_school_id uuid;
  v_institution_id uuid;
  v_profile_id uuid;
  v_parent_id uuid;
  v_student_name text;
  v_user_email text;
  v_relationship text;
  v_existing boolean := false;
  v_relationship_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='28000'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then raise exception 'INVALID_PARENT_PIN' using errcode='22023'; end if;
  v_relationship:=lower(trim(coalesce(p_relationship,'guardian')));
  if v_relationship not in ('father','mother','guardian','other') then
    raise exception 'INVALID_PARENT_RELATIONSHIP' using errcode='22023';
  end if;

  select s.school_id,s.institution_id,trim(s.first_name||' '||s.last_name)
    into v_school_id,v_institution_id,v_student_name
  from public.students s where s.id=p_student_id;
  if v_school_id is null then raise exception 'STUDENT_NOT_FOUND' using errcode='P0002'; end if;
  if not public.has_active_school_role(v_school_id,array['principal','school_admin']) then
    raise exception 'SCHOOL_ACCESS_DENIED' using errcode='42501';
  end if;

  select lower(email) into v_user_email from auth.users
  where id=p_user_id and lower(email)=lower(trim(p_parent_email));
  if v_user_email is null then raise exception 'PARENT_AUTH_EMAIL_MISMATCH' using errcode='23503'; end if;

  if exists(select 1 from public.profiles p where lower(p.email)=v_user_email and p.user_id<>p_user_id) then
    raise exception 'PARENT_EMAIL_ALREADY_LINKED_TO_ANOTHER_PROFILE' using errcode='23505';
  end if;
  if exists(select 1 from public.identity_actors a where lower(a.login_identifier)=v_user_email and a.auth_user_id<>p_user_id) then
    raise exception 'PARENT_EMAIL_ALREADY_LINKED_TO_ANOTHER_IDENTITY' using errcode='23505';
  end if;
  if exists(select 1 from public.profiles p where p.phone=p_parent_phone and p.user_id<>p_user_id and p.role='parent') then
    raise exception 'PARENT_PHONE_ALREADY_LINKED_TO_ANOTHER_ACCOUNT' using errcode='23505';
  end if;

  select p.id into v_profile_id from public.profiles p where p.user_id=p_user_id and p.role='parent';
  if v_profile_id is not null then
    if not exists(select 1 from public.profiles p where p.id=v_profile_id and p.school_id=v_school_id and p.institution_id=v_institution_id) then
      raise exception 'PARENT_ACCOUNT_BELONGS_TO_ANOTHER_SCHOOL' using errcode='42501';
    end if;
    v_existing:=true;
    update public.profiles
    set full_name=trim(p_parent_name),email=v_user_email,phone=trim(p_parent_phone),
        pin_hash=crypt(p_pin,gen_salt('bf',12)),pin_type='4-digit',
        authentication_method='pin',pin_requires_change=true
    where id=v_profile_id;
  else
    insert into public.profiles
      (user_id,full_name,email,phone,school_id,institution_id,role,pin_hash,pin_type,
       authentication_method,pin_requires_change)
    values
      (p_user_id,trim(p_parent_name),v_user_email,trim(p_parent_phone),v_school_id,v_institution_id,
       'parent',crypt(p_pin,gen_salt('bf',12)),'4-digit','pin',true)
    returning id into v_profile_id;
  end if;

  insert into public.identity_actors
    (auth_user_id,institution_id,school_id,actor_type,actor_record_id,login_identifier,auth_method,status,pin_hash)
  values
    (p_user_id,v_institution_id,v_school_id,'parent',v_profile_id,v_user_email,'pin','active',
     crypt(p_pin,gen_salt('bf',12)))
  on conflict (auth_user_id) do update set
    institution_id=excluded.institution_id,school_id=excluded.school_id,
    actor_type='parent',actor_record_id=v_profile_id,login_identifier=v_user_email,
    auth_method='pin',status='active',pin_hash=excluded.pin_hash;

  select id into v_parent_id from public.parents where profile_id=v_profile_id;
  if v_parent_id is null then
    insert into public.parents(profile_id,institution_id,child_student_id)
    values(v_profile_id,v_institution_id,p_student_id)
    returning id into v_parent_id;
  end if;

  insert into public.student_parent_relationships
    (institution_id,school_id,student_id,parent_id,relationship_type,is_primary,
     can_view_results,can_view_attendance,can_receive_notifications)
  values
    (v_institution_id,v_school_id,p_student_id,v_parent_id,v_relationship,p_is_primary,true,true,true)
  on conflict(student_id,parent_id) do update set
    relationship_type=excluded.relationship_type,is_primary=excluded.is_primary
  returning id into v_relationship_id;

  insert into public.system_activity_logs
    (institution_id,school_id,profile_id,action_type,resource_type,resource_id)
  values
    (v_institution_id,v_school_id,v_profile_id,'PARENT_LINKED','student_parent_relationship',v_relationship_id);

  return jsonb_build_object('success',true,'parent_id',v_parent_id,'profile_id',v_profile_id,
    'user_id',p_user_id,'parent_name',trim(p_parent_name),'phone',trim(p_parent_phone),
    'email',v_user_email,'student_id',p_student_id,'student_name',v_student_name,
    'is_existing',v_existing);
end;
$function$;

-- Parent and student records are readable only by the owner/linked parent or authorized school staff.
drop policy if exists students_select_scoped on public.students;
create policy students_select_scoped on public.students
for select to authenticated
using (
  user_id=(select auth.uid())
  or public.has_active_school_role(school_id,array['principal','school_admin'])
  or exists (
    select 1 from public.student_parent_relationships spr
    join public.parents p on p.id=spr.parent_id
    join public.profiles pf on pf.id=p.profile_id
    where spr.student_id=students.id and pf.user_id=(select auth.uid())
  )
);

drop policy if exists parents_select_scoped on public.parents;
create policy parents_select_scoped on public.parents
for select to authenticated
using (
  exists(select 1 from public.profiles pf where pf.id=parents.profile_id and pf.user_id=(select auth.uid()))
  or public.has_active_school_role(
    (select s.school_id from public.students s where s.id=parents.child_student_id),
    array['principal','school_admin']
  )
);

drop policy if exists student_parent_relationships_select_scoped on public.student_parent_relationships;
create policy student_parent_relationships_select_scoped on public.student_parent_relationships
for select to authenticated
using (
  exists (
    select 1 from public.parents p join public.profiles pf on pf.id=p.profile_id
    where p.id=student_parent_relationships.parent_id and pf.user_id=(select auth.uid())
  )
  or public.has_active_school_role(school_id,array['principal','school_admin'])
);

revoke execute on function public.bulk_enroll_students(jsonb,uuid,uuid) from public,anon,authenticated;
revoke execute on function public.create_parent(uuid,text,text,text,text,boolean) from public,anon,authenticated;
revoke all on function public.gradifi_bulk_create_students(jsonb,uuid) from public,anon;
revoke all on function public.gradifi_create_parent_profile(uuid,uuid,text,text,text,text,boolean,text) from public,anon;
grant execute on function public.gradifi_bulk_create_students(jsonb,uuid) to authenticated;
grant execute on function public.gradifi_create_parent_profile(uuid,uuid,text,text,text,text,boolean,text) to authenticated;


-- Sequence allocation is atomic and starts at 00001, including the first student in a school.
create or replace function public.generate_student_number(p_school_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_next_number integer;
  v_prefix text;
  v_school_name text;
begin
  select school_name into v_school_name from public.schools where id=p_school_id;
  if v_school_name is null then raise exception 'SCHOOL_NOT_FOUND' using errcode='P0002'; end if;
  v_prefix:=upper(left(regexp_replace(v_school_name,'[^a-zA-Z]','','g'),3));
  if v_prefix is null or v_prefix='' then v_prefix:='SCH'; end if;

  insert into public.student_number_sequences(school_id,last_number,prefix)
  values(p_school_id,1,v_prefix)
  on conflict(school_id) do update
    set last_number=public.student_number_sequences.last_number+1,
        updated_at=now()
  returning last_number into v_next_number;

  return v_prefix||'-'||to_char(current_date,'YYYY')||'-'||lpad(v_next_number::text,5,'0');
end;
$function$;

revoke execute on function public.generate_student_number(uuid) from public,anon,authenticated;
