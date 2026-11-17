-- Restrict the Dean onboarding browser reads to the Dean's own institution.
-- Global NUC faculty catalogue rows remain readable to authenticated Deans only.
-- This migration adds SELECT policies only; it does not grant browser-side writes.

drop policy if exists dean_read_own_institution_schools on public.schools;
create policy dean_read_own_institution_schools
on public.schools
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.role = 'dean'
      and p.institution_id = schools.institution_id
  )
);

drop policy if exists dean_read_nuc_faculty_catalogue on public.nuc_faculties;
create policy dean_read_nuc_faculty_catalogue
on public.nuc_faculties
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.role = 'dean'
      and (
        nuc_faculties.institution_id is null
        or nuc_faculties.institution_id = p.institution_id
      )
  )
);

drop policy if exists dean_read_own_institution_nuc_departments on public.nuc_departments;
create policy dean_read_own_institution_nuc_departments
on public.nuc_departments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.role = 'dean'
      and p.institution_id = nuc_departments.institution_id
  )
);

drop policy if exists dean_read_own_institution_faculties on public.faculties;
create policy dean_read_own_institution_faculties
on public.faculties
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.role = 'dean'
      and p.institution_id = faculties.institution_id
  )
);

drop policy if exists dean_read_own_institution_departments on public.departments;
create policy dean_read_own_institution_departments
on public.departments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.role = 'dean'
      and p.institution_id = departments.institution_id
  )
);