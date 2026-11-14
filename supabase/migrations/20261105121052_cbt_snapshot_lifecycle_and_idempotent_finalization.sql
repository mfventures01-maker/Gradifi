-- Freeze published CBT papers and route scoring/finalization through one path.
CREATE OR REPLACE FUNCTION public.cbt_reject_published_question_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_exam_id uuid;
  v_status text;
BEGIN
  v_exam_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.exam_id ELSE NEW.exam_id END;
  SELECT status INTO v_status FROM public.cbt_exams WHERE id = v_exam_id;
  IF v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'PUBLISHED_EXAM_CONTENT_IMMUTABLE';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.exam_id IS DISTINCT FROM OLD.exam_id THEN
    RAISE EXCEPTION 'QUESTION_EXAM_ID_IMMUTABLE';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.cbt_reject_published_option_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_question_id uuid;
  v_status text;
BEGIN
  v_question_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.question_id ELSE NEW.question_id END;
  SELECT e.status INTO v_status
  FROM public.cbt_questions q JOIN public.cbt_exams e ON e.id=q.exam_id
  WHERE q.id=v_question_id;
  IF v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'PUBLISHED_EXAM_CONTENT_IMMUTABLE';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.question_id IS DISTINCT FROM OLD.question_id THEN
    RAISE EXCEPTION 'OPTION_QUESTION_ID_IMMUTABLE';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS cbt_questions_freeze_published ON public.cbt_questions;
CREATE TRIGGER cbt_questions_freeze_published
BEFORE INSERT OR UPDATE OR DELETE ON public.cbt_questions
FOR EACH ROW EXECUTE FUNCTION public.cbt_reject_published_question_mutation();

DROP TRIGGER IF EXISTS cbt_options_freeze_published ON public.cbt_options;
CREATE TRIGGER cbt_options_freeze_published
BEFORE INSERT OR UPDATE OR DELETE ON public.cbt_options
FOR EACH ROW EXECUTE FUNCTION public.cbt_reject_published_option_mutation();

CREATE OR REPLACE FUNCTION public.cbt_snapshot_is_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
  RAISE EXCEPTION 'EXAM_QUESTION_SNAPSHOT_IMMUTABLE';
END;
$fn$;

DROP TRIGGER IF EXISTS gradifi_exam_question_snapshots_immutable ON public.gradifi_exam_question_snapshots;
CREATE TRIGGER gradifi_exam_question_snapshots_immutable
BEFORE UPDATE OR DELETE ON public.gradifi_exam_question_snapshots
FOR EACH ROW EXECUTE FUNCTION public.cbt_snapshot_is_immutable();

