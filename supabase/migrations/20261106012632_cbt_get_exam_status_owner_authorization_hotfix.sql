begin;

create or replace function public.get_exam_status(p_attempt_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_attempt record;
  v_answers_count integer;
begin
  /*
   * Candidate data is visible only to the owning authenticated user.
   * Trusted server-side service_role access is retained for existing
   * server integrations. An unauthorized caller receives the same
   * response as a nonexistent attempt.
   */
  select
    a.id,
    a.status,
    a.score,
    a.total_marks,
    a.end_time,
    (
      select count(*)
      from public.cbt_questions q
      where q.exam_id = a.exam_id
    ) as total_questions
  into v_attempt
  from public.cbt_attempts a
  join public.students s on s.id = a.student_id
  where a.id = p_attempt_id
    and (
      s.user_id = auth.uid()
      or auth.role() = 'service_role'
    );

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Attempt not found'
    );
  end if;

  select count(*)
  into v_answers_count
  from public.cbt_answers a
  where a.attempt_id = p_attempt_id;

  return jsonb_build_object(
    'success', true,
    'attempt_id', p_attempt_id,
    'status', v_attempt.status,
    'score', v_attempt.score,
    'total_marks', v_attempt.total_marks,
    'questions_answered', v_answers_count,
    'total_questions', v_attempt.total_questions,
    'progress',
      case
        when v_attempt.total_questions > 0
          then round((v_answers_count::numeric / v_attempt.total_questions::numeric) * 100)
        else 0
      end,
    'time_remaining',
      greatest(0, extract(epoch from (v_attempt.end_time - now()))::integer),
    'time_expired', now() > v_attempt.end_time
  );
end;
$function$;

revoke all on function public.get_exam_status(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.get_exam_status(uuid)
  to authenticated, service_role;

commit;