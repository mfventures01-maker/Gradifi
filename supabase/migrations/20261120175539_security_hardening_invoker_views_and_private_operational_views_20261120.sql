
alter view public.principal_dashboard set (security_invoker = true);
alter view public.student_numbers_view set (security_invoker = true);
alter view public.student_roster set (security_invoker = true);
alter view public.sub_accounts set (security_invoker = true);
alter view public.sub_accounts_public set (security_invoker = true);
alter view public.v_cbt_exams set (security_invoker = true);

revoke select on table
  public.import_progress_view,
  public.invites_public,
  public.pipeline_health,
  public.queue_health,
  public.result_sheet_view,
  public.student_sequence_status,
  public.superadmin_fsm_overview
from anon, authenticated;
