-- Institutional school membership administration and principal lifecycle.
-- Existing schools remain unprovisioned unless a verified principal is bootstrapped below.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS provisioning_status text NOT NULL DEFAULT 'unprovisioned';

ALTER TABLE public.schools
  DROP CONSTRAINT IF EXISTS schools_provisioning_status_check;

ALTER TABLE public.schools
  ADD CONSTRAINT schools_provisioning_status_check
  CHECK (provisioning_status IN ('unprovisioned', 'active'));

CREATE UNIQUE INDEX IF NOT EXISTS gradifi_one_active_principal_per_school
  ON public.gradifi_school_memberships (school_id)
  WHERE member_role = 'principal' AND status = 'active';

CREATE OR REPLACE FUNCTION public.gradifi_assert_school_principal_invariant(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
  v_principal_count integer;
BEGIN
  SELECT s.provisioning_status
    INTO v_status
  FROM public.schools s
  WHERE s.id = p_school_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_status = 'active' THEN
    SELECT count(*)::integer
      INTO v_principal_count
    FROM public.gradifi_school_memberships m
    WHERE m.school_id = p_school_id
      AND m.member_role = 'principal'
      AND m.status = 'active';

    IF v_principal_count <> 1 THEN
      RAISE EXCEPTION
        'Active school % must have exactly one active principal; found %',
        p_school_id, v_principal_count
        USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.gradifi_check_school_principal_invariant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'schools' THEN
    IF TG_OP <> 'DELETE' THEN
      PERFORM public.gradifi_assert_school_principal_invariant(NEW.id);
    END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN
      PERFORM public.gradifi_assert_school_principal_invariant(OLD.school_id);
    END IF;
    IF TG_OP <> 'DELETE' THEN
      IF TG_OP = 'INSERT' OR NEW.school_id IS DISTINCT FROM OLD.school_id THEN
        PERFORM public.gradifi_assert_school_principal_invariant(NEW.school_id);
      END IF;
      IF TG_OP = 'UPDATE' AND NEW.school_id = OLD.school_id THEN
        PERFORM public.gradifi_assert_school_principal_invariant(NEW.school_id);
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS gradifi_school_principal_invariant_school
  ON public.schools;
CREATE CONSTRAINT TRIGGER gradifi_school_principal_invariant_school
AFTER INSERT OR UPDATE ON public.schools
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.gradifi_check_school_principal_invariant();

DROP TRIGGER IF EXISTS gradifi_school_principal_invariant_membership
  ON public.gradifi_school_memberships;
CREATE CONSTRAINT TRIGGER gradifi_school_principal_invariant_membership
AFTER INSERT OR UPDATE OR DELETE ON public.gradifi_school_memberships
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.gradifi_check_school_principal_invariant();

-- Lifecycle state is writable only by trusted SECURITY DEFINER functions / database owner.
CREATE OR REPLACE FUNCTION public.gradifi_guard_school_provisioning_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.provisioning_status <> 'unprovisioned' AND current_user <> 'postgres' THEN
      RAISE EXCEPTION 'School activation must use a trusted onboarding operation'
        USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.provisioning_status IS DISTINCT FROM OLD.provisioning_status
        AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'School provisioning status is managed by trusted onboarding operations'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gradifi_guard_school_provisioning_status
  ON public.schools;
CREATE TRIGGER gradifi_guard_school_provisioning_status
BEFORE INSERT OR UPDATE OF provisioning_status ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.gradifi_guard_school_provisioning_status();

-- Append-only audit protection. Database owner retains controlled maintenance access.
CREATE OR REPLACE FUNCTION public.gradifi_reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF current_user = 'postgres' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_logs is append-only; % is prohibited', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS gradifi_audit_logs_append_only
  ON public.audit_logs;
CREATE TRIGGER gradifi_audit_logs_append_only
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.gradifi_reject_audit_mutation();

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON public.audit_logs FROM PUBLIC, anon, authenticated, service_role;

-- Canonical school authorization: no profiles.role or profiles.school_id fallback.
CREATE OR REPLACE FUNCTION public.has_active_school_role(
  p_school_id uuid,
  p_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gradifi_school_memberships m
    WHERE m.school_id = p_school_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.member_role = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT CASE
    WHEN count(*) = 1 THEN (array_agg(m.school_id))[1]
    ELSE NULL
  END
  FROM public.gradifi_school_memberships m
  WHERE m.user_id = auth.uid()
    AND m.status = 'active';
$$;

-- Membership records are changed only through controlled RPCs.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON public.gradifi_school_memberships
  FROM PUBLIC, anon, authenticated, service_role;

DROP POLICY IF EXISTS "school admins read school memberships"
  ON public.gradifi_school_memberships;
CREATE POLICY "school admins read school memberships"
ON public.gradifi_school_memberships
FOR SELECT
TO authenticated
USING (
  public.has_active_school_role(
    school_id,
    ARRAY['principal', 'school_admin']::text[]
  )
);

CREATE OR REPLACE FUNCTION public.invite_school_member(
  p_school_id uuid,
  p_user_id uuid,
  p_member_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_profile uuid;
  v_actor_role text;
  v_membership_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = v_actor THEN
    RAISE EXCEPTION 'Self-invitation is prohibited' USING ERRCODE = '42501';
  END IF;
  IF p_member_role NOT IN ('school_admin', 'teacher', 'exam_officer') THEN
    RAISE EXCEPTION 'Unsupported invitation role' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.schools WHERE id = p_school_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'School not found'; END IF;

  SELECT m.member_role INTO v_actor_role
  FROM public.gradifi_school_memberships m
  WHERE m.school_id = p_school_id
    AND m.user_id = v_actor
    AND m.status = 'active'
    AND m.member_role IN ('principal', 'school_admin')
  FOR UPDATE;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Active school principal or school administrator required'
      USING ERRCODE = '42501';
  END IF;
  IF p_member_role = 'school_admin' AND v_actor_role <> 'principal' THEN
    RAISE EXCEPTION 'Only the principal may appoint a school administrator'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.id INTO v_actor_profile
  FROM public.profiles p
  WHERE p.user_id = v_actor;
  IF v_actor_profile IS NULL THEN
    RAISE EXCEPTION 'Actor profile is required for audit attribution';
  END IF;

  INSERT INTO public.gradifi_school_memberships
    (school_id, user_id, member_role, status, invited_by)
  VALUES
    (p_school_id, p_user_id, p_member_role, 'invited', v_actor)
  RETURNING id INTO v_membership_id;

  INSERT INTO public.audit_logs
    (actor_id, action, entity, entity_id, "before", "after", metadata)
  VALUES
    (v_actor_profile, 'school_membership.invited',
     'gradifi_school_memberships', v_membership_id::text,
     NULL,
     jsonb_build_object('school_id', p_school_id, 'user_id', p_user_id,
                        'member_role', p_member_role, 'status', 'invited'),
     jsonb_build_object('actor_auth_user_id', v_actor));

  RETURN v_membership_id;
END;
$$;

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

  SELECT school_id, user_id, member_role, status
    INTO v_school_id, v_target_user, v_old_role, v_status
  FROM public.gradifi_school_memberships
  WHERE id = p_membership_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Membership not found'; END IF;
  IF v_target_user = v_actor THEN RAISE EXCEPTION 'Self-role modification is prohibited' USING ERRCODE='42501'; END IF;
  IF v_old_role = 'principal' THEN
    RAISE EXCEPTION 'Principal role changes require transfer_school_principal'
      USING ERRCODE = '42501';
  END IF;
  IF v_old_role = p_new_role THEN RETURN; END IF;

  PERFORM 1 FROM public.schools WHERE id = v_school_id FOR UPDATE;

  SELECT member_role INTO v_actor_role
  FROM public.gradifi_school_memberships
  WHERE school_id = v_school_id AND user_id = v_actor
    AND status = 'active' AND member_role IN ('principal','school_admin');

  IF v_actor_role IS NULL THEN RAISE EXCEPTION 'Insufficient school authority' USING ERRCODE='42501'; END IF;
  IF v_actor_role = 'school_admin'
     AND (v_old_role = 'school_admin' OR p_new_role = 'school_admin') THEN
    RAISE EXCEPTION 'School administrators cannot appoint or modify school administrators'
      USING ERRCODE = '42501';
  END IF;
  IF v_status = 'revoked' THEN RAISE EXCEPTION 'Revoked membership is terminal'; END IF;

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

  SELECT school_id, user_id, member_role, status
    INTO v_school_id, v_target_user, v_target_role, v_old_status
  FROM public.gradifi_school_memberships
  WHERE id = p_membership_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Membership not found'; END IF;
  IF v_target_user = v_actor THEN RAISE EXCEPTION 'Self-status modification is prohibited' USING ERRCODE='42501'; END IF;
  IF v_target_role = 'principal' THEN
    RAISE EXCEPTION 'Principal status can change only through atomic succession'
      USING ERRCODE = '42501';
  END IF;
  IF v_old_status = 'revoked' THEN RAISE EXCEPTION 'Revoked membership is terminal'; END IF;
  IF v_old_status = p_new_status THEN RETURN; END IF;

  PERFORM 1 FROM public.schools WHERE id = v_school_id FOR UPDATE;

  SELECT member_role INTO v_actor_role
  FROM public.gradifi_school_memberships
  WHERE school_id = v_school_id AND user_id = v_actor
    AND status = 'active' AND member_role IN ('principal','school_admin');

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

CREATE OR REPLACE FUNCTION public.transfer_school_principal(
  p_school_id uuid,
  p_successor_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_profile uuid;
  v_outgoing_id uuid;
  v_successor_id uuid;
  v_successor_role text;
  v_principal_count integer;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_successor_user_id = v_actor THEN RAISE EXCEPTION 'Successor must be a different user'; END IF;

  PERFORM 1 FROM public.schools
  WHERE id = p_school_id AND provisioning_status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'School is not active or does not exist'; END IF;

  SELECT count(*)::integer INTO v_principal_count
  FROM public.gradifi_school_memberships
  WHERE school_id = p_school_id AND member_role = 'principal' AND status = 'active';
  IF v_principal_count <> 1 THEN
    RAISE EXCEPTION 'Principal succession requires exactly one current active principal';
  END IF;

  SELECT id INTO v_outgoing_id
  FROM public.gradifi_school_memberships
  WHERE school_id = p_school_id AND user_id = v_actor
    AND member_role = 'principal' AND status = 'active'
  FOR UPDATE;
  IF v_outgoing_id IS NULL THEN
    RAISE EXCEPTION 'Only the current active principal may transfer principal authority'
      USING ERRCODE = '42501';
  END IF;

  SELECT id, member_role INTO v_successor_id, v_successor_role
  FROM public.gradifi_school_memberships
  WHERE school_id = p_school_id
    AND user_id = p_successor_user_id
    AND status = 'active'
    AND member_role IN ('school_admin','teacher','exam_officer')
  FOR UPDATE;
  IF v_successor_id IS NULL THEN
    RAISE EXCEPTION 'Successor must have an active non-principal school membership';
  END IF;

  SELECT id INTO v_actor_profile FROM public.profiles WHERE user_id = v_actor;
  IF v_actor_profile IS NULL THEN RAISE EXCEPTION 'Actor profile required for audit'; END IF;

  -- Demote first to satisfy the partial unique index; deferred invariant validates at commit.
  UPDATE public.gradifi_school_memberships
  SET member_role = 'school_admin'
  WHERE id = v_outgoing_id;

  UPDATE public.gradifi_school_memberships
  SET member_role = 'principal'
  WHERE id = v_successor_id;

  INSERT INTO public.audit_logs
    (actor_id, action, entity, entity_id, "before", "after", metadata)
  VALUES
    (v_actor_profile, 'school_principal.transfer_out',
     'gradifi_school_memberships', v_outgoing_id::text,
     jsonb_build_object('member_role','principal','status','active'),
     jsonb_build_object('member_role','school_admin','status','active'),
     jsonb_build_object('school_id',p_school_id,'successor_user_id',p_successor_user_id)),
    (v_actor_profile, 'school_principal.transfer_in',
     'gradifi_school_memberships', v_successor_id::text,
     jsonb_build_object('member_role',v_successor_role,'status','active'),
     jsonb_build_object('member_role','principal','status','active'),
     jsonb_build_object('school_id',p_school_id,'outgoing_user_id',v_actor));
END;
$$;

-- One-time bootstrap: only the single verified principal_admin profile may seed its matching school.
DO $$
DECLARE
  v_count integer;
  v_profile_id uuid;
  v_user_id uuid;
  v_school_id uuid;
  v_membership_id uuid;
BEGIN
  SELECT count(*)::integer INTO v_count
  FROM public.profiles p
  JOIN public.schools s
    ON s.id = p.school_id
   AND s.institution_id = p.institution_id
  WHERE p.role = 'principal_admin';

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Bootstrap requires exactly one consistent principal_admin profile; found %',
      v_count;
  END IF;

  SELECT p.id, p.user_id, p.school_id
    INTO v_profile_id, v_user_id, v_school_id
  FROM public.profiles p
  JOIN public.schools s
    ON s.id = p.school_id
   AND s.institution_id = p.institution_id
  WHERE p.role = 'principal_admin';

  IF EXISTS (
    SELECT 1 FROM public.gradifi_school_memberships
    WHERE school_id = v_school_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Bootstrap membership already exists; refusing duplicate bootstrap';
  END IF;

  INSERT INTO public.gradifi_school_memberships
    (school_id, user_id, member_role, status, activated_at)
  VALUES
    (v_school_id, v_user_id, 'principal', 'active', now())
  RETURNING id INTO v_membership_id;

  UPDATE public.schools
  SET provisioning_status = 'active'
  WHERE id = v_school_id;

  INSERT INTO public.audit_logs
    (actor_id, action, entity, entity_id, "before", "after", metadata)
  VALUES
    (v_profile_id, 'school_principal.bootstrap',
     'gradifi_school_memberships', v_membership_id::text,
     NULL,
     jsonb_build_object('school_id',v_school_id,'user_id',v_user_id,
                        'member_role','principal','status','active'),
     jsonb_build_object('bootstrap_source','one_time_principal_admin_profile'));
END;
$$;

REVOKE ALL ON FUNCTION public.gradifi_assert_school_principal_invariant(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gradifi_check_school_principal_invariant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gradifi_guard_school_provisioning_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gradifi_reject_audit_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_active_school_role(uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_school_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.invite_school_member(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.change_school_member_role(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_school_member_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_school_principal(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_active_school_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_school_member(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_school_member_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_school_member_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_school_principal(uuid, uuid) TO authenticated;
