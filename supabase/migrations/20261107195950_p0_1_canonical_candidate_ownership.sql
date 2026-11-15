-- P0.1: Canonical CBT candidate ownership
-- Target: ehkmfnaqkdgkjmdxxbwj
-- Scope: additive identity model + CBT ownership/RPC/RLS migration.
-- Explicitly does NOT change exam eligibility (P0.2), question snapshots,
-- Auth users, school/student records, payment logic, or frontend code.

begin;

create table public.cbt_candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_type text not null
    constraint cbt_candidates_type_check
    check (candidate_type in ('student','individual')),
  student_id uuid null references public.students(id) on delete restrict,
  user_id uuid null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint cbt_candidates_identity_shape_check check (
    (candidate_type = 'student' and student_id is not null and user_id is null)
    or
    (candidate_type = 'individual' and student_id is null and user_id is not null)
  )
);

create unique index cbt_candidates_student_identity_uidx
  on public.cbt_candidates(student_id) where candidate_type = 'student';
create unique index cbt_candidates_individual_identity_uidx
  on public.cbt_candidates(user_id) where candidate_type = 'individual';

alter table public.cbt_candidates enable row level security;
revoke all on public.cbt_candidates from anon, authenticated;
grant select, insert, update, delete on public.cbt_candidates to service_role;

insert into public.cbt_candidates(candidate_type, student_id)
select 'student', s.id from public.students s
on conflict (student_id) where candidate_type = 'student' do nothing;

alter table public.cbt_attempts add column candidate_id uuid;
alter table public.cbt_sessions add column candidate_id uuid;
alter table public.cbt_results_summary add column candidate_id uuid;

update public.cbt_attempts a
set candidate_id = c.id
from public.cbt_candidates c
where c.candidate_type = 'student' and c.student_id = a.student_id;

update public.cbt_sessions s
set candidate_id = a.candidate_id
from public.cbt_attempts a
where a.id = s.attempt_id and a.exam_id = s.exam_id and a.student_id = s.student_id;

update public.cbt_results_summary r
set candidate_id = a.candidate_id
from public.cbt_attempts a
where a.id = r.attempt_id and a.exam_id = r.exam_id and a.student_id = r.student_id;

do $$
begin
  if exists (select 1 from public.cbt_attempts where candidate_id is null)
     or exists (select 1 from public.cbt_sessions where candidate_id is null)
     or exists (select 1 from public.cbt_results_summary where candidate_id is null) then
    raise exception 'P0.1_BACKFILL_FAILED: one or more CBT rows lack a canonical candidate';
  end if;
end;
$$;

alter table public.cbt_attempts alter column student_id drop not null;
alter table public.cbt_sessions alter column student_id drop not null;
alter table public.cbt_results_summary alter column student_id drop not null;
alter table public.cbt_attempts alter column candidate_id set not null;
alter table public.cbt_sessions alter column candidate_id set not null;
alter table public.cbt_results_summary alter column candidate_id set not null;

alter table public.cbt_attempts
  add constraint cbt_attempts_candidate_id_fkey
  foreign key (candidate_id) references public.cbt_candidates(id) on delete restrict;
alter table public.cbt_sessions
  add constraint cbt_sessions_candidate_id_fkey
  foreign key (candidate_id) references public.cbt_candidates(id) on delete restrict;
alter table public.cbt_results_summary
  add constraint cbt_results_candidate_id_fkey
  foreign key (candidate_id) references public.cbt_candidates(id) on delete restrict;

alter table public.cbt_sessions drop constraint cbt_sessions_attempt_identity_fkey;
alter table public.cbt_attempts
  add constraint cbt_attempts_id_exam_candidate_key unique (id, exam_id, candidate_id);
alter table public.cbt_sessions
  add constraint cbt_sessions_attempt_candidate_fkey
  foreign key (attempt_id, exam_id, candidate_id)
  references public.cbt_attempts(id, exam_id, candidate_id) on delete cascade;

