-- CBT MVP hardening: question authoring authorization and session identity correlation.
-- Existing records are preserved. No data backfill or destructive operation.

DROP POLICY IF EXISTS cbt_sessions_student_insert ON public.cbt_sessions;
CREATE POLICY cbt_sessions_student_insert
ON public.cbt_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  public.cbt_is_student(student_id)
  AND EXISTS (
    SELECT 1
    FROM public.cbt_attempts AS a
    WHERE a.id = cbt_sessions.attempt_id
      AND a.exam_id = cbt_sessions.exam_id
      AND a.student_id = cbt_sessions.student_id
  )
);

CREATE OR REPLACE FUNCTION public.add_cbt_question(
  p_exam_id uuid,
  p_question_text text,
  p_marks integer,
  p_question_number integer,
  p_options jsonb,
  p_difficulty text DEFAULT 'medium'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_question_id uuid;
  v_option jsonb;
  v_correct_count integer;
  v_option_count integer;
  v_exam_status text;
  v_exam_total integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_question_text IS NULL OR length(btrim(p_question_text)) = 0 THEN
    RAISE EXCEPTION 'Question text is required';
  END IF;
  IF p_marks IS NULL OR p_marks <= 0 THEN
    RAISE EXCEPTION 'Question marks must be positive';
  END IF;
  IF p_question_number IS NULL OR p_question_number <= 0 THEN
    RAISE EXCEPTION 'Question number must be positive';
  END IF;
  IF p_difficulty NOT IN ('easy','medium','hard') THEN
    RAISE EXCEPTION 'Invalid question difficulty';
  END IF;
  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN
    RAISE EXCEPTION 'Options must be a JSON array';
  END IF;

  -- Serialize edits against publishing and enforce tenant ownership.
  PERFORM public.assert_exam_access(p_exam_id);

  SELECT status, total_marks
    INTO v_exam_status, v_exam_total
  FROM public.cbt_exams
  WHERE id = p_exam_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam not found';
  END IF;
  IF v_exam_status <> 'draft' THEN
    RAISE EXCEPTION 'Questions can only be added to draft exams';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE (item->>'is_correct')::boolean IS TRUE)
    INTO v_option_count, v_correct_count
  FROM jsonb_array_elements(p_options) AS item;

  IF v_option_count < 2 THEN
    RAISE EXCEPTION 'At least two answer options are required';
  END IF;
  IF v_correct_count <> 1 THEN
    RAISE EXCEPTION 'Exactly one correct option is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_options) AS item
    WHERE coalesce(btrim(item->>'text'), '') = ''
       OR coalesce(btrim(item->>'letter'), '') = ''
  ) THEN
    RAISE EXCEPTION 'Every option requires non-empty text and letter';
  END IF;

  INSERT INTO public.cbt_questions (
    exam_id, question_text, marks, question_number, question_type, difficulty
  ) VALUES (
    p_exam_id, btrim(p_question_text), p_marks, p_question_number, 'objective', p_difficulty
  ) RETURNING id INTO v_question_id;

  FOR v_option IN SELECT value FROM jsonb_array_elements(p_options)
  LOOP
    INSERT INTO public.cbt_options (
      question_id, option_text, is_correct, option_letter
    ) VALUES (
      v_question_id,
      btrim(v_option->>'text'),
      (v_option->>'is_correct')::boolean,
      upper(btrim(v_option->>'letter'))
    );
  END LOOP;

  UPDATE public.cbt_exams
  SET total_marks = total_marks + p_marks,
      updated_at = now()
  WHERE id = p_exam_id
  RETURNING total_marks INTO v_exam_total;

  RETURN jsonb_build_object(
    'success', true,
    'question_id', v_question_id,
    'question_number', p_question_number,
    'marks_added', p_marks,
    'total_marks', v_exam_total
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.add_cbt_question(uuid,text,integer,integer,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_cbt_question(uuid,text,integer,integer,jsonb,text) TO authenticated;

REVOKE ALL ON FUNCTION public.publish_cbt_exam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_cbt_exam(uuid) TO authenticated;
