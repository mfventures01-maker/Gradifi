
CREATE OR REPLACE FUNCTION public.can_manage_secondary_users(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $$
  SELECT auth.uid() IS NOT NULL
     AND public.is_current_user_active_institution_member(p_institution_id)
     AND EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.user_id = (SELECT auth.uid())
         AND p.institution_id = p_institution_id
         AND p.role = 'principal_admin'
     );
$$;

CREATE OR REPLACE FUNCTION public.get_dean_dashboard_stats(p_institution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $$
DECLARE
  v_total_students bigint;
  v_total_departments bigint;
  v_pending_approvals bigint;
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.is_current_user_active_institution_member(p_institution_id)
     OR NOT EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.user_id = (SELECT auth.uid())
         AND p.institution_id = p_institution_id
         AND p.role = 'dean'
     ) THEN
    RAISE EXCEPTION 'DEAN_INSTITUTION_SCOPE_DENIED';
  END IF;

  SELECT count(*) INTO v_total_students
  FROM public.students WHERE institution_id = p_institution_id;

  SELECT count(*) INTO v_total_departments
  FROM public.nuc_departments WHERE institution_id = p_institution_id;

  SELECT count(*) INTO v_pending_approvals
  FROM public.plagiarism_checks
  WHERE institution_id = p_institution_id AND status = 'pending_dean';

  RETURN jsonb_build_object(
    'total_students', v_total_students,
    'total_departments', v_total_departments,
    'pending_approvals', v_pending_approvals
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_hod_dashboard_stats(p_institution_id uuid, p_department_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $$
DECLARE
  v_total_students bigint;
  v_total_projects bigint;
  v_pending_reviews bigint;
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.is_current_user_active_institution_member(p_institution_id)
     OR NOT EXISTS (
       SELECT 1
       FROM public.identity_actors ia
       JOIN public.nuc_departments nd ON nd.hod_id = ia.actor_record_id
       WHERE ia.auth_user_id = (SELECT auth.uid())
         AND ia.actor_type = 'hod'
         AND ia.status = 'active'
         AND ia.institution_id = p_institution_id
         AND nd.id = p_department_id
         AND nd.institution_id = p_institution_id
     ) THEN
    RAISE EXCEPTION 'HOD_DEPARTMENT_SCOPE_DENIED';
  END IF;

  SELECT count(*) INTO v_total_students
  FROM public.students
  WHERE institution_id = p_institution_id AND department_id = p_department_id;

  SELECT count(*) INTO v_total_projects
  FROM public.projects
  WHERE institution_id = p_institution_id AND department_id = p_department_id;

  SELECT count(*) INTO v_pending_reviews
  FROM public.plagiarism_checks pc
  JOIN public.students s ON s.id = pc.student_id
  WHERE s.institution_id = p_institution_id
    AND s.department_id = p_department_id
    AND pc.status = 'pending_hod';

  RETURN jsonb_build_object(
    'total_students', v_total_students,
    'total_projects', v_total_projects,
    'pending_reviews', v_pending_reviews
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_school_students(
  p_school_id uuid,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.schools s ON s.id = p_school_id
    WHERE p.user_id = (SELECT auth.uid())
      AND public.is_current_user_active_institution_member(s.institution_id)
      AND (
        (p.role = 'principal_admin' AND p.school_id = p_school_id)
        OR (p.role = 'dean' AND p.institution_id = s.institution_id)
      )
  ) THEN
    RAISE EXCEPTION 'SCHOOL_SCOPE_DENIED';
  END IF;

  WITH filtered AS (
    SELECT st.id, st.first_name, st.last_name, st.student_number, st.class_id,
           st.gender, st.email, st.phone, st.cgpa, st.enrollment_status,
           c.name AS class_name
    FROM public.students st
    LEFT JOIN public.classes c ON c.id = st.class_id
    WHERE st.school_id = p_school_id
      AND (
        p_search IS NULL
        OR st.first_name ILIKE '%' || p_search || '%'
        OR st.last_name ILIKE '%' || p_search || '%'
        OR st.student_number ILIKE '%' || p_search || '%'
      )
  ),
  paged AS (
    SELECT * FROM filtered
    ORDER BY last_name, first_name, id
    LIMIT greatest(coalesce(p_limit, 100), 0)
    OFFSET greatest(coalesce(p_offset, 0), 0)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM filtered),
    'students', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'first_name', first_name,
        'last_name', last_name,
        'student_number', student_number,
        'class_name', class_name,
        'class_id', class_id,
        'gender', gender,
        'email', email,
        'phone', phone,
        'cgpa', cgpa,
        'enrollment_status', enrollment_status
      ) ORDER BY last_name, first_name, id)
      FROM paged
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_school_teachers(
  p_school_id uuid,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.schools s ON s.id = p_school_id
    WHERE p.user_id = (SELECT auth.uid())
      AND public.is_current_user_active_institution_member(s.institution_id)
      AND (
        (p.role = 'principal_admin' AND p.school_id = p_school_id)
        OR (p.role = 'dean' AND p.institution_id = s.institution_id)
      )
  ) THEN
    RAISE EXCEPTION 'SCHOOL_SCOPE_DENIED';
  END IF;

  WITH filtered AS (
    SELECT t.id, t.name, t.email, t.phone
    FROM public.teachers t
    WHERE t.school_id = p_school_id
      AND (
        p_search IS NULL
        OR t.name ILIKE '%' || p_search || '%'
        OR t.email ILIKE '%' || p_search || '%'
      )
  ),
  paged AS (
    SELECT * FROM filtered
    ORDER BY name, id
    LIMIT greatest(coalesce(p_limit, 100), 0)
    OFFSET greatest(coalesce(p_offset, 0), 0)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM filtered),
    'teachers', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'email', t.email,
        'phone', t.phone,
        'class_count', (
          SELECT count(*) FROM public.teacher_classes tc WHERE tc.teacher_id = t.id
        ),
        'student_count', (
          SELECT count(DISTINCT st.id)
          FROM public.students st
          JOIN public.teacher_classes tc ON tc.class_id = st.class_id
          WHERE tc.teacher_id = t.id
        )
      ) ORDER BY t.name, t.id)
      FROM paged t
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- The original SECURITY DEFINER implementation had no caller authorization.
-- Keep its implementation private and expose only an authorized wrapper.
ALTER FUNCTION public.get_teacher_details(uuid) RENAME TO get_teacher_details_unchecked;
REVOKE ALL ON FUNCTION public.get_teacher_details_unchecked(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_teacher_details(p_teacher_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $$
DECLARE
  v_teacher record;
BEGIN
  SELECT t.id, t.user_id, t.institution_id
  INTO v_teacher
  FROM public.teachers t
  WHERE t.id = p_teacher_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Teacher not found');
  END IF;

  IF auth.uid() IS NULL OR NOT (
    v_teacher.user_id = (SELECT auth.uid())
    OR (
      public.is_current_user_active_institution_member(v_teacher.institution_id)
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = (SELECT auth.uid())
          AND p.institution_id = v_teacher.institution_id
          AND p.role = ANY (ARRAY['principal_admin','vice_principal','dean','hod'])
      )
    )
  ) THEN
    RAISE EXCEPTION 'TEACHER_SCOPE_DENIED';
  END IF;

  RETURN public.get_teacher_details_unchecked(p_teacher_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_teacher_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_details(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_student_identity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $$
DECLARE
  student_record record;
BEGIN
  SELECT
    s.id AS student_id,
    s.user_id,
    s.school_id,
    s.institution_id,
    s.class_id,
    s.student_number,
    s.first_name,
    s.last_name
  INTO student_record
  FROM public.students s
  JOIN public.institutions i
    ON i.id = s.institution_id
   AND i.status = 'active'
  WHERE s.user_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN row_to_json(student_record)::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.tenants t
    JOIN public.institutions i ON i.id = t.institution_id
    JOIN public.institution_memberships m
      ON m.institution_id = i.id
     AND m.user_id = (SELECT auth.uid())
     AND m.status = 'active'
    WHERE t.id = $1
      AND i.status = 'active'
  ) THEN
    RAISE EXCEPTION 'TENANT_SCOPE_DENIED';
  END IF;

  PERFORM set_config('app.current_tenant', tenant_id::text, true);
END;
$$;
