-- Remove a legacy demo-results RPC that returns hard-coded student data.
REVOKE ALL ON FUNCTION public.get_student_results(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_student_results(p_student_id uuid,p_exam_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $fn$
DECLARE
  v_student_user_id uuid;
  v_results jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT user_id INTO v_student_user_id
  FROM public.students WHERE id=p_student_id;
  IF NOT FOUND OR v_student_user_id IS NULL OR v_student_user_id<>auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized student results access';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
      'exam_id',cr.exam_id,'exam_title',e.title,'subject',sc.name,'class',c.name,
      'score',cr.score,'total_marks',cr.total_marks,'percentage',cr.percentage,
      'grade',cr.grade,'position',cr.position,
      'out_of',(SELECT count(*) FROM public.cbt_results_summary x WHERE x.exam_id=cr.exam_id),
      'submitted_at',a.submitted_at
    ) ORDER BY a.submitted_at DESC)
  INTO v_results
  FROM public.cbt_results_summary cr
  JOIN public.cbt_exams e ON e.id=cr.exam_id
  JOIN public.cbt_attempts a ON a.id=cr.attempt_id
  JOIN public.subject_catalog sc ON sc.id=e.subject_id
  JOIN public.classes c ON c.id=e.class_id
  WHERE cr.student_id=p_student_id
    AND (p_exam_id IS NULL OR cr.exam_id=p_exam_id);

  RETURN jsonb_build_object('success',true,'student_id',p_student_id,
    'results',coalesce(v_results,'[]'::jsonb),
    'total_exams',coalesce(jsonb_array_length(v_results),0));
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_student_results(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_student_results(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_teacher_exam_results(p_exam_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $fn$
DECLARE
  v_results jsonb;
  v_stats jsonb;
  v_grade_distribution jsonb;
  v_exam_details record;
BEGIN
  PERFORM public.assert_exam_access(p_exam_id);

  SELECT e.*,sc.name AS subject_name,c.name AS class_name
  INTO v_exam_details
  FROM public.cbt_exams e
  JOIN public.subject_catalog sc ON sc.id=e.subject_id
  JOIN public.classes c ON c.id=e.class_id
  WHERE e.id=p_exam_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXAM_NOT_FOUND'; END IF;

  SELECT jsonb_agg(jsonb_build_object(
      'student_id',s.id,'student_name',s.first_name||' '||s.last_name,
      'student_number',s.student_number,'score',cr.score,
      'total_marks',cr.total_marks,'percentage',round(cr.percentage,1),
      'grade',cr.grade,'position',cr.position,'submitted_at',a.submitted_at,
      'time_taken',extract(epoch from (a.submitted_at-a.start_time))::integer/60
    ) ORDER BY cr.position)
  INTO v_results
  FROM public.cbt_results_summary cr
  JOIN public.students s ON s.id=cr.student_id
  JOIN public.cbt_attempts a ON a.id=cr.attempt_id
  WHERE cr.exam_id=p_exam_id;

  SELECT jsonb_build_object(
    'total_students',count(*),'average_score',round(avg(percentage)::numeric,1),
    'highest_score',max(percentage),'lowest_score',min(percentage),
    'total_passed',count(*) FILTER(WHERE percentage>=v_exam_details.pass_mark),
    'total_failed',count(*) FILTER(WHERE percentage<v_exam_details.pass_mark),
    'pass_percentage',coalesce(round((count(*) FILTER(WHERE percentage>=v_exam_details.pass_mark)::numeric/
      nullif(count(*),0)::numeric)*100,1),0)
  ) INTO v_stats
  FROM public.cbt_results_summary WHERE exam_id=p_exam_id;

  SELECT jsonb_build_object(
    'A',count(*) FILTER(WHERE grade='A'),'B',count(*) FILTER(WHERE grade='B'),
    'C',count(*) FILTER(WHERE grade='C'),'D',count(*) FILTER(WHERE grade='D'),
    'F',count(*) FILTER(WHERE grade='F')
  ) INTO v_grade_distribution
  FROM public.cbt_results_summary WHERE exam_id=p_exam_id;

  RETURN jsonb_build_object('success',true,'exam_id',p_exam_id,
    'exam_title',v_exam_details.title,'subject',v_exam_details.subject_name,
    'class',v_exam_details.class_name,'date',v_exam_details.exam_date,
    'total_marks',v_exam_details.total_marks,'pass_mark',v_exam_details.pass_mark,
    'statistics',v_stats,'grade_distribution',v_grade_distribution,
    'results',coalesce(v_results,'[]'::jsonb));
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_teacher_exam_results(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_exam_results(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_printable_results(p_exam_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $fn$
DECLARE
  v_exam_info jsonb;
  v_students jsonb;
BEGIN
  PERFORM public.assert_exam_access(p_exam_id);

  SELECT jsonb_build_object(
    'exam_title',e.title,'exam_date',e.exam_date,'total_marks',e.total_marks,
    'pass_mark',e.pass_mark,'class_name',c.name,'subject_name',sc.name,
    'school_name',s.school_name,'principal_name',s.principal_name
  ) INTO v_exam_info
  FROM public.cbt_exams e
  JOIN public.classes c ON c.id=e.class_id
  JOIN public.schools s ON s.id=e.school_id
  JOIN public.subject_catalog sc ON sc.id=e.subject_id
  WHERE e.id=p_exam_id;
  IF v_exam_info IS NULL THEN RAISE EXCEPTION 'EXAM_NOT_FOUND'; END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'student_name',s.first_name||' '||s.last_name,
    'student_number',s.student_number,'score',cr.score,
    'percentage',round(cr.percentage,1),'grade',cr.grade,'position',cr.position,
    'remarks',CASE WHEN cr.percentage>=75 THEN 'EXCELLENT'
      WHEN cr.percentage>=65 THEN 'VERY GOOD'
      WHEN cr.percentage>=50 THEN 'GOOD'
      WHEN cr.percentage>=40 THEN 'FAIR' ELSE 'NEEDS IMPROVEMENT' END
  ) ORDER BY cr.position)
  INTO v_students
  FROM public.cbt_results_summary cr
  JOIN public.students s ON s.id=cr.student_id
  WHERE cr.exam_id=p_exam_id;

  RETURN v_exam_info||jsonb_build_object('success',true,
    'students',coalesce(v_students,'[]'::jsonb),'generated_at',now());
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_printable_results(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_printable_results(uuid) TO authenticated;