alter table public.cbt_attempts drop constraint cbt_attempts_exam_student_attempt_key;
create unique index cbt_attempts_exam_candidate_attempt_uidx
  on public.cbt_attempts(exam_id, candidate_id, attempt_number);
create index cbt_attempts_candidate_status_idx on public.cbt_attempts(candidate_id, status);
create index cbt_sessions_candidate_idx on public.cbt_sessions(candidate_id);
create index cbt_results_candidate_idx on public.cbt_results_summary(candidate_id);

create or replace function public.cbt_candidate_is_owner(p_candidate_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, auth
as $function$
  select auth.uid() is not null and exists (
    select 1 from public.cbt_candidates c
    left join public.students s on c.candidate_type = 'student' and s.id = c.student_id
    where c.id = p_candidate_id
      and ((c.candidate_type = 'student' and s.user_id = auth.uid())
        or (c.candidate_type = 'individual' and c.user_id = auth.uid()))
  );
$function$;

create or replace function public.cbt_get_or_create_candidate()
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_uid uuid := auth.uid();
  v_student_id uuid;
  v_student_count integer;
  v_candidate_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select count(*), (array_agg(s.id order by s.id))[1]
    into v_student_count, v_student_id
  from public.students s where s.user_id = v_uid;
  if v_student_count > 1 then
    raise exception 'CBT_IDENTITY_AMBIGUOUS: Auth user maps to multiple student rows';
  end if;
  if v_student_count = 1 then
    insert into public.cbt_candidates(candidate_type, student_id)
    values ('student', v_student_id)
    on conflict (student_id) where candidate_type = 'student'
    do update set student_id = excluded.student_id
    returning id into v_candidate_id;
  else
    insert into public.cbt_candidates(candidate_type, user_id)
    values ('individual', v_uid)
    on conflict (user_id) where candidate_type = 'individual'
    do update set user_id = excluded.user_id
    returning id into v_candidate_id;
  end if;
  return v_candidate_id;
end;
$function$;

revoke all on function public.cbt_candidate_is_owner(uuid) from public, anon;
revoke all on function public.cbt_get_or_create_candidate() from public, anon;
grant execute on function public.cbt_candidate_is_owner(uuid) to authenticated, service_role;
grant execute on function public.cbt_get_or_create_candidate() to authenticated, service_role;

create or replace function public.cbt_prepare_attempt()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  v_exam public.cbt_exams%rowtype;
  v_candidate public.cbt_candidates%rowtype;
  v_next_number integer;
  v_deadline timestamptz;
begin
  select * into v_candidate from public.cbt_candidates where id = new.candidate_id for share;
  if not found then raise exception 'CBT_CANDIDATE_NOT_FOUND'; end if;
  if v_candidate.candidate_type = 'student' then
    if new.student_id is distinct from v_candidate.student_id then
      raise exception 'CBT_CANDIDATE_STUDENT_MISMATCH';
    end if;
  elsif new.student_id is not null then
    raise exception 'CBT_INDIVIDUAL_MUST_NOT_HAVE_STUDENT_ID';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.exam_id::text || ':' || new.candidate_id::text, 0));
  select * into v_exam from public.cbt_exams where id = new.exam_id for share;
  if not found then raise exception 'CBT exam not found'; end if;
  if v_exam.status not in ('published','active') then raise exception 'CBT exam is not open for attempts'; end if;
  if v_exam.start_time is not null and now() < v_exam.start_time then raise exception 'CBT exam availability window has not opened'; end if;
  if v_exam.end_time is not null and now() >= v_exam.end_time then raise exception 'CBT exam availability window has closed'; end if;
  if new.attempt_number is null then
    select coalesce(max(attempt_number), 0) + 1 into v_next_number
    from public.cbt_attempts where exam_id = new.exam_id and candidate_id = new.candidate_id;
    new.attempt_number := v_next_number;
  end if;
  new.start_time := coalesce(new.start_time, now());
  v_deadline := new.start_time + make_interval(mins => v_exam.duration_minutes);
  if v_exam.end_time is not null then v_deadline := least(v_deadline, v_exam.end_time); end if;
  new.deadline_at := v_deadline;
  new.end_time := null;
  new.submitted_at := null;
  new.status := 'in_progress';
  new.total_marks := v_exam.total_marks;
  new.score := 0;
  return new;
