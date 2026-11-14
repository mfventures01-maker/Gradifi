revoke all on function public.cbt_prepare_attempt() from public, anon, authenticated;
revoke all on function public.cbt_guard_session_update() from public, anon, authenticated;
revoke all on function public.cbt_validate_session_snapshot() from public, anon, authenticated;

revoke all on function public.cbt_is_student(uuid) from public, anon;
revoke all on function public.cbt_teacher_can_access_exam(uuid) from public, anon;
revoke all on function public.cbt_student_can_access_exam(uuid) from public, anon;

grant execute on function public.cbt_is_student(uuid) to authenticated;
grant execute on function public.cbt_teacher_can_access_exam(uuid) to authenticated;
grant execute on function public.cbt_student_can_access_exam(uuid) to authenticated;

revoke all on function public.create_cbt_attempt(uuid) from public, anon;
revoke all on function public.transition_cbt_session(uuid,text) from public, anon;
revoke all on function public.get_cbt_exam_questions(uuid) from public, anon;
revoke all on function public.submit_cbt_answer(uuid,uuid,uuid) from public, anon;
revoke all on function public.submit_cbt_exam(uuid) from public, anon;

grant execute on function public.create_cbt_attempt(uuid) to authenticated;
grant execute on function public.transition_cbt_session(uuid,text) to authenticated;
grant execute on function public.get_cbt_exam_questions(uuid) to authenticated;
grant execute on function public.submit_cbt_answer(uuid,uuid,uuid) to authenticated;
grant execute on function public.submit_cbt_exam(uuid) to authenticated;
