alter view public.import_progress_view set (security_invoker = true);
alter view public.invites_public set (security_invoker = true);
alter view public.pipeline_health set (security_invoker = true);
alter view public.queue_health set (security_invoker = true);
alter view public.result_sheet_view set (security_invoker = true);
alter view public.student_sequence_status set (security_invoker = true);
alter view public.superadmin_fsm_overview set (security_invoker = true);
;