end;
$function$;

create or replace function public.cbt_validate_attempt_candidate()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare v_candidate public.cbt_candidates%rowtype;
begin
  select * into v_candidate from public.cbt_candidates where id = new.candidate_id;
  if not found then raise exception 'CBT_CANDIDATE_NOT_FOUND'; end if;
  if v_candidate.candidate_type = 'student' then
    if new.student_id is distinct from v_candidate.student_id then raise exception 'CBT_CANDIDATE_STUDENT_MISMATCH'; end if;
  elsif new.student_id is not null then
    raise exception 'CBT_INDIVIDUAL_MUST_NOT_HAVE_STUDENT_ID';
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_cbt_validate_attempt_candidate on public.cbt_attempts;
create trigger trg_cbt_validate_attempt_candidate
before insert or update of candidate_id, student_id on public.cbt_attempts
for each row execute function public.cbt_validate_attempt_candidate();

create or replace function public.cbt_validate_result_candidate()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  v_candidate public.cbt_candidates%rowtype;
  v_attempt public.cbt_attempts%rowtype;
begin
  select * into v_candidate from public.cbt_candidates where id = new.candidate_id;
  if not found then raise exception 'CBT_RESULT_CANDIDATE_NOT_FOUND'; end if;
  if v_candidate.candidate_type = 'student' then
    if new.student_id is distinct from v_candidate.student_id then raise exception 'CBT_RESULT_STUDENT_CANDIDATE_MISMATCH'; end if;
  elsif new.student_id is not null then
    raise exception 'CBT_INDIVIDUAL_RESULT_MUST_NOT_HAVE_STUDENT_ID';
  end if;
  select * into v_attempt from public.cbt_attempts
  where id = new.attempt_id and exam_id = new.exam_id and candidate_id = new.candidate_id;
  if not found or v_attempt.student_id is distinct from new.student_id then
    raise exception 'CBT_RESULT_ATTEMPT_CANDIDATE_MISMATCH';
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_cbt_validate_result_candidate on public.cbt_results_summary;
create trigger trg_cbt_validate_result_candidate
before insert or update of attempt_id, exam_id, candidate_id, student_id
on public.cbt_results_summary for each row
execute function public.cbt_validate_result_candidate();

create or replace function public.cbt_guard_session_update()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare v_attempt_status text; v_allowed boolean;
begin
  if new.id is distinct from old.id
    or new.attempt_id is distinct from old.attempt_id
    or new.exam_id is distinct from old.exam_id
    or new.student_id is distinct from old.student_id
    or new.candidate_id is distinct from old.candidate_id
    or new.created_at is distinct from old.created_at then
    raise exception 'CBT session identity fields are immutable';
  end if;
  if new.state <> old.state then
    v_allowed := case old.state
      when 'INITIALIZING' then new.state = 'AUTHENTICATED'
      when 'AUTHENTICATED' then new.state = 'LOADING_EXAM'
      when 'LOADING_EXAM' then new.state = 'INSTRUCTIONS_VIEW'
      when 'INSTRUCTIONS_VIEW' then new.state = 'ACTIVE_EXAM'
      when 'ACTIVE_EXAM' then new.state in ('PAUSED','SUBMITTED','SCORED')
      when 'PAUSED' then new.state in ('ACTIVE_EXAM','SCORED')
      when 'SUBMITTED' then new.state = 'SCORED'
      else false end;
    if not v_allowed then raise exception 'Invalid CBT session transition: % -> %', old.state, new.state; end if;
    if new.state in ('SUBMITTED','SCORED') then
      select status into v_attempt_status from public.cbt_attempts where id = old.attempt_id;
      if v_attempt_status = 'in_progress' then raise exception 'Cannot close CBT session while its attempt is still active'; end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

