-- Narrow production security pass: remove anonymous CBT access and retire obsolete RPC.
-- Authenticated session/snapshot DML is intentionally preserved until the RPC-backed
-- client is confirmed deployed, to avoid breaking the live examination pathway.

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
