-- Repair the live permission regression from the existing receipt allowlist.
-- Production baseline observed 2026-11-16:
--   anon/authenticated have column-level SELECT on evidence_envelope;
--   neither role has table-level SELECT;
--   service_role retains table-level SELECT/INSERT.
-- This migration narrows only the two public roles and preserves service_role.
begin;

revoke select (evidence_envelope)
  on table public.public_verification_records
  from anon, authenticated;

-- Reassert the explicit public receipt metadata allowlist. Do not include
-- evidence_envelope or internal row id / verification run identifiers.
grant select (
  verification_id,
  document_hash,
  evidence_hash,
  engine_version,
  policy_version,
  overall_similarity,
  total_sources_found,
  created_at
)
on table public.public_verification_records
to anon, authenticated;

commit;