create or replace function public.cbt_validate_session_candidate()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  v_candidate public.cbt_candidates%rowtype;
  v_attempt public.cbt_attempts%rowtype;
begin
  select * into v_candidate from public.cbt_candidates where id = new.candidate_id;
  if not found then raise exception 'CBT_CANDIDATE_NOT_FOUND'; end if;
  if v_candidate.candidate_type = 'student' then
    if new.student_id is distinct from v_candidate.student_id then raise exception 'CBT_SESSION_STUDENT_CANDIDATE_MISMATCH'; end if;
  elsif new.student_id is not null then
    raise exception 'CBT_INDIVIDUAL_SESSION_MUST_NOT_HAVE_STUDENT_ID';
  end if;
  select * into v_attempt from public.cbt_attempts
  where id = new.attempt_id and exam_id = new.exam_id and candidate_id = new.candidate_id;
  if not found then raise exception 'CBT_SESSION_ATTEMPT_CANDIDATE_MISMATCH'; end if;
  if v_attempt.student_id is distinct from new.student_id then raise exception 'CBT_SESSION_LEGACY_STUDENT_MISMATCH'; end if;
  return new;
end;
$function$;
drop trigger if exists trg_cbt_validate_session_candidate on public.cbt_sessions;
create trigger trg_cbt_validate_session_candidate
before insert or update of attempt_id, exam_id, candidate_id, student_id
on public.cbt_sessions for each row execute function public.cbt_validate_session_candidate();

drop policy if exists cbt_attempts_student_select on public.cbt_attempts;
create policy cbt_attempts_candidate_select on public.cbt_attempts
for select to authenticated using (public.cbt_candidate_is_owner(candidate_id));

drop policy if exists cbt_results_student_select on public.cbt_results_summary;
create policy cbt_results_candidate_select on public.cbt_results_summary
for select to authenticated using (public.cbt_candidate_is_owner(candidate_id));

drop policy if exists cbt_sessions_student_insert on public.cbt_sessions;
drop policy if exists cbt_sessions_student_select on public.cbt_sessions;
drop policy if exists cbt_sessions_student_update on public.cbt_sessions;

create policy cbt_sessions_candidate_select on public.cbt_sessions
for select to authenticated using (public.cbt_candidate_is_owner(candidate_id));
create policy cbt_sessions_candidate_insert on public.cbt_sessions
for insert to authenticated
with check (
  public.cbt_candidate_is_owner(candidate_id)
  and exists (
    select 1 from public.cbt_attempts a
    where a.id = cbt_sessions.attempt_id
      and a.exam_id = cbt_sessions.exam_id
      and a.candidate_id = cbt_sessions.candidate_id
  )
);
create policy cbt_sessions_candidate_update on public.cbt_sessions
for update to authenticated
using (public.cbt_candidate_is_owner(candidate_id))
with check (public.cbt_candidate_is_owner(candidate_id));

create or replace function public.create_cbt_attempt(p_exam_id uuid)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_candidate_id uuid;
  v_student_id uuid;
  v_attempt public.cbt_attempts%rowtype;
  v_session public.cbt_sessions%rowtype;
  v_question_count integer;
  v_snapshot_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.cbt_student_can_access_exam(p_exam_id) then raise exception 'Candidate is not eligible to start this exam'; end if;
  v_candidate_id := public.cbt_get_or_create_candidate();
  select student_id into v_student_id from public.cbt_candidates
  where id = v_candidate_id and candidate_type = 'student';
  if v_student_id is null then raise exception 'INDIVIDUAL_EXAM_ACCESS_NOT_ENABLED_UNTIL_P0_2'; end if;
  select count(*) into v_question_count from public.cbt_questions where exam_id = p_exam_id;
  select count(*) into v_snapshot_count from public.gradifi_exam_question_snapshots where exam_id = p_exam_id;
  if v_question_count = 0 or v_snapshot_count <> v_question_count then raise exception 'Published exam snapshot is missing or incomplete'; end if;
  insert into public.cbt_attempts(exam_id, candidate_id, student_id)
  values (p_exam_id, v_candidate_id, v_student_id) returning * into v_attempt;
  insert into public.cbt_sessions(
    attempt_id, exam_id, candidate_id, student_id, state, current_question, remaining_time
  ) values (
    v_attempt.id, v_attempt.exam_id, v_candidate_id, v_student_id, 'INITIALIZING', 0,
    greatest(0, extract(epoch from (v_attempt.deadline_at-now()))::integer)
  ) returning * into v_session;
  return jsonb_build_object(
    'success', true, 'attempt_id', v_attempt.id, 'candidate_id', v_candidate_id,
    'attempt_number', v_attempt.attempt_number, 'session_id', v_session.id,
    'start_time', v_attempt.start_time, 'deadline_at', v_attempt.deadline_at,
    'status', v_attempt.status, 'snapshot_questions', v_snapshot_count
  );