CREATE OR REPLACE FUNCTION public.publish_cbt_exam(p_exam_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, extensions
AS $fn$
DECLARE
  v_exam public.cbt_exams%rowtype;
  v_question_count integer;
  v_question_marks integer;
  v_snapshot_count integer;
BEGIN
  PERFORM public.assert_exam_access(p_exam_id);
  SELECT * INTO v_exam FROM public.cbt_exams WHERE id=p_exam_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXAM_NOT_FOUND'; END IF;
  IF v_exam.status <> 'draft' OR v_exam.current_state <> 'draft' THEN
    RAISE EXCEPTION 'Only a draft exam can be published';
  END IF;

  SELECT count(*), coalesce(sum(q.marks),0)
  INTO v_question_count,v_question_marks
  FROM public.cbt_questions q WHERE q.exam_id=p_exam_id;

  IF v_question_count=0 OR v_question_marks<=0 THEN
    RAISE EXCEPTION 'Cannot publish an exam without positively marked questions';
  END IF;
  IF v_exam.total_marks<>v_question_marks THEN
    RAISE EXCEPTION 'Exam total marks do not match question marks';
  END IF;
  IF v_exam.pass_mark>v_question_marks THEN
    RAISE EXCEPTION 'Pass mark cannot exceed total marks';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cbt_questions q
    WHERE q.exam_id=p_exam_id AND (
      q.question_type IS DISTINCT FROM 'objective'
      OR q.marks<=0
      OR (SELECT count(*) FROM public.cbt_options o WHERE o.question_id=q.id)<2
      OR (SELECT count(*) FROM public.cbt_options o WHERE o.question_id=q.id AND o.is_correct IS TRUE)<>1
    )
  ) THEN
    RAISE EXCEPTION 'Every published CBT question must be objective with at least two options and exactly one correct answer';
  END IF;

  SELECT count(*) INTO v_snapshot_count
  FROM public.gradifi_exam_question_snapshots s WHERE s.exam_id=p_exam_id;
  IF v_snapshot_count<>0 THEN
    RAISE EXCEPTION 'Snapshot rows already exist for this draft exam; investigate before publishing';
  END IF;

  INSERT INTO public.gradifi_exam_question_snapshots
    (exam_id, source_question_version_id, display_order, question_payload, answer_key_payload, content_sha256)
  SELECT
    p_exam_id,
    NULL,
    q.question_number,
    jsonb_build_object(
      'question_id',q.id,'text',q.question_text,'marks',q.marks,
      'number',q.question_number,'type',q.question_type,'image_url',q.image_url,
      'options',(SELECT jsonb_agg(jsonb_build_object('id',o.id,'text',o.option_text,'letter',o.option_letter)
                                 ORDER BY o.option_letter)
                 FROM public.cbt_options o WHERE o.question_id=q.id)
    ),
    jsonb_build_object(
      'question_id',q.id,'marks',q.marks,
      'correct_option_id',(SELECT o.id FROM public.cbt_options o
                           WHERE o.question_id=q.id AND o.is_correct IS TRUE)
    ),
    encode(extensions.digest(
      (jsonb_build_object(
        'question_id',q.id,'text',q.question_text,'marks',q.marks,
        'number',q.question_number,'type',q.question_type,'image_url',q.image_url,
        'options',(SELECT jsonb_agg(jsonb_build_object('id',o.id,'text',o.option_text,'letter',o.option_letter)
                                   ORDER BY o.option_letter)
                   FROM public.cbt_options o WHERE o.question_id=q.id)
      )::text || jsonb_build_object(
        'question_id',q.id,'marks',q.marks,
        'correct_option_id',(SELECT o.id FROM public.cbt_options o
                             WHERE o.question_id=q.id AND o.is_correct IS TRUE)
      )::text)::bytea,'sha256'),'hex')
  FROM public.cbt_questions q
  WHERE q.exam_id=p_exam_id
  ORDER BY q.question_number;

  UPDATE public.cbt_exams
  SET status='published', current_state='active',
      start_time=coalesce(start_time,now()),
      end_time=coalesce(end_time,coalesce(start_time,now()) + make_interval(mins=>duration_minutes)),
      updated_at=now()
  WHERE id=p_exam_id RETURNING * INTO v_exam;

  RETURN jsonb_build_object('success',true,'exam_id',p_exam_id,'status',v_exam.status,
    'start_time',v_exam.start_time,'end_time',v_exam.end_time,
    'duration_minutes',v_exam.duration_minutes,'total_questions',v_question_count,
    'total_marks',v_question_marks,'snapshot_count',v_question_count);
