-- Restrict public receipt readers to the documented public receipt columns.
-- Service_role retains table-level SELECT for trusted persistence and INSERT ... RETURNING.
-- The public SELECT RLS policy remains in place.

REVOKE SELECT
ON TABLE public.public_verification_records
FROM anon, authenticated;

GRANT SELECT (
  verification_id,
  document_hash,
  evidence_hash,
  engine_version,
  policy_version,
  overall_similarity,
  total_sources_found,
  evidence_envelope,
  created_at
)
ON TABLE public.public_verification_records
TO anon, authenticated;
