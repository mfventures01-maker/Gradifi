-- SEFAES: scope institutional dashboard RPCs to the canonical actor identity.
begin;

-- Public institution bootstrap currently fabricates a profile UUID instead of
-- linking an auth.users row. Keep these legacy bootstrap RPCs unavailable to
-- browser roles until the public applicant flow is replaced by Auth-backed provisioning.
revoke all on function public.create_institution_account(text,text,text,text,text,text,text,text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.create_institution_account(text,text,text,text,text,text,text,text,text,text,text,text,text,text)
  to service_role;
alter function public.create_institution_account(text,text,text,text,text,text,text,text,text,text,text,text,text,text)
  set search_path = pg_catalog, public, extensions;

revoke all on function public.create_school_with_classes(text,text,text,text,text,text,text,text,uuid)
  from public, anon, authenticated;
grant execute on function public.create_school_with_classes(text,text,text,text,text,text,text,text,uuid)
  to service_role;
alter function public.create_school_with_classes(text,text,text,text,text,text,text,text,uuid)
  set search_path = pg_catalog, public, extensions;

create or replace function public.get_dean_dashboard_stats(p_institution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $dean_stats_body$
declare
  v_total_students bigint;
  v_total_departments bigint;
  v_pending_approvals bigint;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'dean'
      and p.institution_id = p_institution_id
  ) then raise exception 'DEAN_INSTITUTION_SCOPE_DENIED'; end if;

  select count(*) into v_total_students
  from public.students where institution_id = p_institution_id;
  select count(*) into v_total_departments
  from public.nuc_departments where institution_id = p_institution_id;
  select count(*) into v_pending_approvals
  from public.plagiarism_checks
  where institution_id = p_institution_id and status = 'pending_dean';

  return jsonb_build_object(
    'total_students', v_total_students,
    'total_departments', v_total_departments,
    'pending_approvals', v_pending_approvals
  );
end;
$dean_stats_body$;
revoke all on function public.get_dean_dashboard_stats(uuid) from public, anon;
grant execute on function public.get_dean_dashboard_stats(uuid) to authenticated;

create or replace function public.get_hod_dashboard_stats(p_institution_id uuid, p_department_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $hod_stats_body$
declare
  v_total_students bigint;
  v_total_projects bigint;
  v_pending_reviews bigint;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.identity_actors ia
    join public.nuc_departments nd on nd.hod_id = ia.actor_record_id
    where ia.auth_user_id = auth.uid()
      and ia.actor_type = 'hod'
      and ia.institution_id = p_institution_id
      and nd.id = p_department_id
      and nd.institution_id = p_institution_id
  ) then raise exception 'HOD_DEPARTMENT_SCOPE_DENIED'; end if;

  select count(*) into v_total_students
  from public.students
  where institution_id = p_institution_id and department_id = p_department_id;
  select count(*) into v_total_projects
  from public.projects
  where institution_id = p_institution_id and department_id = p_department_id;
  select count(*) into v_pending_reviews
  from public.plagiarism_checks pc
  join public.students s on s.id = pc.student_id
  where s.institution_id = p_institution_id
    and s.department_id = p_department_id
    and pc.status = 'pending_hod';

  return jsonb_build_object(
    'total_students', v_total_students,
    'total_projects', v_total_projects,
    'pending_reviews', v_pending_reviews
  );
end;
$hod_stats_body$;
revoke all on function public.get_hod_dashboard_stats(uuid,uuid) from public, anon;
grant execute on function public.get_hod_dashboard_stats(uuid,uuid) to authenticated;

create or replace function public.get_course_adviser_stats(p_adviser_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $adviser_stats_body$
declare
  v_total_advisees bigint;
  v_at_risk_students bigint;
  v_avg_cgpa numeric;
begin
  if auth.uid() is null or not exists (
    select 1 from public.identity_actors ia
    where ia.auth_user_id = auth.uid()
      and ia.actor_type = 'adviser'
      and ia.actor_record_id = p_adviser_id
      and ia.status = 'active'
  ) then raise exception 'ADVISER_SCOPE_DENIED'; end if;

  select count(*) into v_total_advisees
  from public.students where adviser_id = p_adviser_id;
  select count(*) into v_at_risk_students
  from public.students where adviser_id = p_adviser_id and cgpa < 2.0;
  select coalesce(avg(cgpa), 0) into v_avg_cgpa
  from public.students where adviser_id = p_adviser_id;

  return jsonb_build_object(
    'total_advisees', v_total_advisees,
    'at_risk_students', v_at_risk_students,
    'avg_cgpa', round(v_avg_cgpa, 2)
  );
end;
$adviser_stats_body$;
revoke all on function public.get_course_adviser_stats(uuid) from public, anon;
grant execute on function public.get_course_adviser_stats(uuid) to authenticated;

create or replace function public.get_vp_dashboard_stats(p_school_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $vp_stats_body$
declare
  v_total_classes integer;
  v_total_teachers integer;
  v_total_students integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'vice_principal'
      and p.school_id = p_school_id
  ) then raise exception 'VP_SCHOOL_SCOPE_DENIED'; end if;

  select count(*) into v_total_classes from public.classes where school_id = p_school_id;
  select count(*) into v_total_teachers from public.teachers where school_id = p_school_id;
  select count(*) into v_total_students from public.students where school_id = p_school_id;

  return jsonb_build_object(
    'total_classes', v_total_classes,
    'total_teachers', v_total_teachers,
    'total_students', v_total_students,
    'attendance_rate', null,
    'anomalies_count', null,
    'anomalies', null,
    'exam_schedule', null,
    'recent_teacher_activity', null
  );
end;
$vp_stats_body$;
revoke all on function public.get_vp_dashboard_stats(uuid) from public, anon;
grant execute on function public.get_vp_dashboard_stats(uuid) to authenticated;

-- The bursar RPC is a hard-coded zero-value placeholder, not a financial ledger.
-- Keep it unavailable to user sessions until payment/ledger-backed metrics exist.
revoke all on function public.get_bursar_dashboard_stats(uuid) from public, anon, authenticated;

commit;