end;
$function$;

create or replace function public.cbt_finalize_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  v_attempt public.cbt_attempts%rowtype;
  v_result public.cbt_results_summary%rowtype;
  v_score integer;
  v_percentage numeric(5,2);
  v_grade char(1);
  v_status text;
  v_was_finalized boolean;
begin
  select * into v_attempt from public.cbt_attempts where id = p_attempt_id for update;
  if not found then raise exception 'CBT_ATTEMPT_NOT_FOUND'; end if;
  v_was_finalized := v_attempt.status in ('submitted','timeout');
  if v_attempt.status = 'in_progress' then
    v_status := case when now() >= v_attempt.deadline_at then 'timeout' else 'submitted' end;
    select coalesce(sum(a.marks_awarded),0) into v_score from public.cbt_answers a where a.attempt_id = p_attempt_id;
    if v_attempt.total_marks <= 0 then raise exception 'INVALID_ATTEMPT_TOTAL_MARKS'; end if;
    v_percentage := round((v_score::numeric / v_attempt.total_marks::numeric) * 100, 2);
    v_grade := case when v_percentage >= 75 then 'A' when v_percentage >= 65 then 'B'
      when v_percentage >= 50 then 'C' when v_percentage >= 40 then 'D' else 'F' end;
    update public.cbt_attempts
    set score = v_score, percentage = v_percentage, status = v_status,
        submitted_at = coalesce(submitted_at, now()), end_time = coalesce(end_time, now())
    where id = p_attempt_id returning * into v_attempt;
  elsif v_attempt.status not in ('submitted','timeout') then
    raise exception 'INVALID_ATTEMPT_STATE';
  else
    v_score := coalesce(v_attempt.score,0);
    v_percentage := coalesce(v_attempt.percentage,
      case when v_attempt.total_marks > 0 then round((v_score::numeric / v_attempt.total_marks::numeric) * 100, 2) else 0 end);
    v_grade := case when v_percentage >= 75 then 'A' when v_percentage >= 65 then 'B'
      when v_percentage >= 50 then 'C' when v_percentage >= 40 then 'D' else 'F' end;
  end if;
  insert into public.cbt_results_summary(
    exam_id, candidate_id, student_id, attempt_id, score, total_marks, percentage, grade
  ) values (
    v_attempt.exam_id, v_attempt.candidate_id, v_attempt.student_id, v_attempt.id,
    coalesce(v_attempt.score,0), v_attempt.total_marks, coalesce(v_attempt.percentage,0), v_grade
  ) on conflict (attempt_id) do nothing;
  select * into v_result from public.cbt_results_summary where attempt_id = p_attempt_id;
  return jsonb_build_object(
    'success', true, 'attempt_id', v_attempt.id, 'candidate_id', v_attempt.candidate_id,
    'attempt_number', v_attempt.attempt_number, 'status', v_attempt.status,
    'score', v_result.score, 'total_marks', v_result.total_marks, 'percentage', v_result.percentage,
    'grade', v_result.grade, 'result_id', v_result.id, 'already_finalized', v_was_finalized
  );
end;
$function$;

