
do $$
declare
  r record;
begin
  for r in
    select c.oid, n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind in ('r','v','m')
      and has_table_privilege('anon',c.oid,'SELECT')
      and c.relname not in (
        'gradifi_exam_bodies',
        'gradifi_exam_programmes',
        'gradifi_exam_sessions',
        'gradifi_question_bank_items',
        'gradifi_question_bank_options',
        'gradifi_question_bank_versions'
      )
  loop
    execute format('revoke select on table %I.%I from anon',r.nspname,r.relname);
  end loop;
end
$$;

revoke all privileges on table
  public.mv_ai_queue_summary,
  public.mv_daily_active_users,
  public.mv_monthly_exams
from anon, authenticated;

grant select on table
  public.mv_ai_queue_summary,
  public.mv_daily_active_users,
  public.mv_monthly_exams
to service_role;

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prorettype='trigger'::regtype
      and p.prosecdef
      and has_function_privilege('authenticated',p.oid,'EXECUTE')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated',r.signature);
  end loop;
end
$$;
