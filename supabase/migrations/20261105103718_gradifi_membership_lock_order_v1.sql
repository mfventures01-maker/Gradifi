CREATE OR REPLACE FUNCTION public.change_school_member_role(
  p_membership_id uuid,
  p_new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_profile uuid;
  v_actor_role text;
  v_school_id uuid;
  v_target_user uuid;
  v_old_role text;
  v_status text;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_new_role NOT IN ('school_admin', 'teacher', 'exam_officer') THEN
    RAISE EXCEPTION 'Principal authority can only be changed through principal succession'
      USING ERRCODE = '22023';
  END IF;

  SELECT school_id INTO v_school_id
  FROM public.gradifi_school_memberships
  WHERE id = p_membership_id;
  IF v_school_id IS NULL THEN RAISE EXCEPTION 'Membership not found'; END IF;

  -- All school-administration RPCs acquire locks in school -> membership order.
  PERFORM 1 FROM public.schools WHERE id = v_school_id FOR UPDATE;

  SELECT user_id, member_role, status
    INTO v_target_user, v_old_role, v_status
  FROM public.gradifi_school_memberships
  WHERE id = p_membership_id AND school_id = v_school_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membership not found'; END IF;

  IF v_target_user = v_actor THEN RAISE EXCEPTION 'Self-role modification is prohibited' USING ERRCODE='42501'; END IF;
  IF v_old_role = 'principal' THEN
    RAISE EXCEPTION 'Principal role changes require transfer_school_principal'
      USING ERRCODE = '42501';
  END IF;
  IF v_old_role = p_new_role THEN RETURN; END IF;
  IF v_status = 'revoked' THEN RAISE EXCEPTION 'Revoked membership is terminal'; END IF;

  SELECT member_role INTO v_actor_role
  FROM public.gradifi_school_memberships
  WHERE school_id = v_school_id AND user_id = v_actor
    AND status = 'active' AND member_role IN ('principal','school_admin')
  FOR UPDATE;

  IF v_actor_role IS NULL THEN RAISE EXCEPTION 'Insufficient school authority' USING ERRCODE='42501'; END IF;
  IF v_actor_role = 'school_admin'
     AND (v_old_role = 'school_admin' OR p_new_role = 'school_admin') THEN
    RAISE EXCEPTION 'School administrators cannot appoint or modify school administrators'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_actor_profile FROM public.profiles WHERE user_id = v_actor;
  IF v_actor_profile IS NULL THEN RAISE EXCEPTION 'Actor profile required for audit'; END IF;

  UPDATE public.gradifi_school_memberships
  SET member_role = p_new_role
  WHERE id = p_membership_id;

  INSERT INTO public.audit_logs
    (actor_id, action, entity, entity_id, "before", "after", metadata)
  VALUES
    (v_actor_profile, 'school_membership.role_changed',
     'gradifi_school_memberships', p_membership_id::text,
     jsonb_build_object('member_role', v_old_role, 'status', v_status),
     jsonb_build_object('member_role', p_new_role, 'status', v_status),
     jsonb_build_object('school_id', v_school_id, 'target_user_id', v_target_user));
END;
$$;

CREATE OR REPLACE FUNCTION public.set_school_member_status(
  p_membership_id uuid,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_profile uuid;
  v_actor_role text;
  v_school_id uuid;
  v_target_user uuid;
  v_target_role text;
  v_old_status text;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_new_status NOT IN ('active', 'suspended', 'revoked') THEN
    RAISE EXCEPTION 'Unsupported membership status' USING ERRCODE='22023';
  END IF;

  SELECT school_id INTO v_school_id
  FROM public.gradifi_school_memberships
  WHERE id = p_membership_id;
  IF v_school_id IS NULL THEN RAISE EXCEPTION 'Membership not found'; END IF;

  -- Match the lock order used by invitation and principal succession.
  PERFORM 1 FROM public.schools WHERE id = v_school_id FOR UPDATE;

  SELECT user_id, member_role, status
    INTO v_target_user, v_target_role, v_old_status
  FROM public.gradifi_school_memberships
  WHERE id = p_membership_id AND school_id = v_school_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membership not found'; END IF;

  IF v_target_user = v_actor THEN RAISE EXCEPTION 'Self-status modification is prohibited' USING ERRCODE='42501'; END IF;
  IF v_target_role = 'principal' THEN
    RAISE EXCEPTION 'Principal status can change only through atomic succession'
      USING ERRCODE = '42501';
  END IF;
  IF v_old_status = 'revoked' THEN RAISE EXCEPTION 'Revoked membership is terminal'; END IF;
  IF v_old_status = p_new_status THEN RETURN; END IF;

  SELECT member_role INTO v_actor_role
  FROM public.gradifi_school_memberships
  WHERE school_id = v_school_id AND user_id = v_actor
    AND status = 'active' AND member_role IN ('principal','school_admin')
  FOR UPDATE;

  IF v_actor_role IS NULL THEN RAISE EXCEPTION 'Insufficient school authority' USING ERRCODE='42501'; END IF;
  IF v_actor_role = 'school_admin' AND v_target_role = 'school_admin' THEN
    RAISE EXCEPTION 'School administrators cannot change another administrator'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_actor_profile FROM public.profiles WHERE user_id = v_actor;
  IF v_actor_profile IS NULL THEN RAISE EXCEPTION 'Actor profile required for audit'; END IF;

  UPDATE public.gradifi_school_memberships
  SET status = p_new_status,
      activated_at = CASE
        WHEN p_new_status = 'active' AND activated_at IS NULL THEN now()
        ELSE activated_at
      END
  WHERE id = p_membership_id;

  INSERT INTO public.audit_logs
    (actor_id, action, entity, entity_id, "before", "after", metadata)
  VALUES
    (v_actor_profile, 'school_membership.status_changed',
     'gradifi_school_memberships', p_membership_id::text,
     jsonb_build_object('member_role', v_target_role, 'status', v_old_status),
     jsonb_build_object('member_role', v_target_role, 'status', p_new_status),
     jsonb_build_object('school_id', v_school_id, 'target_user_id', v_target_user));
END;
$$;
