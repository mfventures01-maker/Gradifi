create or replace function public.submit_cbt_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_option_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.cbt_attempts%rowtype;
  v_question public.cbt_questions%rowtype;
  v_option public.cbt_options%rowtype;
  v_marks integer;
  v_remaining integer;
begin
  select a.* into v_attempt
  from public.cbt_attempts a
  join public.students s on s.id = a.student_id
  where a.id = p_attempt_id and s.user_id = auth.uid()
  for update of a;

  if not found then
    raise exception 'CBT attempt not found or unauthorized';
  end if;

  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('success', false, 'error', 'CBT attempt is not active', 'status', v_attempt.status);
  end if;

  if now() >= v_attempt.deadline_at then
    update public.cbt_attempts
    set status = 'timeout', end_time = now(), submitted_at = now()
    where id = p_attempt_id;

    return jsonb_build_object('success', false, 'error', 'CBT attempt deadline has expired', 'status', 'timeout');
  end if;

  select * into v_question
  from public.cbt_questions
  where id = p_question_id and exam_id = v_attempt.exam_id;

  if not found then
    raise exception 'Question does not belong to this exam';
  end if;

  select * into v_option
  from public.cbt_options
  where id = p_selected_option_id and question_id = p_question_id;

  if not found then
    raise exception 'Selected option does not belong to this question';
  end if;

  v_marks := case when v_option.is_correct then v_question.marks else 0 end;

  insert into public.cbt_answers (
    attempt_id, question_id, selected_option_id, is_correct, marks_awarded, updated_at
  )
  values (
    p_attempt_id, p_question_id, p_selected_option_id, v_option.is_correct, v_marks, now()
  )
  on conflict (attempt_id, question_id) do update
  set selected_option_id = excluded.selected_option_id,
      is_correct = excluded.is_correct,
      marks_awarded = excluded.marks_awarded,
      updated_at = now();

  update public.cbt_attempts
  set score = (
    select coalesce(sum(marks_awarded),0)
    from public.cbt_answers where attempt_id = p_attempt_id
  )
  where id = p_attempt_id;

  v_remaining := greatest(0, extract(epoch from (v_attempt.deadline_at - now()))::integer);

  return jsonb_build_object(
    'success', true,
    'attempt_id', p_attempt_id,
    'question_id', p_question_id,
    'marks_awarded', v_marks,
    'is_correct', v_option.is_correct,
    'time_remaining', v_remaining,
    'current_score', (select score from public.cbt_attempts where id = p_attempt_id)
  );
end;
$$;

grant execute on function public.submit_cbt_answer(uuid,uuid,uuid) to authenticated;
