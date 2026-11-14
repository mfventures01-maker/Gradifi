-- Add the RPC-backed CBT session read/persistence path without revoking
-- authenticated table writes yet. Positive runtime validation requires a
-- real published exam with immutable question snapshots and an active attempt.

create or replace function public.get_cbt_active_attempt(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_student_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select id into v_student_id
  from public.students
  where user_id=auth.uid()
  order by created_at nulls last,id
  limit 1;

  if v_student_id is null then
    return jsonb_build_object('active',false);
  end if;

  select jsonb_build_object(
    'active',true,
    'attempt_id',a.id,
    'attempt_number',a.attempt_number,
    'session_id',s.id,
    'start_time',a.start_time,
    'deadline_at',a.deadline_at,
    'status',a.status,
    'session_state',s.state,
    'current_question',s.current_question
  ) into v_result
  from public.cbt_attempts a
  join public.cbt_sessions s on s.attempt_id=a.id
  where a.exam_id=p_exam_id
    and a.student_id=v_student_id
    and a.status='in_progress'
  order by a.attempt_number desc,a.created_at desc
  limit 1;

  return coalesce(v_result,jsonb_build_object('active',false));
end;
$function$;

create or replace function public.get_cbt_attempt_state(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_state jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select jsonb_build_object(
    'success',true,
    'attempt_id',a.id,
    'exam_id',a.exam_id,
    'deadline_at',a.deadline_at,
    'status',a.status,
    'session_id',s.id,
    'session_state',s.state,
    'current_question',coalesce(
      (select snap.current_question
       from public.cbt_session_snapshots snap
       where snap.session_id=s.id
       order by snap.created_at desc,snap.id desc
       limit 1),
      s.current_question
    ),
    'remaining_time',coalesce(
      (select snap.remaining_time
       from public.cbt_session_snapshots snap
       where snap.session_id=s.id
       order by snap.created_at desc,snap.id desc
       limit 1),
      s.remaining_time
    ),
    'answers',coalesce((
      select jsonb_object_agg(ans.question_id::text,ans.selected_option_id::text)
      from public.cbt_answers ans
      where ans.attempt_id=a.id and ans.selected_option_id is not null
    ),'{}'::jsonb)
  ) into v_state
  from public.cbt_attempts a
  join public.students st on st.id=a.student_id
  join public.cbt_sessions s on s.attempt_id=a.id
  where a.id=p_attempt_id and st.user_id=auth.uid();

  if v_state is null then
    raise exception 'CBT_ATTEMPT_NOT_FOUND_OR_NOT_OWNED';
  end if;
  return v_state;
end;
$function$;

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

revoke all on function public.get_cbt_active_attempt(uuid) from public, anon;
grant execute on function public.get_cbt_active_attempt(uuid) to authenticated;

revoke all on function public.get_cbt_attempt_state(uuid) from public, anon;
grant execute on function public.get_cbt_attempt_state(uuid) to authenticated;

revoke all on function public.persist_cbt_session_snapshot(uuid,integer,integer) from public, anon;
grant execute on function public.persist_cbt_session_snapshot(uuid,integer,integer) to authenticated, service_role;
