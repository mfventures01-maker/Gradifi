-- Bind every actor provisioning request to the authenticated actor who initiated it.
-- The root authority remains the canonical authority_user_id, while the provisioner
-- determines whether the allowed transition is VC/Rector -> Dean or Dean -> staff/student.
begin;

do $bind_provisioner$
declare
  v_old_function regprocedure :=
    'public.complete_actor_onboarding(uuid,uuid,text,text,uuid,uuid,text,text,text,text,uuid,uuid,uuid[],text,date,text,boolean,uuid,uuid,text,text,text,boolean,integer)'::regprocedure;
  v_new_definition text;
  v_old_header text := 'p_max_students integer DEFAULT NULL::integer)';
  v_new_header text := 'p_max_students integer DEFAULT NULL::integer, p_provisioned_by_user_id uuid DEFAULT NULL::uuid)';
  v_old_declare text := '  v_expected_actor_roles text[];';
  v_new_declare text := '  v_expected_actor_roles text[];
  v_provisioner public.profiles%rowtype;
  v_provisioner_actor public.identity_actors%rowtype;';
  v_old_authority_block text := $old$
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
  elsif p_expected_authority_role in ('vice_chancellor','rector') then
    if not exists (
      select 1 from public.identity_actors ia
      where ia.auth_user_id = p_authority_user_id
        and ia.actor_type = p_expected_authority_role
        and ia.auth_method = 'email'
        and ia.status = 'active'
    ) then raise exception 'ACTIVE_VC_RECTOR_AUTHORITY_REQUIRED'; end if;
    v_expected_actor_roles := array['dean'];
  else
    raise exception 'UNSUPPORTED_AUTHORITY_ROLE';
  end if;
$old$;
  v_new_authority_block text := $new$
  if p_provisioned_by_user_id is null then
    raise exception 'PROVISIONER_REQUIRED';
  end if;
  select * into v_provisioner
  from public.profiles
  where user_id = p_provisioned_by_user_id;
  if not found then raise exception 'PROVISIONER_PROFILE_NOT_FOUND'; end if;
  if v_provisioner.institution_id is distinct from p_institution_id then
    raise exception 'CROSS_INSTITUTION_PROVISIONER_DENIED';
  end if;

  if p_expected_authority_role = 'principal_admin' then
    if p_provisioned_by_user_id is distinct from p_authority_user_id
       or v_provisioner.role <> 'principal_admin' then
      raise exception 'PRINCIPAL_PROVISIONER_REQUIRED';
    end if;
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
  elsif p_expected_authority_role in ('vice_chancellor','rector') then
    if not exists (
      select 1 from public.identity_actors ia
      where ia.auth_user_id = p_authority_user_id
        and ia.actor_type = p_expected_authority_role
        and ia.auth_method = 'email'
        and ia.status = 'active'
    ) then raise exception 'ACTIVE_VC_RECTOR_AUTHORITY_REQUIRED'; end if;

    if p_provisioned_by_user_id = p_authority_user_id then
      if v_provisioner.role <> p_expected_authority_role then
        raise exception 'ROOT_PROVISIONER_ROLE_MISMATCH';
      end if;
      v_expected_actor_roles := array['dean'];
    else
      if v_provisioner.role <> 'dean' then
        raise exception 'HIGHER_ED_DEAN_PROVISIONER_REQUIRED';
      end if;
      if v_provisioner.authority_user_id is distinct from p_authority_user_id then
        raise exception 'DEAN_ROOT_AUTHORITY_LINK_REQUIRED';
      end if;
      select * into v_provisioner_actor
      from public.identity_actors ia
      where ia.auth_user_id = p_provisioned_by_user_id
        and ia.actor_type = 'dean'
        and ia.status = 'active';
      if not found or v_provisioner_actor.authority_user_id is distinct from p_authority_user_id then
        raise exception 'ACTIVE_DEAN_ROOT_LINK_REQUIRED';
      end if;
      v_expected_actor_roles := array['hod','adviser','lecturer','student'];
    end if;
  else
    raise exception 'UNSUPPORTED_AUTHORITY_ROLE';
  end if;
$new$;
begin
  select pg_get_functiondef(v_old_function) into v_new_definition;

  if position(v_old_header in v_new_definition) = 0 then
    raise exception 'PROVISIONER_SIGNATURE_PATCH_TARGET_NOT_FOUND';
  end if;
  if position(v_old_declare in v_new_definition) = 0 then
    raise exception 'PROVISIONER_DECLARATION_PATCH_TARGET_NOT_FOUND';
  end if;
  if position(v_old_authority_block in v_new_definition) = 0 then
    raise exception 'PROVISIONER_AUTHORITY_PATCH_TARGET_NOT_FOUND';
  end if;

  v_new_definition := replace(v_new_definition,v_old_header,v_new_header);
  v_new_definition := replace(v_new_definition,v_old_declare,v_new_declare);

  -- Insert the provisioner gate after validating the root profile and its tenant.
  v_new_definition := replace(
    v_new_definition,
    '  if v_authority.institution_id is distinct from p_institution_id then
    raise exception ''CROSS_INSTITUTION_AUTHORITY_DENIED'';
  end if;',
    '  if v_authority.institution_id is distinct from p_institution_id then
    raise exception ''CROSS_INSTITUTION_AUTHORITY_DENIED'';
  end if;'
  );

  v_new_definition := replace(v_new_definition,v_old_authority_block,v_new_authority_block);
  execute v_new_definition;
end;
$bind_provisioner$;

-- The old service-role-only overload has no provisioner identity. Remove it so
-- no trusted caller can accidentally invoke the weaker authority contract.
revoke all on function public.complete_actor_onboarding(uuid,uuid,text,text,uuid,uuid,text,text,text,text,uuid,uuid,uuid[],text,date,text,boolean,uuid,uuid,text,text,text,boolean,integer)
  from public, anon, authenticated, service_role;
drop function public.complete_actor_onboarding(uuid,uuid,text,text,uuid,uuid,text,text,text,text,uuid,uuid,uuid[],text,date,text,boolean,uuid,uuid,text,text,text,boolean,integer);

revoke all on function public.complete_actor_onboarding(uuid,uuid,text,text,uuid,uuid,text,text,text,text,uuid,uuid,uuid[],text,date,text,boolean,uuid,uuid,text,text,text,boolean,integer,uuid)
  from public, anon, authenticated;
grant execute on function public.complete_actor_onboarding(uuid,uuid,text,text,uuid,uuid,text,text,text,text,uuid,uuid,uuid[],text,date,text,boolean,uuid,uuid,text,text,text,boolean,integer,uuid)
  to service_role;

commit;