END;
$fn$;
REVOKE ALL ON FUNCTION public.publish_cbt_exam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_cbt_exam(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_cbt_exam_questions(p_exam_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, auth, extensions
AS $fn$
DECLARE
  v_result jsonb;
  v_bad_hashes integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.cbt_student_can_access_exam(p_exam_id) THEN
    RAISE EXCEPTION 'Student is not eligible to view this exam';
  END IF;
  SELECT count(*) FILTER (WHERE s.content_sha256 <> encode(extensions.digest(
      (s.question_payload::text || s.answer_key_payload::text)::bytea,'sha256'),'hex'))
  INTO v_bad_hashes
  FROM public.gradifi_exam_question_snapshots s WHERE s.exam_id=p_exam_id;
  IF v_bad_hashes IS NULL OR v_bad_hashes>0 THEN
    RAISE EXCEPTION 'EXAM_SNAPSHOT_INTEGRITY_FAILURE';
  END IF;

  SELECT jsonb_build_object(
    'success',true,'exam_id',p_exam_id,'status','published',
    'total_questions',count(*),
    'total_marks',coalesce(sum((s.question_payload->>'marks')::integer),0),
    'questions',coalesce(jsonb_agg(s.question_payload ORDER BY s.display_order),'[]'::jsonb)
  ) INTO v_result
  FROM public.gradifi_exam_question_snapshots s WHERE s.exam_id=p_exam_id;
  IF coalesce((v_result->>'total_questions')::integer,0)=0 THEN
    RAISE EXCEPTION 'PUBLISHED_EXAM_SNAPSHOT_MISSING';
  END IF;
  RETURN v_result;
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_cbt_exam_questions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cbt_exam_questions(uuid) TO authenticated;

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
BEGIN
  SELECT * INTO v_attempt FROM public.cbt_attempts WHERE id=p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CBT_ATTEMPT_NOT_FOUND'; END IF;

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
    SET score=v_score, percentage=v_percentage, status=v_status,
        submitted_at=coalesce(submitted_at,now()), end_time=coalesce(end_time,now())
    WHERE id=p_attempt_id RETURNING * INTO v_attempt;
  ELSIF v_attempt.status NOT IN ('submitted','timeout') THEN
    RAISE EXCEPTION 'INVALID_ATTEMPT_STATE';
  ELSE
    v_score := coalesce(v_attempt.score,0);
    v_percentage := coalesce(v_attempt.percentage,
      CASE WHEN v_attempt.total_marks>0 THEN round((v_score::numeric/v_attempt.total_marks::numeric)*100,2) ELSE 0 END);
    v_grade := CASE WHEN v_percentage>=75 THEN 'A'
                    WHEN v_percentage>=65 THEN 'B'
                    WHEN v_percentage>=50 THEN 'C'
                    WHEN v_percentage>=40 THEN 'D' ELSE 'F' END;
  END IF;

  INSERT INTO public.cbt_results_summary
    (exam_id,student_id,attempt_id,score,total_marks,percentage,grade)
  VALUES (v_attempt.exam_id,v_attempt.student_id,v_attempt.id,
          coalesce(v_attempt.score,0),v_attempt.total_marks,
          coalesce(v_attempt.percentage,0),v_grade)
  ON CONFLICT (attempt_id) DO NOTHING;

  SELECT * INTO v_result FROM public.cbt_results_summary WHERE attempt_id=p_attempt_id;
  RETURN jsonb_build_object('success',true,'attempt_id',v_attempt.id,
    'attempt_number',v_attempt.attempt_number,'status',v_attempt.status,
    'score',v_result.score,'total_marks',v_result.total_marks,
    'percentage',v_result.percentage,'grade',v_result.grade,'result_id',v_result.id,
    'already_finalized',(v_attempt.status<>'in_progress'));
END;
$fn$;
REVOKE ALL ON FUNCTION public.cbt_finalize_attempt(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cbt_finalize_attempt(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_cbt_answer(
  p_attempt_id uuid,p_question_id uuid,p_selected_option_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $fn$
DECLARE
  v_attempt public.cbt_attempts%rowtype;
  v_snapshot public.gradifi_exam_question_snapshots%rowtype;
  v_correct_option uuid;
  v_marks integer;
  v_remaining integer;
  v_correct boolean;
  v_current_score integer;
BEGIN
  SELECT a.* INTO v_attempt
  FROM public.cbt_attempts a JOIN public.students s ON s.id=a.student_id
  WHERE a.id=p_attempt_id AND s.user_id=auth.uid()
  FOR UPDATE OF a;
  IF NOT FOUND THEN RAISE EXCEPTION 'CBT attempt not found or unauthorized'; END IF;
  IF v_attempt.status<>'in_progress' THEN
    RETURN jsonb_build_object('success',false,'error','CBT attempt is not active','status',v_attempt.status);
  END IF;
  IF now()>=v_attempt.deadline_at THEN
    PERFORM public.cbt_finalize_attempt(p_attempt_id);
    RETURN jsonb_build_object('success',false,'error','CBT attempt deadline has expired','status','timeout');
  END IF;

  SELECT * INTO v_snapshot
  FROM public.gradifi_exam_question_snapshots s
  WHERE s.exam_id=v_attempt.exam_id
    AND s.question_payload->>'question_id'=p_question_id::text;
  IF NOT FOUND THEN RAISE EXCEPTION 'Question is not part of this attempt paper'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_snapshot.question_payload->'options') o
    WHERE o->>'id'=p_selected_option_id::text
  ) THEN RAISE EXCEPTION 'Selected option does not belong to this snapshot question'; END IF;

  v_correct_option := (v_snapshot.answer_key_payload->>'correct_option_id')::uuid;
  v_marks := (v_snapshot.answer_key_payload->>'marks')::integer;
  v_correct := p_selected_option_id=v_correct_option;

  INSERT INTO public.cbt_answers
    (attempt_id,question_id,selected_option_id,is_correct,marks_awarded,updated_at)
  VALUES (p_attempt_id,p_question_id,p_selected_option_id,v_correct,
          CASE WHEN v_correct THEN v_marks ELSE 0 END,now())
  ON CONFLICT (attempt_id,question_id) DO UPDATE
  SET selected_option_id=excluded.selected_option_id,
      is_correct=excluded.is_correct,marks_awarded=excluded.marks_awarded,updated_at=now();

  SELECT coalesce(sum(marks_awarded),0) INTO v_current_score
  FROM public.cbt_answers WHERE attempt_id=p_attempt_id;
  UPDATE public.cbt_attempts SET score=v_current_score WHERE id=p_attempt_id;
  v_remaining := greatest(0,extract(epoch from (v_attempt.deadline_at-now()))::integer);
  RETURN jsonb_build_object('success',true,'attempt_id',p_attempt_id,
    'question_id',p_question_id,'saved',true,'time_remaining',v_remaining,
    'current_score',v_current_score);
END;
$fn$;
REVOKE ALL ON FUNCTION public.submit_cbt_answer(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_cbt_answer(uuid,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_cbt_exam(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $fn$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.cbt_attempts a JOIN public.students s ON s.id=a.student_id
    WHERE a.id=p_attempt_id AND s.user_id=auth.uid()
  ) THEN RAISE EXCEPTION 'CBT attempt not found or unauthorized'; END IF;
  RETURN public.cbt_finalize_attempt(p_attempt_id);
END;
$fn$;
REVOKE ALL ON FUNCTION public.submit_cbt_exam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_cbt_exam(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.recover_stuck_attempts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_id IN
    SELECT id FROM public.cbt_attempts
    WHERE status='in_progress' AND deadline_at<=now()
    ORDER BY deadline_at
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.cbt_finalize_attempt(v_id);
    v_count := v_count+1;
  END LOOP;
  RETURN v_count;
END;
$fn$;
REVOKE ALL ON FUNCTION public.recover_stuck_attempts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_stuck_attempts() TO service_role;

-- Enforce RPC-only writes for browser roles. RLS remains the read boundary.
REVOKE ALL ON public.cbt_attempts,public.cbt_answers,public.cbt_results_summary,
  public.gradifi_exam_question_snapshots FROM anon,authenticated;
GRANT SELECT ON public.cbt_attempts,public.cbt_answers,public.cbt_results_summary TO authenticated;
REVOKE ALL ON public.cbt_exams,public.cbt_questions,public.cbt_options FROM anon;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.cbt_exams,public.cbt_questions,public.cbt_options FROM authenticated;
GRANT SELECT ON public.cbt_exams,public.cbt_questions,public.cbt_options TO authenticated;