create or replace function public.submit_cbt_answer(p_attempt_id uuid,p_question_id uuid,p_selected_option_id uuid)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_attempt public.cbt_attempts%rowtype;
  v_snapshot public.gradifi_exam_question_snapshots%rowtype;
  v_correct_option uuid;
  v_marks integer;
  v_remaining integer;
  v_correct boolean;
  v_current_score integer;
begin
  select a.* into v_attempt from public.cbt_attempts a
  where a.id = p_attempt_id and public.cbt_candidate_is_owner(a.candidate_id) for update;
  if not found then raise exception 'CBT attempt not found or unauthorized'; end if;
  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('success',false,'error','CBT attempt is not active','status',v_attempt.status);
  end if;
  if now() >= v_attempt.deadline_at then
    perform public.cbt_finalize_attempt(p_attempt_id);
    return jsonb_build_object('success',false,'error','CBT attempt deadline has expired','status','timeout');
  end if;
  select * into v_snapshot from public.gradifi_exam_question_snapshots s
  where s.exam_id = v_attempt.exam_id and s.question_payload->>'question_id' = p_question_id::text;
  if not found then raise exception 'Question is not part of this attempt paper'; end if;
  if not exists (
    select 1 from jsonb_array_elements(v_snapshot.question_payload->'options') o
    where o->>'id' = p_selected_option_id::text
  ) then raise exception 'Selected option does not belong to this snapshot question'; end if;
  v_correct_option := (v_snapshot.answer_key_payload->>'correct_option_id')::uuid;
  v_marks := (v_snapshot.answer_key_payload->>'marks')::integer;
  v_correct := p_selected_option_id = v_correct_option;
  insert into public.cbt_answers(attempt_id, question_id, selected_option_id, is_correct, marks_awarded, updated_at)
  values (p_attempt_id, p_question_id, p_selected_option_id, v_correct, case when v_correct then v_marks else 0 end, now())
  on conflict (attempt_id, question_id) do update
  set selected_option_id = excluded.selected_option_id, is_correct = excluded.is_correct,
      marks_awarded = excluded.marks_awarded, updated_at = now();
  select coalesce(sum(marks_awarded),0) into v_current_score from public.cbt_answers where attempt_id = p_attempt_id;
  update public.cbt_attempts set score = v_current_score where id = p_attempt_id;
  v_remaining := greatest(0, extract(epoch from (v_attempt.deadline_at-now()))::integer);
  return jsonb_build_object('success',true,'attempt_id',p_attempt_id,'candidate_id',v_attempt.candidate_id,
    'question_id',p_question_id,'saved',true,'time_remaining',v_remaining,'current_score',v_current_score);
end;
$function$;

create or replace function public.submit_cbt_exam(p_attempt_id uuid)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, auth
as $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.cbt_attempts a
    where a.id = p_attempt_id and public.cbt_candidate_is_owner(a.candidate_id)
  ) then raise exception 'CBT attempt not found or unauthorized'; end if;
  return public.cbt_finalize_attempt(p_attempt_id);
end;
$function$;

