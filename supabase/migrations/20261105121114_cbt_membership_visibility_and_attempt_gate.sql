CREATE OR REPLACE FUNCTION public.cbt_teacher_can_access_exam(p_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.cbt_exams e
    JOIN public.schools s ON s.id=e.school_id
    JOIN public.gradifi_school_memberships m
      ON m.school_id=e.school_id
     AND m.user_id=auth.uid()
     AND m.status='active'
     AND m.member_role IN ('principal','school_admin','teacher','exam_officer')
    WHERE e.id=p_exam_id
      AND s.provisioning_status='active'
  );
$fn$;
REVOKE ALL ON FUNCTION public.cbt_teacher_can_access_exam(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cbt_teacher_can_access_exam(uuid) TO authenticated,service_role;

REVOKE ALL ON FUNCTION public.get_attempt(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_attempt(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_cbt_attempt(p_exam_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $fn$
DECLARE
  v_student_id uuid;
  v_attempt public.cbt_attempts%rowtype;
  v_session public.cbt_sessions%rowtype;
  v_question_count integer;
  v_snapshot_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT id INTO v_student_id FROM public.students WHERE user_id=auth.uid();
  IF v_student_id IS NULL THEN RAISE EXCEPTION 'Authenticated user is not linked to a student record'; END IF;
  IF NOT public.cbt_student_can_access_exam(p_exam_id) THEN
    RAISE EXCEPTION 'Student is not eligible to start this exam';
  END IF;
  SELECT count(*) INTO v_question_count FROM public.cbt_questions WHERE exam_id=p_exam_id;
  SELECT count(*) INTO v_snapshot_count FROM public.gradifi_exam_question_snapshots WHERE exam_id=p_exam_id;
  IF v_question_count=0 OR v_snapshot_count<>v_question_count THEN
    RAISE EXCEPTION 'Published exam snapshot is missing or incomplete';
  END IF;

  INSERT INTO public.cbt_attempts(exam_id,student_id)
  VALUES(p_exam_id,v_student_id) RETURNING * INTO v_attempt;

  INSERT INTO public.cbt_sessions(attempt_id,exam_id,student_id,state,current_question,remaining_time)
  VALUES(v_attempt.id,v_attempt.exam_id,v_attempt.student_id,'INITIALIZING',0,
    greatest(0,extract(epoch from (v_attempt.deadline_at-now()))::integer))
  RETURNING * INTO v_session;

  RETURN jsonb_build_object('success',true,'attempt_id',v_attempt.id,
    'attempt_number',v_attempt.attempt_number,'session_id',v_session.id,
    'start_time',v_attempt.start_time,'deadline_at',v_attempt.deadline_at,
    'status',v_attempt.status,'snapshot_questions',v_snapshot_count);
END;
$fn$;
REVOKE ALL ON FUNCTION public.create_cbt_attempt(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_cbt_attempt(uuid) TO authenticated;

-- Correct idempotency metadata in the finalization response.
CREATE OR REPLACE FUNCTION public.cbt_finalize_attempt(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_attempt public.cbt_attempts%rowtype;
  v_result public.cbt_results_summary%rowtype;
  v_score integer;
  v_percentage numeric(5,2);
  v_grade char(1);
  v_status text;
  v_was_finalized boolean;
BEGIN
  SELECT * INTO v_attempt FROM public.cbt_attempts WHERE id=p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CBT_ATTEMPT_NOT_FOUND'; END IF;
  v_was_finalized := v_attempt.status IN ('submitted','timeout');

  IF v_attempt.status='in_progress' THEN
    v_status := CASE WHEN now()>=v_attempt.deadline_at THEN 'timeout' ELSE 'submitted' END;
    SELECT coalesce(sum(a.marks_awarded),0) INTO v_score
    FROM public.cbt_answers a WHERE a.attempt_id=p_attempt_id;
    IF v_attempt.total_marks<=0 THEN RAISE EXCEPTION 'INVALID_ATTEMPT_TOTAL_MARKS'; END IF;
    v_percentage := round((v_score::numeric/v_attempt.total_marks::numeric)*100,2);
    v_grade := CASE WHEN v_percentage>=75 THEN 'A'
                    WHEN v_percentage>=65 THEN 'B'
                    WHEN v_percentage>=50 THEN 'C'
                    WHEN v_percentage>=40 THEN 'D' ELSE 'F' END;
    UPDATE public.cbt_attempts
    SET score=v_score,percentage=v_percentage,status=v_status,
        submitted_at=coalesce(submitted_at,now()),end_time=coalesce(end_time,now())
    WHERE id=p_attempt_id RETURNING * INTO v_attempt;
  ELSIF v_attempt.status NOT IN ('submitted','timeout') THEN
    RAISE EXCEPTION 'INVALID_ATTEMPT_STATE';
  ELSE
    v_score:=coalesce(v_attempt.score,0);
    v_percentage:=coalesce(v_attempt.percentage,
      CASE WHEN v_attempt.total_marks>0 THEN round((v_score::numeric/v_attempt.total_marks::numeric)*100,2) ELSE 0 END);
    v_grade:=CASE WHEN v_percentage>=75 THEN 'A'
                  WHEN v_percentage>=65 THEN 'B'
                  WHEN v_percentage>=50 THEN 'C'
                  WHEN v_percentage>=40 THEN 'D' ELSE 'F' END;
  END IF;

  INSERT INTO public.cbt_results_summary
    (exam_id,student_id,attempt_id,score,total_marks,percentage,grade)
  VALUES(v_attempt.exam_id,v_attempt.student_id,v_attempt.id,
    coalesce(v_attempt.score,0),v_attempt.total_marks,coalesce(v_attempt.percentage,0),v_grade)
  ON CONFLICT(attempt_id) DO NOTHING;

  SELECT * INTO v_result FROM public.cbt_results_summary WHERE attempt_id=p_attempt_id;
  RETURN jsonb_build_object('success',true,'attempt_id',v_attempt.id,
    'attempt_number',v_attempt.attempt_number,'status',v_attempt.status,
    'score',v_result.score,'total_marks',v_result.total_marks,
    'percentage',v_result.percentage,'grade',v_result.grade,'result_id',v_result.id,
    'already_finalized',v_was_finalized);
END;
$fn$;
REVOKE ALL ON FUNCTION public.cbt_finalize_attempt(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cbt_finalize_attempt(uuid) TO service_role;
