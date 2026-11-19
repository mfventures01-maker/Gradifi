-- Close anonymous school class/subject provisioning and student-number sequence access.
begin;

create or replace function public.initialize_class_subjects(p_school_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_classes_count integer;
  v_subjects_count integer;
  v_inserted_count integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'principal_admin'
      and p.school_id = p_school_id
  ) then
    raise exception 'PRINCIPAL_SCHOOL_AUTHORITY_REQUIRED';
  end if;

  select count(*) into v_classes_count
  from public.classes c
  where c.school_id = p_school_id;

  select count(*) into v_subjects_count
  from public.subject_catalog;

  with combinations as (
    select p_school_id as school_id, c.id as class_id, sc.id as subject_id
    from public.classes c
    cross join public.subject_catalog sc
    where c.school_id = p_school_id
  ),
  inserted as (
    insert into public.class_subjects (
      school_id, class_id, subject_id, created_at, updated_at
    )
    select school_id, class_id, subject_id, now(), now()
    from combinations
    on conflict (school_id, class_id, subject_id) do nothing
    returning 1
  )
  select count(*) into v_inserted_count from inserted;

  return jsonb_build_object(
    'success', true,
    'school_id', p_school_id,
    'classes', v_classes_count,
    'catalog_subjects', v_subjects_count,
    'combinations_created', v_inserted_count,
    'total_possible', v_classes_count * v_subjects_count
  );
end;
$function$;

revoke all on function public.initialize_class_subjects(uuid) from public, anon;
grant execute on function public.initialize_class_subjects(uuid) to authenticated, service_role;

-- Student-number generation mutates a per-school sequence and is an internal
-- server operation, not a public RPC. The function owner can still invoke it
-- from trusted trigger/SECURITY DEFINER code.
revoke all on function public.generate_student_number(uuid) from public, anon, authenticated;
grant execute on function public.generate_student_number(uuid) to service_role;

commit;