create or replace function public.persist_cbt_session_snapshot(p_session_id uuid,p_current_question integer,p_remaining_time integer)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_session public.cbt_sessions%rowtype;
  v_attempt public.cbt_attempts%rowtype;
  v_question_count integer;
  v_remaining integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_session_id is null then raise exception 'Session identifier is required'; end if;
  if p_current_question is null or p_current_question < 0 then raise exception 'Current question index must be zero or greater'; end if;
  if p_remaining_time is null or p_remaining_time < 0 then raise exception 'Remaining time must be zero or greater'; end if;
  select * into v_session from public.cbt_sessions where id = p_session_id for update;
  if not found then raise exception 'CBT_SESSION_NOT_FOUND'; end if;
  if not public.cbt_candidate_is_owner(v_session.candidate_id) then raise exception 'CBT_SESSION_NOT_OWNED'; end if;
  if v_session.state not in ('ACTIVE_EXAM','PAUSED') then raise exception 'CBT_SESSION_NOT_PERSISTABLE_IN_CURRENT_STATE'; end if;
  select * into v_attempt from public.cbt_attempts
  where id = v_session.attempt_id and exam_id = v_session.exam_id and candidate_id = v_session.candidate_id for update;
  if not found or v_attempt.status <> 'in_progress' then raise exception 'CBT_ATTEMPT_NOT_ACTIVE'; end if;
  if now() >= v_attempt.deadline_at then raise exception 'CBT_ATTEMPT_DEADLINE_EXPIRED'; end if;
  select count(*) into v_question_count from public.gradifi_exam_question_snapshots where exam_id = v_session.exam_id;
  if v_question_count <= 0 or p_current_question >= v_question_count then raise exception 'CBT_CURRENT_QUESTION_OUT_OF_RANGE'; end if;
  v_remaining := least(p_remaining_time,greatest(0,ceil(extract(epoch from (v_attempt.deadline_at-now())))::integer));
  update public.cbt_sessions set current_question = p_current_question, remaining_time = v_remaining, updated_at = now()
  where id = v_session.id returning * into v_session;
  insert into public.cbt_session_snapshots(session_id,state,current_question,remaining_time)
  values (v_session.id,v_session.state,v_session.current_question,v_session.remaining_time);
  return jsonb_build_object('success',true,'session_id',v_session.id,'candidate_id',v_session.candidate_id,
    'state',v_session.state,'current_question',v_session.current_question,'remaining_time',v_session.remaining_time);
end;
$function$;

create or replace function public.transition_cbt_session(p_session_id uuid,p_to_state text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, auth
as $function$
declare v_session public.cbt_sessions%rowtype; v_allowed boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_session from public.cbt_sessions where id = p_session_id for update;
  if not found then raise exception 'CBT session not found'; end if;
  if not public.cbt_candidate_is_owner(v_session.candidate_id) then raise exception 'Unauthorized CBT session access'; end if;
  v_allowed := case v_session.state
    when 'INITIALIZING' then p_to_state = 'AUTHENTICATED'
    when 'AUTHENTICATED' then p_to_state = 'LOADING_EXAM'
    when 'LOADING_EXAM' then p_to_state = 'INSTRUCTIONS_VIEW'
    when 'INSTRUCTIONS_VIEW' then p_to_state = 'ACTIVE_EXAM'
    when 'ACTIVE_EXAM' then p_to_state in ('PAUSED','SUBMITTED','SCORED')
    when 'PAUSED' then p_to_state in ('ACTIVE_EXAM','SCORED')
    when 'SUBMITTED' then p_to_state = 'SCORED'
    else false end;
  if not v_allowed then raise exception 'Invalid CBT session transition: % -> %', v_session.state, p_to_state; end if;
  update public.cbt_sessions set state = p_to_state, updated_at = now()
  where id = p_session_id returning * into v_session;
  return jsonb_build_object('success',true,'session_id',v_session.id,'candidate_id',v_session.candidate_id,'state',v_session.state);
end;
$function$;

revoke all on function public.cbt_finalize_attempt(uuid) from public, anon, authenticated;
grant execute on function public.cbt_finalize_attempt(uuid) to service_role;
revoke all on function public.create_cbt_attempt(uuid) from public, anon;
grant execute on function public.create_cbt_attempt(uuid) to authenticated, service_role;
revoke all on function public.submit_cbt_answer(uuid,uuid,uuid) from public, anon;
grant execute on function public.submit_cbt_answer(uuid,uuid,uuid) to authenticated, service_role;
revoke all on function public.submit_cbt_exam(uuid) from public, anon;
grant execute on function public.submit_cbt_exam(uuid) to authenticated, service_role;
revoke all on function public.persist_cbt_session_snapshot(uuid,integer,integer) from public, anon;
grant execute on function public.persist_cbt_session_snapshot(uuid,integer,integer) to authenticated, service_role;
revoke all on function public.transition_cbt_session(uuid,text) from public, anon;
grant execute on function public.transition_cbt_session(uuid,text) to authenticated, service_role;

commit;
