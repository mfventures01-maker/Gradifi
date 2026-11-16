-- Higher-ed students may be provisioned before academic cohorts/classes exist.
-- School student onboarding remains class-required.
begin;

do $higher_ed_student_class_contract$
declare
  v_function regprocedure :=
    'public.complete_actor_onboarding(uuid,uuid,text,text,uuid,uuid,text,text,text,text,uuid,uuid,uuid[],text,date,text,boolean,uuid,uuid,text,text,text,boolean,integer)'::regprocedure;
  v_definition text;
  v_old text := $old$
if p_class_id is null or not exists (
      select 1 from public.classes c where c.id = p_class_id and c.school_id = p_school_id
    ) then raise exception 'CLASS_NOT_IN_SCHOOL'; end if;
$old$;
  v_new text := $new$
if p_expected_authority_role = 'principal_admin' then
      if p_class_id is null or not exists (
        select 1 from public.classes c where c.id = p_class_id and c.school_id = p_school_id
      ) then raise exception 'CLASS_NOT_IN_SCHOOL'; end if;
    elsif p_class_id is not null and not exists (
      select 1 from public.classes c where c.id = p_class_id and c.school_id = p_school_id
    ) then raise exception 'CLASS_NOT_IN_SCHOOL'; end if;
$new$;
begin
  select pg_get_functiondef(v_function) into v_definition;

  if position(v_old in v_definition) = 0 then
    raise exception 'HIGHER_ED_STUDENT_CLASS_PATCH_TARGET_NOT_FOUND';
  end if;

  v_definition := replace(v_definition, v_old, v_new);
  execute v_definition;
end;
$higher_ed_student_class_contract$;

commit;
