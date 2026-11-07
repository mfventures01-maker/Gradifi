-- Canonical SEFAES identity onboarding
-- One provisioning RPC, one identity model, no role-specific overloaded create RPCs.
begin;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array[
    'principal_admin','vice_principal','bursar','teacher','student','parent',
    'examiner','individual'
  ]::text[]));

alter table public.profiles
  add column if not exists login_identifier text;

create unique index if not exists profiles_login_identifier_uidx
  on public.profiles (login_identifier)
  where login_identifier is not null;

create table if not exists public.identity_login_sequences (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  actor_type text not null check (actor_type in ('vice_principal','bursar','teacher','student','parent')),
  last_value bigint not null default 0,
  primary key (institution_id, actor_type)
);

alter table public.identity_actors
  add column if not exists profile_id uuid references public.profiles(id),
  add column if not exists email text,
  add column if not exists phone text;

create or replace function public.provision_identity_actor(
  p_auth_user_id uuid,
  p_institution_id uuid,
  p_school_id uuid,
  p_actor_type text,
  p_full_name text,
  p_pin text,
  p_email text default null,
  p_phone text default null,
  p_class_id uuid default null,
  p_gender text default null,
  p_date_of_birth date default null,
  p_student_number text default null,
  p_student_id uuid default null,
  p_relationship text default 'guardian'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_prefix text;
  v_next bigint;
  v_login_id text;
  v_profile_id uuid;
  v_actor_id uuid;
  v_record_id uuid;
  v_role_pin_length integer;
  v_pin_hash text;
  v_school_institution uuid;
  v_first_name text;
  v_last_name text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;

  if p_actor_type not in ('vice_principal','bursar','teacher','student','parent') then
    raise exception 'unsupported actor type';
  end if;
  if nullif(trim(p_full_name),'') is null then raise exception 'full name required'; end if;
  if p_pin !~ '^[0-9]+$' then raise exception 'PIN must contain digits only'; end if;

  v_role_pin_length := case when p_actor_type in ('student','parent') then 4 else 6 end;
  if length(p_pin) <> v_role_pin_length then
    raise exception '% requires a % digit PIN', p_actor_type, v_role_pin_length;
  end if;

  if not exists (select 1 from public.institutions i where i.id=p_institution_id) then
    raise exception 'institution not found';
  end if;
  if p_school_id is not null then
    select s.institution_id into v_school_institution
    from public.schools s where s.id=p_school_id;
    if not found or v_school_institution is distinct from p_institution_id then
      raise exception 'school/institution mismatch';
    end if;
  end if;

  v_prefix := case p_actor_type
    when 'vice_principal' then 'VP'
    when 'bursar' then 'BUR'
    when 'teacher' then 'TCH'
    when 'student' then 'STU'
    when 'parent' then 'PAR'
  end;

  insert into public.identity_login_sequences(institution_id,actor_type,last_value)
  values(p_institution_id,p_actor_type,1)
  on conflict(institution_id,actor_type)
  do update set last_value=public.identity_login_sequences.last_value+1
  returning last_value into v_next;

  v_login_id := v_prefix || '-' || upper(substr(replace(p_institution_id::text,'-',''),1,4))
                || '-' || lpad(v_next::text,6,'0');

  v_pin_hash := crypt(p_pin, gen_salt('bf', 12));

  insert into public.profiles(
    user_id,institution_id,school_id,full_name,email,phone,role,
    pin_hash,pin_type,pin_requires_change,authentication_method,login_identifier,
    failed_attempts,created_at
  ) values (
    p_auth_user_id,p_institution_id,p_school_id,trim(p_full_name),nullif(trim(p_email),''),
    nullif(trim(p_phone),''),p_actor_type,v_pin_hash,
    case when v_role_pin_length=4 then '4-digit' else '6-digit' end,
    true,'pin',v_login_id,0,now()
  ) returning id into v_profile_id;

  if p_actor_type='teacher' then
    insert into public.teachers(user_id,institution_id,school_id,name,email,phone,profile_id)
    values(p_auth_user_id,p_institution_id,p_school_id,trim(p_full_name),
           nullif(trim(p_email),''),nullif(trim(p_phone),''),v_profile_id)
    returning id into v_record_id;
  elsif p_actor_type='student' then
    if p_class_id is null then raise exception 'class_id required for student'; end if;
    if not exists(select 1 from public.classes c where c.id=p_class_id and c.school_id=p_school_id) then
      raise exception 'class does not belong to selected school';
    end if;
    v_first_name := split_part(trim(p_full_name),' ',1);
    v_last_name := nullif(trim(substr(trim(p_full_name),length(v_first_name)+1)),'');
    if v_last_name is null then raise exception 'student full name must include first and last name'; end if;
    insert into public.students(
      user_id,school_id,institution_id,class_id,student_number,first_name,last_name,
      gender,date_of_birth,created_at,enrollment_status
    ) values (
      p_auth_user_id,p_school_id,p_institution_id,p_class_id,
      coalesce(nullif(trim(p_student_number),''),v_login_id),
      v_first_name,v_last_name,nullif(p_gender,''),p_date_of_birth,now(),'active'
    ) returning id into v_record_id;
  elsif p_actor_type='parent' then
    insert into public.parents(institution_id,profile_id,child_student_id,full_name,email,phone,created_at)
    values(p_institution_id,v_profile_id,p_student_id,trim(p_full_name),
           nullif(trim(p_email),''),nullif(trim(p_phone),''),now())
    returning id into v_record_id;
    if p_student_id is not null then
      if not exists(select 1 from public.students s where s.id=p_student_id and s.institution_id=p_institution_id) then
        raise exception 'student does not belong to institution';
      end if;
      insert into public.student_parents(student_id,parent_id,relationship,is_primary,can_view_results,created_at)
      values(p_student_id,v_record_id,coalesce(nullif(p_relationship,''),'guardian'),true,true,now())
      on conflict do nothing;
    end if;
  end if;

  insert into public.identity_actors(
    auth_user_id,institution_id,school_id,actor_type,actor_record_id,
    login_identifier,auth_method,status,pin_hash,pin_changed_at,profile_id,email,phone
  ) values (
    p_auth_user_id,p_institution_id,p_school_id,p_actor_type,v_record_id,
    v_login_id,'pin','active',v_pin_hash,null,v_profile_id,
    nullif(trim(p_email),''),nullif(trim(p_phone),'')
  ) returning id into v_actor_id;

  return jsonb_build_object(
    'success',true,'actor_id',v_actor_id,'profile_id',v_profile_id,
    'record_id',v_record_id,'auth_user_id',p_auth_user_id,
    'login_id',v_login_id,'role',p_actor_type,'pin_requires_change',true
  );
end;
$$;

revoke all on function public.provision_identity_actor(uuid,uuid,uuid,text,text,text,text,text,uuid,text,date,text,uuid,text) from public, anon, authenticated;
grant execute on function public.provision_identity_actor(uuid,uuid,uuid,text,text,text,text,text,uuid,text,date,text,uuid,text) to service_role;

create or replace function public.auth_pin_login(p_identifier text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.identity_actors%rowtype;
begin
  select * into v_actor
  from public.identity_actors
  where login_identifier=upper(trim(p_identifier))
  limit 1
  for update;

  if not found or v_actor.status <> 'active' then
    return jsonb_build_object('success',false,'error','Invalid login ID or PIN');
  end if;
  if v_actor.locked_until is not null and v_actor.locked_until > now() then
    return jsonb_build_object('success',false,'error','Account temporarily locked');
  end if;
  if v_actor.pin_hash is null or v_actor.pin_hash <> crypt(p_pin,v_actor.pin_hash) then
    update public.identity_actors
      set failed_attempts=coalesce(failed_attempts,0)+1,
          locked_until=case when coalesce(failed_attempts,0)+1>=5 then now()+interval '30 minutes' else null end,
          updated_at=now()
      where id=v_actor.id;
    return jsonb_build_object('success',false,'error','Invalid login ID or PIN');
  end if;

  update public.identity_actors set failed_attempts=0,locked_until=null,last_login_at=now(),updated_at=now()
    where id=v_actor.id;
  update public.profiles set failed_attempts=0,locked_until=null,last_login_at=now()
    where id=v_actor.profile_id;

  return jsonb_build_object(
    'success',true,'auth_user_id',v_actor.auth_user_id,'actor_id',v_actor.id,
    'profile_id',v_actor.profile_id,'institution_id',v_actor.institution_id,
    'school_id',v_actor.school_id,'role',v_actor.actor_type,
    'requires_change',coalesce((select pin_requires_change from public.profiles where id=v_actor.profile_id),true)
  );
end;
$$;

revoke all on function public.auth_pin_login(text,text) from public, anon, authenticated;
grant execute on function public.auth_pin_login(text,text) to service_role;

-- Remove legacy overloaded onboarding RPCs. New account provisioning is exclusively
-- performed by identity-onboarding -> provision_identity_actor.
drop function if exists public.create_teacher(text,text,text,uuid,uuid);
drop function if exists public.create_teacher(uuid,uuid,text,text,text,text,uuid);
drop function if exists public.create_vp(uuid,uuid,text,text,text);
drop function if exists public.create_vp(uuid,uuid,text,text,text,text,uuid);
drop function if exists public.create_bursar(uuid,uuid,text,text,text);
drop function if exists public.create_bursar(uuid,uuid,text,text,text,text,uuid);
drop function if exists public.create_parent(uuid,text,text,text,text,boolean);
drop function if exists public.enroll_student(uuid,date,text,text,text,text);

commit;
