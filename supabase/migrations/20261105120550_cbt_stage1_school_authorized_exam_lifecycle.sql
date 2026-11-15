-- Stage 1: enforce canonical active school membership for CBT authoring and publishing.
-- Preserve existing schema/data; reject profile-role and caller-supplied identity authority.

CREATE OR REPLACE FUNCTION public.assert_exam_access(p_exam_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
DECLARE
  v_exam_school uuid;
  v_provisioning_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ACCESS_DENIED: AUTHENTICATION_REQUIRED';
  END IF;

  SELECT e.school_id, s.provisioning_status
    INTO v_exam_school, v_provisioning_status
  FROM public.cbt_exams e
  JOIN public.schools s ON s.id = e.school_id
  WHERE e.id = p_exam_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EXAM_NOT_FOUND';
  END IF;

  IF v_provisioning_status <> 'active' THEN
    RAISE EXCEPTION 'ACCESS_DENIED: SCHOOL_NOT_PROVISIONED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.gradifi_school_memberships m
    WHERE m.user_id = auth.uid()
      AND m.school_id = v_exam_school
      AND m.status = 'active'
      AND m.member_role IN ('principal','school_admin','teacher','exam_officer')
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED: ACTIVE_SCHOOL_ROLE_REQUIRED';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.assert_exam_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_exam_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_cbt_exam(
  p_school_id uuid,
  p_class_id uuid,
  p_subject_id uuid,
  p_term_id uuid,
  p_title text,
  p_description text,
  p_duration_minutes integer,
  p_pass_mark integer,
  p_exam_date timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
DECLARE
  v_teacher_id uuid;
  v_exam_id uuid;
  v_class_school uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_title IS NULL OR length(btrim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Exam title is required';
  END IF;
  IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
    RAISE EXCEPTION 'Exam duration must be positive';
  END IF;
  IF p_pass_mark IS NULL OR p_pass_mark < 0 THEN
    RAISE EXCEPTION 'Pass mark cannot be negative';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.gradifi_school_memberships m
    JOIN public.schools s ON s.id = m.school_id
    WHERE m.user_id = auth.uid()
      AND m.school_id = p_school_id
      AND m.status = 'active'
      AND m.member_role IN ('principal','school_admin','teacher','exam_officer')
      AND s.provisioning_status = 'active'
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED: ACTIVE_SCHOOL_ROLE_REQUIRED';
  END IF;

  SELECT c.school_id INTO v_class_school
  FROM public.classes c
  WHERE c.id = p_class_id;
  IF NOT FOUND OR v_class_school <> p_school_id THEN
    RAISE EXCEPTION 'Class does not belong to the requested school';
  END IF;

  SELECT t.id INTO v_teacher_id
  FROM public.teachers t
  WHERE t.user_id = auth.uid()
    AND t.school_id = p_school_id
  ORDER BY t.id
  LIMIT 1;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Authorized staff identity is not linked to a teacher record required by the current exam schema';
  END IF;

  INSERT INTO public.cbt_exams (
    school_id,class_id,subject_id,term_id,title,description,duration_minutes,
    pass_mark,exam_date,created_by,status,current_state
  ) VALUES (
    p_school_id,p_class_id,p_subject_id,p_term_id,btrim(p_title),p_description,
    p_duration_minutes,p_pass_mark,p_exam_date,v_teacher_id,'draft','draft'
  ) RETURNING id INTO v_exam_id;

  RETURN jsonb_build_object('success',true,'exam_id',v_exam_id,'title',btrim(p_title),'status','draft');
END;
$function$;

REVOKE ALL ON FUNCTION public.create_cbt_exam(uuid,uuid,uuid,uuid,text,text,integer,integer,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_cbt_exam(uuid,uuid,uuid,uuid,text,text,integer,integer,timestamptz) TO authenticated;

-- This legacy RPC accepts a caller-supplied user ID and does not establish identity.
REVOKE ALL ON FUNCTION public.create_cbt_exam_v2(uuid,uuid,uuid,text,integer,date,uuid,text,integer,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.publish_cbt_exam(p_exam_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
DECLARE
  v_exam public.cbt_exams%rowtype;
  v_question_count integer;
  v_question_marks integer;
BEGIN
  PERFORM public.assert_exam_access(p_exam_id);

  SELECT * INTO v_exam
  FROM public.cbt_exams
  WHERE id = p_exam_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EXAM_NOT_FOUND';
  END IF;
  IF v_exam.status <> 'draft' OR v_exam.current_state <> 'draft' THEN
    RAISE EXCEPTION 'Only a draft exam can be published';
  END IF;

  SELECT count(*),coalesce(sum(q.marks),0)
    INTO v_question_count,v_question_marks
  FROM public.cbt_questions q
  WHERE q.exam_id = p_exam_id;

  IF v_question_count = 0 OR v_question_marks <= 0 THEN
    RAISE EXCEPTION 'Cannot publish an exam without positively marked questions';
  END IF;
  IF v_exam.total_marks <> v_question_marks THEN
    RAISE EXCEPTION 'Exam total marks do not match question marks';
  END IF;
  IF v_exam.pass_mark > v_question_marks THEN
    RAISE EXCEPTION 'Pass mark cannot exceed total marks';
  END IF;

  UPDATE public.cbt_exams
  SET status='published',
      current_state='active',
      start_time=coalesce(start_time,now()),
      end_time=coalesce(end_time,coalesce(start_time,now()) + make_interval(mins => duration_minutes)),
      updated_at=now()
  WHERE id=p_exam_id
  RETURNING * INTO v_exam;

  RETURN jsonb_build_object(
    'success',true,'exam_id',p_exam_id,'status',v_exam.status,
    'start_time',v_exam.start_time,'end_time',v_exam.end_time,
    'duration_minutes',v_exam.duration_minutes,
    'total_questions',v_question_count,'total_marks',v_question_marks
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.publish_cbt_exam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_cbt_exam(uuid) TO authenticated;
