create or replace function public.cbt_guard_session_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt_status text;
  v_allowed boolean;
begin
  if new.id <> old.id
     or new.attempt_id <> old.attempt_id
     or new.exam_id <> old.exam_id
     or new.student_id <> old.student_id
     or new.created_at <> old.created_at then
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
      else false
    end;

    if not v_allowed then
      raise exception 'Invalid CBT session transition: % -> %', old.state, new.state;
    end if;

    if new.state in ('SUBMITTED','SCORED') then
      select status into v_attempt_status
      from public.cbt_attempts
      where id = old.attempt_id;

      if v_attempt_status = 'in_progress' then
        raise exception 'Cannot close CBT session while its attempt is still active';
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_cbt_guard_session_update on public.cbt_sessions;
create trigger trg_cbt_guard_session_update
before update on public.cbt_sessions
for each row execute function public.cbt_guard_session_update();

create or replace function public.cbt_validate_session_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.cbt_sessions%rowtype;
begin
  select * into v_session
  from public.cbt_sessions
  where id = new.session_id;

  if not found then
    raise exception 'CBT session snapshot parent not found';
  end if;

  if new.state <> v_session.state
     or new.current_question <> v_session.current_question
     or new.remaining_time <> v_session.remaining_time then
    raise exception 'CBT session snapshot must match the persisted session state';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cbt_validate_session_snapshot on public.cbt_session_snapshots;
create trigger trg_cbt_validate_session_snapshot
before insert on public.cbt_session_snapshots
for each row execute function public.cbt_validate_session_snapshot();
