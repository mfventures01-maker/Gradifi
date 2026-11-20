
revoke execute on function public.apply_fsm_event(text,uuid,text,text,text,text) from authenticated;
revoke execute on function public.approve_grading(uuid,uuid,numeric,text) from authenticated;
revoke execute on function public.create_answer_script(uuid,uuid,uuid,uuid,text,text) from authenticated;
revoke execute on function public.enroll_student_subjects(uuid) from authenticated;
revoke execute on function public.finalize_grading(uuid,numeric,text,numeric) from authenticated;
revoke execute on function public.get_attendance_summary(uuid) from authenticated;
revoke execute on function public.get_class_performance(uuid) from authenticated;
revoke execute on function public.get_class_performance(uuid,uuid) from authenticated;
revoke execute on function public.get_human_ai_agreement(uuid) from authenticated;
revoke execute on function public.get_pending_grades(uuid) from authenticated;
revoke execute on function public.get_pending_review_scripts(uuid,uuid) from authenticated;
revoke execute on function public.get_top_performers(uuid,uuid,integer) from authenticated;
revoke execute on function public.override_grading(uuid,uuid,numeric,text,text) from authenticated;
revoke execute on function public.release_grading(uuid,uuid) from authenticated;
revoke execute on function public.set_context(uuid,text,uuid) from authenticated;

comment on function public.apply_fsm_event(text,uuid,text,text,text,text)
  is 'Direct authenticated execution revoked: legacy SECURITY DEFINER accepts caller-supplied role; use a verified actor-bound transition path.';
comment on function public.approve_grading(uuid,uuid,numeric,text)
  is 'Direct authenticated execution revoked: legacy SECURITY DEFINER lacks actor authorization; route through a verified grading authority path.';
comment on function public.override_grading(uuid,uuid,numeric,text,text)
  is 'Direct authenticated execution revoked: legacy SECURITY DEFINER lacks actor authorization; route through a verified grading authority path.';
comment on function public.release_grading(uuid,uuid)
  is 'Direct authenticated execution revoked: legacy SECURITY DEFINER lacks actor authorization; route through a verified grading authority path.';
comment on function public.create_answer_script(uuid,uuid,uuid,uuid,text,text)
  is 'Direct authenticated execution revoked: legacy SECURITY DEFINER lacks caller-to-student/school authorization.';
comment on function public.finalize_grading(uuid,numeric,text,numeric)
  is 'Direct authenticated execution revoked: legacy SECURITY DEFINER lacks caller authorization.';
