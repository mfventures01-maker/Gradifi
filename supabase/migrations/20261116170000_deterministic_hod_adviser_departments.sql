-- Enforce a deterministic faculty -> department relationship for HOD and Adviser.
-- HODs are attached to the NUC register; Advisers use the institution's academic register.
begin;

do $deterministic_department_assignment$
declare
  v_function regprocedure :=
    'public.complete_actor_onboarding(uuid,uuid,text,text,uuid,uuid,text,text,text,text,uuid,uuid,uuid[],text,date,text,boolean,uuid,uuid,text,text,text,boolean,integer)'::regprocedure;
  v_definition text;
  v_old text := $old$
    elsif p_actor_type = 'hod' then
      if p_department_id is null or not exists (
        select 1 from public.nuc_departments nd where nd.id = p_department_id and nd.institution_id = p_institution_id
      ) then raise exception 'NUC_DEPARTMENT_NOT_IN_INSTITUTION'; end if;
    elsif p_department_id is not null and not exists (
      select 1 from public.departments d where d.id = p_department_id and d.institution_id = p_institution_id
    ) then raise exception 'DEPARTMENT_NOT_IN_INSTITUTION'; end if;
$old$;
  v_new text := $new$
    elsif p_actor_type = 'hod' then
      if p_department_id is null or p_faculty_id is null or not exists (
        select 1 from public.nuc_departments nd
        where nd.id = p_department_id
          and nd.institution_id = p_institution_id
          and nd.faculty_id = p_faculty_id
      ) then raise exception 'NUC_DEPARTMENT_NOT_IN_SELECTED_FACULTY'; end if;
    elsif p_actor_type = 'adviser' then
      if p_department_id is null or p_faculty_id is null or not exists (
        select 1 from public.departments d
        where d.id = p_department_id
          and d.institution_id = p_institution_id
          and d.faculty_id = p_faculty_id
      ) then raise exception 'DEPARTMENT_NOT_IN_SELECTED_FACULTY'; end if;
$new$;
begin
  select pg_get_functiondef(v_function) into v_definition;

  if position(v_old in v_definition) = 0 then
    raise exception 'DETERMINISTIC_HOD_ADVISER_PATCH_TARGET_NOT_FOUND';
  end if;

  v_definition := replace(v_definition, v_old, v_new);
  execute v_definition;
end;
$deterministic_department_assignment$;

commit;
