-- Persist school institution locality fields and update its atomic root bootstrap.
begin;
alter table public.institutions add column if not exists state text;
alter table public.institutions add column if not exists lga text;
create or replace function public.bootstrap_school_institution(
  p_auth_user_id uuid,
  p_institution_name text,
  p_institution_type text,
  p_registration_number text,
  p_country text,
  p_address text,
  p_state text,
  p_lga text,
  p_phone text,
  p_website text,
  p_principal_name text,
  p_principal_email text,
  p_principal_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $bootstrap_school_body$
declare
  v_institution_id uuid;
  v_school_id uuid;
  v_profile_id uuid;
  v_slug text;
  v_email text := lower(trim(p_principal_email));
  v_category text;
begin
  if p_auth_user_id is null then raise exception 'AUTH_USER_REQUIRED'; end if;
  if nullif(trim(p_institution_name),'') is null
     or nullif(trim(p_institution_type),'') is null
     or nullif(trim(p_principal_name),'') is null
     or nullif(v_email,'') is null then
    raise exception 'INSTITUTION_AND_PRINCIPAL_REQUIRED';
  end if;
  if p_institution_type not in ('primary','secondary','k12','group_of_schools') then
    raise exception 'UNSUPPORTED_SCHOOL_INSTITUTION_TYPE';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id=p_auth_user_id and lower(u.email)=v_email
  ) then raise exception 'PRINCIPAL_AUTH_EMAIL_MISMATCH'; end if;
  if exists (select 1 from public.profiles p where p.user_id=p_auth_user_id)
     or exists (select 1 from public.identity_actors a where a.auth_user_id=p_auth_user_id) then
    raise exception 'ROOT_AUTH_IDENTITY_ALREADY_PROVISIONED';
  end if;
  if exists (select 1 from public.institutions i where i.registration_number=p_registration_number and p_registration_number is not null) then
    raise exception 'INSTITUTION_REGISTRATION_NUMBER_EXISTS';
  end if;

  v_category := case when p_institution_type='group_of_schools' then 'group_of_schools' else p_institution_type end;
  insert into public.institutions(name,type,country,registration_number,address,state,lga,phone,website_url,established_year,institution_category)
  values(trim(p_institution_name),p_institution_type,coalesce(nullif(trim(p_country),''),'Nigeria'),
    nullif(trim(p_registration_number),''),nullif(trim(p_address),''),nullif(trim(p_state),''),
    nullif(trim(p_lga),''),nullif(trim(p_phone),''),nullif(trim(p_website),''),extract(year from now())::integer,v_category)
  returning id into v_institution_id;

  v_slug := trim(both '-' from regexp_replace(lower(trim(p_institution_name)),'[^a-z0-9]+','-','g'));
  if v_slug='' then raise exception 'INSTITUTION_SLUG_INVALID'; end if;
  if exists(select 1 from public.schools s where s.url_slug=v_slug or s.slug=v_slug) then
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
  end if;

  insert into public.schools(
    institution_id,school_name,principal_name,principal_email,email,phone,address,
    campus_address,campus_phone,school_type,url_slug,slug,provisioning_status
  ) values (
    v_institution_id,trim(p_institution_name),trim(p_principal_name),v_email,v_email,
    nullif(trim(p_phone),''),nullif(trim(p_address),''),nullif(trim(p_address),''),
    nullif(trim(p_phone),''),p_institution_type,v_slug,v_slug,'unprovisioned'
  ) returning id into v_school_id;

  insert into public.profiles(
    user_id,institution_id,school_id,full_name,role,email,phone,
    authentication_method,pin,pin_hash,pin_type,pin_requires_change,failed_attempts,locked_until
  ) values (
    p_auth_user_id,v_institution_id,v_school_id,trim(p_principal_name),'principal_admin',
    v_email,nullif(trim(p_principal_phone),''),'email',null,null,null,false,0,null
  ) returning id into v_profile_id;

  insert into public.identity_actors(
    auth_user_id,institution_id,school_id,actor_type,actor_record_id,
    login_identifier,auth_method,status,pin_hash,pin_changed_at,failed_attempts,authority_user_id
  ) values (
    p_auth_user_id,v_institution_id,v_school_id,'principal_admin',null,
    v_email,'email','active',null,now(),0,null
  );

  insert into public.gradifi_school_memberships(school_id,user_id,member_role,status,invited_by,activated_at)
  values(v_school_id,p_auth_user_id,'principal','active',p_auth_user_id,now());

  insert into public.institution_onboarding(
    institution_id,institution_created,school_created,classes_created,
    subjects_created,teachers_created,students_created,completed
  ) values(v_institution_id,true,true,false,false,false,false,false);

  insert into public.tenant_subscriptions(institution_id,plan_type,is_active)
  values(v_institution_id,'free',true);

  return jsonb_build_object(
    'success',true,'institution_id',v_institution_id,'school_id',v_school_id,
    'profile_id',v_profile_id,'auth_user_id',p_auth_user_id,
    'actor_type','principal_admin','url_slug',v_slug,
    'institution_path','/'||v_slug,'institution_name',trim(p_institution_name),
    'principal_email',v_email
  );
end;
$bootstrap_school_body$;
commit;
