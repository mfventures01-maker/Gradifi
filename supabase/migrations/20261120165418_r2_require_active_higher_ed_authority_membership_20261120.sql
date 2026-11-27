
DO $r2$
DECLARE
  v_def text;
  v_old text := $old$
  if not exists (select 1 from public.institutions i where i.id = p_institution_id) then
    raise exception 'INSTITUTION_NOT_FOUND';
  end if;
$old$;
  v_new text := $new$
  if not exists (select 1 from public.institutions i where i.id = p_institution_id) then
    raise exception 'INSTITUTION_NOT_FOUND';
  end if;

  -- Higher-education executive and Dean operations require a live membership.
  -- Pending institutions may appoint their initial Dean during onboarding;
  -- suspended and rejected institutions may not provision additional actors.
  if p_expected_authority_role in ('vice_chancellor','rector') then
    if not exists (
      select 1
      from public.institutions i
      where i.id = p_institution_id
        and i.status in ('pending','active')
    ) then
      raise exception 'INSTITUTION_NOT_AVAILABLE_FOR_PROVISIONING';
    end if;

    if not exists (
      select 1
      from public.institution_memberships m
      where m.user_id = p_authority_user_id
        and m.institution_id = p_institution_id
        and m.role = p_expected_authority_role
        and m.status = 'active'
    ) then
      raise exception 'ACTIVE_ROOT_INSTITUTION_MEMBERSHIP_REQUIRED';
    end if;

    if p_provisioned_by_user_id is distinct from p_authority_user_id
       and not exists (
         select 1
         from public.institution_memberships m
         where m.user_id = p_provisioned_by_user_id
           and m.institution_id = p_institution_id
           and m.role = 'dean'
           and m.status = 'active'
       ) then
      raise exception 'ACTIVE_DEAN_INSTITUTION_MEMBERSHIP_REQUIRED';
    end if;
  end if;
$new$;
BEGIN
  SELECT pg_get_functiondef(
    'public.complete_actor_onboarding(uuid,uuid,text,text,uuid,uuid,text,text,text,text,uuid,uuid,uuid[],text,date,text,boolean,uuid,uuid,text,text,text,boolean,integer,uuid)'::regprocedure
  ) INTO v_def;

  IF position(v_old in v_def) = 0 THEN
    RAISE EXCEPTION 'R2_ABORT: expected complete_actor_onboarding guard block not found';
  END IF;

  v_def := replace(v_def, v_old, v_new);
  EXECUTE v_def;
END
$r2$;

COMMENT ON FUNCTION public.complete_actor_onboarding(
  uuid,uuid,text,text,uuid,uuid,text,text,text,text,uuid,uuid,uuid[],text,date,text,boolean,uuid,uuid,text,text,text,boolean,integer,uuid
) IS 'R2: provisions school and higher-ed actors; higher-ed root and Dean operations require active institution membership and institution status pending or active. Principal path remains unchanged.';
