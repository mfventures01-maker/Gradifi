-- Production CBT access lockdown applied to the main Supabase project.
-- Removes anonymous access to session tables and the public exam view.
-- Keeps authenticated session/snapshot DML temporarily available until the
-- RPC-backed frontend is confirmed live and positive persistence is certified.

REVOKE SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.cbt_sessions
  FROM anon;

REVOKE SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.cbt_session_snapshots
  FROM anon;

ALTER VIEW public.v_cbt_exams SET (security_invoker = true);
REVOKE SELECT ON TABLE public.v_cbt_exams FROM anon;
GRANT SELECT ON TABLE public.v_cbt_exams TO authenticated;

REVOKE ALL ON FUNCTION public.start_cbt_exam_v2(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
