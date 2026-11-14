-- CBT-02: commercial CBT privilege and lifecycle remediation.
-- Additive, forward-only hardening. Apply only after CBT-01 is reviewed and dry-run.
-- Does not touch AI grading or plagiarism objects.

create or replace function public.persist_cbt_session_snapshot(
  p_session_id uuid,
  p_current_question integer,
  p_remaining_time integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_session public.cbt_sessions%rowtype;
  v_attempt public.cbt_attempts%rowtype;
  v_question_count integer;
  v_remaining integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_session_id is null then raise exception 'Session identifier is required'; end if;
  if p_current_question is null or p_current_question < 0 then
    raise exception 'Current question index must be zero or greater';
  end if;
  if p_remaining_time is null or p_remaining_time < 0 then
    raise exception 'Remaining time must be zero or greater';
  end if;

  select * into v_session
  from public.cbt_sessions
  where id=p_session_id
  for update;

  if not found then raise exception 'CBT_SESSION_NOT_FOUND'; end if;
  if not public.cbt_is_student(v_session.student_id) then
    raise exception 'CBT_SESSION_NOT_OWNED';
  end if;
  if v_session.state not in ('ACTIVE_EXAM','PAUSED') then
    raise exception 'CBT_SESSION_NOT_PERSISTABLE_IN_CURRENT_STATE';
  end if;

  select * into v_attempt
  from public.cbt_attempts
  where id=v_session.attempt_id
    and exam_id=v_session.exam_id
    and student_id=v_session.student_id
  for update;

  if not found or v_attempt.status <> 'in_progress' then
    raise exception 'CBT_ATTEMPT_NOT_ACTIVE';
  end if;
  if now() >= v_attempt.deadline_at then
    raise exception 'CBT_ATTEMPT_DEADLINE_EXPIRED';
  end if;

  select count(*) into v_question_count
  from public.gradifi_exam_question_snapshots
  where exam_id=v_session.exam_id;

  if v_question_count <= 0 or p_current_question >= v_question_count then
    raise exception 'CBT_CURRENT_QUESTION_OUT_OF_RANGE';
  end if;

  v_remaining := least(
    p_remaining_time,
    greatest(0,ceil(extract(epoch from (v_attempt.deadline_at-now())))::integer)
  );

  update public.cbt_sessions
  set current_question=p_current_question,
      remaining_time=v_remaining,
      updated_at=now()
  where id=v_session.id
  returning * into v_session;

  insert into public.cbt_session_snapshots(
    session_id,state,current_question,remaining_time
  ) values (
    v_session.id,v_session.state,v_session.current_question,v_session.remaining_time
  );

  return jsonb_build_object(
    'success',true,
    'session_id',v_session.id,
    'state',v_session.state,
    'current_question',v_session.current_question,
    'remaining_time',v_session.remaining_time
  );
end;
$function$;

revoke all on function public.persist_cbt_session_snapshot(uuid,integer,integer) from public, anon;
grant execute on function public.persist_cbt_session_snapshot(uuid,integer,integer) to authenticated, service_role;

-- Clients may still read their own session under the existing RLS policies,
-- but all state and snapshot writes must pass through guarded functions.
revoke insert, update, delete on public.cbt_sessions from anon, authenticated;
revoke insert, update, delete on public.cbt_session_snapshots from anon, authenticated;

-- Legacy RPC writes obsolete columns, accepts an arbitrary user ID, and has no
-- repository call sites. Retain the function object for dependency-safe retirement,
-- but remove every client and service execution path.
revoke all on function public.start_cbt_exam_v2(uuid,uuid) from public, anon, authenticated, service_role;

-- Pass marks remain raw examination marks, bounded by the sum of question marks.
-- Preserve the existing publication validations and immutable snapshot construction.
create or replace function public.publish_cbt_exam(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'extensions'
as $function$
declare
  v_exam public.cbt_exams%rowtype;
  v_question_count integer;
  v_question_marks integer;
  v_snapshot_count integer;
begin
  perform public.assert_exam_access(p_exam_id);
  select * into v_exam from public.cbt_exams where id=p_exam_id for update;
  if not found then raise exception 'EXAM_NOT_FOUND'; end if;
  if v_exam.status <> 'draft' or v_exam.current_state <> 'draft' then
    raise exception 'Only a draft exam can be published';
  end if;

  select count(*),coalesce(sum(q.marks),0)
  into v_question_count,v_question_marks
  from public.cbt_questions q where q.exam_id=p_exam_id;

  if v_question_count=0 or v_question_marks<=0 then
    raise exception 'Cannot publish an exam without positively marked questions';
  end if;
  if v_exam.total_marks<>v_question_marks then
    raise exception 'Exam total marks do not match question marks';
  end if;
  if v_exam.pass_mark is null or v_exam.pass_mark<0 or v_exam.pass_mark>v_question_marks then
    raise exception 'Pass mark cannot exceed total examination marks';
  end if;
  if exists (
    select 1 from public.cbt_questions q
    where q.exam_id=p_exam_id and (
      q.question_type is distinct from 'objective'
      or q.marks<=0
      or (select count(*) from public.cbt_options o where o.question_id=q.id)<2
      or (select count(*) from public.cbt_options o where o.question_id=q.id and o.is_correct is true)<>1
    )
  ) then
    raise exception 'Every published CBT question must be objective with at least two options and exactly one correct answer';
  end if;

  select count(*) into v_snapshot_count
  from public.gradifi_exam_question_snapshots s where s.exam_id=p_exam_id;
  if v_snapshot_count<>0 then
    raise exception 'Snapshot rows already exist for this draft exam; investigate before publishing';
  end if;

  insert into public.gradifi_exam_question_snapshots
    (exam_id,source_question_version_id,display_order,question_payload,answer_key_payload,content_sha256)
  select
    p_exam_id,NULL,q.question_number,
    jsonb_build_object(
      'question_id',q.id,'text',q.question_text,'marks',q.marks,
      'number',q.question_number,'type',q.question_type,'image_url',q.image_url,
      'options',(select jsonb_agg(jsonb_build_object('id',o.id,'text',o.option_text,'letter',o.option_letter) order by o.option_letter)
                 from public.cbt_options o where o.question_id=q.id)
    ),
    jsonb_build_object(
      'question_id',q.id,'marks',q.marks,
      'correct_option_id',(select o.id from public.cbt_options o where o.question_id=q.id and o.is_correct is true)
    ),
    encode(extensions.digest(
      (jsonb_build_object(
        'question_id',q.id,'text',q.question_text,'marks',q.marks,
        'number',q.question_number,'type',q.question_type,'image_url',q.image_url,
        'options',(select jsonb_agg(jsonb_build_object('id',o.id,'text',o.option_text,'letter',o.option_letter) order by o.option_letter)
                   from public.cbt_options o where o.question_id=q.id)
      )::text || jsonb_build_object(
        'question_id',q.id,'marks',q.marks,
        'correct_option_id',(select o.id from public.cbt_options o where o.question_id=q.id and o.is_correct is true)
      )::text)::bytea,'sha256'),'hex')
  from public.cbt_questions q
  where q.exam_id=p_exam_id
  order by q.question_number;

  update public.cbt_exams
  set status='published',current_state='active',
      start_time=coalesce(start_time,now()),
      end_time=coalesce(end_time,coalesce(start_time,now())+make_interval(mins=>duration_minutes)),
      updated_at=now()
  where id=p_exam_id returning * into v_exam;

  return jsonb_build_object(
    'success',true,'exam_id',p_exam_id,'status',v_exam.status,
    'start_time',v_exam.start_time,'end_time',v_exam.end_time,
    'duration_minutes',v_exam.duration_minutes,'total_questions',v_question_count,
    'total_marks',v_question_marks,'pass_mark',v_exam.pass_mark,
    'snapshot_count',v_question_count
  );
end;
$function$;

revoke all on function public.publish_cbt_exam(uuid) from public, anon;
grant execute on function public.publish_cbt_exam(uuid) to authenticated, service_role;

-- Explicit grants are repeated here so the intended privilege state is visible
-- in this remediation migration and can be checked independently.
grant select on public.cbt_sessions to authenticated;
grant select on public.cbt_session_snapshots to authenticated;
