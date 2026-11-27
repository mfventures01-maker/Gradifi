drop policy if exists documents_insert_member_owner on public.documents;
create policy documents_insert_member_owner on public.documents for insert to authenticated
with check (
 owner_user_id=(select auth.uid())
 and institution_id is not null
 and public.is_current_user_institution_member(documents.institution_id)
 and exists(select 1 from public.tenants t
  where t.id=documents.tenant_id and t.institution_id=documents.institution_id)
);
drop policy if exists documents_update_member_owner on public.documents;
create policy documents_update_member_owner on public.documents for update to authenticated
using(owner_user_id=(select auth.uid()) and public.is_current_user_institution_member(documents.institution_id))
with check(
 owner_user_id=(select auth.uid())
 and public.is_current_user_institution_member(documents.institution_id)
 and exists(select 1 from public.tenants t
  where t.id=documents.tenant_id and t.institution_id=documents.institution_id)
);
drop policy if exists submissions_insert_member_owner on public.submissions;
create policy submissions_insert_member_owner on public.submissions for insert to authenticated
with check(
 owner_user_id=(select auth.uid())
 and institution_id is not null
 and public.is_current_user_institution_member(submissions.institution_id)
 and exists(select 1 from public.projects p
  where p.id=submissions.project_id and p.institution_id=submissions.institution_id)
);
drop policy if exists submissions_update_member_owner on public.submissions;
create policy submissions_update_member_owner on public.submissions for update to authenticated
using(owner_user_id=(select auth.uid()) and public.is_current_user_institution_member(submissions.institution_id))
with check(
 owner_user_id=(select auth.uid())
 and public.is_current_user_institution_member(submissions.institution_id)
 and exists(select 1 from public.projects p
  where p.id=submissions.project_id and p.institution_id=submissions.institution_id)
);
