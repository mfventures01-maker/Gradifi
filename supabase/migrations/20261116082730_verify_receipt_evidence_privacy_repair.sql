begin;

revoke select (evidence_envelope)
  on table public.public_verification_records
  from anon, authenticated;

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