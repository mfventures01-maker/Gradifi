
DROP POLICY IF EXISTS dean_read_own_institution_faculties ON public.faculties;
CREATE POLICY dean_read_own_institution_faculties
ON public.faculties
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.institutions i ON i.id = faculties.institution_id
    WHERE p.user_id = (SELECT auth.uid())
      AND p.role = 'dean'
      AND p.institution_id = faculties.institution_id
      AND i.status = 'active'
  )
);

DROP POLICY IF EXISTS dean_read_own_institution_departments ON public.departments;
CREATE POLICY dean_read_own_institution_departments
ON public.departments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.institutions i ON i.id = departments.institution_id
    WHERE p.user_id = (SELECT auth.uid())
      AND p.role = 'dean'
      AND p.institution_id = departments.institution_id
      AND i.status = 'active'
  )
);
