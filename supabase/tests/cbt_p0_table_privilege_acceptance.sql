-- CBT P0-01 read-only acceptance checks.
-- Run only against a disposable/local or approved staging database after the
-- P0-01 migration has been applied. This script performs no writes.

do $acceptance$
declare
  v_table text;
  v_role text;
  v_expected_select boolean;
  v_actual_select boolean;
begin
  foreach v_table in array array[
    'cbt_sessions',
    'cbt_session_snapshots',
    'gradifi_exam_question_map',
    'gradifi_exam_question_snapshots',
    'gradifi_question_bank_answer_keys',
    'gradifi_question_bank_items',
    'gradifi_question_bank_options',
    'gradifi_question_bank_versions',
    'cbt_public_candidate_profiles',
    'cbt_public_offers',
    'cbt_public_orders',
    'cbt_public_entitlements'
  ] loop
    if to_regclass(format('public.%I', v_table)) is null then
      raise exception 'P0-01 acceptance prerequisite missing: public.%', v_table;
    end if;

    foreach v_role in array array['anon', 'authenticated'] loop
      if has_table_privilege(v_role, format('public.%I', v_table), 'INSERT')
         or has_table_privilege(v_role, format('public.%I', v_table), 'UPDATE')
         or has_table_privilege(v_role, format('public.%I', v_table), 'DELETE')
         or has_table_privilege(v_role, format('public.%I', v_table), 'TRUNCATE')
         or has_table_privilege(v_role, format('public.%I', v_table), 'REFERENCES')
         or has_table_privilege(v_role, format('public.%I', v_table), 'TRIGGER') then
        raise exception 'P0-01 failure: role % retains a write/structural privilege on public.%', v_role, v_table;
      end if;

      v_expected_select := case
        when v_table in (
          'gradifi_question_bank_items',
          'gradifi_question_bank_options',
          'gradifi_question_bank_versions',
          'cbt_public_offers'
        ) then true
        when v_role = 'authenticated' and v_table in (
          'cbt_sessions',
          'cbt_session_snapshots',
          'cbt_public_candidate_profiles',
          'cbt_public_orders',
          'cbt_public_entitlements'
        ) then true
        else false
      end;

      v_actual_select := has_table_privilege(v_role, format('public.%I', v_table), 'SELECT');
      if v_actual_select is distinct from v_expected_select then
        raise exception 'P0-01 failure: role % SELECT privilege mismatch on public.% (expected %, actual %)',
          v_role, v_table, v_expected_select, v_actual_select;
      end if;
    end loop;
  end loop;

  if not has_function_privilege(
    'authenticated',
    'public.persist_cbt_session_snapshot(uuid,integer,integer)',
    'EXECUTE'
  ) then
    raise exception 'P0-01 failure: authenticated cannot execute persist_cbt_session_snapshot';
  end if;

  if has_function_privilege(
    'anon',
    'public.persist_cbt_session_snapshot(uuid,integer,integer)',
    'EXECUTE'
  ) then
    raise exception 'P0-01 failure: anon can execute persist_cbt_session_snapshot';
  end if;
end;
$acceptance$;
