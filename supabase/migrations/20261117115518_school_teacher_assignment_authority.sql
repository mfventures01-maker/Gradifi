-- Bind legacy teacher-subject assignment RPC to the authenticated Principal's school.
begin;

create or replace function public.assign_teacher_to_subject(
  p_teacher_id uuid,
  p_class_subject_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_teacher_school_id uuid;
  v_subject_school_id uuid;
  v_assignment_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select t.school_id, cs.school_id
    into v_teacher_school_id, v_subject_school_id
  from public.teachers t
  cross join public.class_subjects cs
  where t.id = p_teacher_id
    and cs.id = p_class_subject_id;

  if v_teacher_school_id is null or v_subject_school_id is null then
    raise exception 'TEACHER_OR_CLASS_SUBJECT_NOT_FOUND';
  end if;

  if v_teacher_school_id is distinct from v_subject_school_id then
    raise exception 'CROSS_SCHOOL_TEACHER_ASSIGNMENT_DENIED';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'principal_admin'
      and p.school_id = v_teacher_school_id
  ) then
    raise exception 'PRINCIPAL_SCHOOL_AUTHORITY_REQUIRED';
  end if;

  insert into public.teacher_subject_assignments (
    school_id, teacher_id, class_subject_id
  )
  values (
    v_teacher_school_id, p_teacher_id, p_class_subject_id
  )
  on conflict (teacher_id, class_subject_id)
  do update set school_id = excluded.school_id
  returning id into v_assignment_id;

  return v_assignment_id;
end;
$function$;

revoke all on function public.assign_teacher_to_subject(uuid, uuid) from public, anon;
grant execute on function public.assign_teacher_to_subject(uuid, uuid) to authenticated, service_role;

commit;
